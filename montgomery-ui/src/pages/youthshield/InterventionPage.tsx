import { useState } from 'react';
import { useBackgroundAction } from '@/hooks/useBackgroundAction';
import { youthshield } from '@/lib/api';
import { ModuleHeader, StatCard } from '@/components/shared';
import { Markdown } from '@/components/shared/Markdown';
import { pick, labelify, sanitizeH3, isH3Hex } from '@/components/shared/AdaptiveRenderer';
import { Shield, Zap, RefreshCw, DollarSign, Users, MapPin, Clock, AlertTriangle, CheckCircle2, Building2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const MONTGOMERY_NEIGHBORHOODS = [
  { value: '', label: 'All High-Risk Zones (Citywide)' },
  { value: '1', label: 'District 1 — Cloverdale / Midtown' },
  { value: '2', label: 'District 2 — Capitol Heights / Centennial Hill' },
  { value: '3', label: 'District 3 — West Montgomery / Chisholm' },
  { value: '4', label: 'District 4 — Gibbs Village / Tulane Court' },
  { value: '5', label: 'District 5 — Dalraida / Eastdale' },
  { value: '6', label: 'District 6 — Normandale / Woodmere' },
  { value: '7', label: 'District 7 — Pike Road / Snowdoun' },
  { value: '8', label: 'District 8 — Prattville Junction / Mitylene' },
  { value: '9', label: 'District 9 — Eastern Boulevard / AUM' },
];

const INTERVENTION_TYPES = [
  { value: 'mentorship', label: 'Mentorship Program', icon: Users, desc: 'Pair at-risk youth with trained mentors' },
  { value: 'after_school', label: 'After-School Programs', icon: Clock, desc: 'Extended learning and activity programs' },
  { value: 'job_training', label: 'Job Training', icon: DollarSign, desc: 'Vocational training and employment pathways' },
  { value: 'community_policing', label: 'Community Policing', icon: Shield, desc: 'Increased community engagement patrols' },
  { value: 'crisis_intervention', label: 'Crisis Intervention', icon: Zap, desc: 'Immediate response teams for at-risk situations' },
];

/* ═══════════════════════════════════════════
   Normalize AI response into consistent shape
   Handles ALL observed AI response formats
   ═══════════════════════════════════════════ */
interface NormalizedZone {
  zoneName: string;
  riskLevel: string;
  programs: NormalizedProgram[];
}
interface NormalizedProgram {
  program: string;
  type: string;
  deploymentPoint: string;
  timeSlot: string;
  provider: string;
  providerNotes: string;
  urgency: string;
  distance: string;
  alternativeProvider: string;
}

function normalizeResponse(raw: any): {
  zones: NormalizedZone[];
  coverageGaps: string[];
  coordinationNotes: string;
  totalPrograms: number;
  uniqueProviders: string[];
  urgentCount: number;
} {
  if (!raw || typeof raw !== 'object') return { zones: [], coverageGaps: [], coordinationNotes: '', totalPrograms: 0, uniqueProviders: [], urgentCount: 0 };

  // Unwrap nested envelopes
  const d = raw.interventionPlan || raw.intervention_plan || raw.plan || raw.data?.interventionPlan || raw.data?.intervention_plan || raw.data || raw;

  let zones: NormalizedZone[] = [];

  // FORMAT A: intervention_plan[] — each item is a zone with nested interventions[]
  const planArray = Array.isArray(d) ? d
    : Array.isArray(d.intervention_plan) ? d.intervention_plan
    : Array.isArray(d.interventionPlan) ? d.interventionPlan
    : Array.isArray(d.routing_plan) ? d.routing_plan
    : Array.isArray(d.routingPlan) ? d.routingPlan
    : null;

  if (planArray && planArray.length > 0 && planArray[0] && typeof planArray[0] === 'object') {
    const firstItem = planArray[0];
    const hasNestedInterventions = Array.isArray(firstItem.interventions) || Array.isArray(firstItem.programs) || Array.isArray(firstItem.activities);

    if (hasNestedInterventions) {
      // Nested format: each item = a zone with programs inside
      zones = planArray.map((zoneItem: any) => {
        const zoneId = String(pick(zoneItem, 'zone_h3_index', 'zoneH3Index', 'zone', 'zoneH3', 'h3Index', 'h3_index', 'area', 'location') || 'Unknown');
        const zoneName = isH3Hex(zoneId) ? sanitizeH3(zoneId) : zoneId;
        const riskLevel = String(pick(zoneItem, 'risk_level', 'riskLevel', 'urgency', 'priority', 'severity') || '');
        const nested = zoneItem.interventions || zoneItem.programs || zoneItem.activities || [];

        const programs: NormalizedProgram[] = (Array.isArray(nested) ? nested : []).map((p: any) => normalizeProgram(p));
        return { zoneName, riskLevel, programs };
      });
    } else {
      // FORMAT B: flat interventions[] — each item IS a program
      const programs = planArray.map((p: any) => normalizeProgram(p));
      // Group by zone
      const byZone = new Map<string, NormalizedProgram[]>();
      for (const p of programs) {
        const key = p.deploymentPoint || 'Citywide';
        if (!byZone.has(key)) byZone.set(key, []);
        byZone.get(key)!.push(p);
      }
      zones = [...byZone.entries()].map(([name, progs]) => ({
        zoneName: name,
        riskLevel: progs[0]?.urgency || '',
        programs: progs,
      }));
    }
  }

  // Also try top-level flat interventions[] if zones is still empty
  if (zones.length === 0) {
    const flatArr = Array.isArray(d.interventions) ? d.interventions
      : Array.isArray(d.recommendations) ? d.recommendations
      : Array.isArray(d.strategies) ? d.strategies
      : null;

    if (flatArr && flatArr.length > 0) {
      const programs = flatArr.map((p: any) => typeof p === 'string'
        ? { program: p, type: '', deploymentPoint: '', timeSlot: '', provider: '', providerNotes: '', urgency: '', distance: '', alternativeProvider: '' }
        : normalizeProgram(p)
      );
      zones = [{ zoneName: 'Intervention Plan', riskLevel: '', programs }];
    }
  }

  // Coverage gaps
  const gapsRaw = pick(d, 'coverageGaps', 'coverage_gaps', 'gaps', 'riskAreas', 'challenges') || pick(raw, 'coverageGaps', 'coverage_gaps', 'gaps');
  const coverageGaps: string[] = Array.isArray(gapsRaw) ? gapsRaw.map((g: any) => typeof g === 'string' ? g : pick(g, 'text', 'description', 'gap', 'area') || JSON.stringify(g)) : [];

  // Coordination notes
  const coordRaw = pick(d, 'coordinationNotes', 'coordination_notes', 'coordination', 'notes', 'partnerships') || pick(raw, 'coordinationNotes', 'coordination_notes', 'coordination');
  const coordinationNotes = typeof coordRaw === 'string' ? coordRaw : (coordRaw && typeof coordRaw === 'object' ? Object.values(coordRaw).filter(v => typeof v === 'string').join('\n\n') : '');

  // Compute stats
  const allPrograms = zones.flatMap(z => z.programs);
  const totalPrograms = allPrograms.length;
  const uniqueProviders = [...new Set(allPrograms.map(p => p.provider || p.program).filter(Boolean))];
  const urgentCount = zones.filter(z => {
    const r = z.riskLevel.toLowerCase();
    return r.includes('critical') || r.includes('high') || r.includes('urgent') || r.includes('immediate');
  }).length;

  return { zones, coverageGaps, coordinationNotes: sanitizeH3(coordinationNotes), totalPrograms, uniqueProviders, urgentCount };
}

function normalizeProgram(p: any): NormalizedProgram {
  if (typeof p === 'string') return { program: p, type: '', deploymentPoint: '', timeSlot: '', provider: '', providerNotes: '', urgency: '', distance: '', alternativeProvider: '' };
  return {
    program: String(pick(p, 'program', 'name', 'title', 'recommendedIntervention', 'recommended_intervention', 'intervention') || ''),
    type: String(pick(p, 'type', 'category', 'interventionType', 'intervention_type') || ''),
    deploymentPoint: sanitizeH3(String(pick(p, 'deploymentPoint', 'deployment_point', 'location', 'venue', 'center', 'site') || '')),
    timeSlot: String(pick(p, 'timeSlot', 'time_slot', 'time', 'schedule', 'hours') || ''),
    provider: String(pick(p, 'provider', 'organization', 'agency', 'partner') || ''),
    providerNotes: sanitizeH3(String(pick(p, 'providerNotes', 'provider_notes', 'notes', 'description', 'details', 'rationale') || '')),
    urgency: String(pick(p, 'urgency', 'priority', 'risk_level', 'riskLevel', 'level') || ''),
    distance: String(pick(p, 'distanceToZone', 'distance_to_zone', 'distance') || ''),
    alternativeProvider: String(pick(p, 'alternativeProvider', 'alternative_provider', 'alternative', 'backup') || ''),
  };
}

function riskColor(level: string): string {
  const l = level.toLowerCase();
  if (l.includes('critical') || l.includes('extreme')) return 'text-red-500 bg-red-500/15 border-red-500/30';
  if (l.includes('high') || l.includes('urgent')) return 'text-orange-400 bg-orange-500/15 border-orange-500/30';
  if (l.includes('medium') || l.includes('moderate')) return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
  return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
}

function riskBorder(level: string): string {
  const l = level.toLowerCase();
  if (l.includes('critical') || l.includes('extreme')) return 'border-l-red-500';
  if (l.includes('high') || l.includes('urgent')) return 'border-l-orange-500';
  if (l.includes('medium') || l.includes('moderate')) return 'border-l-amber-500';
  return 'border-l-youthshield-500';
}

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
export default function InterventionPage() {
  const [form, setForm] = useState({ district: '', interventionType: 'mentorship' });
  const action = useBackgroundAction('Run Intervention Model', youthshield.intervention);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    action.execute({
      zoneH3: form.district ? `district_${form.district}` : undefined,
      interventionType: form.interventionType,
    });
  };

  const raw = action.data as any;
  const result = raw ? normalizeResponse(raw) : null;
  const hasData = result && result.zones.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Intervention Designer" subtitle="AI-powered intervention routing for youth violence prevention zones" accentColor="bg-youthshield-500" icon={<Shield className="w-6 h-6" />} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Config Form ─── */}
        <form onSubmit={handleSubmit} className="glass-card p-6 lg:col-span-1 space-y-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Configure Intervention</h3>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Target Area</label>
            <select value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} className="input-field w-full text-sm">
              {MONTGOMERY_NEIGHBORHOODS.map(n => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-600 mt-1">Select a district or analyze all high-risk zones</p>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Intervention Type</label>
            <div className="space-y-2">
              {INTERVENTION_TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <label key={t.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${form.interventionType === t.value ? 'border-youthshield-500/50 bg-youthshield-500/5' : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'}`}>
                    <input type="radio" name="type" value={t.value} checked={form.interventionType === t.value} onChange={e => setForm(f => ({ ...f, interventionType: e.target.value }))} className="sr-only" />
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${form.interventionType === t.value ? 'text-youthshield-400' : 'text-slate-500'}`} />
                    <div>
                      <p className={`text-sm font-medium ${form.interventionType === t.value ? 'text-youthshield-300' : 'text-slate-300'}`}>{t.label}</p>
                      <p className="text-sm text-slate-500">{t.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <button type="submit" disabled={action.loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {action.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Run Intervention Model
          </button>

          {action.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-400">{action.error}</p>
            </div>
          )}
        </form>

        {/* ─── Results ─── */}
        <div className="lg:col-span-2 space-y-6">
          {hasData && result ? (
            <>
              {/* Stats Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Risk Zones" value={result.zones.length} icon={<MapPin className="w-4 h-4" />} color="text-red-400" />
                <StatCard label="Programs" value={result.totalPrograms} icon={<Shield className="w-4 h-4" />} color="text-youthshield-400" />
                <StatCard label="Providers" value={result.uniqueProviders.length} icon={<Users className="w-4 h-4" />} color="text-amber-400" />
                <StatCard label="Urgent Zones" value={result.urgentCount} icon={<AlertTriangle className="w-4 h-4" />} color="text-orange-400" />
              </div>

              {/* Zone Cards */}
              <div className="space-y-4">
                {result.zones.map((zone, zi) => (
                  <div key={zi} className={`glass-card border-l-4 ${riskBorder(zone.riskLevel)} overflow-hidden`}>
                    {/* Zone Header */}
                    <div className="px-5 py-3.5 border-b border-slate-700/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-youthshield-500/15 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-youthshield-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-200">{sanitizeH3(zone.zoneName)}</h4>
                          <p className="text-xs text-slate-500">{zone.programs.length} program{zone.programs.length !== 1 ? 's' : ''} assigned</p>
                        </div>
                      </div>
                      {zone.riskLevel && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${riskColor(zone.riskLevel)}`}>
                          {zone.riskLevel}
                        </span>
                      )}
                    </div>

                    {/* Programs */}
                    <div className="divide-y divide-slate-700/20">
                      {zone.programs.map((prog, pi) => (
                        <div key={pi} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {/* Program name & type */}
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <h5 className="text-sm font-semibold text-slate-200">{sanitizeH3(prog.program || `Program ${pi + 1}`)}</h5>
                                {prog.type && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-youthshield-500/10 text-youthshield-400 font-medium border border-youthshield-500/20">
                                    {prog.type}
                                  </span>
                                )}
                                {prog.urgency && (
                                  <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${riskColor(prog.urgency)}`}>
                                    {prog.urgency}
                                  </span>
                                )}
                              </div>

                              {/* Metadata row */}
                              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
                                {prog.deploymentPoint && (
                                  <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-slate-500" />
                                    {prog.deploymentPoint}
                                  </span>
                                )}
                                {prog.timeSlot && (
                                  <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    {prog.timeSlot}
                                  </span>
                                )}
                                {prog.distance && (
                                  <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-500" />
                                    {prog.distance}
                                  </span>
                                )}
                              </div>

                              {/* Provider notes */}
                              {prog.providerNotes && (
                                <p className="text-xs text-slate-400 mt-2 leading-relaxed bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/20">
                                  {prog.providerNotes}
                                </p>
                              )}

                              {/* Alternative */}
                              {prog.alternativeProvider && (
                                <p className="text-xs text-slate-500 mt-1.5">
                                  <span className="font-medium">Alternative:</span> {sanitizeH3(prog.alternativeProvider)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Coverage Gaps */}
              {result.coverageGaps.length > 0 && (
                <div className="glass-card p-5 border-l-4 border-l-amber-500">
                  <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Coverage Gaps
                  </h3>
                  <div className="space-y-2">
                    {result.coverageGaps.map((g, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5 text-xs">●</span>
                        <p className="text-sm text-slate-300">{sanitizeH3(g)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coordination Notes */}
              {result.coordinationNotes && (
                <div className="glass-card p-5 border-l-4 border-l-youthshield-500">
                  <h3 className="text-sm font-semibold text-youthshield-300 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Coordination Notes
                  </h3>
                  <Markdown size="sm">{result.coordinationNotes}</Markdown>
                </div>
              )}

              {/* Provider Summary */}
              {result.uniqueProviders.length > 0 && (
                <div className="glass-card p-5">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-youthshield-400" />
                    Engaged Providers ({result.uniqueProviders.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.uniqueProviders.map((p, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-youthshield-500/10 text-youthshield-400 border border-youthshield-500/20">
                        {sanitizeH3(p)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="glass-card p-16 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <div className="w-20 h-20 rounded-full bg-youthshield-500/10 flex items-center justify-center mb-4">
                <Shield className="w-10 h-10 text-youthshield-500/30" />
              </div>
              <h3 className="text-lg font-semibold text-slate-400 mb-1">Design an Intervention</h3>
              <p className="text-sm text-slate-500 max-w-sm">Select a target zone and intervention type, then run the model to see AI-routed programs, providers, and deployment plans.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
