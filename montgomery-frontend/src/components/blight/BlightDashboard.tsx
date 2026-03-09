import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { Building2, AlertTriangle, FileText, Loader2, Zap, RefreshCw, ChevronRight, Search } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { blightApi } from '../../api/blight';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../api/client';
import KPICard from '../shared/KPICard';
import { SkeletonCard, SkeletonTable } from '../shared/LoadingSkeleton';
import Pagination from '../shared/Pagination';
import Badge, { severityColor } from '../shared/Badge';

interface OutletCtx { district: string }

const TABS = ['Overview', 'Blight Scores', 'Regeneration', 'Contagion', 'Nuisances', 'Violations', 'Properties'];
const STATUS_COLORS: Record<string, string> = { open: '#ef4444', closed: '#10b981', pending: '#f59e0b' };

function ScoreBar({ score }: { score: number }) {
  const color = score > 70 ? '#ef4444' : score > 40 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-mono w-8 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

export default function BlightDashboard() {
  const { district } = useOutletContext<OutletCtx>();
  const { success, error: toastError } = useToast();
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [scores, setScores] = useState<Record<string, unknown>[]>([]);
  const [scoresPagination, setScoresPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [nuisances, setNuisances] = useState<Record<string, unknown>[]>([]);
  const [nuisancePagination, setNuisancePagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [violations, setViolations] = useState<Record<string, unknown>[]>([]);
  const [violationPagination, setViolationPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [properties, setProperties] = useState<Record<string, unknown>[]>([]);
  const [propPagination, setPropPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [scoresPage, setScoresPage] = useState(1);
  const [nuisancePage, setNuisancePage] = useState(1);
  const [violationPage, setViolationPage] = useState(1);
  const [propPage, setPropPage] = useState(1);

  const [violationStatus, setViolationStatus] = useState('');
  const [minScore, setMinScore] = useState(0);

  // Regeneration
  const [regenParcel, setRegenParcel] = useState('');
  const [regenDistrict, setRegenDistrict] = useState('');
  const [regenCount, setRegenCount] = useState(5);
  const [regenResult, setRegenResult] = useState<Record<string, unknown>[] | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  // Contagion
  const [contagionParcel, setContagionParcel] = useState('');
  const [contagionDistrict, setContagionDistrict] = useState('');
  const [contagionResult, setContagionResult] = useState<Record<string, unknown> | null>(null);
  const [tracking, setTracking] = useState(false);

  const [scoringParcels, setScoringParcels] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [s, sc, n, v, p] = await Promise.allSettled([
      blightApi.stats(),
      blightApi.scores({ district: district || undefined }),
      blightApi.nuisances({ district: district || undefined }),
      blightApi.violations({ district: district || undefined }),
      blightApi.properties(),
    ]);
    if (s.status === 'fulfilled') setStats(s.value);
    if (sc.status === 'fulfilled') { setScores(sc.value.scores || []); if (sc.value.pagination) setScoresPagination(sc.value.pagination); }
    if (n.status === 'fulfilled') { setNuisances(n.value.nuisances || []); if (n.value.pagination) setNuisancePagination(n.value.pagination); }
    if (v.status === 'fulfilled') { setViolations(v.value.violations || []); if (v.value.pagination) setViolationPagination(v.value.pagination); }
    if (p.status === 'fulfilled') { setProperties(p.value.properties || []); if (p.value.pagination) setPropPagination(p.value.pagination); }
    setLoading(false);
  }, [district]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRegeneration = async () => {
    setRegenerating(true);
    try {
      const r = await blightApi.regeneration({ parcelNo: regenParcel || undefined, district: regenDistrict || undefined, count: regenCount });
      setRegenResult(r.blueprints || [r]);
      success('Blueprints Generated', 'AI regeneration plan ready');
    } catch (e) { toastError('Regeneration failed', getErrorMessage(e)); }
    finally { setRegenerating(false); }
  };

  const handleContagion = async () => {
    setTracking(true);
    try {
      const r = await blightApi.contagion({ parcelNo: contagionParcel || undefined, district: contagionDistrict || undefined });
      setContagionResult(r);
      success('Contagion Analysis Complete', 'Blight spread mapped');
    } catch (e) { toastError('Contagion analysis failed', getErrorMessage(e)); }
    finally { setTracking(false); }
  };

  const handleScoreParcels = async () => {
    setScoringParcels(true);
    try {
      const r = await blightApi.scoreParcels();
      success('Parcels Scored', r.message || 'AI scoring complete');
      const sc = await blightApi.scores({ district: district || undefined });
      setScores(sc.scores || []);
    } catch (e) { toastError('Scoring failed', getErrorMessage(e)); }
    finally { setScoringParcels(false); }
  };

  const totals = (stats?.totals as Record<string, number>) || {};
  const kpis = [
    { label: 'Nuisance Complaints', value: totals.nuisances || 0, icon: AlertTriangle, color: 'text-blue-400', bgColor: 'bg-blue-500/15', borderColor: 'border-blue-500/20' },
    { label: 'Code Violations', value: totals.codeViolations || 0, icon: FileText, color: 'text-red-400', bgColor: 'bg-red-500/15', borderColor: 'border-red-500/20' },
    { label: 'City-Owned Properties', value: totals.cityOwnedProperties || 0, icon: Building2, color: 'text-blue-400', bgColor: 'bg-blue-500/15', borderColor: 'border-blue-500/20' },
    { label: '311 Service Requests', value: totals.serviceRequests311 || 0, icon: FileText, color: 'text-amber-400', bgColor: 'bg-amber-500/15', borderColor: 'border-amber-500/20' },
  ];

  const violationsByStatus = (stats?.violationsByStatus as { status: string; count: number }[]) || [];
  const nuisanceByDistrict = (stats?.nuisanceByDistrict as { district: string; count: number }[]) || [];

  return (
    <div className="space-y-6 animate-slide-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Blight-to-Bright 2.0</h1>
            <p className="text-slate-400 text-sm">Urban Regeneration Intelligence</p>
          </div>
        </div>
        <button onClick={fetchAll} className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {loading ? Array.from({length:4}).map((_,i)=><SkeletonCard key={i}/>) :
          kpis.map((k,i)=>(
            <motion.div key={k.label} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}>
              <KPICard {...k} />
            </motion.div>
          ))
        }
      </div>

      <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab===t ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="glass rounded-2xl border border-slate-700/50 p-5">
            <h3 className="font-semibold text-white mb-4 text-sm">Violations by Status</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={violationsByStatus} cx="50%" cy="50%" outerRadius={75} dataKey="count" nameKey="status" label={false} labelLine={false}>
                  {violationsByStatus.map((s, i) => (
                    <Cell key={i} fill={STATUS_COLORS[s.status?.toLowerCase()] || '#6366f1'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:'12px',color:'#f1f5f9',fontSize:'12px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="glass rounded-2xl border border-slate-700/50 p-5">
            <h3 className="font-semibold text-white mb-4 text-sm">Nuisances by District</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={nuisanceByDistrict} layout="vertical">
                <XAxis type="number" tick={{fontSize:10,fill:'#94a3b8'}} />
                <YAxis dataKey="district" type="category" tick={{fontSize:10,fill:'#94a3b8'}} width={80} />
                <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:'12px',color:'#f1f5f9',fontSize:'12px'}} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'Blight Scores' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400">Min Score: <span className="text-white font-bold">{minScore}</span></label>
              <input type="range" min={0} max={100} value={minScore} onChange={e => setMinScore(+e.target.value)} className="w-32 accent-blue-500" />
              <button onClick={() => blightApi.scores({ district: district||undefined, minScore }).then(r => { setScores(r.scores||[]); if(r.pagination) setScoresPagination(r.pagination); })}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium text-white transition-colors">Filter</button>
            </div>
            <button onClick={handleScoreParcels} disabled={scoringParcels}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition-all disabled:opacity-50">
              {scoringParcels ? <><Loader2 className="w-3 h-3 animate-spin"/>Scoring...</> : <><Zap className="w-3 h-3"/>AI Score Parcels</>}
            </button>
          </div>
          <div className="glass rounded-2xl border border-slate-700/50 overflow-hidden">
            {loading ? <SkeletonTable /> : (
              <>
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/60">
                      <tr>{['Parcel #','Address','District','Blight Score','Violations','Nuisances','Lien Status'].map(h=>(
                        <th key={h} className="text-left text-xs font-semibold text-slate-400 px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {scores.map(s=>(
                        <tr key={s.id as string} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono text-slate-400">{s.parcelNo as string||'—'}</td>
                          <td className="px-4 py-3 text-xs text-white truncate max-w-36">{s.address as string||'—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{s.district as string||'—'}</td>
                          <td className="px-4 py-3 w-36"><ScoreBar score={s.blightScore as number||0} /></td>
                          <td className="px-4 py-3 text-xs text-slate-300">{s.violationCount as number||0}</td>
                          <td className="px-4 py-3 text-xs text-slate-300">{s.nuisanceCount as number||0}</td>
                          <td className="px-4 py-3"><Badge label={(s.lienStatus as string)||'None'} color={s.lienStatus ? 'red' : 'slate'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={scoresPage} totalPages={scoresPagination.totalPages} total={scoresPagination.total} limit={50}
                  onPageChange={p => { setScoresPage(p); blightApi.scores({ district: district||undefined, page: p, minScore }).then(r => { setScores(r.scores||[]); if(r.pagination) setScoresPagination(r.pagination); }); }} />
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'Regeneration' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="glass rounded-2xl border border-slate-700/50 p-6 space-y-4">
            <h3 className="font-semibold text-white">Regeneration Blueprint Generator</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Parcel Number</label>
                <input value={regenParcel} onChange={e => setRegenParcel(e.target.value)} placeholder="Optional"
                  className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">District</label>
                <input value={regenDistrict} onChange={e => setRegenDistrict(e.target.value)} placeholder="Optional"
                  className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Number of Blueprints: <span className="text-white font-bold">{regenCount}</span></label>
              <input type="range" min={1} max={10} value={regenCount} onChange={e => setRegenCount(+e.target.value)} className="w-full accent-blue-500" />
            </div>
            <button onClick={handleRegeneration} disabled={regenerating}
              className="w-full py-2.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{background:'linear-gradient(135deg,#3b82f6,#1d4ed8)'}}>
              {regenerating ? <><Loader2 className="w-4 h-4 animate-spin"/>Generating...</> : <><Zap className="w-4 h-4"/>Generate Blueprints</>}
            </button>
          </div>
          <div className="overflow-auto max-h-[500px] space-y-3">
            {regenResult ? regenResult.map((b, i) => (
              <div key={i} className="glass rounded-xl border border-blue-500/20 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-white">Parcel {b.parcelNum as string || b.parcelNo as string}</p>
                  {b.catalyticPotential && <Badge label={b.catalyticPotential as string} color="blue" />}
                </div>
                {b.address && <p className="text-xs text-slate-400 mb-2">{b.address as string}</p>}
                {b.recommendations && (
                  <ul className="space-y-1.5">
                    {((b.recommendations as string[]) || []).map((r, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-slate-300">
                        <ChevronRight className="w-3 h-3 mt-0.5 text-blue-400 flex-shrink-0" />{r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Generate blueprints to see AI regeneration plans</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'Contagion' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="glass rounded-2xl border border-slate-700/50 p-6 space-y-4">
            <h3 className="font-semibold text-white">Blight Contagion Tracker</h3>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Parcel Number (optional)</label>
              <input value={contagionParcel} onChange={e => setContagionParcel(e.target.value)} placeholder="Leave blank for district analysis"
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">District (optional)</label>
              <input value={contagionDistrict} onChange={e => setContagionDistrict(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50" />
            </div>
            <button onClick={handleContagion} disabled={tracking}
              className="w-full py-2.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{background:'linear-gradient(135deg,#3b82f6,#1d4ed8)'}}>
              {tracking ? <><Loader2 className="w-4 h-4 animate-spin"/>Tracking...</> : <><Zap className="w-4 h-4"/>Track Contagion</>}
            </button>
          </div>
          <div>
            {contagionResult ? (
              <div className="space-y-3">
                {contagionResult.hotspots && (
                  <div className="glass rounded-xl border border-red-500/20 p-4">
                    <h4 className="text-xs font-semibold text-red-400 mb-2">Hotspots ({((contagionResult.hotspots as unknown[]) || []).length})</h4>
                    <pre className="text-xs text-slate-300 overflow-auto max-h-32 whitespace-pre-wrap">{JSON.stringify(contagionResult.hotspots, null, 2)}</pre>
                  </div>
                )}
                {contagionResult.recommendations && (
                  <div className="glass rounded-xl border border-slate-700/50 p-4">
                    <h4 className="text-xs font-semibold text-white mb-2">Recommendations</h4>
                    <ul className="space-y-1.5">
                      {((contagionResult.recommendations as string[]) || []).map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <ChevronRight className="w-3 h-3 mt-0.5 text-blue-400 flex-shrink-0" />{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Run analysis to see blight spread patterns</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'Nuisances' && (
        <div className="glass rounded-2xl border border-slate-700/50 overflow-hidden">
          {loading ? <SkeletonTable /> : (
            <>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/60">
                    <tr>{['Type','Description','Address','District','Reported Date','Status'].map(h=>(
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {nuisances.map(n=>(
                      <tr key={n.id as string} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-xs font-medium text-white">{n.nuisanceType as string||'—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 truncate max-w-48">{n.description as string||'—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 truncate max-w-36">{n.address as string||'—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{n.district as string||'—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{n.reportedDate ? new Date(n.reportedDate as string).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3"><Badge label={(n.status as string)||'Unknown'} color={severityColor((n.status as string)||'')} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={nuisancePage} totalPages={nuisancePagination.totalPages} total={nuisancePagination.total} limit={50}
                onPageChange={p => { setNuisancePage(p); blightApi.nuisances({ district: district||undefined, page: p }).then(r => { setNuisances(r.nuisances||[]); if(r.pagination) setNuisancePagination(r.pagination); }); }} />
            </>
          )}
        </div>
      )}

      {tab === 'Violations' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <select value={violationStatus} onChange={e => setViolationStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-white focus:outline-none">
              <option value="">All Statuses</option>
              {['open','closed','pending'].map(s=><option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
            <button onClick={() => blightApi.violations({ district: district||undefined, status: violationStatus||undefined }).then(r => { setViolations(r.violations||[]); if(r.pagination) setViolationPagination(r.pagination); })}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium text-white transition-colors">Filter</button>
          </div>
          <div className="glass rounded-2xl border border-slate-700/50 overflow-hidden">
            {loading ? <SkeletonTable /> : (
              <>
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/60">
                      <tr>{['Case #','Violation Type','Address','District','Status','Date Opened','Lien Amount'].map(h=>(
                        <th key={h} className="text-left text-xs font-semibold text-slate-400 px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {violations.map(v=>(
                        <tr key={v.id as string} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono text-slate-400">{v.caseNumber as string||'—'}</td>
                          <td className="px-4 py-3 text-xs text-white">{v.violationType as string||'—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-400 truncate max-w-36">{v.address as string||'—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{v.district as string||'—'}</td>
                          <td className="px-4 py-3"><Badge label={(v.status as string)||'Unknown'} color={severityColor((v.status as string)||'')} /></td>
                          <td className="px-4 py-3 text-xs text-slate-500">{v.openedDate ? new Date(v.openedDate as string).toLocaleDateString() : '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-300">{v.lienAmount ? `$${(v.lienAmount as number).toLocaleString()}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={violationPage} totalPages={violationPagination.totalPages} total={violationPagination.total} limit={50}
                  onPageChange={p => { setViolationPage(p); blightApi.violations({ district: district||undefined, page: p, status: violationStatus||undefined }).then(r => { setViolations(r.violations||[]); if(r.pagination) setViolationPagination(r.pagination); }); }} />
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'Properties' && (
        <div className="glass rounded-2xl border border-slate-700/50 overflow-hidden">
          {loading ? <SkeletonTable /> : (
            <>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/60">
                    <tr>{['Parcel #','Address','District','Acreage','Zoning','Maintained By'].map(h=>(
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {properties.map(p=>(
                      <tr key={p.id as string} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-slate-400">{p.parcelNo as string||'—'}</td>
                        <td className="px-4 py-3 text-xs text-white truncate max-w-40">{p.address as string||'—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{p.district as string||'—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-300">{p.acreage as string||'—'}</td>
                        <td className="px-4 py-3"><Badge label={(p.zoning as string)||'—'} color="blue" /></td>
                        <td className="px-4 py-3 text-xs text-slate-400">{p.maintainedBy as string||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={propPage} totalPages={propPagination.totalPages} total={propPagination.total} limit={50}
                onPageChange={p => { setPropPage(p); blightApi.properties({ page: p }).then(r => { setProperties(r.properties||[]); if(r.pagination) setPropPagination(r.pagination); }); }} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
