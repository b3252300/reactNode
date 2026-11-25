import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

let refreshRequest = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';
    const isSessionEndpoint = ['/auth/login', '/auth/logout', '/auth/refresh'].some(
      (endpoint) => url.startsWith(endpoint)
    );

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !isSessionEndpoint &&
      !originalRequest._retried
    ) {
      originalRequest._retried = true;
      try {
        refreshRequest ??= api
          .post('/auth/refresh')
          .finally(() => {
            refreshRequest = null;
          });
        await refreshRequest;
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
