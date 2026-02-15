// utils/api.js
import axios from 'axios';

// Get base URL without any trailing slash or /api
const getBaseURL = () => {
  const url = import.meta.env.VITE_API_URL || 
    (window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : 'https://circulink-beta-testing.onrender.com');
  
  // Remove trailing slash if present
  return url.replace(/\/+$/, '');
};

const API_BASE_URL = getBaseURL();

console.log('API Base URL:', API_BASE_URL); // For debugging

const api = axios.create({
  baseURL: API_BASE_URL, // No /api here - we'll add it in the requests
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} from ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config.url
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API No Response:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Request Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;