import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { LoadingScreen } from '@/components/shared';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Layout
import Layout from '@/components/layout/Layout';

// Auth pages (eager loaded)
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';

// Lazy-loaded pages
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const AlertsPage = lazy(() => import('@/pages/AlertsPage'));
const BriefingPage = lazy(() => import('@/pages/BriefingPage'));

// Sentinel
const SentinelOverview = lazy(() => import('@/pages/sentinel/SentinelOverview'));
const IncidentsPage = lazy(() => import('@/pages/sentinel/IncidentsPage'));
const ForceMultiplierPage = lazy(() => import('@/pages/sentinel/ForceMultiplierPage'));
const DeploymentPage = lazy(() => import('@/pages/sentinel/DeploymentPage'));
const CompliancePage = lazy(() => import('@/pages/sentinel/CompliancePage'));
const RecruitmentPage = lazy(() => import('@/pages/sentinel/RecruitmentPage'));

// YouthShield
const YouthShieldOverview = lazy(() => import('@/pages/youthshield/YouthShieldOverview'));
const RiskZonesPage = lazy(() => import('@/pages/youthshield/RiskZonesPage'));
const GapAnalysisPage = lazy(() => import('@/pages/youthshield/GapAnalysisPage'));
const ResourcesPage = lazy(() => import('@/pages/youthshield/ResourcesPage'));
const InterventionPage = lazy(() => import('@/pages/youthshield/InterventionPage'));

// Blight
const BlightOverview = lazy(() => import('@/pages/blight/BlightOverview'));
const NuisancesPage = lazy(() => import('@/pages/blight/NuisancesPage'));
const ViolationsPage = lazy(() => import('@/pages/blight/ViolationsPage'));
const PropertiesPage = lazy(() => import('@/pages/blight/PropertiesPage'));
const ScoresPage = lazy(() => import('@/pages/blight/ScoresPage'));
const RegenerationPage = lazy(() => import('@/pages/blight/RegenerationPage'));
const ContagionPage = lazy(() => import('@/pages/blight/ContagionPage'));

// Compass
const CompassOverview = lazy(() => import('@/pages/compass/CompassOverview'));
const ImpactPage = lazy(() => import('@/pages/compass/ImpactPage'));
const ScenarioPage = lazy(() => import('@/pages/compass/ScenarioPage'));
const CBAPage = lazy(() => import('@/pages/compass/CBAPage'));
const PermitsPage = lazy(() => import('@/pages/compass/PermitsPage'));

// Intelligence
const AiChatPage = lazy(() => import('@/pages/AiChatPage'));
const GeoLookupPage = lazy(() => import('@/pages/GeoLookupPage'));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen message="Loading..." />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route element={<Layout />}>
        <Route path="/" element={<SuspenseWrapper><DashboardPage /></SuspenseWrapper>} />
        <Route path="/alerts" element={<SuspenseWrapper><AlertsPage /></SuspenseWrapper>} />
        <Route path="/briefing" element={<SuspenseWrapper><BriefingPage /></SuspenseWrapper>} />

        {/* Sentinel */}
        <Route path="/sentinel" element={<SuspenseWrapper><SentinelOverview /></SuspenseWrapper>} />
        <Route path="/sentinel/incidents" element={<SuspenseWrapper><IncidentsPage /></SuspenseWrapper>} />
        <Route path="/sentinel/force-multiplier" element={<SuspenseWrapper><ForceMultiplierPage /></SuspenseWrapper>} />
        <Route path="/sentinel/deployment" element={<SuspenseWrapper><DeploymentPage /></SuspenseWrapper>} />
        <Route path="/sentinel/compliance" element={<SuspenseWrapper><CompliancePage /></SuspenseWrapper>} />
        <Route path="/sentinel/recruitment" element={<SuspenseWrapper><RecruitmentPage /></SuspenseWrapper>} />

        {/* YouthShield */}
        <Route path="/youthshield" element={<SuspenseWrapper><YouthShieldOverview /></SuspenseWrapper>} />
        <Route path="/youthshield/risk-zones" element={<SuspenseWrapper><RiskZonesPage /></SuspenseWrapper>} />
        <Route path="/youthshield/gap-analysis" element={<SuspenseWrapper><GapAnalysisPage /></SuspenseWrapper>} />
        <Route path="/youthshield/resources" element={<SuspenseWrapper><ResourcesPage /></SuspenseWrapper>} />
        <Route path="/youthshield/intervention" element={<SuspenseWrapper><InterventionPage /></SuspenseWrapper>} />

        {/* Blight */}
        <Route path="/blight" element={<SuspenseWrapper><BlightOverview /></SuspenseWrapper>} />
        <Route path="/blight/nuisances" element={<SuspenseWrapper><NuisancesPage /></SuspenseWrapper>} />
        <Route path="/blight/violations" element={<SuspenseWrapper><ViolationsPage /></SuspenseWrapper>} />
        <Route path="/blight/properties" element={<SuspenseWrapper><PropertiesPage /></SuspenseWrapper>} />
        <Route path="/blight/scores" element={<SuspenseWrapper><ScoresPage /></SuspenseWrapper>} />
        <Route path="/blight/regeneration" element={<SuspenseWrapper><RegenerationPage /></SuspenseWrapper>} />
        <Route path="/blight/contagion" element={<SuspenseWrapper><ContagionPage /></SuspenseWrapper>} />

        {/* Compass */}
        <Route path="/compass" element={<SuspenseWrapper><CompassOverview /></SuspenseWrapper>} />
        <Route path="/compass/impact" element={<SuspenseWrapper><ImpactPage /></SuspenseWrapper>} />
        <Route path="/compass/scenario" element={<SuspenseWrapper><ScenarioPage /></SuspenseWrapper>} />
        <Route path="/compass/cba" element={<SuspenseWrapper><CBAPage /></SuspenseWrapper>} />
        <Route path="/compass/permits" element={<SuspenseWrapper><PermitsPage /></SuspenseWrapper>} />

        {/* Intelligence */}
        <Route path="/ai" element={<SuspenseWrapper><AiChatPage /></SuspenseWrapper>} />
        <Route path="/geo" element={<SuspenseWrapper><GeoLookupPage /></SuspenseWrapper>} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
