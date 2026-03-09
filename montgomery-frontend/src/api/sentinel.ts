import { client } from './client';

export const sentinelApi = {
  stats: async (district?: string) => {
    const { data } = await client.get('/api/sentinel/stats', { params: district ? { district } : {} });
    return data;
  },

  incidents: async (params: { district?: string; page?: number; limit?: number; type?: string; category?: string } = {}) => {
    const { data } = await client.get('/api/sentinel/incidents', { params: { page: 1, limit: 50, ...params } });
    return data;
  },

  forceMultiplier: async (params: { district?: string; shift?: string; page?: number; limit?: number } = {}) => {
    const { data } = await client.get('/api/sentinel/force-multiplier', { params: { page: 1, limit: 50, ...params } });
    return data;
  },

  recalculateZones: async () => {
    const { data } = await client.post('/api/sentinel/force-multiplier');
    return data;
  },

  deployment: async (payload: { officerCount?: number; shift?: string; district?: string } = {}) => {
    const { data } = await client.post('/api/sentinel/deployment', { officerCount: 14, shift: 'day', ...payload });
    return data;
  },

  compliance: async () => {
    const { data } = await client.get('/api/sentinel/compliance');
    return data;
  },

  complianceScenario: async (payload: Record<string, unknown>) => {
    const { data } = await client.post('/api/sentinel/compliance', payload);
    return data;
  },

  recruitmentRoi: async (payload: { district?: string; shift?: string; additionalOfficers?: number } = {}) => {
    const { data } = await client.post('/api/sentinel/recruitment-roi', payload);
    return data;
  },

  analyze: async (payload: { analysisType: string; query: string; district?: string }) => {
    const { data } = await client.post('/api/sentinel/analyze', payload);
    return data;
  },
};
