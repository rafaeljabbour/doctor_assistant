// src/api/api.js
import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:8000/api', // Update this if your backend uses a different port or URL
});

// Automatically attach token (if available) to every request
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            config.headers.client = 'not-browser';
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default API;
