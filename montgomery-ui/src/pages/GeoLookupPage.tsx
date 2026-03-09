import { useState } from 'react';
import { useAction, useFetch } from '@/hooks/useFetch';
import { geo } from '@/lib/api';
import { ModuleHeader, StatCard } from '@/components/shared';
import { MapPin, Search, RefreshCw, Building, Shield, Users, TreePine } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export default function GeoLookupPage() {
  const [searchParams] = useSearchParams();
  const [address, setAddress] = useState(searchParams.get('q') || '');
  const action = useAction(geo.lookup);
  const { data: districts } = useFetch(geo.districts);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    action.execute({ address });
  };

  const d = action.data as any;
  const districtList = Array.isArray(districts) ? districts : (districts as any)?.data || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Geo Intelligence" subtitle="Cross-module geographic data lookup for any Montgomery address" accentColor="bg-gradient-to-r from-cyan-500 to-blue-500" icon={<MapPin className="w-6 h-6" />} />

      <form onSubmit={handleSearch} className="glass-card p-6">
        <label className="block text-xs text-slate-400 mb-2">Search Address</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter a Montgomery address..." className="input-field w-full pl-10 text-sm" autoFocus />
          </div>
          <button type="submit" disabled={action.loading} className="btn-primary flex items-center gap-2 px-6">
            {action.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Lookup
          </button>
        </div>
      </form>

      {action.error && (
        <div className="glass-card p-4 border-l-4 border-l-red-500 bg-red-500/5">
          <p className="text-sm text-red-400">{action.error}</p>
        </div>
      )}

      {d && (
        <div className="space-y-6 animate-slide-up">
          <div className="glass-card p-6 border-l-4 border-l-cyan-500">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-white">{d.address || address}</h3>
                {d.district && <p className="text-sm text-slate-400 mt-1">Council District {d.district}</p>}
                {(d.lat && d.lng) && <p className="text-xs text-slate-500 font-mono mt-1">{Number(d.lat).toFixed(5)}, {Number(d.lng).toFixed(5)}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {d.sentinel && <StatCard label="Safety Score" value={d.sentinel.safetyScore ?? '-'} icon={<Shield className="w-4 h-4" />} color="text-sentinel-400" />}
            {d.youthshield && <StatCard label="Youth Risk" value={d.youthshield.riskLevel ?? '-'} icon={<Users className="w-4 h-4" />} color="text-youthshield-400" />}
            {d.blight && <StatCard label="Blight Score" value={d.blight.blightScore ?? '-'} icon={<Building className="w-4 h-4" />} color="text-blight-400" />}
            {d.compass && <StatCard label="Econ Activity" value={d.compass.economicActivity ?? '-'} icon={<TreePine className="w-4 h-4" />} color="text-compass-400" />}
          </div>

          {d.sentinel && (
            <div className="glass-card p-6 border-l-4 border-l-sentinel-500">
              <h3 className="text-sm font-semibold text-sentinel-300 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Sentinel MGM
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(d.sentinel).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-lg font-bold font-mono text-sentinel-400">{String(v)}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.youthshield && (
            <div className="glass-card p-6 border-l-4 border-l-youthshield-500">
              <h3 className="text-sm font-semibold text-youthshield-300 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> YouthShield
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(d.youthshield).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-lg font-bold font-mono text-youthshield-400">{String(v)}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.blight && (
            <div className="glass-card p-6 border-l-4 border-l-blight-500">
              <h3 className="text-sm font-semibold text-blight-300 mb-3 flex items-center gap-2">
                <Building className="w-4 h-4" /> Blight-to-Bright
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(d.blight).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-lg font-bold font-mono text-blight-400">{String(v)}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.compass && (
            <div className="glass-card p-6 border-l-4 border-l-compass-500">
              <h3 className="text-sm font-semibold text-compass-300 mb-3 flex items-center gap-2">
                <TreePine className="w-4 h-4" /> DataCenter Compass
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(d.compass).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-lg font-bold font-mono text-compass-400">{String(v)}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.nearby && Array.isArray(d.nearby) && d.nearby.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Nearby Points of Interest</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {d.nearby.map((poi: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                    <MapPin className="w-4 h-4 text-cyan-500/50 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-300 truncate">{poi.name}</p>
                      <p className="text-[10px] text-slate-500">{poi.type} · {poi.distance}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!d && !action.loading && districtList.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Council Districts</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {districtList.map((dist: any) => (
              <div key={dist.id || dist.district} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                <p className="text-sm font-semibold text-cyan-400">District {dist.district || dist.id}</p>
                {dist.council_member && <p className="text-xs text-slate-400 mt-1">{dist.council_member}</p>}
                {dist.population && <p className="text-[10px] text-slate-500">{dist.population.toLocaleString()} residents</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!d && !action.loading && districtList.length === 0 && (
        <div className="glass-card p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4">
            <MapPin className="w-10 h-10 text-cyan-500/30" />
          </div>
          <h3 className="text-lg font-semibold text-slate-400 mb-1">Geographic Intelligence</h3>
          <p className="text-sm text-slate-500 max-w-sm">Enter any Montgomery address to get cross-module data including safety scores, blight data, youth resources, and economic indicators.</p>
        </div>
      )}
    </div>
  );
}
