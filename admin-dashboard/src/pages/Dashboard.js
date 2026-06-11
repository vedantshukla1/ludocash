import React, { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { adminService } from '../services/adminApi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const StatCard = ({ icon, label, value, sub, color }) => (
  <div style={{ ...styles.statCard, borderColor: color + '40' }}>
    <div style={styles.statIcon}>{icon}</div>
    <div style={styles.statValue}>{value}</div>
    <div style={styles.statLabel}>{label}</div>
    {sub && <div style={styles.statSub}>{sub}</div>}
  </div>
);

const chartOptions = {
  responsive: true,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a0a2e', borderColor: '#FFD700', borderWidth: 1 } },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', fontSize: 11 } },
    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
  },
};

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = () =>
      adminService.getDashboard()
        .then((r) => {
          setData(r.data);
          setError('');
        })
        .catch((err) => {
          const msg = err.response?.data?.error
            || (err.response?.status === 401 ? 'Session expired — log in again' : null)
            || (!err.response ? 'Cannot reach backend — run: cd backend && npm start' : 'Failed to load dashboard');
          setError(msg);
          setData(null);
        })
        .finally(() => setLoading(false));

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div style={styles.loading}>Loading dashboard...</div>;
  if (!data) {
    return (
      <div style={styles.loading}>
        <div>{error || 'Failed to load dashboard.'}</div>
        <button type="button" style={styles.retryBtn} onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  const { stats, charts } = data;
  const dailyRevenue = charts?.dailyRevenue || [];
  const dailySignups = charts?.dailySignups || [];
  const dailyGames = charts?.dailyGames || [];
  const revenue = stats?.revenue || { today: 0, week: 0, month: 0 };

  const revenueChartData = {
    labels: dailyRevenue.map((d) => d._id),
    datasets: [{
      label: 'Revenue (₹)',
      data: dailyRevenue.map((d) => d.revenue),
      borderColor: '#FFD700',
      backgroundColor: 'rgba(255,215,0,0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  const signupsChartData = {
    labels: dailySignups.map((d) => d._id),
    datasets: [{
      label: 'New Users',
      data: dailySignups.map((d) => d.count),
      backgroundColor: 'rgba(68,136,255,0.7)',
      borderColor: '#4488FF',
      borderWidth: 1,
    }],
  };

  const gamesChartData = {
    labels: dailyGames.map((d) => d._id),
    datasets: [{
      label: 'Games Played',
      data: dailyGames.map((d) => d.count),
      backgroundColor: 'rgba(68,221,136,0.7)',
      borderColor: '#44DD88',
      borderWidth: 1,
    }],
  };

  return (
    <div>
      <h1 style={styles.pageTitle}>📊 Dashboard</h1>

      {/* Stat cards */}
      <div style={styles.statsGrid}>
        <StatCard icon="👥" label="Total Users" value={stats.totalUsers.toLocaleString()} color="#4488FF" />
        <StatCard icon="🎮" label="Active Games" value={stats.activeGames} color="#44DD88" />
        <StatCard icon="💸" label="Pending Withdrawals" value={stats.pendingWithdrawals} color="#FF4444" />
        <StatCard icon="👤" label="New (7 days)" value={stats.recentSignups || 0} color="#FFD700" />
        <StatCard icon="💰" label="Revenue Today" value={`₹${revenue.today.toFixed(0)}`} color="#FFD700" />
        <StatCard icon="📈" label="Revenue (Week)" value={`₹${revenue.week.toFixed(0)}`} color="#44DD88" />
        <StatCard icon="📊" label="Revenue (Month)" value={`₹${revenue.month.toFixed(0)}`} color="#4488FF" />
      </div>

      {/* Charts */}
      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>📈 Daily Revenue (7 days)</h3>
          <Line data={revenueChartData} options={chartOptions} />
        </div>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>👤 New Signups (7 days)</h3>
          <Bar data={signupsChartData} options={chartOptions} />
        </div>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>🎮 Games Played (7 days)</h3>
          <Bar data={gamesChartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

const styles = {
  loading: { color: '#FFD700', fontSize: 16, padding: 40, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    padding: '10px 20px',
    background: 'rgba(255,215,0,0.2)',
    border: '1px solid rgba(255,215,0,0.5)',
    borderRadius: 8,
    color: '#FFD700',
    fontWeight: 700,
    cursor: 'pointer',
  },
  pageTitle: { color: '#FFD700', fontSize: 24, fontWeight: 900, marginBottom: 24 },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 16,
    marginBottom: 28,
  },
  statCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: '20px 16px',
    border: '1px solid',
    textAlign: 'center',
  },
  statIcon: { fontSize: 26, marginBottom: 8 },
  statValue: { color: '#fff', fontSize: 24, fontWeight: 900, marginBottom: 4 },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600 },
  statSub: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: 20,
  },
  chartCard: {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 20,
    border: '1px solid rgba(255,215,0,0.15)',
  },
  chartTitle: { color: '#FFD700', fontSize: 14, fontWeight: 800, marginBottom: 16 },
};

export default DashboardPage;
