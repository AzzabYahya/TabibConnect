import axios from 'axios';

import { getStoredAccessToken, getStoredCsrfToken } from './session';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 10000,
  withCredentials: true,
});

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

export default api;
