import axiosInstance from '../utils/axios';

const API_BASE_URL = import.meta.env.VITE_API_GATEWAY || 'http://localhost:8080';

export const apiClient = {
  // Generic API call methods
  get: (url, config = {}) => axiosInstance.get(url, config),
  post: (url, data, config = {}) => axiosInstance.post(url, data, config),
  put: (url, data, config = {}) => axiosInstance.put(url, data, config),
  delete: (url, config = {}) => axiosInstance.delete(url, config),
  patch: (url, data, config = {}) => axiosInstance.patch(url, data, config),
};

export default apiClient;