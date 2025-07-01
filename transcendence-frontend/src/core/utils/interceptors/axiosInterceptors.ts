import axios from "axios";
import tokenService from "../../../services/tokenService";

// Daha güvenli fallback
const envUrl = import.meta.env.VITE_API_BASE_URL;
export const BASE_API_URL = envUrl && envUrl.trim() !== '' ? envUrl : "http://localhost:3001/api";

console.log("🔍 import.meta.env.VITE_API_BASE_URL:", import.meta.env.VITE_API_BASE_URL);
console.log("🔍 envUrl:", envUrl);
console.log("🔍 BASE_API_URL final:", BASE_API_URL);

const axiosInstance = axios.create({
    baseURL: BASE_API_URL,
});

axiosInstance.interceptors.request.use((config) => {
    const token = tokenService.getToken();

    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    console.log("🔍 Request interceptor çalıştı:", {
        url: config.url,
        baseURL: config.baseURL,
        fullURL: config.baseURL + config.url,
        method: config.method?.toUpperCase(),
        data: config.data
    });
    return config;
});

axiosInstance.interceptors.response.use(
    (response) => {
        console.log("✅ Response interceptor çalıştı", {
            status: response.status,
            url: response.config.url,
            data: response.data
        });
        return response;
    },
    (error) => {
        console.error("❌ Response interceptor error:", {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            baseURL: error.config?.baseURL,
            fullURL: (error.config?.baseURL || '') + (error.config?.url || ''),
            method: error.config?.method?.toUpperCase(),
            responseData: error.response?.data,
            code: error.code
        });
        
        // Detailed error for specific status codes
        if (error.response?.status === 404) {
            console.error("🚨 404 NOT FOUND - Endpoint bulunamadı:", {
                requestedURL: (error.config?.baseURL || '') + (error.config?.url || ''),
                availableEndpoints: [
                    'POST http://localhost:3001/api/auth/register',
                    'POST http://localhost:3001/api/auth/login'
                ]
            });
        }
        
        return Promise.reject(error);
    }
);

export default axiosInstance;
