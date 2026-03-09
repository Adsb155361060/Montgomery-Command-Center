import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

export const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('mcc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Unwrap { success, data } envelope from every response
client.interceptors.response.use(
  (res) => {
    // If backend returns { success, data }, unwrap to res.data = data
    if (res.data && typeof res.data === 'object' && 'success' in res.data && 'data' in res.data) {
      res.data = res.data.data;
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mcc_token');
      localStorage.removeItem('mcc_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const getErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error || err.response?.data?.message || err.message || 'Request failed';
  }
  return 'An unexpected error occurred';
};
