import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
});

// Interceptor to attach User or Admin JWT token
API.interceptors.request.use((config) => {
  const userToken = localStorage.getItem('bjp_user_token');
  const adminToken = localStorage.getItem('bjp_admin_token');

  const rawUrl = String(config.url || '').toLowerCase();
  const isAdminUrl = rawUrl.includes('admin');

  // Always attach adminToken for admin endpoints — highest priority
  if (isAdminUrl && adminToken && adminToken !== 'undefined' && adminToken !== 'null') {
    config.headers.Authorization = `Bearer ${adminToken}`;
  } else if (!isAdminUrl && userToken && userToken !== 'undefined' && userToken !== 'null') {
    config.headers.Authorization = `Bearer ${userToken}`;
  } else if (adminToken && adminToken !== 'undefined' && adminToken !== 'null') {
    config.headers.Authorization = `Bearer ${adminToken}`;
  } else if (userToken && userToken !== 'undefined' && userToken !== 'null') {
    config.headers.Authorization = `Bearer ${userToken}`;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default API;
