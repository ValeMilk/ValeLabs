import axios from 'axios';
import type { LoginResponse, ApiResponse } from '../types/shared-types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// JWT interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ========== AUTH SERVICES ==========

export async function login(
  email: string,
  senha: string
): Promise<LoginResponse> {
  const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', {
    email,
    senha,
  });

  if (response.data.dados) {
    localStorage.setItem('token', response.data.dados.token);
    localStorage.setItem('usuario', JSON.stringify(response.data.dados.usuario));
  }

  return response.data.dados!;
}

export async function logout(): Promise<void> {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
}

export async function me(): Promise<any> {
  const response = await api.get<ApiResponse<any>>('/auth/me');
  return response.data.dados;
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function getUsuario(): any {
  const usuario = localStorage.getItem('usuario');
  return usuario ? JSON.parse(usuario) : null;
}

export function isLogado(): boolean {
  return !!getToken();
}
