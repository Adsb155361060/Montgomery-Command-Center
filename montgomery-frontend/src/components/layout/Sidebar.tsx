import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Shield, Users, Building2, TrendingUp,
  MessageSquare, Settings, LogOut
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Command', color: 'text-amber-400', activeColor: 'bg-amber-500/20 border-amber-500/40' },
  { to: '/sentinel', icon: Shield, label: 'Sentinel', color: 'text-red-400', activeColor: 'bg-red-500/20 border-red-500/40' },
  { to: '/youthshield', icon: Users, label: 'YouthShield', color: 'text-purple-400', activeColor: 'bg-purple-500/20 border-purple-500/40' },
  { to: '/blight', icon: Building2, label: 'Blight', color: 'text-blue-400', activeColor: 'bg-blue-500/20 border-blue-500/40' },
  { to: '/compass', icon: TrendingUp, label: 'Compass', color: 'text-emerald-400', activeColor: 'bg-emerald-500/20 border-emerald-500/40' },
  { to: '/ai-chat', icon: MessageSquare, label: 'AI Chat', color: 'text-cyan-400', activeColor: 'bg-cyan-500/20 border-cyan-500/40' },
  { to: '/settings', icon: Settings, label: 'Settings', color: 'text-slate-400', activeColor: 'bg-slate-500/20 border-slate-500/40' },
];

export default function Sidebar() {
  const { logout, user } = useAuth();

  return (
    <div className="w-16 flex flex-col h-full bg-slate-950 border-r border-slate-800/50 py-3">
      {/* Logo */}
      <div className="flex items-center justify-center w-full mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #f59e0b, #b45309)'}}>
          <Shield className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 px-2">
        {navItems.map(({ to, icon: Icon, label, color, activeColor }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative flex items-center justify-center w-full h-10 rounded-xl transition-all group border ${
                isActive ? activeColor : 'border-transparent hover:bg-slate-800/50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 transition-colors ${isActive ? color : 'text-slate-500 group-hover:text-slate-300'}`} />
                {/* Tooltip */}
                <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-xs font-medium text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-slate-700">
                  {label}
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 space-y-1">
        <div className="flex items-center justify-center w-full h-10 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <span className="text-xs font-bold text-amber-400">{user?.name?.charAt(0) ?? 'U'}</span>
          </div>
        </div>
        <button
          onClick={logout}
          className="relative flex items-center justify-center w-full h-10 rounded-xl border border-transparent hover:bg-red-500/10 hover:border-red-500/30 transition-all group"
        >
          <LogOut className="w-5 h-5 text-slate-500 group-hover:text-red-400 transition-colors" />
          <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-xs font-medium text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-slate-700">
            Sign Out
          </div>
        </button>
      </div>
    </div>
  );
}
