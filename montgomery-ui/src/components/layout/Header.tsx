import { useAuth } from '@/contexts/AuthContext';
import { useBackgroundTasks } from '@/contexts/BackgroundTaskContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Bell, Search, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { user, logout } = useAuth();
  const { tasks } = useBackgroundTasks();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const runningTasks = tasks.filter(t => t.status === 'running');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleBadge: Record<string, string> = {
    EXECUTIVE: 'bg-amber-500/20 text-amber-400',
    OPERATIONAL: 'bg-blight-500/20 text-blight-400',
    CITIZEN: 'bg-compass-500/20 text-compass-400',
  };

  return (
    <header className="h-16 border-b border-slate-800/50 bg-navy-900/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search address, parcel, or incident..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/30 transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim();
                if (val.length >= 3) navigate(`/geo?q=${encodeURIComponent(val)}`);
              }
            }}
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Active background tasks indicator */}
        {runningTasks.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-pulse">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            <span className="text-xs font-medium text-amber-400">
              {runningTasks.length} AI {runningTasks.length === 1 ? 'task' : 'tasks'} running
            </span>
          </div>
        )}

        {/* Notifications bell */}
        <button
          onClick={() => navigate('/alerts')}
          className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-slate-800/50 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center text-white font-semibold text-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-white leading-tight">{user?.name || 'User'}</p>
              <p className="text-[11px] text-slate-500 leading-tight">{user?.title || user?.role}</p>
            </div>
          </button>
          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl z-50 py-2 animate-slide-up">
                <div className="px-4 py-2 border-b border-slate-700/50">
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                  <span className={`badge text-[10px] mt-1 ${roleBadge[user?.role || ''] || ''}`}>
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
