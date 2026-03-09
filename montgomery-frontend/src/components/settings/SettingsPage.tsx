import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Users, Shield, Plus, Loader2, Save, AlertCircle } from 'lucide-react';
import { authApi } from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../api/client';
import Badge from '../shared/Badge';
import type { User as UserType } from '../../types';

export default function SettingsPage() {
  const { user, isExecutive } = useAuth();
  const { success, error: toastError } = useToast();
  const [tab, setTab] = useState('profile');
  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [title, setTitle] = useState(user?.title || '');
  const [dept, setDept] = useState(user?.department || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Register form
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('OPERATIONAL');
  const [regTitle, setRegTitle] = useState('');
  const [regDept, setRegDept] = useState('');
  const [regModules, setRegModules] = useState<string[]>([]);
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState('');

  useEffect(() => {
    if (isExecutive && tab === 'users') {
      setLoadingUsers(true);
      authApi.users().then(r => setUsers(r.users || [])).catch(() => {}).finally(() => setLoadingUsers(false));
    }
  }, [isExecutive, tab]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await authApi.updateMe({ name, title, department: dept });
      success('Profile Updated', 'Your profile has been saved');
    } catch (e) { toastError('Update failed', getErrorMessage(e)); }
    finally { setSavingProfile(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegistering(true);
    try {
      await authApi.register({ email: regEmail, password: regPassword, name: regName, role: regRole, title: regTitle, department: regDept, modules: regModules });
      success('User Created', `${regName} has been registered`);
      setRegEmail(''); setRegPassword(''); setRegName(''); setRegTitle(''); setRegDept(''); setRegModules([]);
      if (isExecutive) {
        authApi.users().then(r => setUsers(r.users || [])).catch(() => {});
      }
    } catch (e) {
      setRegError(getErrorMessage(e));
    } finally { setRegistering(false); }
  };

  const toggleModule = (mod: string) => {
    setRegModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };

  const roleColor = (r: string) => r === 'EXECUTIVE' ? 'amber' : r === 'OPERATIONAL' ? 'blue' : 'slate' as const;

  return (
    <div className="space-y-6 animate-slide-in-up max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-700/50 border border-slate-600/50 flex items-center justify-center">
          <Settings className="w-5 h-5 text-slate-300" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Settings</h1>
          <p className="text-slate-400 text-sm">Profile & administration</p>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50 w-fit">
        {[{ id: 'profile', icon: User, label: 'Profile' }, ...(isExecutive ? [{ id: 'users', icon: Users, label: 'Users' }, { id: 'register', icon: Plus, label: 'New User' }] : [])].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tab===t.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="glass rounded-2xl border border-slate-700/50 p-6 space-y-5">
          <div className="flex items-center gap-4 pb-5 border-b border-slate-700/50">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl font-black text-amber-400">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="font-bold text-white text-lg">{user?.name}</p>
              <p className="text-slate-400 text-sm">{user?.email}</p>
              <Badge label={user?.role || ''} color={roleColor(user?.role || '')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Full Name', value: name, setter: setName, placeholder: 'John Smith' },
              { label: 'Title', value: title, setter: setTitle, placeholder: 'CTO' },
              { label: 'Department', value: dept, setter: setDept, placeholder: 'Technology' },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-medium text-slate-400 mb-2">{f.label}</label>
                <input value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                  className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors" />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Modules Access</label>
            <div className="flex gap-2 flex-wrap">
              {(user?.modules || []).map(m => <Badge key={m} label={m} color="blue" />)}
              {user?.role === 'EXECUTIVE' && <Badge label="All Modules" color="amber" />}
            </div>
          </div>

          <button onClick={handleSaveProfile} disabled={savingProfile}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 bg-slate-700 hover:bg-slate-600">
            {savingProfile ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Profile</>}
          </button>
        </div>
      )}

      {tab === 'users' && isExecutive && (
        <div className="glass rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <h3 className="font-semibold text-white">System Users</h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-300">{users.length}</span>
            </div>
          </div>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-700/50 border border-slate-600/50 flex items-center justify-center font-bold text-sm text-white">
                      {u.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.department && <span className="text-xs text-slate-500">{u.department}</span>}
                    <Badge label={u.role} color={roleColor(u.role)} />
                    {u.modules?.map(m => <Badge key={m} label={m} color="slate" />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'register' && (
        <div className="glass rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Plus className="w-4 h-4 text-slate-400" />
            <h3 className="font-semibold text-white">Register New User</h3>
          </div>
          {regError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{regError}</p>
            </div>
          )}
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Full Name', value: regName, setter: setRegName, type: 'text', required: true },
                { label: 'Email', value: regEmail, setter: setRegEmail, type: 'email', required: true },
                { label: 'Password', value: regPassword, setter: setRegPassword, type: 'password', required: true },
                { label: 'Job Title', value: regTitle, setter: setRegTitle, type: 'text', required: false },
                { label: 'Department', value: regDept, setter: setRegDept, type: 'text', required: false },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-slate-400 mb-2">{f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                  <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)} required={f.required}
                    className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Role</label>
                <select value={regRole} onChange={e => setRegRole(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-white focus:outline-none">
                  {['EXECUTIVE','OPERATIONAL','CITIZEN'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            {regRole === 'OPERATIONAL' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Module Access</label>
                <div className="flex gap-2 flex-wrap">
                  {['sentinel','youthshield','blight','compass'].map(m => (
                    <button type="button" key={m} onClick={() => toggleModule(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${regModules.includes(m) ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button type="submit" disabled={registering}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
              style={{background:'linear-gradient(135deg,#6366f1,#4f46e5)'}}>
              {registering ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : <><Shield className="w-4 h-4" />Create User</>}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
