import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '',
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

/* ── Endpoint helpers ─────────────────────────────────── */

export const authApi = {
  login: (username, password) => api.post('/login', { username, password }),
  signup: (username, password) => api.post('/signup', { username, password }),
};

export const stockApi = {
  news: (ticker, config) => api.get(`/stock/${encodeURIComponent(ticker)}`, config),
  history: (ticker) => api.get(`/stock/${encodeURIComponent(ticker)}/history`),
  quote: (ticker) => api.get(`/stock/${encodeURIComponent(ticker)}/quote`),
};

export const portfolioApi = {
  get: () => api.get('/portfolio'),
  add: (payload) => api.post('/portfolio/add', payload),
  remove: (payload) => api.post('/portfolio/remove', payload),
  history: () => api.get('/portfolio/history'),
};
