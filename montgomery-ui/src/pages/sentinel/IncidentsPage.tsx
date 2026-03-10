import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { sentinel } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, DataTable, Pagination, ModuleHeader, FilterBar, useFilters } from '@/components/shared';
import { Activity } from 'lucide-react';
import type { FilterField } from '@/components/shared';

const PAGE_SIZE = 25;

const FILTER_FIELDS: FilterField[] = [
  {
    key: 'district',
    label: 'District',
    type: 'text',
    placeholder: 'e.g. 2, 4A, District I...',
  },
  {
    key: 'type',
    label: 'Incident Type',
    type: 'text',
    placeholder: 'Search type...',
  },
  {
    key: 'category',
    label: 'Category',
    type: 'text',
    placeholder: 'Search category...',
  },
];

export default function IncidentsPage() {
  const [page, setPage] = useState(1);
  const { filters, setFilter, resetFilters, filterParams } = useFilters(
    { district: '', type: '', category: '' },
    setPage,
  );

  const { data, loading, error, refetch, raw } = useFetch(
    () => sentinel.incidents({ page, limit: PAGE_SIZE, ...filterParams }),
    [page, filters.district, filters.type, filters.category]
  );

  if (loading) return <LoadingScreen message="Loading incidents..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const rows = Array.isArray(data) ? data : (data as any)?.data || (data as any)?.incidents || [];
  const pagination = (raw as any)?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const totalRecords = pagination?.total;

  return (
    <div className="space-y-4 animate-fade-in">
      <ModuleHeader
        title="Incident Records"
        subtitle="55,000+ fire/rescue incidents with spatial indexing"
        accentColor="bg-sentinel-500"
        icon={<Activity className="w-6 h-6" />}
      />

      <FilterBar
        filters={FILTER_FIELDS}
        values={filters}
        onChange={setFilter}
        onReset={resetFilters}
        accentColor="sentinel"
      />

      <div className="glass-card overflow-hidden">
        <DataTable
          data={rows}
          keyField="id"
          columns={[
            { key: 'incidentNumber', label: 'Incident #', render: v => <span className="font-mono text-xs text-sentinel-400">{String(v || '—')}</span> },
            { key: 'incidentType', label: 'Type', render: v => <span className="badge-sentinel text-xs">{String(v || '—')}</span> },
            { key: 'incidentCategory', label: 'Category' },
            { key: 'address', label: 'Address' },
            { key: 'district', label: 'District', render: v => v ? String(v) : '—' },
            { key: 'shift', label: 'Shift' },
            { key: 'responseTime', label: 'Response', render: v => v ? `${v}s` : '—' },
          ]}
        />
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalRecords={totalRecords} pageSize={PAGE_SIZE} />
    </div>
  );
}
