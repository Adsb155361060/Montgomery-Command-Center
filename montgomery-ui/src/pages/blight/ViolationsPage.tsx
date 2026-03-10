import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { blight } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, DataTable, Pagination, FilterBar, useFilters } from '@/components/shared';
import { FileWarning } from 'lucide-react';
import type { FilterField } from '@/components/shared';

const PAGE_SIZE = 25;

const FILTER_FIELDS: FilterField[] = [
  { key: 'district', label: 'District', type: 'text', placeholder: 'Search district...' },
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
    { value: 'in_progress', label: 'In Progress' },
  ]},
  { key: 'caseType', label: 'Violation Type', type: 'text', placeholder: 'Search type...' },
  { key: 'address', label: 'Address', type: 'text', placeholder: 'Search address...' },
];

export default function ViolationsPage() {
  const [page, setPage] = useState(1);
  const { filters, setFilter, resetFilters, filterParams } = useFilters(
    { district: '', status: '', caseType: '', address: '' },
    setPage,
  );

  const { data, loading, error, refetch, raw } = useFetch(
    () => blight.violations({ page, limit: PAGE_SIZE, ...filterParams }),
    [page, filters.district, filters.status, filters.caseType, filters.address]
  );

  if (loading) return <LoadingScreen message="Loading code violations..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const items = Array.isArray(data) ? data : (data as any)?.data || (data as any)?.violations || [];
  const pagination = (raw as any)?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const totalRecords = pagination?.total;

  const columns = [
    { key: 'offenseNum', label: 'Case #', render: (_v: any, r: any) => <span className="font-mono text-xs text-blight-400">{r.offenseNum || r.caseNumber || r.id}</span> },
    { key: 'caseType', label: 'Violation', render: (_v: any, r: any) => <span className="text-xs text-slate-300 max-w-[200px] truncate block">{r.caseType || r.violationType || r.type || '-'}</span> },
    { key: 'address', label: 'Address', render: (_v: any, r: any) => <span className="text-xs text-slate-300">{r.address || '-'}</span> },
    { key: 'caseStatus', label: 'Status', render: (_v: any, r: any) => {
      const s = (r.caseStatus || r.status || '').toLowerCase();
      return <span className={`badge text-xs ${s === 'open' || s === 'active' ? 'badge-warning' : s === 'closed' || s === 'resolved' || s === 'compliant' ? 'badge-success' : 'badge-blight'}`}>{r.caseStatus || r.status || '-'}</span>;
    }},
    { key: 'councilDistrict', label: 'District', render: (_v: any, r: any) => <span className="text-xs text-slate-400">{r.councilDistrict ?? r.district ?? '-'}</span> },
    { key: 'caseDate', label: 'Date', render: (_v: any, r: any) => <span className="text-xs text-slate-500">{r.caseDate || '-'}</span> },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <ModuleHeader title="Code Violations" subtitle="Building and property code violations database" accentColor="bg-blight-500" icon={<FileWarning className="w-6 h-6" />} />

      <FilterBar filters={FILTER_FIELDS} values={filters} onChange={setFilter} onReset={resetFilters} accentColor="blight" />

      <div className="glass-card overflow-hidden">
        <DataTable columns={columns} data={items} emptyMessage="No code violations found" />
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalRecords={totalRecords} pageSize={PAGE_SIZE} />
    </div>
  );
}
