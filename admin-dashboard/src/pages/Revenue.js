import React, { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js';
import { adminService } from '../services/adminApi';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

const RevenuePage = () => {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminService.getRevenue({ period })
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div style={styles.loading}>Loading revenue data...</div>;

  const lineData = {
    labels: data?.byDay?.map((d) => d._id) || [],
    datasets: [{
      label: 'Platform Revenue (₹)',
      data: data?.byDay?.map((d) => d.platformCut) || [],
      borderColor: '#FFD700',
      backgroundColor: 'rgba(255,215,0,0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  const COLORS = ['#FF4444', '#4488FF', '#44DD88'];
  const donutData = {
    labels: data?.byMode?.map((m) => m._id) || [],
    datasets: [{
      data: data?.byMode?.map((m) => m.platformCut) || [],
      backgroundColor: COLORS,
      borderColor: '#1a0a2e',
      borderWidth: 2,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: 'rgba(255,255,255,0.6)' } },
      tooltip: { backgroundColor: '#1a0a2e', borderColor: '#FFD700', borderWidth: 1 },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
    },
  };

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>💰 Revenue</h1>
        <div style={styles.periodRow}>
          {['day', 'week', 'month'].map((p) => (
            <button
              key={p}
              style={{ ...styles.periodBtn, ...(period === p ? styles.periodBtnActive : {}) }}
              onClick={() => setPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.totalCard}>
        <div style={styles.totalLabel}>Total Platform Revenue</div>
        <div style={styles.totalValue}>₹{(data?.totalRevenue || 0).toLocaleString('en-IN')}</div>
        <div style={styles.totalPeriod}>This {period}</div>
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>📈 Revenue Over Time</h3>
          <Line data={lineData} options={chartOptions} />
        </div>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>🎮 Revenue by Mode</h3>
          {(data?.byMode?.length || 0) > 0
            ? <Doughnut data={donutData} options={{ responsive: true, plugins: { legend: { labels: { color: 'rgba(255,255,255,0.6)' } } } }} />
            : <div style={styles.noData}>No data yet</div>}

          <div style={styles.modeTable}>
            {data?.byMode?.map((m, i) => (
              <div key={m._id} style={styles.modeRow}>
                <span style={{ color: COLORS[i % COLORS.length], fontWeight: 700 }}>● {m._id}</span>
                <span style={{ color: '#fff' }}>{m.games} games</span>
                <span style={{ color: '#FFD700', fontWeight: 800 }}>₹{m.platformCut?.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  loading: { color: '#FFD700', padding: 40, textAlign: 'center' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { color: '#FFD700', fontSize: 24, fontWeight: 900 },
  periodRow: { display: 'flex', gap: 6 },
  periodBtn: { padding: '8px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  periodBtnActive: { background: 'rgba(255,215,0,0.15)', borderColor: '#FFD700', color: '#FFD700' },
  totalCard: { background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05))', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 16, padding: '28px 32px', textAlign: 'center', marginBottom: 24 },
  totalLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 8 },
  totalValue: { color: '#FFD700', fontSize: 48, fontWeight: 900 },
  totalPeriod: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 6 },
  chartsGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 },
  chartCard: { background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,215,0,0.15)' },
  chartTitle: { color: '#FFD700', fontSize: 14, fontWeight: 800, marginBottom: 16 },
  noData: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 40 },
  modeTable: { marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  modeRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 13 },
};

export default RevenuePage;
