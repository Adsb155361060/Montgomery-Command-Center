import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { TrendingUp, DollarSign, Building, Users, Loader2, Zap, RefreshCw, ChevronRight, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { compassApi } from '../../api/compass';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../api/client';
import KPICard from '../shared/KPICard';
import { SkeletonCard, SkeletonTable } from '../shared/LoadingSkeleton';
import Pagination from '../shared/Pagination';
import Badge from '../shared/Badge';

interface OutletCtx { district: string }

const TABS = ['Overview', 'Impact', 'Scenario Simulator', 'CBA Designer', 'Permits'];
const MAJOR_PROJECTS = [
  { name: 'Meta Data Center', amount: 1500000000, status: 'Under Construction', color: '#3b82f6', jobs: 800 },
  { name: 'AWS Data Center', amount: 800000000, status: 'Planned', color: '#8b5cf6', jobs: 600 },
  { name: 'Google Data Center', amount: 700000000, status: 'Planned', color: '#10b981', jobs: 500 },
  { name: 'Inland Port', amount: 340000000, status: 'Under Construction', color: '#f59e0b', jobs: 2618 },
  { name: 'Convention Center', amount: 100000000, status: 'Planned', color: '#ef4444', jobs: 200 },
];

export default function CompassDashboard() {
  const { district } = useOutletContext<OutletCtx>();
  const { success, error: toastError } = useToast();
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [impact, setImpact] = useState<Record<string, unknown> | null>(null);
  const [permits, setPermits] = useState<Record<string, unknown>[]>([]);
  const [permitPagination, setPermitPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [permitPage, setPermitPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Scenario
  const [scenarioText, setScenarioText] = useState('Model the 20-year economic impact of all planned data centers and the inland port on Montgomery, Alabama, including utility costs, housing prices, job creation, and tax revenue.');
  const [scenarioResult, setScenarioResult] = useState<Record<string, unknown> | null>(null);
  const [runningScenario, setRunningScenario] = useState(false);

  // CBA
  const [cbaProject, setCbaProject] = useState('Meta Data Center');
  const [cbaAmount, setCbaAmount] = useState(1500000000);
  const [cbaResult, setCbaResult] = useState<Record<string, unknown> | null>(null);
  const [runningCba, setRunningCba] = useState(false);

  const [permitType, setPermitType] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [s, imp, p] = await Promise.allSettled([
      compassApi.stats(),
      compassApi.impact(),
      compassApi.permits({ district: district || undefined }),
    ]);
    if (s.status === 'fulfilled') setStats(s.value);
    if (imp.status === 'fulfilled') setImpact(imp.value);
    if (p.status === 'fulfilled') { setPermits(p.value.permits || []); if (p.value.pagination) setPermitPagination(p.value.pagination); }
    setLoading(false);
  }, [district]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleScenario = async () => {
    setRunningScenario(true);
    try {
      const r = await compassApi.scenario(scenarioText);
      setScenarioResult(r);
      success('Scenario Complete', 'AI economic projections ready');
    } catch (e) { toastError('Scenario failed', getErrorMessage(e)); }
    finally { setRunningScenario(false); }
  };

  const handleCba = async () => {
    setRunningCba(true);
    try {
      const r = await compassApi.cba({ project: cbaProject, investmentAmount: cbaAmount });
      setCbaResult(r);
      success('CBA Design Complete', 'Community benefit analysis ready');
    } catch (e) { toastError('CBA failed', getErrorMessage(e)); }
    finally { setRunningCba(false); }
  };

  const construction = (stats?.construction as Record<string, unknown>) || {};
  const economy = (stats?.economy as Record<string, unknown>) || {};
  const populationTrends = (stats?.populationTrends as Record<string, unknown>[]) || [];

  const kpis = [
    { label: 'Construction Permits', value: (construction.totalPermits as number) || 0, icon: Building, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/20' },
    { label: 'Est. Construction Value', value: `$${(((construction.totalEstimatedCost as number)||0)/1e9).toFixed(2)}B`, icon: DollarSign, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/20' },
    { label: 'Business Licenses', value: (economy.activeBusinessLicenses as number) || 0, icon: TrendingUp, color: 'text-blue-400', bgColor: 'bg-blue-500/15', borderColor: 'border-blue-500/20' },
    { label: 'Major Projects', value: MAJOR_PROJECTS.length, icon: Users, color: 'text-amber-400', bgColor: 'bg-amber-500/15', borderColor: 'border-amber-500/20', subtitle: '$3.84B+ pipeline' },
  ];

  const combinedImpact = (impact?.combinedImpact as Record<string, unknown>) || {};

  return (
    <div className="space-y-6 animate-slide-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Compass</h1>
            <p className="text-slate-400 text-sm">Economic Impact Intelligence</p>
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
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab===t ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {MAJOR_PROJECTS.map(p => (
              <div key={p.name} className="glass rounded-xl border border-slate-700/50 p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full" style={{background: p.color}} />
                <p className="text-xs font-semibold text-white pl-2">{p.name}</p>
                <p className="text-lg font-black pl-2 mt-1" style={{color: p.color}}>${(p.amount/1e9).toFixed(1)}B</p>
                <div className="flex items-center justify-between pl-2 mt-1">
                  <Badge label={p.status} color={p.status === 'Under Construction' ? 'green' : 'blue'} />
                  <span className="text-xs text-slate-400">{p.jobs.toLocaleString()} jobs</span>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="glass rounded-2xl border border-slate-700/50 p-5">
              <h3 className="font-semibold text-white mb-4 text-sm">Construction by Type</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={((construction.byType as {type:string;count:number}[])||[]).slice(0,8)}>
                  <XAxis dataKey="type" tick={{fontSize:9,fill:'#94a3b8'}} angle={-15} textAnchor="end" />
                  <YAxis tick={{fontSize:10,fill:'#94a3b8'}} />
                  <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:'12px',color:'#f1f5f9',fontSize:'12px'}} />
                  <Bar dataKey="count" fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass rounded-2xl border border-slate-700/50 p-5">
              <h3 className="font-semibold text-white mb-4 text-sm">Population Trends</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={populationTrends.slice(-20)}>
                  <XAxis dataKey="date" tick={{fontSize:9,fill:'#94a3b8'}} />
                  <YAxis tick={{fontSize:10,fill:'#94a3b8'}} />
                  <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:'12px',color:'#f1f5f9',fontSize:'12px'}} />
                  <Line type="monotone" dataKey="visitors" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === 'Impact' && (
        <div className="space-y-5">
          {loading ? <SkeletonTable /> : impact ? (
            <>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total Investment', value: `$${((impact.totalInvestment as number||3840)/1e6).toFixed(0)}M`, color: 'text-emerald-400' },
                  { label: 'Construction Jobs', value: (combinedImpact.totalConstructionJobs as number||0).toLocaleString(), color: 'text-blue-400' },
                  { label: 'Permanent Jobs', value: (combinedImpact.totalPermanentJobs as number||0).toLocaleString(), color: 'text-purple-400' },
                  { label: 'Confidence Level', value: (impact.confidenceLevel as string) || 'High', color: 'text-amber-400' },
                ].map(s => (
                  <div key={s.label} className="glass rounded-xl border border-slate-700/50 p-4">
                    <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                    <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="glass rounded-2xl border border-slate-700/50 p-5">
                  <h4 className="font-semibold text-white text-sm mb-3">Combined Impact</h4>
                  <div className="space-y-2">
                    {Object.entries(combinedImpact).map(([k,v]) => (
                      <div key={k} className="flex justify-between py-1.5 border-b border-slate-700/30">
                        <span className="text-xs text-slate-400 capitalize">{k.replace(/([A-Z])/g,' $1').trim()}</span>
                        <span className="text-xs font-medium text-white">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {impact.keyRisks && (
                    <div className="glass rounded-xl border border-red-500/20 p-4">
                      <h4 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Key Risks</h4>
                      <ul className="space-y-1">
                        {((impact.keyRisks as string[]) || []).map((r,i)=>(
                          <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                            <span className="text-red-400 mt-0.5">·</span>{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {impact.opportunities && (
                    <div className="glass rounded-xl border border-emerald-500/20 p-4">
                      <h4 className="text-xs font-semibold text-emerald-400 mb-2">Opportunities</h4>
                      <ul className="space-y-1">
                        {((impact.opportunities as string[]) || []).map((o,i)=>(
                          <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                            <span className="text-emerald-400 mt-0.5">·</span>{o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {tab === 'Scenario Simulator' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="glass rounded-2xl border border-slate-700/50 p-6 space-y-4">
            <h3 className="font-semibold text-white">What-If Scenario Simulator</h3>
            <textarea value={scenarioText} onChange={e => setScenarioText(e.target.value)} rows={8}
              className="w-full px-3 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none leading-relaxed"
              placeholder="Describe your economic scenario..." />
            <button onClick={handleScenario} disabled={runningScenario}
              className="w-full py-2.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{background:'linear-gradient(135deg,#10b981,#047857)'}}>
              {runningScenario ? <><Loader2 className="w-4 h-4 animate-spin"/>Modeling...</> : <><Zap className="w-4 h-4"/>Run Scenario</>}
            </button>
          </div>
          <div className="overflow-auto max-h-[600px]">
            {scenarioResult ? (
              <div className="space-y-3">
                {['year1','year3','year5','year10','year20'].map(yr => {
                  const proj = (scenarioResult.projections as Record<string,unknown>)?.[yr];
                  if (!proj) return null;
                  return (
                    <div key={yr} className="glass rounded-xl border border-emerald-500/20 p-4">
                      <h4 className="text-xs font-semibold text-emerald-400 mb-2">{yr.replace('year','Year ')}</h4>
                      <pre className="text-xs text-slate-300 whitespace-pre-wrap">{JSON.stringify(proj, null, 2)}</pre>
                    </div>
                  );
                })}
                {scenarioResult.confidenceLevel && (
                  <div className="glass rounded-xl border border-slate-700/50 p-3">
                    <p className="text-xs text-slate-400">Confidence: <span className="text-white font-medium">{scenarioResult.confidenceLevel as string}</span></p>
                    {scenarioResult.modelUsed && <p className="text-xs text-slate-500 mt-1">Model: {scenarioResult.modelUsed as string}</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Enter a scenario and run to see AI projections</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'CBA Designer' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="glass rounded-2xl border border-slate-700/50 p-6 space-y-4">
            <h3 className="font-semibold text-white">Community Benefit Agreement Designer</h3>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Project</label>
              <select value={cbaProject} onChange={e => setCbaProject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-white focus:outline-none">
                {MAJOR_PROJECTS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Investment Amount: <span className="text-white font-bold">${(cbaAmount/1e6).toFixed(0)}M</span></label>
              <input type="range" min={100000000} max={2000000000} step={50000000} value={cbaAmount} onChange={e => setCbaAmount(+e.target.value)} className="w-full accent-emerald-500" />
            </div>
            <button onClick={handleCba} disabled={runningCba}
              className="w-full py-2.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{background:'linear-gradient(135deg,#10b981,#047857)'}}>
              {runningCba ? <><Loader2 className="w-4 h-4 animate-spin"/>Designing CBA...</> : <><Zap className="w-4 h-4"/>Design CBA</>}
            </button>
          </div>
          <div className="overflow-auto max-h-[600px]">
            {cbaResult ? (
              <div className="space-y-3">
                <div className="glass rounded-xl border border-emerald-500/20 p-4">
                  <p className="text-xs text-slate-400 mb-1">Recommended CBA Value</p>
                  <p className="text-2xl font-black text-emerald-400">${((cbaResult.recommendedCBAValue as number||0)/1e6).toFixed(1)}M</p>
                </div>
                {cbaResult.components && (
                  <div className="glass rounded-xl border border-slate-700/50 p-4">
                    <h4 className="text-xs font-semibold text-white mb-2">CBA Components</h4>
                    <div className="space-y-2">
                      {((cbaResult.components as Record<string,unknown>[]) || []).map((c, i) => (
                        <div key={i} className="flex justify-between py-1.5 border-b border-slate-700/30">
                          <span className="text-xs text-slate-300">{c.name as string || c.component as string || `Component ${i+1}`}</span>
                          {c.value && <span className="text-xs font-medium text-emerald-400">{c.value as string}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {cbaResult.negotiationPoints && (
                  <div className="glass rounded-xl border border-slate-700/50 p-4">
                    <h4 className="text-xs font-semibold text-white mb-2">Negotiation Points</h4>
                    <ul className="space-y-1.5">
                      {((cbaResult.negotiationPoints as string[]) || []).map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <ChevronRight className="w-3 h-3 mt-0.5 text-emerald-400 flex-shrink-0" />{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Design a CBA to get AI-backed recommendations</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'Permits' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input value={permitType} onChange={e => setPermitType(e.target.value)} placeholder="Filter by type..."
              className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none w-48" />
            <button onClick={() => compassApi.permits({ district: district||undefined, projectType: permitType||undefined }).then(r => { setPermits(r.permits||[]); if(r.pagination) setPermitPagination(r.pagination); })}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium text-white transition-colors">Filter</button>
          </div>
          <div className="glass rounded-2xl border border-slate-700/50 overflow-hidden">
            {loading ? <SkeletonTable /> : (
              <>
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/60">
                      <tr>{['Permit #','Type','Description','Address','District','Est. Cost','Status','Date'].map(h=>(
                        <th key={h} className="text-left text-xs font-semibold text-slate-400 px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {permits.map(p=>(
                        <tr key={p.id as string} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono text-slate-400">{p.permitNumber as string||'—'}</td>
                          <td className="px-4 py-3 text-xs text-white">{p.projectType as string||'—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-400 truncate max-w-36">{p.description as string||'—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-400 truncate max-w-36">{p.address as string||'—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{p.district as string||'—'}</td>
                          <td className="px-4 py-3 text-xs text-emerald-400 font-medium">{p.estimatedCost ? `$${((p.estimatedCost as number)/1e3).toFixed(0)}K` : '—'}</td>
                          <td className="px-4 py-3"><Badge label={(p.status as string)||'—'} color="green" /></td>
                          <td className="px-4 py-3 text-xs text-slate-500">{p.issueDate ? new Date(p.issueDate as string).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={permitPage} totalPages={permitPagination.totalPages} total={permitPagination.total} limit={50}
                  onPageChange={p => { setPermitPage(p); compassApi.permits({ district: district||undefined, page: p }).then(r => { setPermits(r.permits||[]); if(r.pagination) setPermitPagination(r.pagination); }); }} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
