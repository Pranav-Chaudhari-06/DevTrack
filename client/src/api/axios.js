import axios from 'axios';
import { getToken, setToken, triggerUnauthenticated } from '../utils/tokenStore';

const api = axios.create({
  baseURL:         import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true, // send the httpOnly refresh cookie on every request
});

// ── Request: attach access token from memory ──────────────────────────────────
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response: on 401, attempt a silent token refresh then retry ───────────────
let isRefreshing  = false;
let failedQueue   = [];

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only intercept 401s — skip the refresh endpoint itself to avoid loops
    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.includes('/api/auth/refresh') ||
      original.url?.includes('/api/auth/login')
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue requests that arrive while a refresh is already in flight
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing    = true;

    try {
      const { data } = await api.post('/api/auth/refresh');
      setToken(data.token);
      processQueue(null, data.token);
      original.headers.Authorization = `Bearer ${data.token}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      setToken(null);
      triggerUnauthenticated(); // tells AuthContext to clear user state → PrivateRoute redirects
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
