import axios from 'axios';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const normalizedApiUrl = rawApiUrl
  ? (rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://') ? rawApiUrl : `https://${rawApiUrl}`).replace(/\/+$/, '')
  : '';

export const API_BASE = normalizedApiUrl ? `${normalizedApiUrl}/api` : '/api';

const memberApi = axios.create({
  baseURL: API_BASE,
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
  myFellowship: () => memberApi.get('/me/fellowship'),
  browseNearbyFellowships: () => memberApi.get('/me/fellowship/browse'),
  joinFellowship: (data) => memberApi.post('/me/fellowship/join', data),
  submitCellReport: (data) => memberApi.post('/me/fellowship/reports', data),
  todayDevotional: () => memberApi.get('/me/devotionals/today'),
  listDevotionals: (params) => memberApi.get('/me/devotionals', { params }),
  getDevotionalByDate: (date) => memberApi.get(`/me/devotionals/${date}`),
  listDiscipleshipCourses: () => memberApi.get('/me/discipleship/courses'),
  getDiscipleshipCourse: (id) => memberApi.get(`/me/discipleship/courses/${id}`),
  enrollDiscipleshipCourse: (id) => memberApi.post(`/me/discipleship/courses/${id}/enroll`),
  completeLesson: (lessonId, data) => memberApi.post(`/me/discipleship/lessons/${lessonId}/complete`, data || {}),
  exportData: () => memberApi.get('/me/export'),
  birthdays: () => memberApi.get('/me/birthdays'),
  announcements: () => memberApi.get('/me/announcements'),
  media: (params) => memberApi.get('/me/media', { params }),
  mediaItem: (id) => memberApi.get(`/me/media/${id}`),
  givingOptions: () => memberApi.get('/me/giving/options'),
  initiateGiving: (data) => memberApi.post('/me/giving/initiate', data),
  getVirtualAccount: () => memberApi.get('/me/giving/virtual-account'),
  generateVirtualAccount: () => memberApi.post('/me/giving/virtual-account'),
  getPushVapidKey: () => memberApi.get('/me/push/vapid-key'),
  subscribePush: (data) => memberApi.post('/me/push/subscribe', data),
  unsubscribePush: (data) => memberApi.post('/me/push/unsubscribe', data),
  sendTestPush: () => memberApi.post('/me/push/test'),
  getPreferences: () => memberApi.get('/me/notifications/preferences'),
  updatePreferences: (data) => memberApi.put('/me/notifications/preferences', data),
};



export default memberApi;
