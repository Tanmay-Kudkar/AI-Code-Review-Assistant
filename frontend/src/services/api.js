import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor — attach access token ──────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor — auto-refresh on 401 ─────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// ─── Server Wakeup Queue ──────────────────────────────────────────────────────
let isWakingUp = false;
let wakeupQueue = [];

const processWakeupQueue = () => {
  wakeupQueue.forEach((prom) => {
    prom.resolve();
  });
  wakeupQueue = [];
};

window.addEventListener('server-awake', () => {
  isWakingUp = false;
  processWakeupQueue();
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Guard: network errors (server down, CORS, etc.) have no config — just reject
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Check if a request failed because Render is spinning up (Network Error, Timeout, or 502/503)
    const isColdStartError = 
      error.message === 'Network Error' || 
      error.code === 'ECONNABORTED' ||
      error.message.includes('timeout') ||
      (error.response && (error.response.status === 502 || error.response.status === 503));

    // If we're already waking up, or we just detected a cold start error
    if ((isWakingUp || isColdStartError) && originalRequest.url !== '/' && !originalRequest._retryWakeup) {
      if (!isWakingUp) {
        isWakingUp = true;
        window.dispatchEvent(new Event('server-wakeup-required'));
      }
      originalRequest._retryWakeup = true;
      return new Promise((resolve) => {
        wakeupQueue.push({ resolve });
      }).then(() => {
        return api(originalRequest);
      });
    }

    // Prevent infinite loop if the refresh token request itself fails with 401
    // Also skip refresh logic for login/register endpoints since 401 means invalid credentials there
    if (
      originalRequest.url === '/auth/refresh' ||
      originalRequest.url === '/auth/login' ||
      originalRequest.url === '/auth/register'
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        const newToken = data.accessToken;
        localStorage.setItem('accessToken', newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth API ────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
};

// ─── Reviews API ─────────────────────────────────────────────────────────────
export const reviewsApi = {
  submit: (formData) => api.post('/reviews', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  submitSnippet: (data) => api.post('/reviews', data),
  submitGithub: (data) => api.post('/reviews', data),
  list: (params) => api.get('/reviews', { params }),
  get: (id) => api.get(`/reviews/${id}`),
  delete: (id) => api.delete(`/reviews/${id}`),
  getStatic: (id) => api.get(`/reviews/${id}/static`),
  getAi: (id) => api.get(`/reviews/${id}/ai`),
  getComplexity: (id) => api.get(`/reviews/${id}/complexity`),
  getAiStatus: (id) => api.get(`/reviews/${id}/ai/status`),
  retryAi: (id, section) => api.post(`/reviews/${id}/retry`, { section }),
  generateFix: (id, payload) => api.post(`/reviews/${id}/fix`, payload, { timeout: 60000 }),
};

export default api;
