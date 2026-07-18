import { useState, useEffect, useRef } from 'react';
import { Menu, Bell, Plus, Search, Moon, Code2, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { reviewsApi } from '../../services/api';

export default function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const { data } = await reviewsApi.list({ search: query, limit: 5 });
        setResults(data.reviews || []);
      } catch (error) {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('topbar-search')?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="h-16 bg-surface-900/80 backdrop-blur-xl border-b border-surface-800 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 z-10">
      {/* Left: hamburger */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-surface-800 text-slate-400 hover:text-white transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Dynamic Search Bar */}
        <div ref={searchRef} className="hidden sm:block relative w-72 z-50">
          <div className="flex items-center bg-surface-800 border border-surface-700 rounded-xl px-3 py-1.5 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/50 transition-all group relative z-10">
            <Search className="w-4 h-4 text-slate-400 mr-2 group-focus-within:text-brand-400 transition-colors" />
            <input 
              id="topbar-search"
              type="text" 
              placeholder="Search reviews..." 
              className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder:text-slate-500 w-full"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              autoComplete="off"
            />
            {isLoading ? (
               <Loader className="w-4 h-4 text-brand-400 animate-spin ml-2 flex-shrink-0" />
            ) : (
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                <kbd className="hidden lg:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium text-slate-500 bg-surface-900 border border-surface-700 rounded">Ctrl</kbd>
                <kbd className="hidden lg:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium text-slate-500 bg-surface-900 border border-surface-700 rounded">K</kbd>
              </div>
            )}
          </div>
          
          {/* Dropdown Suggestions */}
          {isOpen && query.trim() !== '' && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-surface-800 border border-surface-700 rounded-xl shadow-xl shadow-black/50 overflow-hidden transform opacity-100 scale-100 transition-all origin-top">
              {results.length > 0 ? (
                <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                  {results.map(review => (
                    <div 
                      key={review.id}
                      onClick={() => {
                        navigate(`/reviews/${review.id}`);
                        setIsOpen(false);
                        setQuery('');
                      }}
                      className="flex items-center justify-between p-2 hover:bg-surface-700/50 rounded-lg cursor-pointer transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate group-hover:text-brand-300 transition-colors">{review.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Code2 className="w-3 h-3 text-slate-500" />
                          <span className="text-xs text-slate-400">{review.language}</span>
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${review.status === 'DONE' ? 'bg-emerald-400' : review.status === 'FAILED' ? 'bg-red-400' : 'bg-brand-400'}`}></div>
                    </div>
                  ))}
                </div>
              ) : !isLoading ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-slate-400">No reviews found.</p>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-slate-400">Searching...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Dark Mode Toggle (Mock) */}
        <button className="p-2 text-slate-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors hidden sm:block">
          <Moon className="w-4 h-4" />
        </button>

        {/* Notifications (Mock) */}
        <button className="p-2 text-slate-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse ring-2 ring-surface-900"></span>
        </button>

        <div className="h-6 w-px bg-surface-700 mx-1 hidden sm:block"></div>

        <button
          onClick={() => navigate('/submit')}
          className="btn-primary py-1.5 px-3 text-xs shadow-md shadow-brand-900/30"
          id="topbar-new-review-btn"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Review</span>
        </button>
        
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer shadow-inner hover:scale-105 transition-transform overflow-hidden ${!user?.avatar ? 'bg-gradient-to-br from-brand-400 to-violet-500' : 'bg-surface-800'}`}
          onClick={() => navigate('/profile')}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            user?.name?.charAt(0).toUpperCase()
          )}
        </div>
      </div>
    </header>
  );
}
