import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { blight } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, Pagination, FilterBar, useFilters } from '@/components/shared';
import { Landmark, MapPin, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const PAGE_SIZE = 24;

const FILTER_FIELDS = [
  { key: 'neighborhood', label: 'Neighborhood', type: 'text' as const, placeholder: 'Search neighborhood...' },
  { key: 'address', label: 'Address', type: 'text' as const, placeholder: 'Search address...' },
  { key: 'maintBy', label: 'Maintained By', type: 'text' as const, placeholder: 'e.g. Parks, Streets...' },
];

export default function PropertiesPage() {
  const [page, setPage] = useState(1);
  const { filters, setFilter, resetFilters, filterParams } = useFilters({ neighborhood: '', address: '', maintBy: '' }, setPage);

  const { data, loading, error, refetch, raw } = useFetch(
    () => blight.properties({ page, limit: PAGE_SIZE, ...filterParams }),
    [page, filterParams]
  );

  if (loading) return <LoadingScreen message="Loading city properties..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const items = Array.isArray(data) ? data : [];
  const pagination = (raw as any)?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const totalRecords = pagination?.total;

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="City-Owned Properties" subtitle="Municipal property assets with regeneration potential" accentColor="bg-blight-500" icon={<Landmark className="w-6 h-6" />} />

      <FilterBar filters={FILTER_FIELDS} values={filters} onChange={setFilter} onReset={resetFilters} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((p: any) => {
          const addr = p.propAddress || [p.streetNum, p.streetName].filter(Boolean).join(' ') || p.address;
          const label = p.owner || addr || 'City Property';
          const typeLabel = p.useType || p.zoning || p.devArea || 'Municipal';
          return (
            <div key={p.id} className="glass-card p-5 hover:border-blight-500/30 transition-all duration-300 group">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blight-500/10 border border-blight-500/20">
                  <Landmark className="w-4 h-4 text-blight-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-blight-300 transition-colors">{label}</h3>
                  <p className="text-xs text-slate-500">{typeLabel}</p>
                </div>
              </div>
              {addr && (
                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{addr}</p>
                </div>
              )}
              {p.neighborhood && <p className="text-[10px] text-slate-500 mb-1">Neighborhood: {p.neighborhood}</p>}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/30">
                {p.appraisedVal ? (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-compass-500" />
                    <span className="text-xs font-mono text-compass-400">{formatCurrency(p.appraisedVal)}</span>
                  </div>
                ) : <span className="text-[10px] text-slate-600">No appraisal</span>}
                {p.maintBy && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400">{p.maintBy}</span>}
              </div>
              {p.calcAcre != null && <p className="text-[10px] text-slate-500 mt-2">{p.calcAcre} acres</p>}
            </div>
          );
        })}
      </div>

      {!items.length && (
        <div className="glass-card p-12 text-center">
          <Landmark className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No city-owned properties found</p>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalRecords={totalRecords} pageSize={PAGE_SIZE} />
    </div>
  );
}
