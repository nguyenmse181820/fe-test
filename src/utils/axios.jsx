import axios from 'axios';


const axiosInstance = axios.create({
  // baseURL: 'http://localhost:8080/',
  baseURL: import.meta.env.VITE_API_GATEWAY || 'http://localhost:8080/',
  // timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          if (!window.location.pathname.includes('/login')) {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }
          break;
        case 403:
          console.error('Access denied');
          break;
        case 404:
          console.error('Resource not found');
          break;
        case 500:
          console.error('Server error');
          break;
        default:
          console.error('An error occurred:', error.response.data);
      }
    } else if (error.request) {
      console.error('No response received from server');
    } else {
      console.error('Error sending request:', error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance; 