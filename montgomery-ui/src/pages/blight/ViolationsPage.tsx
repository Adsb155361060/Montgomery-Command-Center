import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { blight } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, DataTable, Pagination } from '@/components/shared';
import { FileWarning, Filter } from 'lucide-react';

export default function ViolationsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, loading, error, refetch } = useFetch(() => blight.violations({ page, limit: 25, status: status || undefined }), [page, status]);

  if (loading) return <LoadingScreen message="Loading code violations..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const raw = data as any;
  const items = Array.isArray(raw) ? raw : (raw?.data || raw?.violations || []);
  const pagination = raw?.pagination;
  const totalPages = pagination?.totalPages ?? pagination?.pages ?? 1;

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
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Code Violations" subtitle="Building and property code violations database" accentColor="bg-blight-500" icon={<FileWarning className="w-6 h-6" />}>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-field w-40 text-sm">
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>
      </ModuleHeader>

      <DataTable columns={columns} data={items} emptyMessage="No code violations found" />
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
    </div>
  );
}
