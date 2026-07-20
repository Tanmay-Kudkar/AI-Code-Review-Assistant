import { useEffect, useState, useRef } from 'react';
import { useServerState } from '../../context/ServerStateContext';
import { Server, Loader } from 'lucide-react';
import axios from 'axios';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

export default function ServerWakeupScreen() {
  const { serverState, setServerState } = useServerState();
  useLockBodyScroll(serverState !== 'awake');
  const [progress, setProgress] = useState(0);

  const [backendAwake, setBackendAwake] = useState(false);
  const backendAwakeRef = useRef(false);

  useEffect(() => {
    backendAwakeRef.current = backendAwake;
  }, [backendAwake]);

  // Simulated Progress Animation
  useEffect(() => {
    if (serverState !== 'waking_up') return;
    setProgress(0);
    setBackendAwake(false);
    backendAwakeRef.current = false;

    const interval = setInterval(() => {
      setProgress(p => {
        if (backendAwakeRef.current) {
          if (p >= 100) return 100;
          const next = Math.min(100, p + 15);
          if (next === 100) {
            setTimeout(() => setServerState('success'), 400); // Wait a tiny bit for the bar to visually hit 100%
          }
          return next;
        }

        if (p >= 99) return 99;
        // Asymptotic approach: distance to 100% decreases by 3.5% every tick.
        // This makes it start fast and smoothly slow down as it approaches 100%.
        const increment = (100 - p) * 0.035;
        return Math.min(99, p + increment);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [serverState, setServerState]);

  // Polling backend while waking up
  useEffect(() => {
    if (serverState !== 'waking_up') return;

    let isPolling = true;
    const pollHealth = async () => {
      while (isPolling) {
        try {
          const baseURL = import.meta.env.VITE_API_URL || '/api';
          await axios.get(`${baseURL}/`, { timeout: 1500 });
          // If it succeeds, the server is live!
          if (isPolling) {
            setBackendAwake(true);
            isPolling = false; // Stop polling
          }
        } catch (err) {
          // Still asleep, wait 500ms and try again
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    };

    pollHealth();

    return () => { isPolling = false; };
  }, [serverState, setServerState]);

  // Success timeout
  useEffect(() => {
    if (serverState === 'success') {
      const timeout = setTimeout(() => {
        setServerState('awake');
      }, 1500); // Wait 1.5s as requested
      return () => clearTimeout(timeout);
    }
  }, [serverState, setServerState]);

  if (serverState === 'awake') return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0B1020]/90 backdrop-blur-[18px] flex flex-col items-center justify-center p-6 animate-fade-in">
      
      {/* Background Glow Orbs (Slow floating effect) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#8B5CF6]/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute top-1/2 left-1/2 translate-x-1/4 -translate-y-1/4 w-[400px] h-[400px] bg-[#10B981]/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />

      <div className="max-w-[480px] w-full text-center relative overflow-hidden border border-white/10 bg-[#161B2D]/75 backdrop-blur-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.35)] rounded-2xl hover:-translate-y-1 hover:shadow-2xl transition-transform duration-500 group">
        
        {/* Subtle inner gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/5 via-transparent to-[#10B981]/5 opacity-60" />

        <div className="relative z-10 py-10 px-8">
          
          {serverState === 'waking_up' ? (
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] text-xs font-semibold border border-[#8B5CF6]/20 shadow-[0_0_10px_rgba(139,92,246,0.15)]">
                <Loader className="w-3.5 h-3.5 animate-spin" />
                Connecting Backend
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] text-xs font-semibold border border-[#10B981]/20 shadow-[0_0_10px_rgba(16,185,129,0.15)] animate-fade-in">
                <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                ONLINE
              </div>
            </div>
          )}

          {serverState === 'waking_up' ? (
            <div className="animate-fade-in">
              <div className="relative mx-auto w-28 h-28 mb-8 flex items-center justify-center">
                {/* Orbital rings */}
                <div className="absolute inset-0 rounded-full border border-slate-700/30" />
                <div className="absolute inset-0 rounded-full border-2 border-t-[#8B5CF6] border-r-transparent border-b-transparent border-l-transparent animate-spin shadow-[0_0_15px_rgba(139,92,246,0.5)]" style={{ animationDuration: '2.5s' }} />
                <div className="absolute inset-2 rounded-full border-2 border-b-[#10B981] border-t-transparent border-r-transparent border-l-transparent animate-spin-reverse shadow-[0_0_15px_rgba(16,185,129,0.3)]" style={{ animationDuration: '3.5s' }} />
                <div className="absolute inset-4 rounded-full border border-slate-700/30" />
                
                {/* Glowing Server Icon inside */}
                <div className="relative z-10 p-4 bg-[#0B1020] rounded-full border border-white/5 shadow-inner">
                  <Server className="w-8 h-8 text-[#8B5CF6] animate-pulse drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
                </div>
              </div>
              <h2 className="text-[32px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F8FAFC] to-[#94A3B8] mb-2 tracking-[-0.03em] leading-tight">
                Preparing your workspace...
              </h2>
              <p className="text-[#9CA3AF] text-[16px] leading-relaxed mb-8 px-2 font-medium">
                Usually takes 10–20 seconds
              </p>

              {/* Simulated Progress Bar */}
              <div className="w-full max-w-[85%] mx-auto">
                <div className="flex justify-between text-xs font-semibold mb-2 text-[#94A3B8]">
                  <span>Connecting to backend...</span>
                  <span>{Math.floor(progress)}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#0B1020] rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#10B981] rounded-full transition-all duration-300 ease-out relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in flex flex-col items-center">
              <div className="relative mx-auto w-28 h-28 mb-8 flex items-center justify-center">
                {/* Ripple effect */}
                <div className="absolute inset-0 rounded-full bg-[#10B981]/20 animate-ping opacity-75" style={{ animationDuration: '1.5s' }} />
                <div className="absolute inset-2 rounded-full bg-[#10B981]/30 animate-pulse" />
                
                {/* Checkmark icon with scale+fade pop */}
                <div className="relative z-10 w-24 h-24 flex items-center justify-center rounded-full bg-[rgba(16,185,129,0.12)] border-2 border-[rgba(16,185,129,0.25)] shadow-[0_0_30px_rgba(16,185,129,0.25)] backdrop-blur-sm animate-success-pop">
                  <svg className="checkmark w-12 h-12 text-[#10B981] drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                    <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <h2 className="text-[36px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#10B981] to-[#34D399] mb-2 tracking-[-0.03em] leading-tight">
                Server is Live 🎉
              </h2>
              <p className="text-[#10B981] text-[16px] font-medium">
                Everything is ready. Redirecting...
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .animate-spin-reverse {
          animation: spin-reverse linear infinite;
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes success-pop {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-success-pop {
          animation: success-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .checkmark__check {
          transform-origin: 50% 50%;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) 0.2s forwards;
        }
        @keyframes stroke {
          100% {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}
