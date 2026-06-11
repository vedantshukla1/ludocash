import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminApi';

const TYPE_COLORS = {
  deposit: '#44DD88', winning: '#FFD700', entry_fee: '#FF4444',
  withdraw: '#4488FF', bonus: '#FF69B4', tds: '#FF8C00',
  refund: '#44DD88', adjustment: '#aaa',
};

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [page, typeFilter, from, to]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (typeFilter) params.type = typeFilter;
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await adminService.getTransactions(params);
      setTransactions(data.transactions);
      setTotal(data.pagination.total);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await adminService.exportTransactions(params);
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transactions.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (_) { alert('Export failed'); }
  };

  const totalPages = Math.ceil(total / 50);
  const types = ['', 'deposit', 'winning', 'entry_fee', 'withdraw', 'bonus', 'tds', 'refund', 'adjustment'];

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>💳 Transactions</h1>
        <button style={styles.exportBtn} onClick={handleExport}>📥 Export CSV</button>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} style={{ width: 160 }}>
          {types.map((t) => <option key={t} value={t}>{t || 'All Types'}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" />
        <span style={styles.count}>{total} records</span>
      </div>

      <div style={styles.tableWrap}>
        <table>
          <thead>
            <tr style={styles.thead}>
              {['User', 'Email', 'Type', 'Amount', 'Status', 'Date'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={styles.loading}>Loading...</td></tr>
            ) : transactions.map((t) => (
              <tr key={t._id} style={styles.tr}>
                <td style={styles.td}>{t.userId?.name || '-'}</td>
                <td style={styles.td}>{t.userId?.email || '-'}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.typeBadge, color: TYPE_COLORS[t.type] || '#fff', borderColor: TYPE_COLORS[t.type] || '#fff' }}>
                    {t.type.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ ...styles.td, color: ['deposit','winning','bonus','refund'].includes(t.type) ? '#44DD88' : '#FF4444', fontWeight: 700 }}>
                  {['deposit','winning','bonus','refund'].includes(t.type) ? '+' : '-'}₹{Math.abs(t.amount).toFixed(0)}
                </td>
                <td style={styles.td}>
                  <span style={{ color: t.status === 'completed' ? '#44DD88' : t.status === 'failed' ? '#FF4444' : '#FFD700' }}>
                    {t.status}
                  </span>
                </td>
                <td style={styles.td}>{new Date(t.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.pagination}>
        <button style={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
        <span style={styles.pageInfo}>Page {page} / {totalPages}</span>
        <button style={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>
    </div>
  );
};

const styles = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { color: '#FFD700', fontSize: 24, fontWeight: 900 },
  exportBtn: { padding: '10px 20px', background: 'rgba(68,221,136,0.15)', border: '1px solid #44DD88', borderRadius: 8, color: '#44DD88', fontWeight: 700, cursor: 'pointer' },
  filters: { display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' },
  count: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginLeft: 'auto' },
  tableWrap: { background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,215,0,0.15)', overflow: 'hidden', overflowX: 'auto' },
  thead: { background: 'rgba(255,215,0,0.1)' },
  th: { padding: '12px 14px', color: '#FFD700', fontSize: 12, fontWeight: 700, textAlign: 'left' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.05)' },
  td: { padding: '12px 14px', color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  loading: { padding: 30, textAlign: 'center', color: '#FFD700' },
  typeBadge: { padding: '2px 8px', borderRadius: 12, border: '1px solid', fontSize: 11, fontWeight: 700 },
  pagination: { display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, justifyContent: 'center' },
  pageBtn: { padding: '8px 18px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 8, color: '#FFD700', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  pageInfo: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
};

export default TransactionsPage;
