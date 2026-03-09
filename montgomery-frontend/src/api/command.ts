import { client } from './client';

export const commandApi = {
  dashboard: async (district?: string) => {
    const { data } = await client.get('/api/command/dashboard', { params: district ? { district } : {} });
    return data;
  },

  alerts: async (params: { page?: number; limit?: number; severity?: string; module?: string } = {}) => {
    const { data } = await client.get('/api/command/alerts', { params: { page: 1, limit: 50, ...params } });
    return data;
  },

  generateAlerts: async () => {
    const { data } = await client.post('/api/command/alerts');
    return data;
  },

  briefing: async () => {
    const { data } = await client.get('/api/command/briefing');
    return data;
  },

  generateBriefing: async () => {
    const { data } = await client.post('/api/command/briefing');
    return data;
  },
};
