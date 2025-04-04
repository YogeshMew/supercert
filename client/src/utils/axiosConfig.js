import axios from 'axios';
import Cookies from 'js-cookie';

// Create a configured axios instance
const instance = axios.create({
  baseURL: 'http://localhost:5001',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor to include the authentication token in all requests
instance.interceptors.request.use(
  (config) => {
    // Get the token from cookies
    const token = Cookies.get('token');
    
    // If token exists, add to headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.log('API Error:', error.response?.data || error.message);
    
    // Handle 401 Unauthorized errors (token expired or invalid) 
    if (error.response && error.response.status === 401) {       
      // Don't redirect if the error happens during login/register
      if (error.config && (
        error.config.url.includes('/login') || 
        error.config.url.includes('/register') ||
        error.config.url.includes('/api/extract/image') ||
        error.config.url.includes('/verify/certificate')
      )) {
        return Promise.reject(error);
      }
      
      // Clean up authentication data
      Cookies.remove('token', { path: '/' });
      Cookies.remove('jwt', { path: '/' });
      localStorage.removeItem('user');

      // Redirect to login page if not already on login or register page
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default instance; 