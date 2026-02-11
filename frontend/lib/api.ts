import axios from 'axios';

const API_URL = typeof window === 'undefined' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1')
  : '/api/v1';

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
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stored auth data
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_ID_KEY);
      localStorage.removeItem(USER_ROLE_KEY);

      // Redirect to login if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login', new URLSearchParams(credentials), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', null, {
      params: { refresh_token: refreshToken },
    }),

  logout: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_ROLE_KEY);
    document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; max-age=0`;
    document.cookie = `${REFRESH_TOKEN_KEY}=; path=/; max-age=0`;
    document.cookie = `${USER_ROLE_KEY}=; path=/; max-age=0`;
  },

  // Token storage helpers
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    document.cookie = `${ACCESS_TOKEN_KEY}=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `${REFRESH_TOKEN_KEY}=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;
  },

  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),

  setUserData: (userId: string, role: string) => {
    localStorage.setItem(USER_ID_KEY, userId);
    localStorage.setItem(USER_ROLE_KEY, role);
    document.cookie = `${USER_ROLE_KEY}=${role}; path=/; max-age=86400; SameSite=Lax`;
  },

  getUserId: () => localStorage.getItem(USER_ID_KEY),
  getUserRole: () => localStorage.getItem(USER_ROLE_KEY),
};

// Users API
export const usersApi = {
  list: (month?: string) => api.get(month ? `/users/?month=${month}` : '/users/'),
  getMe: () => api.get('/users/me'),
  updateMe: (data: any) => api.patch('/users/me', data),
  create: (user: any) => api.post('/users/', user),
  update: (userId: string, user: any) => api.patch(`/users/${userId}`, user),
  delete: (userId: string) => api.delete(`/users/${userId}`),
};

// Consumption API
export const consumptionApi = {
  getGrid: (month: string) => api.get(`/consumption/grid?month=${month}`),
  getMine: (month: string) => api.get(`/consumption/mine?month=${month}`),
  upsert: (data: any) => api.patch('/consumption/', data),
  export: (month: string) => api.get(`/consumption/export?month=${month}`, { responseType: 'blob' }),
  exportPdf: (month: string) => api.get(`/consumption/export-pdf?month=${month}`, { responseType: 'blob' }),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/consumption/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Admin API
export const adminApi = {
  getDailyEntry: (date: string) => api.get(`/admin/daily-entry?selected_date=${date}`),
  saveDailyEntry: (date: string, entries: any[]) =>
    api.post(`/admin/daily-entry?selected_date=${date}`, entries),
  getPaymentsDashboard: (month: string, status?: string) => {
    const params = status ? `?month=${month}&status=${status}` : `?month=${month}`;
    return api.get(`/admin/payments${params}`);
  },
  sendReminder: (billId: string) => api.post(`/admin/payments/remind/${billId}`),
  getAuditLogs: () => api.get('/admin/audit-logs'),
};

// Bills API
export const billsApi = {
  generate: (userId: string, month: string) => api.post(`/bills/generate/${userId}/${month}`),
  generateAll: (month: string) => api.post(`/bills/generate-all?month=${month}`),
  get: (userId: string, month: string) => api.get(`/bills/${userId}/${month}`),
  list: (month: string) => api.get(`/bills/?month=${month}`),
  getPdfStatus: (billId: string) => api.get(`/bills/${billId}/pdf-status`),
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

  submitReference: async (billId: string, utr: string) => {
    const response = await api.post(`/payments/submit-reference/${billId}`, { utr });
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
