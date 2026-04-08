import api from './client';

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

export const membersAPI = {
  list: (params) => api.get('/members', { params }),
  get: (id) => api.get(`/members/${id}`),
  create: (data) => api.post('/members', data),
  update: (id, data) => api.put(`/members/${id}`, data),
  delete: (id) => api.delete(`/members/${id}`),
  stats: () => api.get('/members/stats'),
};

export const firstTimersAPI = {
  list: (params) => api.get('/first-timers', { params }),
  create: (data) => api.post('/first-timers', data),
  updateFollowUp: (id, data) => api.patch(`/first-timers/${id}/follow-up`, data),
  convert: (id) => api.post(`/first-timers/${id}/convert`),
  stats: () => api.get('/first-timers/stats'),
};

export const eventsAPI = {
  list: (params) => api.get('/events', { params }),
  create: (data) => api.post('/events', data),
  stats: () => api.get('/events/stats'),
  recordAttendance: (id, data) => api.post(`/events/${id}/attendance`, data),
  getAttendance: (id) => api.get(`/events/${id}/attendance`),
};

export const financeAPI = {
  summary: (params) => api.get('/finance/summary', { params }),
  transactions: (params) => api.get('/finance/transactions', { params }),
  createTransaction: (data) => api.post('/finance/transactions', data),
  accounts: () => api.get('/finance/accounts'),
  createAccount: (data) => api.post('/finance/accounts', data),
  categories: () => api.get('/finance/categories'),
  createCategory: (data) => api.post('/finance/categories', data),
};

export const departmentsAPI = {
  list: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  members: (id) => api.get(`/departments/${id}/members`),
  addMember: (id, data) => api.post(`/departments/${id}/members`, data),
  removeMember: (id, memberId) => api.delete(`/departments/${id}/members/${memberId}`),
};

export const branchesAPI = {
  list: () => api.get('/branches'),
  get: (id) => api.get(`/branches/${id}`),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
};

export const mediaAPI = {
  list: (params) => api.get('/media', { params }),
  create: (data) => api.post('/media', data),
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  publish: (id) => api.patch(`/media/${id}/publish`),
  stats: () => api.get('/media/stats'),
};

export const prayerAPI = {
  list: (params) => api.get('/prayer', { params }),
  create: (data) => api.post('/prayer', data),
  update: (id, data) => api.patch(`/prayer/${id}`, data),
};

export const communicationsAPI = {
  list: (params) => api.get('/communications', { params }),
  create: (data) => api.post('/communications', data),
  send: (id) => api.post(`/communications/${id}/send`),
  delete: (id) => api.delete(`/communications/${id}`),
  stats: () => api.get('/communications/stats'),
};

export const usersAPI = {
  list: () => api.get('/users'),
  invite: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  resetPassword: (id) => api.post(`/users/${id}/reset-password`),
};

export const reportsAPI = {
  members: (params) => api.get('/reports/members', { params }),
  finance: (params) => api.get('/reports/finance', { params }),
  attendance: (params) => api.get('/reports/attendance', { params }),
  firstTimers: (params) => api.get('/reports/first-timers', { params }),
};

export const budgetsAPI = {
  list: () => api.get('/budgets'),
  create: (data) => api.post('/budgets', data),
  update: (id, data) => api.put(`/budgets/${id}`, data),
};

export const followUpsAPI = {
  list: (params) => api.get('/follow-ups', { params }),
  mine: () => api.get('/follow-ups/mine'),
  stats: () => api.get('/follow-ups/stats'),
  create: (data) => api.post('/follow-ups', data),
  update: (id, data) => api.patch(`/follow-ups/${id}`, data),
};

export const settingsAPI = {
  getChurch: () => api.get('/settings'),
  getStats: () => api.get('/settings/stats'),
  updateChurch: (data) => api.put('/settings/church', data),
  updateProfile: (data) => api.put('/settings/profile', data),
  changePassword: (data) => api.post('/settings/change-password', data),
};

export const searchAPI = {
  global: (q) => api.get('/search', { params: { q } }),
};
