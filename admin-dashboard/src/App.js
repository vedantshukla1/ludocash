import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import UsersPage from './pages/Users';
import GamesPage from './pages/Games';
import TransactionsPage from './pages/Transactions';
import WithdrawalsPage from './pages/Withdrawals';
import RevenuePage from './pages/Revenue';
import SettingsPage from './pages/Settings';

const NAV_ITEMS = [
  { path: '/', icon: '📊', label: 'Dashboard' },
  { path: '/users', icon: '👥', label: 'Users' },
  { path: '/games', icon: '🎮', label: 'Games' },
  { path: '/transactions', icon: '💳', label: 'Transactions' },
  { path: '/withdrawals', icon: '💸', label: 'Withdrawals' },
  { path: '/revenue', icon: '💰', label: 'Revenue' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
];

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/login" replace />;
};

const Sidebar = ({ onLogout }) => {
  const location = useLocation();
  return (
    <aside style={styles.sidebar}>
      <div style={styles.sidebarLogo}>
        <span style={styles.logoEmoji}>🎲</span>
        <div>
          <div style={styles.logoText}>LudoCash</div>
          <div style={styles.logoSub}>Admin Panel</div>
        </div>
      </div>
      <nav style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{ ...styles.navItem, ...(isActive ? styles.navItemActive : {}) }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <button style={styles.logoutBtn} onClick={onLogout}>
        🚪 Logout
      </button>
    </aside>
  );
};

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('adminToken'));

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsLoggedIn(false);
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isLoggedIn
            ? <Navigate to="/" replace />
            : <LoginPage onLogin={() => setIsLoggedIn(true)} />
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div style={styles.layout}>
              <Sidebar onLogout={handleLogout} />
              <main style={styles.main}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/games" element={<GamesPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/withdrawals" element={<WithdrawalsPage />} />
                  <Route path="/revenue" element={<RevenuePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const styles = {
  layout: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    width: 220,
    background: 'linear-gradient(180deg, #1a0a2e 0%, #231245 100%)',
    borderRight: '1px solid rgba(255,215,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
  },
  sidebarLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 20px 24px',
    borderBottom: '1px solid rgba(255,215,0,0.15)',
    marginBottom: 16,
  },
  logoEmoji: { fontSize: 32 },
  logoText: { color: '#FFD700', fontWeight: 900, fontSize: 18, letterSpacing: 1 },
  logoSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 8,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  navItemActive: {
    background: 'rgba(255,215,0,0.15)',
    color: '#FFD700',
    borderLeft: '3px solid #FFD700',
  },
  navIcon: { fontSize: 18, width: 22 },
  logoutBtn: {
    margin: '16px 12px 0',
    padding: '10px 14px',
    background: 'rgba(255,68,68,0.1)',
    border: '1px solid rgba(255,68,68,0.3)',
    borderRadius: 8,
    color: '#FF4444',
    fontSize: 14,
    fontWeight: 700,
  },
  main: {
    flex: 1,
    padding: 28,
    background: '#0f0a1e',
    overflowY: 'auto',
    minHeight: '100vh',
  },
};

export default App;
