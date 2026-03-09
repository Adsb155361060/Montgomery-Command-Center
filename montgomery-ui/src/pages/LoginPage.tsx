import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff, AlertCircle, Crown, Briefcase, Users, Zap } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    role: 'EXECUTIVE',
    label: 'Executive — Mayor',
    desc: 'Full access to all modules, briefings & AI tools',
    email: 'mayor@montgomeryal.gov',
    password: 'Montgomery2026!',
    icon: Crown,
    gradient: 'from-amber-500 to-orange-600',
    border: 'border-amber-500/30 hover:border-amber-500/60',
    badge: 'bg-amber-500/15 text-amber-400',
  },
  {
    role: 'OPERATIONAL',
    label: 'Operational — Patrol',
    desc: 'Shift commander with Sentinel module access',
    email: 'shift.commander@mpd.montgomeryal.gov',
    password: 'Montgomery2026!',
    icon: Briefcase,
    gradient: 'from-blue-500 to-cyan-600',
    border: 'border-blue-500/30 hover:border-blue-500/60',
    badge: 'bg-blue-500/15 text-blue-400',
  },
  {
    role: 'CITIZEN',
    label: 'Citizen',
    desc: 'Read-only public transparency portal',
    email: 'citizen@montgomery.example',
    password: 'Montgomery2026!',
    icon: Users,
    gradient: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-500/30 hover:border-emerald-500/60',
    badge: 'bg-emerald-500/15 text-emerald-400',
  },
];

export default function LoginPage() {
  const { login, error, clearError, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch { /* error handled by context */ }
  };

  const handleDemoLogin = async (account: typeof DEMO_ACCOUNTS[0]) => {
    setDemoLoading(account.role);
    try {
      await login(account.email, account.password);
      navigate('/');
    } catch {
      // If demo login fails (account doesn't exist), show credentials so user can register
      setEmail(account.email);
      setPassword(account.password);
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-red-500/10" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="relative z-10 text-center max-w-lg px-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center font-display font-bold text-white text-4xl mx-auto mb-8 shadow-2xl shadow-amber-500/20">
            M
          </div>
          <h1 className="font-display text-4xl font-bold text-white mb-4">
            Montgomery<br />Command Center
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            A Unified City Transformation Platform —
            Public Safety, Youth Violence Prevention, Urban Regeneration & Economic Intelligence
          </p>
          <div className="flex gap-3 mt-8 justify-center">
            {[
              { color: 'bg-sentinel-500', label: 'Sentinel' },
              { color: 'bg-youthshield-500', label: 'YouthShield' },
              { color: 'bg-blight-500', label: 'Blight' },
              { color: 'bg-compass-500', label: 'Compass' },
            ].map(m => (
              <div key={m.label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${m.color}`} />
                <span className="text-xs text-slate-500">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center font-display font-bold text-white text-2xl mx-auto mb-4">
              M
            </div>
            <h1 className="font-display text-2xl font-bold text-white">Montgomery Command Center</h1>
          </div>

          <div className="glass-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-display font-bold text-white">Sign In</h2>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-4 animate-slide-up">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
                <button onClick={clearError} className="ml-auto text-red-400 hover:text-red-300 text-xs">✕</button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Demo Quick Access */}
            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Demo Access</span>
              </div>
              <div className="space-y-2.5">
                {DEMO_ACCOUNTS.map(account => {
                  const Icon = account.icon;
                  const isLoading = demoLoading === account.role;
                  return (
                    <button
                      key={account.role}
                      onClick={() => handleDemoLogin(account)}
                      disabled={loading || demoLoading !== null}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border ${account.border} bg-slate-800/30 transition-all duration-200 hover:bg-slate-800/60 disabled:opacity-50 disabled:cursor-not-allowed group text-left`}
                    >
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${account.gradient} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{account.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${account.badge}`}>{account.role}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{account.desc}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {isLoading ? (
                          <div className="w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
                        ) : (
                          <span className="text-[10px] text-slate-600 font-mono">{account.email.split('@')[0]}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-sm text-slate-500 text-center mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-amber-500 hover:text-amber-400 font-medium">
                Register
              </Link>
            </p>
          </div>

          <p className="text-xs text-slate-600 text-center mt-6">
            City of Montgomery, Alabama — World Wide Vibes Hackathon 2026
          </p>
        </div>
      </div>
    </div>
  );
}
