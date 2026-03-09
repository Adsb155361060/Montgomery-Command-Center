import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { youthshield } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, Pagination } from '@/components/shared';
import { Building2, School, TreePine, BookOpen, Baby, Filter } from 'lucide-react';

const typeIcons: Record<string, any> = {
  school: School,
  community_center: Building2,
  park: TreePine,
  library: BookOpen,
  daycare: Baby,
};

const typeColors: Record<string, string> = {
  school: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  community_center: 'text-youthshield-400 bg-youthshield-500/10 border-youthshield-500/20',
  park: 'text-compass-400 bg-compass-500/10 border-compass-500/20',
  library: 'text-blight-400 bg-blight-500/10 border-blight-500/20',
  daycare: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
};

export default function ResourcesPage() {
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useFetch(() => youthshield.resources({ type: type || undefined, page, limit: 30 }), [type, page]);

  if (loading) return <LoadingScreen message="Loading youth resources..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const resources = Array.isArray(data) ? data : (data as any)?.data || [];
  const meta = (data as any)?.meta;

  const types = ['school', 'community_center', 'park', 'library', 'daycare'];

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Youth Resources" subtitle="Schools, community centers, parks, libraries & daycares serving Montgomery youth" accentColor="bg-youthshield-500" icon={<Building2 className="w-6 h-6" />}>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className="input-field w-48 text-sm">
            <option value="">All Types</option>
            {types.map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
          </select>
        </div>
      </ModuleHeader>

      <div className="flex gap-2 flex-wrap">
        {types.map(t => {
          const Icon = typeIcons[t] || Building2;
          const count = resources.filter((r: any) => r.type === t).length;
          return (
            <button key={t} onClick={() => { setType(type === t ? '' : t); setPage(1); }} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${type === t ? typeColors[t] : 'text-slate-400 bg-slate-800/50 border-slate-700/50 hover:border-slate-600'}`}>
              <Icon className="w-3.5 h-3.5" />
              {t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              {count > 0 && <span className="bg-slate-700/50 px-1.5 py-0.5 rounded-md">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {resources.map((r: any) => {
          const Icon = typeIcons[r.type] || Building2;
          const colorClass = typeColors[r.type] || 'text-slate-400 bg-slate-500/10 border-slate-500/20';
          return (
            <div key={r.id} className="glass-card p-5 hover:border-youthshield-500/20 transition-all duration-300 group">
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-lg border ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate group-hover:text-youthshield-300 transition-colors">{r.name}</h3>
                  <p className="text-xs text-slate-500 capitalize">{r.type?.replace('_', ' ')}</p>
                </div>
              </div>
              {r.address && <p className="text-xs text-slate-400 mb-2">📍 {r.address}</p>}
              {r.phone && <p className="text-xs text-slate-400 mb-2">📞 {r.phone}</p>}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/30">
                {r.district && <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">District {r.district}</span>}
                {(r.lat && r.lng) && <span className="text-[10px] text-slate-600 font-mono">{Number(r.lat).toFixed(3)}, {Number(r.lng).toFixed(3)}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {!resources.length && (
        <div className="glass-card p-12 text-center">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No resources found{type ? ` for type "${type}"` : ''}</p>
        </div>
      )}

      {meta && <Pagination page={page} totalPages={meta.pages} onPageChange={setPage} />}
    </div>
  );
}
