import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { blight } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, DataTable, Pagination } from '@/components/shared';
import { AlertTriangle, Filter } from 'lucide-react';

export default function NuisancesPage() {
  const [page, setPage] = useState(1);
  const [district, setDistrict] = useState('');
  const { data, loading, error, refetch } = useFetch(() => blight.nuisances({ page, limit: 25, district: district || undefined }), [page, district]);

  if (loading) return <LoadingScreen message="Loading nuisance reports..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const raw = data as any;
  const items = Array.isArray(raw) ? raw : (raw?.data || raw?.nuisances || []);
  const pagination = raw?.pagination;
  const totalPages = pagination?.totalPages ?? pagination?.pages ?? 1;

  const columns = [
    { key: 'offenseNo', label: 'Case #', render: (_v: any, r: any) => <span className="font-mono text-xs text-blight-400">{r.offenseNo || r.caseNumber || r.id}</span> },
    { key: 'type', label: 'Type', render: (_v: any, r: any) => <span className="badge badge-blight text-xs">{r.type || r.nuisanceType || '-'}</span> },
    { key: 'location', label: 'Address', render: (_v: any, r: any) => <span className="text-xs text-slate-300">{r.location || r.address || '-'}</span> },
    { key: 'remark', label: 'Remark', render: (_v: any, r: any) => <span className="text-xs text-slate-300 max-w-[200px] truncate block">{r.remark || '-'}</span> },
    { key: 'district', label: 'District', render: (_v: any, r: any) => <span className="text-xs text-slate-400">{r.district ?? '-'}</span> },
    { key: 'hearingDate', label: 'Hearing', render: (_v: any, r: any) => <span className="text-xs text-slate-500">{r.hearingDate || '-'}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Nuisance Reports" subtitle="Environmental nuisance cases across Montgomery" accentColor="bg-blight-500" icon={<AlertTriangle className="w-6 h-6" />}>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={district} onChange={e => { setDistrict(e.target.value); setPage(1); }} className="input-field w-40 text-sm">
            <option value="">All Districts</option>
            {[1,2,3,4,5,6,7,8,9].map(d => <option key={d} value={d}>District {d}</option>)}
          </select>
        </div>
      </ModuleHeader>

      <DataTable columns={columns} data={items} emptyMessage="No nuisance reports found" />
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
    </div>
  );
}
