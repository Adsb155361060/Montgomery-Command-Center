import { client } from './client';

export const youthshieldApi = {
  stats: async () => {
    const { data } = await client.get('/api/youthshield/stats');
    return data;
  },

  riskZones: async (params: { district?: string; page?: number; limit?: number } = {}) => {
    const { data } = await client.get('/api/youthshield/risk-zones', { params: { page: 1, limit: 50, ...params } });
    return data;
  },

  recalculateRiskZones: async () => {
    const { data } = await client.post('/api/youthshield/risk-zones');
    return data;
  },

  intervention: async (payload: { zoneH3?: string; interventionType?: string } = {}) => {
    const { data } = await client.post('/api/youthshield/intervention', payload);
    return data;
  },

  gapAnalysis: async (district?: string) => {
    const { data } = await client.get('/api/youthshield/gap-analysis', { params: district ? { district } : {} });
    return data;
  },

  resources: async (type?: string) => {
    const { data } = await client.get('/api/youthshield/resources', { params: type ? { type } : {} });
    return data;
  },
};
