import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import LoginPage from './components/auth/LoginPage';
import AppShell from './components/layout/AppShell';
import CommandDashboard from './components/command/CommandDashboard';
import SentinelDashboard from './components/sentinel/SentinelDashboard';
import YouthShieldDashboard from './components/youthshield/YouthShieldDashboard';
import BlightDashboard from './components/blight/BlightDashboard';
import CompassDashboard from './components/compass/CompassDashboard';
import AIChatPage from './components/ai/AIChatPage';
import SettingsPage from './components/settings/SettingsPage';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: '#0f172a'}}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading Montgomery Command Center...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<CommandDashboard />} />
        <Route path="/sentinel" element={<SentinelDashboard />} />
        <Route path="/youthshield" element={<YouthShieldDashboard />} />
        <Route path="/blight" element={<BlightDashboard />} />
        <Route path="/compass" element={<CompassDashboard />} />
        <Route path="/ai-chat" element={<AIChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
