import { client } from './client';

export const healthApi = {
  check: async () => {
    const { data } = await client.get('/api/health');
    return data;
  },
};
