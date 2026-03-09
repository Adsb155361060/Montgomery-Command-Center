import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { compass } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, DataTable, Pagination } from '@/components/shared';
import { FileText, Filter } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function PermitsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, loading, error, refetch } = useFetch(() => compass.permits({ page, limit: 25, status: status || undefined }), [page, status]);

  if (loading) return <LoadingScreen message="Loading construction permits..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const raw = data as any;
  const items = Array.isArray(raw) ? raw : (raw?.data || raw?.permits || []);
  const pagination = raw?.pagination;
  const totalPages = pagination?.totalPages ?? pagination?.pages ?? 1;

  const columns = [
    { key: 'permitNo', label: 'Permit #', render: (_v: any, r: any) => <span className="font-mono text-xs text-compass-400">{r.permitNo || r.permitNumber || r.id}</span> },
    { key: 'projectType', label: 'Type', render: (_v: any, r: any) => <span className="badge badge-compass text-xs">{r.projectType || r.permitCode || r.type || '-'}</span> },
    { key: 'physicalAddress', label: 'Address', render: (_v: any, r: any) => <span className="text-xs text-slate-300 max-w-[180px] truncate block">{r.physicalAddress || r.address || '-'}</span> },
    { key: 'estimatedCost', label: 'Est. Cost', render: (_v: any, r: any) => <span className="text-xs font-mono text-compass-400">{r.estimatedCost ? formatCurrency(r.estimatedCost) : '-'}</span> },
    { key: 'permitStatus', label: 'Status', render: (_v: any, r: any) => {
      const s = (r.permitStatus || r.status || '').toLowerCase();
      return <span className={`badge text-xs ${s === 'approved' || s === 'issued' || s === 'active' || s === 'finaled' ? 'badge-success' : s === 'pending' || s === 'review' ? 'badge-warning' : s === 'denied' || s === 'revoked' || s === 'expired' ? 'badge-danger' : 'badge-compass'}`}>{r.permitStatus || r.status || '-'}</span>;
    }},
    { key: 'issuedDate', label: 'Issued', render: (_v: any, r: any) => <span className="text-xs text-slate-500">{r.issuedDate || '-'}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Construction Permits" subtitle="Building and development permit database" accentColor="bg-compass-500" icon={<FileText className="w-6 h-6" />}>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-field w-40 text-sm">
            <option value="">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="denied">Denied</option>
            <option value="issued">Issued</option>
          </select>
        </div>
      </ModuleHeader>

      <DataTable columns={columns} data={items} emptyMessage="No construction permits found" />
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
    </div>
  );
}
