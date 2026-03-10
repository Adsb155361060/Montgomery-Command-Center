import { useState, useMemo } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { youthshield } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, FilterBar, useFilters } from '@/components/shared';
import { Building2, School, TreePine, BookOpen, Baby } from 'lucide-react';

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

/** API returns grouped { schools[], communityCenters[], parks[], libraries[], daycares[] }
 *  Flatten into a single array with a consistent `type` field using `resourceType`. */
function flattenResources(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  const out: any[] = [];
  for (const item of (raw.schools || [])) out.push({ ...item, type: item.resourceType || 'school', lat: item.latitude, lng: item.longitude });
  for (const item of (raw.communityCenters || [])) out.push({ ...item, type: item.resourceType || 'community_center', lat: item.latitude, lng: item.longitude });
  for (const item of (raw.parks || [])) out.push({ ...item, type: item.resourceType || 'park', lat: item.latitude, lng: item.longitude });
  for (const item of (raw.libraries || [])) out.push({ ...item, type: item.resourceType || 'library', lat: item.latitude, lng: item.longitude });
  for (const item of (raw.daycares || [])) out.push({ ...item, type: item.resourceType || 'daycare', lat: item.latitude, lng: item.longitude });
  return out;
}

const FILTER_FIELDS = [
  { key: 'search', label: 'Name / Address', type: 'text' as const, placeholder: 'Search by name or address...' },
];

export default function ResourcesPage() {
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const { filters, setFilter, resetFilters } = useFilters({ search: '' }, setPage);

  // Don't send type filter to API — flatten locally instead (API uses different type keys: "center" vs "community_center")
  const { data, loading, error, refetch } = useFetch(() => youthshield.resources({ page, limit: 200 }), [page]);

  if (loading) return <LoadingScreen message="Loading youth resources..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const allResources = useMemo(() => flattenResources(data), [data]);

  const resources = useMemo(() => {
    let filtered = type ? allResources.filter((r: any) => r.type === type) : allResources;
    const search = filters.search.toLowerCase().trim();
    if (search) {
      filtered = filtered.filter((r: any) =>
        (r.name || '').toLowerCase().includes(search) ||
        (r.address || '').toLowerCase().includes(search)
      );
    }
    return filtered;
  }, [allResources, type, filters.search]);

  const summary = (data as any)?.summary;

  const types = ['school', 'community_center', 'park', 'library', 'daycare'];
  const typeCounts: Record<string, number> = {};
  for (const t of types) typeCounts[t] = allResources.filter((r: any) => r.type === t).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Youth Resources" subtitle="Schools, community centers, parks, libraries & daycares serving Montgomery youth" accentColor="bg-youthshield-500" icon={<Building2 className="w-6 h-6" />} />

      <FilterBar filters={FILTER_FIELDS} values={filters} onChange={setFilter} onReset={resetFilters} />

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setType('')} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${!type ? 'text-white bg-youthshield-500/20 border-youthshield-500/40' : 'text-slate-400 bg-slate-800/50 border-slate-700/50 hover:border-slate-600'}`}>
          All ({allResources.length})
        </button>
        {types.map(t => {
          const Icon = typeIcons[t] || Building2;
          return (
            <button key={t} onClick={() => setType(type === t ? '' : t)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${type === t ? typeColors[t] : 'text-slate-400 bg-slate-800/50 border-slate-700/50 hover:border-slate-600'}`}>
              <Icon className="w-3.5 h-3.5" />
              {t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              <span className="bg-slate-700/50 px-1.5 py-0.5 rounded-md">{typeCounts[t]}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {resources.map((r: any) => {
          const Icon = typeIcons[r.type] || Building2;
          const colorClass = typeColors[r.type] || 'text-slate-400 bg-slate-500/10 border-slate-500/20';
          return (
            <div key={`${r.type}-${r.id}`} className="glass-card p-5 hover:border-youthshield-500/20 transition-all duration-300 group">
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-lg border ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-youthshield-300 transition-colors">{r.name}</h3>
                  <p className="text-xs text-slate-500 capitalize">{r.type?.replace('_', ' ')}</p>
                </div>
              </div>
              {r.address && <p className="text-xs text-slate-400 mb-1">📍 {r.address}</p>}
              {r.phone && <p className="text-xs text-slate-400 mb-1">📞 {r.phone}</p>}
              {r.hours && <p className="text-xs text-slate-400 mb-1">🕐 {r.hours} ({r.days})</p>}
              {r.enrollment && <p className="text-xs text-slate-400 mb-1">👥 Enrollment: {r.enrollment}</p>}
              {r.level && <p className="text-xs text-slate-400 mb-1">📚 {r.level}</p>}
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
          <p className="text-slate-400">No resources found{type ? ` for type "${type.replace('_', ' ')}"` : ''}</p>
        </div>
      )}
    </div>
  );
}
