import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor for global error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || err.message || 'Network error';
    return Promise.reject(new Error(msg));
  }
);

export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

export const consumersAPI = {
  list: (params) => api.get('/consumers', { params }),
  get: (id) => api.get(`/consumers/${id}`),
  deleteMany: (ids) => api.delete('/consumers', { data: { ids } }),
};

export const billsAPI = {
  list: (params) => api.get('/bills', { params }),
  upload: (file, preview = false) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/bills/upload${preview ? '?preview=true' : ''}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const analyzeAPI = {
  run: (consumerId) => api.post(`/analyze/${consumerId}`),
};

export const aiAPI = {
  investigate: (consumerId) => api.post(`/ai-investigation/${consumerId}`),
};

export const alertsAPI = {
  list: (params) => api.get('/alerts', { params }),
  update: (id, data) => api.patch(`/alerts/${id}`, data),
};

export const reportsAPI = {
  list: (params) => api.get('/reports', { params }),
  get: (id) => api.get(`/reports/${id}`),
  create: (data) => api.post('/reports', data),
  remove: (id) => api.delete(`/reports/${id}`),
  removeMany: (ids) => api.delete('/reports', { data: { ids } }),
};

export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
