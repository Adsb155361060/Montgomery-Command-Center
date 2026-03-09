import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { sentinel } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, DataTable, Pagination, ModuleHeader } from '@/components/shared';
import { Activity } from 'lucide-react';

export default function IncidentsPage() {
  const [page, setPage] = useState(1);
  const [district, setDistrict] = useState('');
  const [type, setType] = useState('');
  const { data, loading, error, refetch } = useFetch(
    () => sentinel.incidents({ page, limit: 25, district: district || undefined, type: type || undefined }),
    [page, district, type]
  );

  if (loading) return <LoadingScreen message="Loading incidents..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const raw = data as any;
  const rows = Array.isArray(raw) ? raw : (raw?.data || raw?.incidents || []);
  const pagination = raw?.pagination;
  const totalPages = pagination?.totalPages ?? pagination?.pages ?? 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader
        title="Incident Records"
        subtitle="55,000+ fire/rescue incidents with spatial indexing"
        accentColor="bg-sentinel-500"
        icon={<Activity className="w-6 h-6" />}
      >
        <select value={district} onChange={e => { setDistrict(e.target.value); setPage(1); }} className="input-field w-auto text-sm">
          <option value="">All Districts</option>
          {[1,2,3,4,5,6,7,8,9].map(d => <option key={d} value={String(d)}>District {d}</option>)}
        </select>
        <input
          type="text"
          value={type}
          onChange={e => { setType(e.target.value); setPage(1); }}
          placeholder="Filter by type..."
          className="input-field w-auto text-sm"
        />
      </ModuleHeader>

      <div className="glass-card overflow-hidden">
        <DataTable
          data={rows}
          keyField="id"
          columns={[
            { key: 'incidentNumber', label: 'Incident #', render: v => <span className="font-mono text-xs text-sentinel-400">{String(v || '—')}</span> },
            { key: 'incidentType', label: 'Type', render: v => <span className="badge-sentinel text-xs">{String(v || '—')}</span> },
            { key: 'incidentCategory', label: 'Category' },
            { key: 'address', label: 'Address' },
            { key: 'district', label: 'District', render: v => v ? `District ${v}` : '—' },
            { key: 'responseTime', label: 'Response', render: v => v ? String(v) : '—' },
          ]}
        />
      </div>

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
    </div>
  );
}
