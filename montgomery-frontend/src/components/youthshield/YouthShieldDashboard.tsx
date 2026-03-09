import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { Users, MapPin, Clock, School, Loader2, Zap, RefreshCw, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { youthshieldApi } from '../../api/youthshield';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../api/client';
import KPICard from '../shared/KPICard';
import { SkeletonCard, SkeletonTable } from '../shared/LoadingSkeleton';
import Pagination from '../shared/Pagination';
import Badge from '../shared/Badge';

interface OutletCtx { district: string }

const TABS = ['Overview', 'Risk Zones', 'Intervention', 'Gap Analysis', 'Resources'];
const RESOURCE_TYPES = ['school', 'center', 'park', 'library', 'daycare'];
const COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981'];

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

export default function YouthShieldDashboard() {
  const { district } = useOutletContext<OutletCtx>();
  const { success, error: toastError } = useToast();
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [riskZones, setRiskZones] = useState<Record<string, unknown>[]>([]);
  const [riskPagination, setRiskPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [riskPage, setRiskPage] = useState(1);
  const [gapAnalysis, setGapAnalysis] = useState<Record<string, unknown> | null>(null);
  const [resources, setResources] = useState<Record<string, unknown> | null>(null);
  const [resourceType, setResourceType] = useState('school');
  const [loading, setLoading] = useState(true);

  // Intervention form
  const [interventionZone, setInterventionZone] = useState('');
  const [interventionType, setInterventionType] = useState('');
  const [interventionResult, setInterventionResult] = useState<Record<string, unknown> | null>(null);
  const [running, setRunning] = useState(false);

  const [recalculating, setRecalculating] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [s, rz, gap, res] = await Promise.allSettled([
      youthshieldApi.stats(),
      youthshieldApi.riskZones({ district: district || undefined }),
      youthshieldApi.gapAnalysis(district || undefined),
      youthshieldApi.resources(resourceType),
    ]);
    if (s.status === 'fulfilled') setStats(s.value);
    if (rz.status === 'fulfilled') { setRiskZones(rz.value.zones || []); if (rz.value.pagination) setRiskPagination(rz.value.pagination); }
    if (gap.status === 'fulfilled') setGapAnalysis(gap.value);
    if (res.status === 'fulfilled') setResources(res.value);
    setLoading(false);
  }, [district, resourceType]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleIntervention = async () => {
    setRunning(true);
    try {
      const r = await youthshieldApi.intervention({ zoneH3: interventionZone || undefined, interventionType: interventionType || undefined });
      setInterventionResult(r);
      success('Intervention Plan Ready', 'AI routing complete');
    } catch (e) { toastError('Intervention failed', getErrorMessage(e)); }
    finally { setRunning(false); }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const r = await youthshieldApi.recalculateRiskZones();
      success('Risk Zones Updated', r.message || 'AI recalculation complete');
      const rz = await youthshieldApi.riskZones({ district: district || undefined });
      setRiskZones(rz.zones || []);
    } catch (e) { toastError('Recalculation failed', getErrorMessage(e)); }
    finally { setRecalculating(false); }
  };

  const facilities = (stats?.facilities as Record<string, number>) || {};
  const facilityData = [
    { name: 'Schools', value: facilities.schools || 0 },
    { name: 'Centers', value: facilities.communityCenters || 0 },
    { name: 'Parks', value: facilities.parks || 0 },
    { name: 'Libraries', value: facilities.libraries || 0 },
    { name: 'Daycares', value: facilities.daycares || 0 },
  ];

  const kpis = [
    { label: 'Total Facilities', value: facilities.total || 0, icon: Users, color: 'text-purple-400', bgColor: 'bg-purple-500/15', borderColor: 'border-purple-500/20' },
    { label: 'Schools', value: facilities.schools || 0, icon: School, color: 'text-purple-400', bgColor: 'bg-purple-500/15', borderColor: 'border-purple-500/20' },
    { label: 'Community Centers', value: facilities.communityCenters || 0, icon: MapPin, color: 'text-indigo-400', bgColor: 'bg-indigo-500/15', borderColor: 'border-indigo-500/20' },
    { label: 'Parks', value: facilities.parks || 0, icon: MapPin, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/20' },
    { label: 'Risk Zones', value: riskZones.length || 0, icon: Clock, color: 'text-red-400', bgColor: 'bg-red-500/15', borderColor: 'border-red-500/20', subtitle: '3–8PM danger window' },
  ];

  const gapSummary = (gapAnalysis?.summary as Record<string, unknown>) || {};
  const gapZones = (gapAnalysis?.gapZones as Record<string, unknown>[]) || [];
  const gapRecommendations = (gapAnalysis?.recommendations as string[]) || [];
  const allResources = resources ? [
    ...((resources.schools as Record<string,unknown>[]) || []),
    ...((resources.communityCenters as Record<string,unknown>[]) || []),
    ...((resources.parks as Record<string,unknown>[]) || []),
    ...((resources.libraries as Record<string,unknown>[]) || []),
    ...((resources.daycares as Record<string,unknown>[]) || []),
  ] : [];

  return (
    <div className="space-y-6 animate-slide-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">YouthShield</h1>
            <p className="text-slate-400 text-sm">Youth Violence Prevention Intelligence</p>
          </div>
        </div>
        <button onClick={fetchAll} className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3">
        {loading ? Array.from({length:5}).map((_,i)=><SkeletonCard key={i}/>) :
          kpis.map((k,i)=>(
            <motion.div key={k.label} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}>
              <KPICard {...k} />
            </motion.div>
          ))
        }
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tab===t ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="glass rounded-2xl border border-slate-700/50 p-5">
            <h3 className="font-semibold text-white mb-4 text-sm">Facility Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={facilityData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name, value}) => `${name}: ${value}`} labelLine fontSize={11}>
                  {facilityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:'12px',color:'#f1f5f9',fontSize:'12px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="glass rounded-2xl border border-slate-700/50 p-5">
            <h3 className="font-semibold text-white mb-4 text-sm">Key Facts</h3>
            <div className="space-y-3">
              {[
                { label: '50%+ of 2024 homicide arrests', value: 'Under age 21', color: 'text-red-400' },
                { label: 'National gun violence rank', value: '5th', color: 'text-orange-400' },
                { label: 'Critical window', value: '3–8 PM daily', color: 'text-amber-400' },
                { label: 'Total youth facilities', value: (facilities.total || 0).toString(), color: 'text-purple-400' },
                { label: 'Daycares', value: (facilities.daycares || 0).toString(), color: 'text-blue-400' },
              ].map(f => (
                <div key={f.label} className="flex items-center justify-between py-2 border-b border-slate-700/30">
                  <span className="text-xs text-slate-400">{f.label}</span>
                  <span className={`text-xs font-bold ${f.color}`}>{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'Risk Zones' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={handleRecalculate} disabled={recalculating}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-medium transition-all disabled:opacity-50">
              {recalculating ? <><Loader2 className="w-3 h-3 animate-spin"/>Recalculating...</> : <><Zap className="w-3 h-3"/>AI Recalculate</>}
            </button>
          </div>
          <div className="glass rounded-2xl border border-slate-700/50 overflow-hidden">
            {loading ? <SkeletonTable /> : (
              <>
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/60">
                      <tr>{['H3 Index','District','Risk Score','Gap Score','Population Density','Updated'].map(h=>(
                        <th key={h} className="text-left text-xs font-semibold text-slate-400 px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {riskZones.map(z=>(
                        <tr key={z.id as string} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono text-slate-500">{(z.h3Index as string)?.slice(0,12)}...</td>
                          <td className="px-4 py-3 text-xs text-white">{(z.district as string)||'—'}</td>
                          <td className="px-4 py-3 w-36"><ScoreBar score={z.riskScore as number||0} /></td>
                          <td className="px-4 py-3 w-36"><ScoreBar score={z.gapScore as number||0} /></td>
                          <td className="px-4 py-3 text-xs text-slate-400">{(z.populationDensity as number)||'—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{z.calculatedAt ? new Date(z.calculatedAt as string).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={riskPage} totalPages={riskPagination.totalPages} total={riskPagination.total} limit={50} onPageChange={p => { setRiskPage(p); youthshieldApi.riskZones({ district: district||undefined, page: p }).then(r => { setRiskZones(r.zones||[]); if (r.pagination) setRiskPagination(r.pagination); }); }} />
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'Intervention' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="glass rounded-2xl border border-slate-700/50 p-6 space-y-4">
            <h3 className="font-semibold text-white">Intervention Routing Engine</h3>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">H3 Zone Index (optional)</label>
              <input value={interventionZone} onChange={e => setInterventionZone(e.target.value)} placeholder="e.g. 872830829ffffff"
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Intervention Type (optional)</label>
              <select value={interventionType} onChange={e => setInterventionType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-white focus:outline-none">
                <option value="">All types</option>
                {['CrimeStoppers','SOOP','Parks & Rec','MPS After-School','Church Youth','YMCA'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button onClick={handleIntervention} disabled={running}
              className="w-full py-2.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{background:'linear-gradient(135deg,#8b5cf6,#6d28d9)'}}>
              {running ? <><Loader2 className="w-4 h-4 animate-spin"/>Routing...</> : <><Zap className="w-4 h-4"/>Route Interventions</>}
            </button>
          </div>
          <div>
            {interventionResult ? (
              <div className="space-y-4">
                <div className="glass rounded-xl border border-purple-500/20 p-4">
                  <h4 className="text-sm font-semibold text-white mb-3">Interventions ({((interventionResult.interventions as unknown[]) || []).length})</h4>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {((interventionResult.interventions as Record<string,unknown>[]) || []).map((iv, i) => (
                      <div key={i} className="flex items-start gap-2 py-2 border-b border-slate-700/30">
                        <ChevronRight className="w-3 h-3 mt-0.5 text-purple-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-white">{iv.type as string || iv.program as string || 'Intervention'}</p>
                          {iv.location && <p className="text-xs text-slate-400">{iv.location as string}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {interventionResult.coordinationNotes && (
                  <div className="glass rounded-xl border border-slate-700/50 p-4">
                    <h4 className="text-xs font-semibold text-white mb-2">Coordination Notes</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{interventionResult.coordinationNotes as string}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Run intervention routing to get AI recommendations</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'Gap Analysis' && gapAnalysis && (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Gap Zones', value: gapSummary.totalGapZones as number || 0 },
              { label: 'Worst District', value: gapSummary.worstDistrict as string || '—' },
              { label: 'Avg Gap Hours', value: `${gapSummary.avgGapHours as number || 0}h` },
              { label: 'Centers Closing Before 6PM', value: gapSummary.centersClosingBefore6PM as number || 0 },
            ].map(s => (
              <div key={s.label} className="glass rounded-xl border border-slate-700/50 p-4">
                <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                <p className="text-xl font-black text-purple-400">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="glass rounded-2xl border border-slate-700/50 p-5">
              <h4 className="font-semibold text-white text-sm mb-3">Gap Zones</h4>
              <div className="space-y-2 max-h-64 overflow-auto">
                {gapZones.map((z, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/30">
                    <div>
                      <p className="text-xs font-mono text-slate-400">{(z.h3Index as string)?.slice(0,14)}</p>
                      <p className="text-xs text-slate-500">{(z.district as string)||'—'}</p>
                    </div>
                    <Badge label={`${z.gapHours as number || 0}h gap`} color="red" />
                  </div>
                ))}
              </div>
            </div>
            <div className="glass rounded-2xl border border-slate-700/50 p-5">
              <h4 className="font-semibold text-white text-sm mb-3">AI Recommendations</h4>
              <ul className="space-y-2.5">
                {gapRecommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-purple-400 flex-shrink-0" />
                    <p className="text-xs text-slate-300 leading-relaxed">{r}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === 'Resources' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {RESOURCE_TYPES.map(t => (
              <button key={t} onClick={() => setResourceType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${resourceType===t ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 max-h-[500px] overflow-auto">
            {allResources.slice(0,30).map((r, i) => (
              <motion.div key={i} initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{delay:i*0.02}}
                className="glass rounded-xl border border-slate-700/50 p-4">
                <p className="text-xs font-semibold text-white truncate">{r.name as string || r.schoolName as string || 'Resource'}</p>
                <p className="text-xs text-slate-400 mt-1 truncate">{r.address as string || '—'}</p>
                {r.district && <Badge label={r.district as string} color="purple" />}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
