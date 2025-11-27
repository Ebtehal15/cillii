import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 
  (import.meta.env.PROD ? 'https://cillii.onrender.com' : 'http://localhost:4000');

const apiClient = axios.create({
  baseURL,
  withCredentials: true, // Session cookie'leri için gerekli
});

// Request interceptor - giden istekleri logla
apiClient.interceptors.request.use(
  (config) => {
    console.log('🚀 API Request:', config.method?.toUpperCase(), config.url, config.data);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - gelen cevapları logla
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url, response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;


















