import axios from 'axios';

import {
  clearCsrfToken,
  clearSession,
  getStoredAccessToken,
  getStoredCsrfToken,
  storeCsrfToken,
  storeSession,
} from './session';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 10000,
  withCredentials: true,
});

let refreshPromise = null;

const ensureCsrfToken = async () => {
  const existing = getStoredCsrfToken();
  if (existing) return existing;
  const csrfResponse = await api.get('/auth/csrf-token');
  const csrfToken = csrfResponse.data?.csrfToken || '';
  if (csrfToken) {
    storeCsrfToken(csrfToken);
  }
  return csrfToken;
};

const refreshAccessToken = async () => {
  await ensureCsrfToken();
  const response = await api.post('/auth/refresh-token');
  const accessToken = response.data?.data?.accessToken;
  const user = response.data?.data?.user;
  if (!accessToken || !user) {
    throw new Error('Token refresh payload is invalid');
  }
  storeSession({ accessToken, user });
  return accessToken;
};

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  const csrfToken = getStoredCsrfToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (csrfToken && config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    config.headers = config.headers || {};
    config.headers['x-csrf-token'] = csrfToken;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config || {};
    const requestUrl = String(originalRequest.url || '');
    const isAuthRefreshCall = requestUrl.includes('/auth/refresh-token');
    const isCsrfCall = requestUrl.includes('/auth/csrf-token');

    if (status !== 401 || originalRequest._retry || isAuthRefreshCall || isCsrfCall) {
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearSession();
      clearCsrfToken();
      return Promise.reject(refreshError);
    }
  }
);

export default api;
