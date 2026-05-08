import axios from 'axios';

const memberApi = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

memberApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('memberToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

memberApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/member-auth/')) {
      localStorage.removeItem('memberToken');
      localStorage.removeItem('memberChurchSlug');
      const slug = window.location.pathname.split('/')[2];
      if (slug) window.location.href = `/portal/${slug}/login`;
    }
    return Promise.reject(err);
  }
);

export const memberAuthAPI = {
  login: (data) => memberApi.post('/member-auth/login', data),
  setPassword: (data) => memberApi.post('/member-auth/set-password', data),
};

export const memberPortalAPI = {
  home: () => memberApi.get('/me/home'),
  getProfile: () => memberApi.get('/me/profile'),
  updateProfile: (data) => memberApi.patch('/me/profile', data),
  giving: () => memberApi.get('/me/giving'),
  events: () => memberApi.get('/me/events'),
  submitPrayer: (data) => memberApi.post('/me/prayer-requests', data),
};

export default memberApi;
