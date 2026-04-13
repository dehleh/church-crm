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
  importCsv: (data) => api.post('/members/import', data),
};

export const firstTimersAPI = {
  list: (params) => api.get('/first-timers', { params }),
  create: (data) => api.post('/first-timers', data),
  update: (id, data) => api.put(`/first-timers/${id}`, data),
  updateFollowUp: (id, data) => api.patch(`/first-timers/${id}/follow-up`, data),
  convert: (id) => api.post(`/first-timers/${id}/convert`),
  stats: () => api.get('/first-timers/stats'),
  importCsv: (data) => api.post('/first-timers/import', data),
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
  importTransactions: (data) => api.post('/finance/transactions/import', data),
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
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/communications/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
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
  getMessaging: () => api.get('/settings/messaging'),
  updateMessaging: (data) => api.put('/settings/messaging', data),
  testMessaging: (data) => api.post('/settings/messaging/test', data),
};

export const searchAPI = {
  global: (q) => api.get('/search', { params: { q } }),
};

export const groupsAPI = {
  list: () => api.get('/groups'),
  create: (data) => api.post('/groups', data),
  update: (id, data) => api.put(`/groups/${id}`, data),
  members: (id) => api.get(`/groups/${id}/members`),
  addMember: (id, data) => api.post(`/groups/${id}/members`, data),
  removeMember: (id, memberId) => api.delete(`/groups/${id}/members/${memberId}`),
};

export const assetsAPI = {
  list: (params) => api.get('/assets', { params }),
  get: (id) => api.get(`/assets/${id}`),
  create: (data) => api.post('/assets', data),
  update: (id, data) => api.put(`/assets/${id}`, data),
  delete: (id) => api.delete(`/assets/${id}`),
  stats: () => api.get('/assets/stats'),
};

export const counselingAPI = {
  list: (params) => api.get('/counseling', { params }),
  create: (data) => api.post('/counseling', data),
  update: (id, data) => api.patch(`/counseling/${id}`, data),
  stats: () => api.get('/counseling/stats'),
};

export const welfareAPI = {
  packages: () => api.get('/welfare/packages'),
  createPackage: (data) => api.post('/welfare/packages', data),
  applications: (params) => api.get('/welfare/applications', { params }),
  createApplication: (data) => api.post('/welfare/applications', data),
  reviewApplication: (id, data) => api.patch(`/welfare/applications/${id}`, data),
  stats: () => api.get('/welfare/stats'),
};

export const procurementAPI = {
  stats: () => api.get('/procurement/stats'),
  requisitions: (params) => api.get('/procurement/requisitions', { params }),
  createRequisition: (data) => api.post('/procurement/requisitions', data),
  updateRequisition: (id, data) => api.patch(`/procurement/requisitions/${id}`, data),
  purchaseRequests: (params) => api.get('/procurement/purchase-requests', { params }),
  createPurchaseRequest: (data) => api.post('/procurement/purchase-requests', data),
  reviewPurchaseRequest: (id, data) => api.patch(`/procurement/purchase-requests/${id}`, data),
  importRequisitions: (data) => api.post('/procurement/requisitions/import', data),
  importPurchaseRequests: (data) => api.post('/procurement/purchase-requests/import', data),
};
