import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' }
});

// Add JWT token to every request
api.interceptors.request.use(config => {
    const token = localStorage.getItem('gclientes_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    return config;
});

// Handle 401 responses
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('gclientes_token');
            localStorage.removeItem('gclientes_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
