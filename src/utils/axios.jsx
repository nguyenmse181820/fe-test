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
    } else {
      console.log('⚠️ No token found for request:', config.url);
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
          console.error('❌ Access denied - Check user permissions and token validity');
          console.error('Request URL:', error.config?.url);
          console.error('Token exists:', !!localStorage.getItem('token'));
          break;
        case 404:
          console.error('Resource not found');
          break;
        case 500:
          console.error('Server error');
          break;
        case 503:
          console.error('Service unavailable - this may be due to the service being temporarily overloaded');
          // For booking operations, don't auto-redirect, let the component handle the retry
          if (error.config.url.includes('/bookings') && error.config.method === 'post') {
            console.warn('Booking operation in progress, may need retrying');
          }
          break;
        default:
          console.error('An error occurred:', error.response.data);
      }
    } else if (error.request) {
      console.error('No response received from server');
    } else {
      console.error('Error sending request:', error.message);
    }
    
    // If it's a timeout error, add a clearer message
    if (error.code === 'ECONNABORTED') {
      error.friendlyMessage = 'The request took too long to complete. The operation might still be processing.';
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
export { axiosInstance as api }; 