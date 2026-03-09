import { useState, useEffect } from 'react';
import { Activity, ChevronDown, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { healthApi } from '../../api/health';
import { geoApi } from '../../api/geo';

interface HeaderProps {
  district: string;
  onDistrictChange: (d: string) => void;
}

export default function Header({ district, onDistrictChange }: HeaderProps) {
  const { user } = useAuth();
  const [health, setHealth] = useState<{ status: string } | null>(null);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [time, setTime] = useState(new Date());
  const [address, setAddress] = useState('');
  const [lookupResult, setLookupResult] = useState<string | null>(null);

  useEffect(() => {
    healthApi.check().then(setHealth).catch(() => setHealth({ status: 'degraded' }));
    geoApi.districts().then(d => setDistricts(d.districts || [])).catch(() => {});
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    try {
      const r = await geoApi.lookup(address);
      setLookupResult(JSON.stringify(r, null, 2));
    } catch {
      setLookupResult('Address not found');
    }
  };

  const roleColor = user?.role === 'EXECUTIVE' ? 'text-amber-400 bg-amber-500/15 border-amber-500/30'
    : user?.role === 'OPERATIONAL' ? 'text-blue-400 bg-blue-500/15 border-blue-500/30'
    : 'text-slate-400 bg-slate-500/15 border-slate-500/30';

  return (
    <div className="h-14 bg-slate-950/90 border-b border-slate-800/50 flex items-center px-4 gap-4 flex-shrink-0">
      {/* City name */}
      <div className="flex-shrink-0">
        <p className="text-white font-bold text-sm leading-none">Montgomery</p>
        <p className="text-slate-500 text-xs">Command Center</p>
      </div>

      <div className="w-px h-6 bg-slate-700" />

      {/* Address lookup */}
      <form onSubmit={handleLookup} className="relative flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={address}
            onChange={e => { setAddress(e.target.value); setLookupResult(null); }}
            placeholder="Address lookup..."
            className="w-48 pl-8 pr-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
          />
        </div>
        {lookupResult && (
          <div className="absolute top-full left-0 mt-1 p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 z-50 max-w-xs max-h-48 overflow-auto shadow-2xl whitespace-pre-wrap">
            {lookupResult}
          </div>
        )}
      </form>

      {/* District filter */}
      <div className="relative flex items-center gap-1">
        <select
          value={district}
          onChange={e => onDistrictChange(e.target.value)}
          className="appearance-none pl-3 pr-8 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-white focus:outline-none focus:border-slate-500 transition-colors cursor-pointer"
        >
          <option value="">All Districts</option>
          {districts.map(d => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      </div>

      <div className="flex-1" />

      {/* Health status */}
      <div className="flex items-center gap-1.5">
        <Activity className={`w-3.5 h-3.5 ${health?.status === 'ok' ? 'text-emerald-400' : 'text-amber-400'}`} />
        <span className="text-xs text-slate-400">{health?.status === 'ok' ? 'All Systems Nominal' : 'Checking...'}</span>
      </div>

      <div className="w-px h-6 bg-slate-700" />

      {/* Time */}
      <p className="text-xs text-slate-400 font-mono flex-shrink-0">
        {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>

      <div className="w-px h-6 bg-slate-700" />

      {/* User */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right">
          <p className="text-xs font-semibold text-white leading-none">{user?.name}</p>
          <p className="text-xs text-slate-500 leading-none mt-0.5">{user?.department || user?.title}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${roleColor}`}>
          {user?.role}
        </span>
      </div>
    </div>
  );
}
