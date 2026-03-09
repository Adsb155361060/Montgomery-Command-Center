import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { FloatingAiAssistant } from './FloatingAiAssistant';
import OnboardingGuide from '@/components/onboarding/OnboardingGuide';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/shared';

export default function Layout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-navy-950">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center font-display font-bold text-white text-3xl mx-auto mb-4 animate-pulse-slow">
            M
          </div>
          <Spinner size="md" />
          <p className="text-slate-500 text-sm mt-3">Montgomery Command Center</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-navy-950">
      <Sidebar />
      <div className="ml-64 transition-all duration-300">
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
      <FloatingAiAssistant />
      <OnboardingGuide />
    </div>
  );
}
