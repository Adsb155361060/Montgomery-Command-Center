import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Shield, Users, Building2, Compass,
  MessageSquare, AlertTriangle, ChevronRight, ChevronLeft,
  X, Sparkles, Rocket, CheckCircle2, MapPin,
} from 'lucide-react';

/* ── localStorage key ── */
const ONBOARDING_KEY = 'mcc_onboarding_complete';

/* ── Step definitions ── */
interface Step {
  id: string;
  title: string;
  description: string;
  details: string[];
  icon: React.ElementType;
  gradient: string;
  bgGlow: string;
  route?: string;          // Navigate here when step is active
  accentColor: string;
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'Welcome to Montgomery Command Center',
    description: 'Your AI-powered civic intelligence platform for Montgomery, Alabama.',
    details: [
      'Real-time city-wide monitoring across public safety, youth services, urban renewal, and economic development.',
      'AI-driven insights powered by advanced analytics and machine learning models.',
      'Role-based access — Executives, Operations staff, and Citizens each see what matters most.',
    ],
    icon: Rocket,
    gradient: 'from-amber-500 to-red-500',
    bgGlow: 'bg-amber-500/10',
    accentColor: 'text-amber-400',
  },
  {
    id: 'dashboard',
    title: 'Command Dashboard',
    description: 'Your city at a glance — the central hub for all modules.',
    details: [
      'See aggregated stats from all four modules: incidents, risk zones, blight, and permits.',
      'Real-time alerts feed shows the latest city events and AI-detected anomalies.',
      'Quick-access module cards let you jump into any area with one click.',
      'Trend charts track crime, blight, and economic indicators over time.',
    ],
    icon: LayoutDashboard,
    gradient: 'from-amber-500 to-orange-600',
    bgGlow: 'bg-amber-500/10',
    route: '/',
    accentColor: 'text-amber-400',
  },
  {
    id: 'sentinel',
    title: 'Sentinel MGM — Public Safety',
    description: 'AI-powered policing analytics to keep Montgomery safe.',
    details: [
      'Incidents — Browse 911 calls and fire/rescue incidents with filters and heatmaps.',
      'Force Multiplier — AI analyzes patrol zones to optimize officer deployment efficiency.',
      'Deployment Optimizer — Generate optimized shift schedules and resource allocation plans.',
      'SB 298 Compliance — Track Alabama Senate Bill 298 reporting requirements automatically.',
      'Recruitment ROI — Model hiring scenarios with cost-benefit projections.',
    ],
    icon: Shield,
    gradient: 'from-red-500 to-rose-600',
    bgGlow: 'bg-red-500/10',
    route: '/sentinel',
    accentColor: 'text-sentinel-400',
  },
  {
    id: 'youthshield',
    title: 'YouthShield — Youth Violence Prevention',
    description: 'Predictive analytics to protect Montgomery\'s youth.',
    details: [
      'Risk Zones — AI identifies geographic areas with elevated youth violence risk.',
      'Gap Analysis — Discovers where community resources are lacking vs. where they\'re needed.',
      'Resources — Maps community centers, schools, recreation facilities, and programs.',
      'Intervention Planner — Design targeted intervention programs with AI-generated action plans.',
    ],
    icon: Users,
    gradient: 'from-purple-500 to-violet-600',
    bgGlow: 'bg-purple-500/10',
    route: '/youthshield',
    accentColor: 'text-youthshield-400',
  },
  {
    id: 'blight',
    title: 'Blight-to-Bright — Urban Renewal',
    description: 'Transform neglected properties into community assets.',
    details: [
      'Nuisances & Violations — Track code violations, environmental nuisances, and property conditions.',
      'Blight Scores — AI-calculated severity scores rank properties by remediation urgency.',
      'Regeneration Engine — Generate parcel-specific reuse recommendations (housing, parks, commercial).',
      'Contagion Analysis — Model how blight spreads between neighboring properties and plan interventions.',
    ],
    icon: Building2,
    gradient: 'from-blue-500 to-cyan-600',
    bgGlow: 'bg-blue-500/10',
    route: '/blight',
    accentColor: 'text-blight-400',
  },
  {
    id: 'compass',
    title: 'DataCenter Compass — Economic Impact',
    description: 'Quantify economic impact of data center and infrastructure investments.',
    details: [
      'Impact Dashboard — Visualize jobs, tax revenue, and GDP effects of major projects.',
      'What-If Simulator — Run scenario models to project outcomes of different investment sizes.',
      'CBA Designer — Build comprehensive cost-benefit analyses with AI-assisted negotiation insights.',
      'Permits — Track construction permits tied to development projects.',
    ],
    icon: Compass,
    gradient: 'from-emerald-500 to-teal-600',
    bgGlow: 'bg-emerald-500/10',
    route: '/compass',
    accentColor: 'text-compass-400',
  },
  {
    id: 'intelligence',
    title: 'Intelligence Tools',
    description: 'Cross-module AI assistant and spatial search.',
    details: [
      'AI Assistant — Ask questions in natural language about any city data. Get instant, sourced answers.',
      'Geo Lookup — Search any address or parcel to see all related incidents, violations, permits, and scores.',
      'All AI analysis pages generate detailed reports you can review and act on.',
    ],
    icon: MessageSquare,
    gradient: 'from-pink-500 to-rose-600',
    bgGlow: 'bg-pink-500/10',
    route: '/ai',
    accentColor: 'text-pink-400',
  },
  {
    id: 'alerts',
    title: 'Alerts & Notifications',
    description: 'Stay informed with real-time system alerts.',
    details: [
      'AI-generated alerts when anomalies are detected across any module.',
      'Priority-based filtering — Critical, Warning, and Informational levels.',
      'Click the bell icon in the top-right corner anytime to view active alerts.',
    ],
    icon: AlertTriangle,
    gradient: 'from-yellow-500 to-amber-600',
    bgGlow: 'bg-yellow-500/10',
    route: '/alerts',
    accentColor: 'text-yellow-400',
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'You now know the key areas of Montgomery Command Center.',
    details: [
      'Use the sidebar on the left to navigate between modules and pages.',
      'Look for the AI sparkle ✨ icon — those pages have AI-powered analysis capabilities.',
      'You can restart this tour anytime from the help menu.',
      'Welcome aboard — let\'s make Montgomery better, together.',
    ],
    icon: CheckCircle2,
    gradient: 'from-emerald-500 to-green-600',
    bgGlow: 'bg-emerald-500/10',
    accentColor: 'text-emerald-400',
  },
];

