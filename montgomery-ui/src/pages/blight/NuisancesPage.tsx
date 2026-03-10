import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { blight } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, DataTable, Pagination, FilterBar, useFilters } from '@/components/shared';
import { AlertTriangle } from 'lucide-react';

const PAGE_SIZE = 25;

const FILTER_FIELDS = [
  { key: 'district', label: 'District', type: 'text' as const, placeholder: 'e.g. 2, 4A...' },
  { key: 'type', label: 'Type', type: 'text' as const, placeholder: 'e.g. weeds, junk...' },
  { key: 'location', label: 'Location', type: 'text' as const, placeholder: 'Search address...' },
];

export default function NuisancesPage() {
  const [page, setPage] = useState(1);
  const { filters, setFilter, resetFilters, filterParams } = useFilters({ district: '', type: '', location: '' }, setPage);

  const { data, loading, error, refetch, raw } = useFetch(
    () => blight.nuisances({ page, limit: PAGE_SIZE, ...filterParams }),
    [page, filterParams]
  );

  if (loading) return <LoadingScreen message="Loading nuisance reports..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const items = Array.isArray(data) ? data : [];
  const pagination = (raw as any)?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const totalRecords = pagination?.total;

  const columns = [
    { key: 'offenseNo', label: 'Case #', render: (_v: any, r: any) => <span className="font-mono text-xs text-blight-400">{r.offenseNo || r.caseNumber || r.id}</span> },
    { key: 'type', label: 'Type', render: (_v: any, r: any) => <span className="badge badge-blight text-xs">{r.type || r.nuisanceType || '-'}</span> },
    { key: 'location', label: 'Address', render: (_v: any, r: any) => <span className="text-xs text-slate-600 dark:text-slate-300">{r.location || r.address || '-'}</span> },
    { key: 'remark', label: 'Remark', render: (_v: any, r: any) => <span className="text-xs text-slate-600 dark:text-slate-300 max-w-[200px] truncate block">{r.remark || '-'}</span> },
    { key: 'district', label: 'District', render: (_v: any, r: any) => <span className="text-xs text-slate-500 dark:text-slate-400">{r.district ?? '-'}</span> },
    { key: 'hearingDate', label: 'Hearing', render: (_v: any, r: any) => <span className="text-xs text-slate-500">{r.hearingDate || '-'}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Nuisance Reports" subtitle="Environmental nuisance cases across Montgomery" accentColor="bg-blight-500" icon={<AlertTriangle className="w-6 h-6" />} />

      <FilterBar filters={FILTER_FIELDS} values={filters} onChange={setFilter} onReset={resetFilters} />

      <DataTable columns={columns} data={items} emptyMessage="No nuisance reports found" />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalRecords={totalRecords} pageSize={PAGE_SIZE} />
    </div>
  );
}
