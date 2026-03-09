import { client } from './client';

export const geoApi = {
  lookup: async (address: string) => {
    const { data } = await client.get('/api/geo/lookup', { params: { address } });
    return data;
  },

  districts: async () => {
    const { data } = await client.get('/api/geo/districts');
    return data;
  },
};
