import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Code2, History, User, LogOut, X, Zap, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/submit', icon: Code2, label: 'New Review' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col
        bg-surface-900 border-r border-surface-800
        transform transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-lg shadow-brand-900/50">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-none">AI Review</p>
              <p className="text-xs text-slate-500 mt-0.5">Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg hover:bg-surface-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 h-[52px] rounded-r-xl rounded-l-none text-sm font-medium
                transition-all duration-250 group hover:translate-x-1 border-l-4
                ${isActive
                  ? 'border-brand-500 bg-brand-500/10 text-brand-300 shadow-[inset_0px_0px_20px_rgba(124,92,255,0.05)]'
                  : 'border-transparent text-slate-400 hover:text-slate-100 hover:bg-surface-800'}
              `}
            >
              <Icon className="w-[22px] h-[22px] flex-shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-surface-800">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-800/50 border border-surface-700/30 mb-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-inner overflow-hidden mt-0.5 ${!user?.avatar ? 'bg-gradient-to-br from-brand-400 to-violet-500' : 'bg-surface-800'}`}>
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate leading-tight">
                {user?.name ? (
                  user.name.split(' ').length > 2 
                    ? `${user.name.split(' ')[0]} ${user.name.split(' ').pop()}` 
                    : user.name
                ) : ''}
              </p>
              <p className="text-[10px] text-brand-300 font-bold mt-0.5 mb-1.5 uppercase tracking-wider">Premium User</p>
              <NavLink to="/profile" onClick={onClose} className="inline-flex items-center text-xs text-slate-400 hover:text-brand-300 transition-colors font-medium group cursor-pointer">
                View Profile <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
              </NavLink>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
