import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isExecutive: boolean;
  isOperational: boolean;
  isCitizen: boolean;
  hasModule: (mod: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('mcc_token');
    const storedUser = localStorage.getItem('mcc_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      try { setUser(JSON.parse(storedUser)); } catch { localStorage.clear(); }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('mcc_token', res.token);
    localStorage.setItem('mcc_user', JSON.stringify(res.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('mcc_token');
    localStorage.removeItem('mcc_user');
  };

  const isExecutive = user?.role === 'EXECUTIVE';
  const isOperational = user?.role === 'OPERATIONAL';
  const isCitizen = user?.role === 'CITIZEN';
  const hasModule = (mod: string) => isExecutive || (user?.modules?.includes(mod as 'sentinel' | 'youthshield' | 'blight' | 'compass') ?? false);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isExecutive, isOperational, isCitizen, hasModule }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
