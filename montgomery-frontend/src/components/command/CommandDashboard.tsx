import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import {
  Shield, Users, Building2, TrendingUp,
  Bell, Zap, FileText, RefreshCw, Loader2,
  AlertTriangle, ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { commandApi } from '../../api/command';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../api/client';
import KPICard from '../shared/KPICard';
import { SkeletonCard } from '../shared/LoadingSkeleton';
import Badge, { severityColor } from '../shared/Badge';
import type { Alert, Briefing } from '../../types';

interface OutletCtx { district: string }

export default function CommandDashboard() {
  const { district } = useOutletContext<OutletCtx>();
  const { success, error: toastError } = useToast();

  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingAlerts, setGeneratingAlerts] = useState(false);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [expandedBriefing, setExpandedBriefing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, alertsRes, briefRes] = await Promise.allSettled([
        commandApi.dashboard(district || undefined),
        commandApi.alerts({ limit: 20 }),
        commandApi.briefing(),
      ]);
      if (dash.status === 'fulfilled') setDashboard(dash.value);
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.alerts || []);
      if (briefRes.status === 'fulfilled') setBriefing(briefRes.value);
    } catch (e) {
      toastError('Failed to load dashboard', getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [district, toastError]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGenerateAlerts = async () => {
    setGeneratingAlerts(true);
    try {
      const r = await commandApi.generateAlerts();
      success('Alerts Generated', `${r.alerts} convergence alerts created`);
      const alertsRes = await commandApi.alerts({ limit: 20 });
      setAlerts(alertsRes.alerts || []);
    } catch (e) {
      toastError('Failed to generate alerts', getErrorMessage(e));
    } finally {
      setGeneratingAlerts(false);
    }
  };

  const handleGenerateBriefing = async () => {
    setGeneratingBriefing(true);
    try {
      const r = await commandApi.generateBriefing();
      setBriefing(r);
      success('Briefing Generated', 'Executive briefing is ready');
    } catch (e) {
      toastError('Failed to generate briefing', getErrorMessage(e));
    } finally {
      setGeneratingBriefing(false);
    }
  };

  const sent = (dashboard?.sentinel as Record<string, unknown>) || {};
  const youth = (dashboard?.youthshield as Record<string, unknown>) || {};
  const blight = (dashboard?.blight as Record<string, unknown>) || {};
  const compass = (dashboard?.compass as Record<string, unknown>) || {};

  const kpis = [
    { label: 'Total Incidents', value: (sent.totalIncidents as number) || 0, icon: Shield, color: 'text-red-400', bgColor: 'bg-red-500/15', borderColor: 'border-red-500/20', subtitle: 'Fire & rescue incidents' },
    { label: 'At-Risk Youth Zones', value: (youth.riskZoneCount as number) || 0, icon: Users, color: 'text-purple-400', bgColor: 'bg-purple-500/15', borderColor: 'border-purple-500/20', subtitle: 'H3 zones requiring intervention' },
    { label: 'Blight Parcels', value: (blight.blightParcels as number) || 0, icon: Building2, color: 'text-blue-400', bgColor: 'bg-blue-500/15', borderColor: 'border-blue-500/20', subtitle: 'High-severity parcels' },
    { label: 'Total Investment', value: `$${((compass.totalInvestment as number || 3840) / 1000).toFixed(1)}B`, icon: TrendingUp, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/20', subtitle: 'Active development pipeline' },
  ];

  return (
    <div className="space-y-6 animate-slide-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Command Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Unified intelligence across all city modules</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <button onClick={fetchData} className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4">
        {loading ? Array.from({length:4}).map((_,i) => <SkeletonCard key={i} />) :
          kpis.map((k,i) => (
            <motion.div key={k.label} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.08}}>
              <KPICard {...k} />
            </motion.div>
          ))
        }
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Alerts Panel */}
        <div className="col-span-2 glass rounded-2xl border border-slate-700/50 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h2 className="font-semibold text-white">Convergence Alerts</h2>
              {alerts.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">{alerts.length}</span>
              )}
            </div>
            <button
              onClick={handleGenerateAlerts}
              disabled={generatingAlerts}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition-all disabled:opacity-50"
            >
              {generatingAlerts ? <><Loader2 className="w-3 h-3 animate-spin" />Generating...</> : <><Zap className="w-3 h-3" />Generate AI Alerts</>}
            </button>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-slate-700/30">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No active alerts. Generate AI alerts to analyze cross-module patterns.</p>
              </div>
            ) : alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-5 py-3.5 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      alert.severity === 'critical' ? 'text-red-400' :
                      alert.severity === 'high' ? 'text-orange-400' :
                      alert.severity === 'medium' ? 'text-amber-400' : 'text-blue-400'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{alert.title}</p>
                      {alert.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{alert.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {alert.module && <Badge label={alert.module} color="blue" />}
                    <Badge label={alert.severity} color={severityColor(alert.severity)} />
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(alert.generatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Module Health + Briefing */}
        <div className="flex flex-col gap-4">
          {/* Module Quick Stats */}
          <div className="glass rounded-2xl border border-slate-700/50 p-5">
            <h3 className="font-semibold text-white mb-4 text-sm">Module Health</h3>
            <div className="space-y-3">
              {[
                { name: 'Sentinel', color: 'bg-red-500', value: sent.totalIncidents as number || 0, label: 'incidents', icon: Shield, textColor: 'text-red-400' },
                { name: 'YouthShield', color: 'bg-purple-500', value: youth.totalFacilities as number || 0, label: 'facilities', icon: Users, textColor: 'text-purple-400' },
                { name: 'Blight-to-Bright', color: 'bg-blue-500', value: blight.totalNuisances as number || 0, label: 'nuisances', icon: Building2, textColor: 'text-blue-400' },
                { name: 'Compass', color: 'bg-emerald-500', value: compass.totalPermits as number || 0, label: 'permits', icon: TrendingUp, textColor: 'text-emerald-400' },
              ].map(m => (
                <div key={m.name} className="flex items-center gap-3">
                  <div className={`w-1.5 h-8 rounded-full ${m.color} opacity-80`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white">{m.name}</p>
                    <p className="text-xs text-slate-500">{m.value?.toLocaleString() || '—'} {m.label}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              ))}
            </div>
          </div>

          {/* Executive Briefing */}
          <div className="glass rounded-2xl border border-slate-700/50 flex-1 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-white text-sm">Executive Briefing</h3>
              </div>
              <button
                onClick={handleGenerateBriefing}
                disabled={generatingBriefing}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 transition-all disabled:opacity-50"
              >
                {generatingBriefing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {generatingBriefing ? 'Generating...' : 'Generate'}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {briefing ? (
                <div>
                  <p className="text-xs font-semibold text-indigo-400 mb-2">{briefing.title}</p>
                  <div className={`text-xs text-slate-300 leading-relaxed ${!expandedBriefing ? 'line-clamp-6' : ''}`}>
                    {briefing.content}
                  </div>
                  <button
                    onClick={() => setExpandedBriefing(!expandedBriefing)}
                    className="mt-2 text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                  >
                    {expandedBriefing ? <><ChevronUp className="w-3 h-3" />Show less</> : <><ChevronDown className="w-3 h-3" />Read more</>}
                  </button>
                  {expandedBriefing && briefing.crossModuleInsights && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <p className="text-xs font-medium text-white mb-1">Cross-Module Insights</p>
                      <p className="text-xs text-slate-400">{briefing.crossModuleInsights}</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-600 mt-2">By {briefing.generatedBy}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-6 text-slate-500">
                  <FileText className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs text-center">No briefing available.<br />Generate one to get AI-powered insights.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
