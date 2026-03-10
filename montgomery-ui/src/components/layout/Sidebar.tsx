import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Shield, Users, Building2, Compass,
  MessageSquare, MapPin, ChevronLeft, ChevronRight,
  Target, Clock, FileBarChart, DollarSign,
  AlertTriangle, BookOpen, Search, Zap,
  Home, BarChart3, Factory, FileText,
  Wrench, TrendingUp, Map, Briefcase, Activity,
} from 'lucide-react';
import { useState } from 'react';

const navGroups = [
  {
    label: 'Command',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard', module: null },
      { path: '/alerts', icon: AlertTriangle, label: 'Alerts', module: null },
      { path: '/briefing', icon: FileBarChart, label: 'Executive Briefing', module: null, role: 'EXECUTIVE' as const },
    ],
  },
  {
    label: 'Sentinel MGM',
    color: 'text-sentinel-500',
    items: [
      { path: '/sentinel', icon: Shield, label: 'Overview', module: 'sentinel' },
      { path: '/sentinel/incidents', icon: Activity, label: 'Incidents', module: 'sentinel' },
      { path: '/sentinel/force-multiplier', icon: Target, label: 'Force Multiplier', module: 'sentinel' },
      { path: '/sentinel/deployment', icon: Map, label: 'Deployment', module: 'sentinel' },
      { path: '/sentinel/compliance', icon: FileBarChart, label: 'SB 298 Compliance', module: 'sentinel' },
      { path: '/sentinel/recruitment', icon: DollarSign, label: 'Recruitment ROI', module: 'sentinel' },
    ],
  },
  {
    label: 'YouthShield',
    color: 'text-youthshield-500',
    items: [
      { path: '/youthshield', icon: Users, label: 'Overview', module: 'youthshield' },
      { path: '/youthshield/risk-zones', icon: AlertTriangle, label: 'Risk Zones', module: 'youthshield' },
      { path: '/youthshield/gap-analysis', icon: Clock, label: 'Gap Analysis', module: 'youthshield' },
      { path: '/youthshield/resources', icon: BookOpen, label: 'Resources', module: 'youthshield' },
      { path: '/youthshield/intervention', icon: Zap, label: 'Intervention', module: 'youthshield' },
    ],
  },
  {
    label: 'Blight-to-Bright',
    color: 'text-blight-500',
    items: [
      { path: '/blight', icon: Building2, label: 'Overview', module: 'blight' },
      { path: '/blight/nuisances', icon: Wrench, label: 'Nuisances', module: 'blight' },
      { path: '/blight/violations', icon: FileText, label: 'Violations', module: 'blight' },
      { path: '/blight/properties', icon: Home, label: 'Properties', module: 'blight' },
      { path: '/blight/scores', icon: BarChart3, label: 'Blight Scores', module: 'blight' },
      { path: '/blight/regeneration', icon: TrendingUp, label: 'Regeneration', module: 'blight' },
      { path: '/blight/contagion', icon: Activity, label: 'Contagion', module: 'blight' },
    ],
  },
  {
    label: 'DataCenter Compass',
    color: 'text-compass-500',
    items: [
      { path: '/compass', icon: Compass, label: 'Overview', module: 'compass' },
      { path: '/compass/impact', icon: Factory, label: 'Impact Dashboard', module: 'compass' },
      { path: '/compass/scenario', icon: Search, label: 'What-If Simulator', module: 'compass' },
      { path: '/compass/cba', icon: Briefcase, label: 'CBA Designer', module: 'compass' },
      { path: '/compass/permits', icon: FileText, label: 'Permits', module: 'compass' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { path: '/ai', icon: MessageSquare, label: 'AI Assistant', module: null },
      { path: '/geo', icon: MapPin, label: 'Geo Lookup', module: null },
    ],
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, hasModule, isExecutive } = useAuth();
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-screen bg-navy-900 border-r border-slate-800/50 z-40 flex flex-col transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-800/50 flex-shrink-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center font-display font-bold text-white text-lg flex-shrink-0">
          M
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-display font-bold text-sm text-white leading-tight">Montgomery</h1>
            <p className="text-[10px] text-slate-500 leading-tight">Command Center</p>
          </div>
        )}
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
        {navGroups.map(group => {
          const visibleItems = group.items.filter(item => {
            if ('role' in item && item.role && !isExecutive) return false;
            if ('module' in item && item.module && !hasModule(item.module)) return false;
            return true;
          });
          if (!visibleItems.length) return null;

          return (
            <div key={group.label} className="mb-4" data-tour={group.label}>
              {!collapsed && (
                <p className={cn('text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5', group.color || 'text-slate-600')}>
                  {group.label}
                </p>
              )}
              {visibleItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-slate-800 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    )
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-slate-800/50 p-2 flex-shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800/50 transition-all text-sm"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /> <span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
