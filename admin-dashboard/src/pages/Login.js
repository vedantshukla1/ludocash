import React, { useState } from 'react';
import { adminService } from '../services/adminApi';

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await adminService.login({ username, password });
      localStorage.setItem('adminToken', data.token);
      onLogin();
    } catch (err) {
      if (!err.response) {
        setError('Cannot reach server. Start the backend: cd backend && npm start');
      } else {
        setError(err.response?.data?.error || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoEmoji}>🎲</span>
          <div style={styles.logoText}>LudoCash</div>
          <div style={styles.logoSub}>Admin Dashboard</div>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Logging in...' : '🔐 Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1A0A2E, #2D1B5E)',
  },
  card: {
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 40,
    width: 380,
    border: '1px solid rgba(255,215,0,0.2)',
    boxShadow: '0 0 40px rgba(255,215,0,0.1)',
  },
  logo: { textAlign: 'center', marginBottom: 32 },
  logoEmoji: { fontSize: 48, display: 'block', marginBottom: 8 },
  logoText: { fontSize: 28, fontWeight: 900, color: '#FFD700', letterSpacing: 2 },
  logoSub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' },
  input: { width: '100%' },
  error: {
    padding: '10px 14px',
    background: 'rgba(255,68,68,0.15)',
    border: '1px solid rgba(255,68,68,0.4)',
    borderRadius: 8,
    color: '#FF6B6B',
    fontSize: 13,
  },
  btn: {
    padding: '14px',
    background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
    border: 'none',
    borderRadius: 10,
    color: '#1A0A2E',
    fontSize: 15,
    fontWeight: 900,
    cursor: 'pointer',
    marginTop: 8,
  },
};

export default LoginPage;
