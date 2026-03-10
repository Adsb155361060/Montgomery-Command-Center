import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Shield, Users, Building2, Compass,
  MessageSquare, ChevronRight, ChevronLeft,
  X, Sparkles, Rocket, CheckCircle2,
} from 'lucide-react';

const ONBOARDING_KEY = 'mcc_onboarding_complete';

interface Step {
  id: string;
  title: string;
  description: string;
  details: string[];
  icon: React.ElementType;
  gradient: string;
  route?: string;
  accentColor: string;
  /** data-tour attribute value on the sidebar group to highlight */
  sidebarTarget?: string;
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'Welcome to Montgomery Command Center',
    description: 'Your AI-powered civic intelligence platform.',
    details: [
      'Real-time monitoring across public safety, youth services, urban renewal, and economic development.',
      'AI-driven insights powered by Gemini and advanced analytics.',
      'Role-based access for Executives, Operations, and Citizens.',
    ],
    icon: Rocket,
    gradient: 'from-amber-500 to-red-500',
    accentColor: 'text-amber-400',
  },
  {
    id: 'dashboard',
    title: 'Command Dashboard',
    description: 'Your city at a glance — the central hub.',
    details: [
      'Aggregated stats from all four modules.',
      'Real-time alerts and AI-detected anomalies.',
      'Trend charts for crime, blight, and economic indicators.',
    ],
    icon: LayoutDashboard,
    gradient: 'from-amber-500 to-orange-600',
    route: '/',
    accentColor: 'text-amber-400',
    sidebarTarget: 'Command',
  },
  {
    id: 'sentinel',
    title: 'Sentinel MGM — Public Safety',
    description: 'AI-powered policing analytics.',
    details: [
      'Incidents — Browse 911 calls with filters and heatmaps.',
      'Force Multiplier — Optimize officer deployment efficiency.',
      'SB 298 Compliance — Track reporting requirements.',
      'Recruitment ROI — Model hiring cost-benefit scenarios.',
    ],
    icon: Shield,
    gradient: 'from-red-500 to-rose-600',
    route: '/sentinel',
    accentColor: 'text-sentinel-400',
    sidebarTarget: 'Sentinel MGM',
  },
  {
    id: 'youthshield',
    title: 'YouthShield — Youth Violence Prevention',
    description: 'Predictive analytics to protect youth.',
    details: [
      'Risk Zones — AI-identified areas with elevated risk.',
      'Gap Analysis — Where resources are lacking vs. needed.',
      'Intervention Planner — Targeted AI-generated action plans.',
    ],
    icon: Users,
    gradient: 'from-purple-500 to-violet-600',
    route: '/youthshield',
    accentColor: 'text-youthshield-400',
    sidebarTarget: 'YouthShield',
  },
  {
    id: 'blight',
    title: 'Blight-to-Bright — Urban Renewal',
    description: 'Transform neglected properties into community assets.',
    details: [
      'Blight Scores — AI severity scores rank remediation urgency.',
      'Regeneration Engine — Parcel-specific reuse recommendations.',
      'Contagion Analysis — Model how blight spreads between properties.',
    ],
    icon: Building2,
    gradient: 'from-blue-500 to-cyan-600',
    route: '/blight',
    accentColor: 'text-blight-400',
    sidebarTarget: 'Blight-to-Bright',
  },
  {
    id: 'compass',
    title: 'DataCenter Compass — Economic Impact',
    description: 'Quantify data center and infrastructure investment impact.',
    details: [
      'Impact Dashboard — Jobs, tax revenue, and GDP effects.',
      'What-If Simulator — Scenario models for different investments.',
      'CBA Designer — Cost-benefit analyses with AI insights.',
    ],
    icon: Compass,
    gradient: 'from-emerald-500 to-teal-600',
    route: '/compass',
    accentColor: 'text-compass-400',
    sidebarTarget: 'DataCenter Compass',
  },
  {
    id: 'intelligence',
    title: 'Intelligence Tools',
    description: 'Cross-module AI assistant and spatial search.',
    details: [
      'AI Assistant — Natural language questions about any city data.',
      'Geo Lookup — Search addresses for incidents, violations, permits.',
    ],
    icon: MessageSquare,
    gradient: 'from-pink-500 to-rose-600',
    route: '/ai',
    accentColor: 'text-pink-400',
    sidebarTarget: 'Intelligence',
  },
  {
    id: 'complete',
    title: "You're All Set!",
    description: 'You now know the key areas of Montgomery Command Center.',
    details: [
      'Use the sidebar to navigate between modules.',
      'Look for AI sparkle icons for AI-powered analysis.',
      'Restart this tour anytime from the help menu.',
    ],
    icon: CheckCircle2,
    gradient: 'from-emerald-500 to-green-600',
    accentColor: 'text-emerald-400',
  },
];

