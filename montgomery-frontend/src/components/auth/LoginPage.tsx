import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../api/client';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('tporterfield@montgomeryal.gov');
  const [password, setPassword] = useState('Montgomery2026!');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 40%, #1e1040 100%)'}}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/3 rounded-full blur-3xl" />
        {/* Grid */}
        <div className="absolute inset-0" style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px'}} />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 relative"
              style={{background: 'linear-gradient(135deg, #f59e0b, #b45309)'}}
            >
              <Shield className="w-10 h-10 text-white" />
              <div className="absolute inset-0 rounded-2xl animate-float" style={{background: 'linear-gradient(135deg, #f59e0b, #b45309)', filter: 'blur(20px)', opacity: 0.4, zIndex: -1}} />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black text-white tracking-tight"
            >
              Montgomery
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-amber-400/80 font-semibold tracking-widest text-xs uppercase mt-1"
            >
              Command Center
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-slate-400 text-sm mt-3"
            >
              City of Montgomery, Alabama · Unified Intelligence Platform
            </motion.p>
          </div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl border border-slate-700/50 p-8"
          >
            <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-800/70 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  placeholder="you@montgomery.gov"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-12 bg-slate-800/70 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{background: loading ? '#334155' : 'linear-gradient(135deg, #f59e0b, #b45309)'}}
              >
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Authenticating...</> : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <p className="text-xs text-slate-500 text-center mb-3">Demo credentials</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { role: 'EXECUTIVE (CTO)', email: 'tporterfield@montgomeryal.gov', pass: 'Montgomery2026!', color: 'text-amber-400' },
                  { role: 'EXECUTIVE (Mayor)', email: 'mayor@montgomeryal.gov', pass: 'Montgomery2026!', color: 'text-amber-400' },
                  { role: 'OPERATIONAL', email: 'shift.commander@mpd.montgomeryal.gov', pass: 'Montgomery2026!', color: 'text-blue-400' },
                  { role: 'CITIZEN', email: 'citizen@montgomery.example', pass: 'Montgomery2026!', color: 'text-slate-400' },
                ].map(({ role, email: e, pass, color }) => (
                  <button
                    key={role}
                    onClick={() => { setEmail(e); setPassword(pass); }}
                    className="text-xs p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <span className={`font-semibold ${color}`}>{role}</span>
                    <span className="text-slate-400 ml-2">{e}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          <p className="text-center text-xs text-slate-600 mt-6">
            © 2026 City of Montgomery · Secure Government Platform
          </p>
        </motion.div>
      </div>
    </div>
  );
}
