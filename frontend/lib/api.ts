import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

// Standard API Error Response Model
export interface ApiErrorResponse {
  detail: string | Array<{ loc: string[]; msg: string; type: string }>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  price_per_liter: number;
  is_active: boolean;
  address?: string;
  daily_target_qty: number;
  language: string;
  theme: string;
  font_size: string;
  subscription_plan: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface Bill {
  id: string;
  customer_id: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  due_date: string;
  billing_month: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_ID_KEY = 'user_id';
const USER_ROLE_KEY = 'user_role';

// Helper to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Request interceptor for auth token and CSRF
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token for non-GET requests (required when cookies are sent)
    if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
      const csrfToken = getCookie('csrf_token');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
      
      // Inject Idempotency-Key to prevent double-writes on network retries
      if (!config.headers['Idempotency-Key']) {
        config.headers['Idempotency-Key'] = typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : `${Math.random().toString(36).substring(2, 15)}-${Date.now().toString(36)}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
        authApi.logout();
        if (!window.location.pathname.includes('/login')) window.location.href = '/';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        authApi.logout();
        if (!window.location.pathname.includes('/login')) window.location.href = '/';
        return Promise.reject(error);
      }

      try {
        const response = await authApi.refresh(refreshToken);
        const newAccessToken = response.data.access_token;
        const newRefreshToken = response.data.refresh_token || refreshToken;
        authApi.setTokens(newAccessToken, newRefreshToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        authApi.logout();
        if (!window.location.pathname.includes('/login')) window.location.href = '/';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403) {
      toast.error('Access denied. You do not have permission.');
    } else if (error.response?.status >= 500) {
      const reqId = error.response?.headers?.['x-request-id'];
      toast.error('Server error. Please try again later.', {
        id: 'server-error',
        description: reqId ? `Request ID: ${reqId}` : undefined,
      });
    } else if (error.response?.status >= 400 && error.response?.status !== 401) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      let errorMsg = 'An error occurred';
      if (axiosError.response?.data?.detail) {
        if (typeof axiosError.response.data.detail === 'string') {
          errorMsg = axiosError.response.data.detail;
        } else if (Array.isArray(axiosError.response.data.detail)) {
          errorMsg = axiosError.response.data.detail.map(d => d.msg).join(', ');
        }
      }
      toast.error('Request failed', {
        id: 'client-error',
        description: errorMsg,
      });
      // Note: We avoid aggressive toasts for 404s depending on the endpoint in the UI layer
    } else if (!error.response) {
      toast.error('Network error. Check your connection.', {
        id: 'server-error',
        action: { label: 'Retry', onClick: () => window.location.reload() },
      });
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login', credentials, {
      headers: { 'Content-Type': 'application/json' },
    }),

  verifyLoginOtp: (data: { temp_token: string; otp_code: string }) =>
    api.post('/auth/login/verify', data),

  resendLoginOtp: (temp_token: string) =>
    api.post('/auth/login/resend-otp', { temp_token }),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', null, {
      params: { refresh_token: refreshToken },
    }),

  logout: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_ROLE_KEY);
    const secure = '; Secure';
    document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; max-age=0${secure}`;
    document.cookie = `${REFRESH_TOKEN_KEY}=; path=/; max-age=0${secure}`;
    document.cookie = `${USER_ROLE_KEY}=; path=/; max-age=0${secure}`;
  },

  // Token storage helpers
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    const secure = '; Secure';
    document.cookie = `${ACCESS_TOKEN_KEY}=${accessToken}; path=/; max-age=86400; SameSite=Lax${secure}`;
    document.cookie = `${REFRESH_TOKEN_KEY}=${refreshToken}; path=/; max-age=604800; SameSite=Lax${secure}`;
  },

  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),

  setUserData: (userId: string, role: string) => {
    localStorage.setItem(USER_ID_KEY, userId);
    localStorage.setItem(USER_ROLE_KEY, role);
    const secure = '; Secure';
    document.cookie = `${USER_ROLE_KEY}=${role}; path=/; max-age=86400; SameSite=Lax${secure}`;
  },

  getUserId: () => localStorage.getItem(USER_ID_KEY),
  getUserRole: () => localStorage.getItem(USER_ROLE_KEY),

  forgotPassword: (identifier: string) =>
    api.post('/auth/forgot-password', { identifier }),

  checkResetStatus: (identifier: string) =>
    api.get('/auth/check-reset-status', { params: { identifier } }),

  resetPassword: (data: { identifier: string; new_password: string }) =>
    api.post('/auth/reset-password', data),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/auth/change-password', data),
};

// Users API
export const usersApi = {
  list: (month?: string) => api.get(month ? `/users/?month=${month}` : '/users/'),
  getMe: () => api.get<User>('/users/me'),
  create: (user: Partial<User>) => api.post('/users/', user),
  update: (userId: string, user: Partial<User>) => api.patch(`/users/${userId}`, user),
  updateMe: (user: Partial<User>) => api.patch('/users/me', user),
  delete: (userId: string) => api.delete(`/users/${userId}`),
};

