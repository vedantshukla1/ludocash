import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://ludocash.onrender.com/api'; // Switched to production Render URL

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor — handle 401 / refresh ─────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        await AsyncStorage.setItem('accessToken', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        // Emit an event for the AuthContext to pick up
        return Promise.reject({ ...error, sessionExpired: true });
      }
    }
    return Promise.reject(error);
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  googleLogin: (data) => api.post('/auth/google', data),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
  dailyBonus: () => api.post('/auth/daily-bonus'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// ─── Wallet ───────────────────────────────────────────────────────────────────
export const walletAPI = {
  createOrder: (amount) => api.post('/wallet/create-order', { amount }),
  verifyPayment: (data) => api.post('/wallet/verify-payment', data),
  withdraw: (data) => api.post('/wallet/withdraw', data),
  getBalance: () => api.get('/wallet/balance'),
  getTransactions: (params) => api.get('/wallet/transactions', { params }),
  redeemReferral: (code) => api.post('/wallet/redeem-referral', { code }),
  redeemCoupon: (code) => api.post('/wallet/redeem-coupon', { code }),
};

// ─── Game ─────────────────────────────────────────────────────────────────────
export const gameAPI = {
  getHistory: (params) => api.get('/game/history', { params }),
  getGame: (gameId) => api.get(`/game/${gameId}`),
  getActiveGame: () => api.get('/game/active/current'),
  getWaitingCount: (mode, fee) => api.get(`/game/waiting-count/${mode}/${fee}`),
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export const leaderboardAPI = {
  get: (params) => api.get('/leaderboard', { params }),
};

export default api;
