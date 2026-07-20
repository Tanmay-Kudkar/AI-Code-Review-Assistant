import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const ServerStateContext = createContext(null);

export function ServerStateProvider({ children }) {
  // 'awake' | 'waking_up' | 'success'
  const [serverState, setServerState] = useState('awake'); 

  const triggerWakeup = useCallback(() => {
    setServerState(prev => prev === 'awake' ? 'waking_up' : prev);
  }, []);

  // When tab becomes visible after being hidden (e.g. user comes back after a while)
  // We ping the server to check if it fell asleep.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && serverState === 'awake') {
        try {
          const baseURL = import.meta.env.VITE_API_URL || '/api';
          await axios.get(`${baseURL}/`, { timeout: 4000 });
        } catch (err) {
          if (err.message === 'Network Error' || err.code === 'ECONNABORTED' || err.message.includes('timeout') || (err.response && err.response.status >= 502)) {
            triggerWakeup();
          }
        }
      }
    };
    
    // Listen for interceptor events
    const handleInterceptorWakeup = () => triggerWakeup();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('server-wakeup-required', handleInterceptorWakeup);
    
    // Also run it once on initial load just in case the server is asleep immediately!
    handleVisibilityChange();
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('server-wakeup-required', handleInterceptorWakeup);
    };
  }, [serverState, triggerWakeup]);

  // Dispatch 'server-awake' when we transition to success or awake
  useEffect(() => {
    if (serverState === 'success' || serverState === 'awake') {
      window.dispatchEvent(new Event('server-awake'));
    }
  }, [serverState]);

  return (
    <ServerStateContext.Provider value={{ serverState, setServerState, triggerWakeup }}>
      {children}
    </ServerStateContext.Provider>
  );
}

export const useServerState = () => useContext(ServerStateContext);
