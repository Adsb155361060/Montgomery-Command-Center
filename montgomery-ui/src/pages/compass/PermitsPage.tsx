import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { compass } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, DataTable, Pagination, FilterBar, useFilters } from '@/components/shared';
import { FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const PAGE_SIZE = 25;

const FILTER_FIELDS = [
  { key: 'district', label: 'District', type: 'text' as const, placeholder: 'e.g. 2, 4A...' },
  { key: 'status', label: 'Status', type: 'select' as const, options: [
    { value: 'approved', label: 'Approved' },
    { value: 'pending', label: 'Pending' },
    { value: 'denied', label: 'Denied' },
    { value: 'issued', label: 'Issued' },
    { value: 'finaled', label: 'Finaled' },
  ]},
  { key: 'address', label: 'Address', type: 'text' as const, placeholder: 'Search address...' },
];

export default function PermitsPage() {
  const [page, setPage] = useState(1);
  const { filters, setFilter, resetFilters, filterParams } = useFilters({ district: '', status: '', address: '' }, setPage);

  const { data, loading, error, refetch, raw } = useFetch(
    () => compass.permits({ page, limit: PAGE_SIZE, ...filterParams }),
    [page, filterParams]
  );

  if (loading) return <LoadingScreen message="Loading construction permits..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const items = Array.isArray(data) ? data : [];
  const pagination = (raw as any)?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const totalRecords = pagination?.total;

  const columns = [
    { key: 'permitNo', label: 'Permit #', render: (_v: any, r: any) => <span className="font-mono text-xs text-compass-400">{r.permitNo || r.permitNumber || r.id}</span> },
    { key: 'projectType', label: 'Type', render: (_v: any, r: any) => <span className="badge badge-compass text-xs">{r.projectType || r.permitCode || r.type || '-'}</span> },
    { key: 'physicalAddress', label: 'Address', render: (_v: any, r: any) => <span className="text-xs text-slate-600 dark:text-slate-300 max-w-[180px] truncate block">{r.physicalAddress || r.address || '-'}</span> },
    { key: 'estimatedCost', label: 'Est. Cost', render: (_v: any, r: any) => <span className="text-xs font-mono text-compass-400">{r.estimatedCost ? formatCurrency(r.estimatedCost) : '-'}</span> },
    { key: 'permitStatus', label: 'Status', render: (_v: any, r: any) => {
      const s = (r.permitStatus || r.status || '').toLowerCase();
      return <span className={`badge text-xs ${s === 'approved' || s === 'issued' || s === 'active' || s === 'finaled' ? 'badge-success' : s === 'pending' || s === 'review' ? 'badge-warning' : s === 'denied' || s === 'revoked' || s === 'expired' ? 'badge-danger' : 'badge-compass'}`}>{r.permitStatus || r.status || '-'}</span>;
    }},
    { key: 'issuedDate', label: 'Issued', render: (_v: any, r: any) => <span className="text-xs text-slate-500">{r.issuedDate || '-'}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Construction Permits" subtitle="Building and development permit database" accentColor="bg-compass-500" icon={<FileText className="w-6 h-6" />} />

      <FilterBar filters={FILTER_FIELDS} values={filters} onChange={setFilter} onReset={resetFilters} />

      <DataTable columns={columns} data={items} emptyMessage="No construction permits found" />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalRecords={totalRecords} pageSize={PAGE_SIZE} />
    </div>
  );
}