/* ── Component ── */
export default function OnboardingGuide() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);        // triggers CSS re-animation
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      // Short delay so dashboard renders first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const step = STEPS[currentStep];
  const totalSteps = STEPS.length;
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  const goTo = (idx: number) => {
    setCurrentStep(idx);
    setFadeKey(k => k + 1);
    const target = STEPS[idx];
    if (target.route && location.pathname !== target.route) {
      navigate(target.route);
    }
  };

  const goNext = () => {
    if (isLast) {
      completeOnboarding();
      return;
    }
    goTo(currentStep + 1);
  };

  const goPrev = () => {
    if (isFirst) return;
    goTo(currentStep - 1);
  };

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setVisible(false);
    navigate('/');
  };

  const skipOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  const Icon = step.icon;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300" />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div
          key={fadeKey}
          className="relative w-full max-w-2xl bg-navy-900 border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden animate-fade-in"
        >
          {/* Top glow accent bar */}
          <div className={cn('h-1.5 w-full bg-gradient-to-r', step.gradient)} />

          {/* Close / Skip */}
          <button
            onClick={skipOnboarding}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/50 transition-all z-10"
            title="Skip tour"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="px-8 pt-8 pb-6">
            {/* Icon + Step indicator */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={cn('w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg', step.gradient)}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">
                    Step {currentStep + 1} of {totalSteps}
                  </p>
                  <h2 className="text-xl font-display font-bold text-white leading-tight">
                    {step.title}
                  </h2>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className={cn('text-base leading-relaxed mb-5', step.accentColor)}>
              {step.description}
            </p>

            {/* Details list */}
            <div className="space-y-3 mb-8">
              {step.details.map((detail, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={cn('w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold text-white', step.gradient)}>
                    {i + 1}
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300 cursor-pointer',
                      i === currentStep
                        ? cn('flex-[3] bg-gradient-to-r', step.gradient)
                        : i < currentStep
                        ? 'flex-1 bg-slate-600'
                        : 'flex-1 bg-slate-800'
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between">
              <div>
                {!isFirst && (
                  <button
                    onClick={goPrev}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                )}
                {isFirst && (
                  <button
                    onClick={skipOnboarding}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-300 transition-all"
                  >
                    Skip Tour
                  </button>
                )}
              </div>

              <button
                onClick={goNext}
                className={cn(
                  'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r',
                  step.gradient
                )}
              >
                {isLast ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Get Started
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Bottom decorative glow */}
          <div className={cn('absolute -bottom-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none', step.bgGlow)} />
          <div className={cn('absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-10 pointer-events-none', step.bgGlow)} />
        </div>
      </div>
    </>
  );
}

/* ── Hook to restart the tour ── */
export function useOnboardingReset() {
  return useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY);
    window.location.reload();
  }, []);
}

/* ── Utility to check if onboarding is complete ── */
export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}
