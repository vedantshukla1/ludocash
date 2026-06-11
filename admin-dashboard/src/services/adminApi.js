import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const adminApi = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export const adminService = {
  login: (data) => adminApi.post('/admin/login', data),
  getDashboard: () => adminApi.get('/admin/dashboard'),

  // Users
  getUsers: (params) => adminApi.get('/admin/users', { params }),
  getUser: (id) => adminApi.get(`/admin/users/${id}`),
  blockUser: (id, isBlocked) => adminApi.put(`/admin/users/${id}/block`, { isBlocked }),
  adjustWallet: (id, data) => adminApi.put(`/admin/users/${id}/wallet`, data),

  // Games
  getGames: (params) => adminApi.get('/admin/games', { params }),
  getGame: (id) => adminApi.get(`/admin/games/${id}`),

  // Transactions
  getTransactions: (params) => adminApi.get('/admin/transactions', { params }),
  exportTransactions: (params) => adminApi.get('/admin/transactions/export/csv', { params, responseType: 'blob' }),

  // Withdrawals
  getWithdrawals: (params) => adminApi.get('/admin/withdrawals', { params }),
  approveWithdrawal: (id, data) => adminApi.put(`/admin/withdrawals/${id}/approve`, data),
  rejectWithdrawal: (id, data) => adminApi.put(`/admin/withdrawals/${id}/reject`, data),
  bulkApproveWithdrawals: (ids) => adminApi.post('/admin/withdrawals/bulk-approve', { ids }),

  // Revenue
  getRevenue: (params) => adminApi.get('/admin/revenue', { params }),

  // Settings
  getSettings: () => adminApi.get('/admin/settings'),
  updateSettings: (data) => adminApi.put('/admin/settings', data),
};

export default adminApi;
