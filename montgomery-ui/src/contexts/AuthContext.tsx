import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { auth as authApi } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; role?: string }) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  isExecutive: boolean;
  isOperational: boolean;
  isCitizen: boolean;
  hasModule: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('mcc_token'),
    loading: true,
    error: null,
  });

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('mcc_token');
    if (!token) {
      setState({ user: null, token: null, loading: false, error: null });
      return;
    }
    try {
      const res = await authApi.me();
      setState({ user: res.data.user, token, loading: false, error: null });
    } catch {
      localStorage.removeItem('mcc_token');
      setState({ user: null, token: null, loading: false, error: null });
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (email: string, password: string) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem('mcc_token', res.data.token);
      setState({ user: res.data.user, token: res.data.token, loading: false, error: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setState(s => ({ ...s, loading: false, error: msg }));
      throw err;
    }
  };

  const register = async (data: { email: string; password: string; name: string; role?: string }) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const res = await authApi.register(data);
      localStorage.setItem('mcc_token', res.data.token);
      setState({ user: res.data.user, token: res.data.token, loading: false, error: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setState(s => ({ ...s, loading: false, error: msg }));
      throw err;
    }
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem('mcc_token');
    setState({ user: null, token: null, loading: false, error: null });
  };

  const clearError = () => setState(s => ({ ...s, error: null }));

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    clearError,
    isExecutive: state.user?.role === 'EXECUTIVE',
    isOperational: state.user?.role === 'OPERATIONAL',
    isCitizen: state.user?.role === 'CITIZEN',
    hasModule: (mod: string) => {
      if (!state.user) return false;
      if (state.user.role === 'EXECUTIVE') return true;
      return state.user.modules?.includes(mod) ?? false;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
