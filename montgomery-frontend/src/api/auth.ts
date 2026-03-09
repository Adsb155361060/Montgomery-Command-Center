import { client } from './client';
import type { User, AuthResponse } from '../types';

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await client.post('/api/auth/login', { email, password });
    return data;
  },

  register: async (payload: {
    email: string; password: string; name: string;
    role?: string; title?: string; department?: string;
    district?: string; modules?: string[];
  }) => {
    const { data } = await client.post('/api/auth/register', payload);
    return data;
  },

  me: async (): Promise<{ user: User }> => {
    const { data } = await client.get('/api/auth/me');
    return data;
  },

  updateMe: async (payload: { name?: string; title?: string; department?: string; district?: string }) => {
    const { data } = await client.post('/api/auth/me', payload);
    return data;
  },

  users: async (): Promise<{ users: User[]; total: number }> => {
    const { data } = await client.get('/api/auth/users');
    return data;
  },
};