export default function OnboardingGuide() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [cardPos, setCardPos] = useState<{ top: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  // Position the card next to the highlighted sidebar group
  useEffect(() => {
    const step = STEPS[currentStep];
    if (!step.sidebarTarget) {
      setCardPos(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${step.sidebarTarget}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      // Center the card vertically relative to the sidebar group, clamped to viewport
      const cardHeight = 340;
      let top = rect.top + rect.height / 2 - cardHeight / 2;
      top = Math.max(16, Math.min(top, window.innerHeight - cardHeight - 16));
      setCardPos({ top });
    } else {
      setCardPos(null);
    }
  }, [currentStep, visible]);

  // Highlight sidebar target
  useEffect(() => {
    // Remove previous highlights
    document.querySelectorAll('[data-tour]').forEach(el => {
      el.classList.remove('tour-highlight');
    });
    const step = STEPS[currentStep];
    if (step.sidebarTarget && visible) {
      const el = document.querySelector(`[data-tour="${step.sidebarTarget}"]`);
      el?.classList.add('tour-highlight');
    }
    return () => {
      document.querySelectorAll('[data-tour]').forEach(el => {
        el.classList.remove('tour-highlight');
      });
    };
  }, [currentStep, visible]);

  const step = STEPS[currentStep];
  const totalSteps = STEPS.length;
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  const goTo = (idx: number) => {
    setCurrentStep(idx);
    const target = STEPS[idx];
    if (target.route && location.pathname !== target.route) {
      navigate(target.route);
    }
  };

  const goNext = () => {
    if (isLast) { completeOnboarding(); return; }
    goTo(currentStep + 1);
  };
  const goPrev = () => { if (!isFirst) goTo(currentStep - 1); };

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
  const hasTarget = !!step.sidebarTarget && cardPos;

  return (
    <>
      {/* Subtle backdrop — not blocking, just dimming the main content area */}
      <div
        className="fixed inset-0 z-[90] pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 256px, rgba(0,0,0,0.35) 256px)' }}
      />

      {/* Tour card */}
      <div
        ref={cardRef}
        className="fixed z-[100] animate-fade-in"
        style={hasTarget
          ? { left: 272, top: cardPos.top, width: 380 }
          : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 420 }
        }
      >
        {/* Arrow pointing left to sidebar */}
        {hasTarget && (
          <div
            className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0"
            style={{
              borderTop: '10px solid transparent',
              borderBottom: '10px solid transparent',
              borderRight: '10px solid var(--tour-arrow-color, rgba(30, 41, 59, 0.95))',
            }}
          />
        )}

        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-gray-200 dark:border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
          {/* Accent bar */}
          <div className={cn('h-1 w-full bg-gradient-to-r', step.gradient)} />

          <div className="p-5">
            {/* Header row */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg', step.gradient)}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {currentStep + 1} / {totalSteps}
                  </p>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{step.title}</h2>
                </div>
              </div>
              <button onClick={skipOnboarding} className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-all" title="Skip tour">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className={cn('text-xs leading-relaxed mb-3', step.accentColor)}>
              {step.description}
            </p>

            {/* Details */}
            <div className="space-y-1.5 mb-4">
              {step.details.map((detail, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={cn('w-4 h-4 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-bold text-white', step.gradient)}>
                    {i + 1}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>

            {/* Progress dots */}
            <div className="flex gap-1 mb-3">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={cn(
                    'h-1 rounded-full transition-all duration-300 cursor-pointer',
                    i === currentStep
                      ? cn('flex-[2] bg-gradient-to-r', step.gradient)
                      : i < currentStep
                      ? 'flex-1 bg-gray-400 dark:bg-slate-600'
                      : 'flex-1 bg-gray-200 dark:bg-slate-700/50'
                  )}
                />
              ))}
            </div>

            {/* Nav buttons */}
            <div className="flex items-center justify-between">
              <div>
                {!isFirst ? (
                  <button onClick={goPrev} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-all">
                    <ChevronLeft className="w-3 h-3" /> Back
                  </button>
                ) : (
                  <button onClick={skipOnboarding} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-all">
                    Skip Tour
                  </button>
                )}
              </div>
              <button
                onClick={goNext}
                className={cn('flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r', step.gradient)}
              >
                {isLast ? (
                  <><Sparkles className="w-3 h-3" /> Get Started</>
                ) : (
                  <>Continue <ChevronRight className="w-3 h-3" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function useOnboardingReset() {
  return useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY);
    window.location.reload();
  }, []);
}

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}