// Consumption API
export const consumptionApi = {
  getGrid: (month: string) => api.get(`/consumption/grid?month=${month}`),
  getMine: (month: string) => api.get(`/consumption/mine?month=${month}`),
  updateMine: (data: Partial<{ date: string; quantity: number; extra_qty: number; status: string }>) => api.patch('/consumption/mine', data),
  upsert: (data: Partial<{ user_id: string; date: string; quantity: number; extra_qty: number }>) => api.patch('/consumption/', data),
  export: (month: string) => api.get(`/consumption/export?month=${month}&format=pdf`, { responseType: 'blob' }),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/consumption/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  verify: (consumptionId: string, approved: boolean) => api.post(`/consumption/${consumptionId}/verify?approved=${approved}`),
  getRequests: () => api.get('/consumption/requests'),
};

// Admin API
export const adminApi = {
  getDailyEntry: (date: string) => api.get(`/admin/daily-entry?selected_date=${date}`),
  saveDailyEntry: (date: string, entries: Array<{ user_id: string; liters: number }>) =>
    api.post(`/admin/daily-entry?selected_date=${date}`, entries),
  getPaymentsDashboard: (month: string, status?: string) => {
    const params = status ? `?month=${month}&status=${status}` : `?month=${month}`;
    return api.get(`/admin/payments${params}`);
  },
  sendReminder: (billId: string) => api.post(`/admin/payments/remind/${billId}`),
  getAuditLogs: () => api.get('/admin/audit-logs'),
  lock: (month: string, userId?: string) =>
    api.post(`/admin/lock?month=${month}${userId ? `&user_id=${userId}` : ""}`),
  unlock: (month: string, userId?: string) =>
    api.post(`/admin/unlock?month=${month}${userId ? `&user_id=${userId}` : ""}`),
};

// Admin Auth API
export const adminAuthApi = {
  getPasswordRequests: () => api.get('/admin/auth/password-requests'),
  approveRequest: (requestId: string) => api.post(`/admin/auth/password-requests/${requestId}/approve`),
  rejectRequest: (requestId: string) => api.post(`/admin/auth/password-requests/${requestId}/reject`),
};

// Bills API
export const billsApi = {
  generate: (userId: string, month: string) => api.post(`/bills/generate/${userId}/${month}`),
  generateAll: (month: string) => api.post(`/bills/generate-all?month=${month}`),
  get: (userId: string, month: string) => api.get(`/bills/${userId}/${month}`),
  list: (month?: string) => api.get(month ? `/bills/?month=${month}` : '/bills/'),
  getPdfStatus: (billId: string) => api.get(`/bills/${billId}/pdf-status`),
  submitUtr: (billId: string, utr: string) => api.post(`/bills/${billId}/submit-utr`, { utr_reference: utr }),
  bulkAction: (data: { bill_ids: string[]; status?: string; notes?: string }) => api.post('/bills/bulk-action', data),
};

// Payments API
export const paymentsApi = {
  createOrder: async (billId: string) => {
    const response = await api.post(`/payments/create-order/${billId}`);
    return response.data;
  },

  markPaid: async (billId: string, paymentMethod?: string, notes?: string) => {
    const response = await api.post(`/payments/mark-paid/${billId}`, {
      payment_method: paymentMethod || 'CASH',
      notes: notes || ''
    });
    return response.data;
  },
};

export const aiApi = {
  chat: async (message: string) => {
    const response = await api.post("/ai/chat", { message });
    return response.data;
  },
};

// Analytics API
export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getRevenueTrend: (months: number = 12) => api.get(`/analytics/revenue-trend?months=${months}`),
  getCustomerInsights: () => api.get('/analytics/customers'),
  getForecast: () => api.get('/analytics/forecast'),
};

// Support API
export const supportApi = {
  create: (data: { subject: string; message: string; priority?: string }) => api.post('/support/', data),
  getMyTickets: () => api.get('/support/'),
  getAllTickets: (status?: string) => api.get(status ? `/support/admin?status=${status}` : '/support/admin'),
};

// Registration API
export const registrationApi = {
  signup: (data: Record<string, unknown>) => api.post('/registration/signup', data),
  getRequests: () => api.get('/registration/requests'),
  approve: (regId: string) => api.post(`/registration/requests/${regId}/approve`),
  reject: (regId: string) => api.post(`/registration/requests/${regId}/reject`),
  verifyOtp: (data: { email: string; otp_code: string }) =>
    api.post('/registration/verify-otp', data).then(res => res.data),
  resendOtp: (email: string) =>
    api.post('/registration/resend-otp', { email }).then(res => res.data),
};

