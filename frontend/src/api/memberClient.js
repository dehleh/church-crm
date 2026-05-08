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
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return memberApi.post('/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  affiliations: () => memberApi.get('/me/affiliations'),
  giving: () => memberApi.get('/me/giving'),
  events: () => memberApi.get('/me/events'),
  listPrayers: () => memberApi.get('/me/prayer-requests'),
  submitPrayer: (data) => memberApi.post('/me/prayer-requests', data),
  welfarePackages: () => memberApi.get('/me/welfare/packages'),
  myWelfareApplications: () => memberApi.get('/me/welfare/applications'),
  submitWelfare: (data) => memberApi.post('/me/welfare/applications', data),
  myCounseling: () => memberApi.get('/me/counseling'),
  submitCounseling: (data) => memberApi.post('/me/counseling', data),
};

export default memberApi;
