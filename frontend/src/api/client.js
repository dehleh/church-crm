import axios from 'axios';
import toast from 'react-hot-toast';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const normalizedApiUrl = rawApiUrl
  ? (rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://') ? rawApiUrl : `https://${rawApiUrl}`).replace(/\/+$/, '')
  : '';

export const API_BASE = normalizedApiUrl ? `${normalizedApiUrl}/api` : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle responses — detect if static server returned index.html instead of JSON
api.interceptors.response.use(
  res => {
    if (typeof res.data === 'string' && res.data.trim().startsWith('<!DOCTYPE html')) {
      const err = new Error(
        'Backend connection error: API request returned index.html instead of backend data. Please ensure VITE_API_URL is configured on church-crm-frontend in Railway.'
      );
      return Promise.reject(err);
    }
    return res;
  },
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    if (err.response?.status !== 401) {
      const data = err.response?.data;
      // License expired — redirect to dedicated screen
      if (err.response?.status === 402 && data?.code === 'LICENSE_EXPIRED') {
        if (window.location.pathname !== '/license-expired') {
          window.location.href = '/license-expired';
        }
        return Promise.reject(err);
      }
      let msg = data?.message || (err.message === 'Network Error' ? 'Unable to reach backend server. Please verify backend is online.' : 'Something went wrong');
      // Show field-level validation errors if present
      if (data?.errors?.length) {
        msg = data.errors.map(e => `${e.field}: ${e.message}`).join(', ');
      }
      toast.error(msg);
    }
    return Promise.reject(err);
  }
);

export default api;
