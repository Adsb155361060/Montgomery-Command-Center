import { client } from './client';

export const blightApi = {
  stats: async () => {
    const { data } = await client.get('/api/blight/stats');
    return data;
  },

  scores: async (params: { district?: string; page?: number; limit?: number; minScore?: number } = {}) => {
    const { data } = await client.get('/api/blight/scores', { params: { page: 1, limit: 50, ...params } });
    return data;
  },

  scoreParcels: async () => {
    const { data } = await client.post('/api/blight/scores');
    return data;
  },

  regeneration: async (payload: { parcelNo?: string; district?: string; count?: number } = {}) => {
    const { data } = await client.post('/api/blight/regeneration', { count: 5, ...payload });
    return data;
  },

  contagion: async (payload: { parcelNo?: string; district?: string } = {}) => {
    const { data } = await client.post('/api/blight/contagion', payload);
    return data;
  },

  nuisances: async (params: { district?: string; page?: number; limit?: number } = {}) => {
    const { data } = await client.get('/api/blight/nuisances', { params: { page: 1, limit: 50, ...params } });
    return data;
  },

  violations: async (params: { district?: string; page?: number; limit?: number; status?: string } = {}) => {
    const { data } = await client.get('/api/blight/violations', { params: { page: 1, limit: 50, ...params } });
    return data;
  },

  properties: async (params: { page?: number; limit?: number; zoning?: string; maintBy?: string } = {}) => {
    const { data } = await client.get('/api/blight/properties', { params: { page: 1, limit: 50, ...params } });
    return data;
  },
};
