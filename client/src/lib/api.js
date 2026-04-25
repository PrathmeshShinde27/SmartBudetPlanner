import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sbp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sbp_token');
      localStorage.removeItem('sbp_user');
    }
    return Promise.reject(error);
  }
);
