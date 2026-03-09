import { client } from './client';

export const aiApi = {
  chat: async (payload: { message: string; module?: string; context?: string }) => {
    const { data } = await client.post('/api/ai/chat', { module: 'cross_module', ...payload });
    return data;
  },

  stats: async () => {
    const { data } = await client.get('/api/ai/stats');
    return data;
  },
};
