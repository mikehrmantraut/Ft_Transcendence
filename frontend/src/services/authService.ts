import axiosInstance from "../core/utils/interceptors/axiosInterceptors";
import tokenService from "./tokenService";

export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    displayName?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    user: {
        id: number;
        email: string;
        firstName: string;
        lastName: string;
        displayName: string;
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
        isRemoved: boolean;
    };
    accessToken: string;
    expiresIn: number;
}

class AuthService {
    private baseUrl = "http://localhost:3001/api"; // Geçici hardcoded URL

    async register(data: RegisterRequest): Promise<AuthResponse> {
        console.log("🚀 AuthService.register called with baseUrl:", this.baseUrl);
        const response = await axiosInstance.post<AuthResponse>(`${this.baseUrl}/auth/register`, data);
        
        // Token'ı kaydet
        tokenService.setToken(response.data.accessToken);
        
        return response.data;
    }

    async login(data: LoginRequest): Promise<AuthResponse> {
        const response = await axiosInstance.post<AuthResponse>(`${this.baseUrl}/auth/login`, data);
        
        // Token'ı kaydet
        tokenService.setToken(response.data.accessToken);
        
        return response.data;
    }

    async logout(): Promise<void> {
        try {
            await axiosInstance.post(`${this.baseUrl}/auth/logout`);
        } catch (error) {
            // Logout error'ı critical değil
            console.error('Logout error:', error);
        } finally {
            // Her durumda local token'ı temizle
            tokenService.removeToken();
        }
    }

    async refreshToken(): Promise<AuthResponse> {
        const response = await axiosInstance.post<AuthResponse>(`${this.baseUrl}/auth/refresh`);
        
        // Yeni token'ı kaydet
        tokenService.setToken(response.data.accessToken);
        
        return response.data;
    }
}

export const authService = new AuthService(); 