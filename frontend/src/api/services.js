import axios from 'axios';
import api, { API_BASE } from './client';

const publicApi = axios.create({
  baseURL: `${API_BASE}/public`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

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
  birthdays: (params) => api.get('/members/birthdays', { params }),
  sendBirthdayWish: (id, data = {}) => api.post(`/members/${id}/birthday-wish`, data),
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
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  sendReminder: (id) => api.post(`/events/${id}/remind`),
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
  previewAudience: (data) => api.post('/communications/preview-audience', data),
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

export const platformAPI = {
  stats: () => api.get('/platform/stats'),
  listChurches: (params) => api.get('/platform/churches', { params }),
  createChurch: (data) => api.post('/platform/churches', data),
  getChurch: (id) => api.get(`/platform/churches/${id}`),
  suspendChurch: (id, data) => api.patch(`/platform/churches/${id}/suspend`, data),
  activateChurch: (id) => api.patch(`/platform/churches/${id}/activate`),
  resetChurchAdminPassword: (id, data) => api.post(`/platform/churches/${id}/reset-admin-password`, data || {}),
  deleteChurch: (id) => api.delete(`/platform/churches/${id}`),
  updateSettings: (id, data) => api.patch(`/platform/churches/${id}/settings`, data),
  plans: () => api.get('/platform/plans'),
  listLicenseRequests: (params) => api.get('/platform/license-requests', { params }),
  updateLicenseRequest: (id, data) => api.patch(`/platform/license-requests/${id}`, data),
  auditLog: (params) => api.get('/platform/audit-log', { params }),
  impersonate: (id) => api.post(`/platform/churches/${id}/impersonate`),
};

export const licenseAPI = {
  submitRequest: (data) => axios.post('/api/license/request', data),
};

export const jobsAPI = {
  get: (id) => api.get(`/jobs/${id}`),
};

export const publicIntakeAPI = {
  getContext: (churchSlug) => publicApi.get(`/churches/${churchSlug}/intake`),
  getEventCheckIn: (churchSlug, eventId) => publicApi.get(`/churches/${churchSlug}/events/${eventId}/check-in`),
  submitFirstTimer: (churchSlug, data) => publicApi.post(`/churches/${churchSlug}/first-timers`, data),
  submitMember: (churchSlug, data) => publicApi.post(`/churches/${churchSlug}/members`, data),
  submitPrayerRequest: (churchSlug, data) => publicApi.post(`/churches/${churchSlug}/prayer-requests`, data),
  submitWelfareApplication: (churchSlug, data) => publicApi.post(`/churches/${churchSlug}/welfare-applications`, data),
  submitEventCheckIn: (churchSlug, eventId, data) => publicApi.post(`/churches/${churchSlug}/events/${eventId}/check-in`, data),
};

const contactAxios = axios.create({
  baseURL: `${API_BASE}/contact`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export const contactAPI = {
  submit: (data) => contactAxios.post('/', data),
  list: (params) => api.get('/contact', { params }),
  update: (id, data) => api.patch(`/contact/${id}`, data),
};

export const fellowshipAPI = {
  getSettings: () => api.get('/fellowship/settings'),
  updateSettings: (data) => api.put('/fellowship/settings', data),
  stats: () => api.get('/fellowship/stats'),
  zones: () => api.get('/fellowship/zones'),
  createZone: (data) => api.post('/fellowship/zones', data),
  updateZone: (id, data) => api.put(`/fellowship/zones/${id}`, data),
  centers: (params) => api.get('/fellowship/centers', { params }),
  getCenter: (id) => api.get(`/fellowship/centers/${id}`),
  createCenter: (data) => api.post('/fellowship/centers', data),
  updateCenter: (id, data) => api.put(`/fellowship/centers/${id}`, data),
  centerMembers: (id) => api.get(`/fellowship/centers/${id}/members`),
  addMember: (id, data) => api.post(`/fellowship/centers/${id}/members`, data),
  removeMember: (id, memberId) => api.delete(`/fellowship/centers/${id}/members/${memberId}`),
  unassignedMembers: (params) => api.get('/fellowship/unassigned-members', { params }),
  proximityMatch: (data) => api.post('/fellowship/proximity-match', data),
  reports: (params) => api.get('/fellowship/reports', { params }),
  submitReport: (data) => api.post('/fellowship/reports', data),
  joinRequests: () => api.get('/fellowship/join-requests'),
  reviewJoinRequest: (id, data) => api.patch(`/fellowship/join-requests/${id}`, data),
};

export const discipleshipAPI = {
  listCourses: (params) => api.get('/discipleship/courses', { params }),
  getCourse: (id) => api.get(`/discipleship/courses/${id}`),
  createCourse: (data) => api.post('/discipleship/courses', data),
  updateCourse: (id, data) => api.put(`/discipleship/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/discipleship/courses/${id}`),
  createLesson: (courseId, data) => api.post(`/discipleship/courses/${courseId}/lessons`, data),
  updateLesson: (lessonId, data) => api.put(`/discipleship/lessons/${lessonId}`, data),
  deleteLesson: (lessonId) => api.delete(`/discipleship/lessons/${lessonId}`),
  enrollMember: (courseId, data) => api.post(`/discipleship/courses/${courseId}/enroll`, data),
  seedDefaults: () => api.post('/discipleship/seed-default'),
};

export const devotionalsAPI = {
  list: (params) => api.get('/devotionals', { params }),
  getByDate: (date) => api.get(`/devotionals/date/${date}`),
  get: (id) => api.get(`/devotionals/${id}`),
  create: (data) => api.post('/devotionals', data),
  update: (id, data) => api.put(`/devotionals/${id}`, data),
  delete: (id) => api.delete(`/devotionals/${id}`),
  broadcast: (id, data) => api.post(`/devotionals/${id}/broadcast`, data),
  getSettings: () => api.get('/devotionals/settings'),
  updateSettings: (data) => api.put('/devotionals/settings', data),
  seedSamples: () => api.post('/devotionals/seed-samples'),
};

export const givingAPI = {
  getPublicInfo: (slug) => axios.get(`${API_BASE}/giving/public/${slug}/info`),
  initialize: (data) => axios.post(`${API_BASE}/giving/public/initialize`, data),
  verify: (reference, params) => axios.get(`${API_BASE}/giving/public/verify/${reference}`, { params }),
  listTransactions: (params) => api.get('/giving/transactions', { params }),
};

export const twoFactorAPI = {
  getStatus: () => api.get('/auth/2fa/status'),
  setup: () => api.post('/auth/2fa/setup'),
  enable: (data) => api.post('/auth/2fa/enable', data),
  disable: (data) => api.post('/auth/2fa/disable', data),
  verifyLogin: (data) => axios.post(`${API_BASE}/auth/2fa/verify-login`, data),
};

export const memberExportAPI = {
  exportData: () => api.get('/me/export'),
};

export const campaignsAPI = {
  list: (params) => api.get('/campaigns', { params }),
  get: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),
  recordDonation: (id, data) => api.post(`/campaigns/${id}/record-donation`, data),
  getPublicCampaigns: (churchSlug) => axios.get(`${API_BASE}/campaigns/public/${churchSlug}`),
  getPublicCampaign: (churchSlug, campaignSlug) => axios.get(`${API_BASE}/campaigns/public/${churchSlug}/${campaignSlug}`),
};


