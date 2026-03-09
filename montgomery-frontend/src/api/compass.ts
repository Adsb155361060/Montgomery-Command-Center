import { client } from './client';

export const compassApi = {
  stats: async () => {
    const { data } = await client.get('/api/compass/stats');
    return data;
  },

  impact: async () => {
    const { data } = await client.get('/api/compass/impact');
    return data;
  },

  scenario: async (scenario: string) => {
    const { data } = await client.post('/api/compass/scenario', { scenario });
    return data;
  },

  cba: async (payload: { project?: string; investmentAmount?: number } = {}) => {
    const { data } = await client.post('/api/compass/cba', payload);
    return data;
  },

  permits: async (params: { district?: string; page?: number; limit?: number; projectType?: string; year?: number } = {}) => {
    const { data } = await client.get('/api/compass/permits', { params: { page: 1, limit: 50, ...params } });
    return data;
  },
};
