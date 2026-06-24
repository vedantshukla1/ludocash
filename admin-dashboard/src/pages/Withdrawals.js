import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminApi';

const WithdrawalsPage = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => { load(); }, [page, statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminService.getWithdrawals({ page, limit: 20, status: statusFilter });
      setWithdrawals(data.withdrawals);
      setTotal(data.pagination.total);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const handleApprove = async (id) => {
    try {
      await adminService.approveWithdrawal(id);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleReject = async (id) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await adminService.rejectWithdrawal(id, { reason });
      load();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleBulkApprove = async () => {
    if (!selected.length) return alert('Select withdrawals first');
    if (!window.confirm(`Approve ${selected.length} withdrawals?`)) return;
    try {
      const { data } = await adminService.bulkApproveWithdrawals(selected);
      alert(`Approved: ${data.results.approved.length}, Failed: ${data.results.failed.length}`);
      setSelected([]);
      load();
    } catch (err) { alert('Bulk approval failed'); }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    const pending = withdrawals.filter((w) => w.status === 'pending').map((w) => w._id);
    setSelected(selected.length === pending.length ? [] : pending);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>💸 Withdrawals</h1>
        {statusFilter === 'pending' && (
          <button style={styles.bulkBtn} onClick={handleBulkApprove} disabled={!selected.length}>
            ✅ Bulk Approve ({selected.length})
          </button>
        )}
      </div>

      {/* Status filter */}
      <div style={styles.filterRow}>
        {['pending', 'approved', 'rejected', 'all'].map((s) => (
          <button
            key={s}
            style={{ ...styles.filterBtn, ...(statusFilter === s ? styles.filterBtnActive : {}) }}
            onClick={() => { setStatusFilter(s); setPage(1); setSelected([]); }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span style={styles.count}>{total} total</span>
      </div>

      <div style={styles.tableWrap}>
        <table>
          <thead>
            <tr style={styles.thead}>
              {statusFilter === 'pending' && <th style={styles.th}><input type="checkbox" onChange={selectAll} /></th>}
              {['User', 'Email', 'Amount', 'UPI ID', 'Status', 'Reason', 'Requested', 'Actions'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={styles.loading}>Loading...</td></tr>
            ) : withdrawals.map((w) => (
              <tr key={w._id} style={styles.tr}>
                {statusFilter === 'pending' && (
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={selected.includes(w._id)}
                      onChange={() => toggleSelect(w._id)}
                    />
                  </td>
                )}
                <td style={styles.td}>{w.userId?.name || '-'}</td>
                <td style={styles.td}>{w.userId?.email || '-'}</td>
                <td style={{ ...styles.td, color: '#FFD700', fontWeight: 800, fontSize: 16 }}>₹{w.amount}</td>
                <td style={styles.td}>{w.upiId}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, ...statusColor(w.status) }}>
                    {w.status}
                  </span>
                </td>
                <td style={{ ...styles.td, fontSize: 12, color: '#aaa', maxWidth: 150 }}>
                  {w.rejectionReason || (w.status === 'failed' ? 'Gateway Error' : '-')}
                </td>
                <td style={styles.td}>{new Date(w.createdAt).toLocaleDateString('en-IN')}</td>
                <td style={styles.td}>
                  {w.status === 'pending' && (
                    <div style={styles.actionBtns}>
                      <button style={styles.approveBtn} onClick={() => handleApprove(w._id)}>✅</button>
                      <button style={styles.rejectBtn} onClick={() => handleReject(w._id)}>❌</button>
                    </div>
                  )}
                  {w.status !== 'pending' && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>-</span>}
                </td>
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

const statusColor = (status) => ({
  pending: { backgroundColor: '#ffdd0022', color: '#FFD700' },
  approved: { backgroundColor: '#44dd8822', color: '#44DD88' },
  rejected: { backgroundColor: '#ff444422', color: '#FF4444' },
  processing: { backgroundColor: '#4488ff22', color: '#4488FF' },
  completed: { backgroundColor: '#44dd8822', color: '#44DD88' },
  failed: { backgroundColor: '#ff444422', color: '#FF4444' },
}[status] || {});

const styles = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { color: '#FFD700', fontSize: 24, fontWeight: 900 },
  bulkBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #44DD88, #22BB66)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer',
  },
  filterRow: { display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' },
  filterBtn: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 20,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
  },
  filterBtnActive: { background: 'rgba(255,215,0,0.15)', borderColor: '#FFD700', color: '#FFD700' },
  count: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginLeft: 'auto' },
  tableWrap: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    border: '1px solid rgba(255,215,0,0.15)',
    overflow: 'hidden',
    overflowX: 'auto',
  },
  thead: { background: 'rgba(255,215,0,0.1)' },
  th: { padding: '12px 14px', color: '#FFD700', fontSize: 12, fontWeight: 700, textAlign: 'left' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.05)' },
  td: { padding: '12px 14px', color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  loading: { padding: 30, textAlign: 'center', color: '#FFD700' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  actionBtns: { display: 'flex', gap: 6 },
  approveBtn: { padding: '4px 8px', background: 'rgba(68,221,136,0.15)', border: '1px solid #44DD88', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  rejectBtn: { padding: '4px 8px', background: 'rgba(255,68,68,0.15)', border: '1px solid #FF4444', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  pagination: { display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, justifyContent: 'center' },
  pageBtn: { padding: '8px 18px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 8, color: '#FFD700', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  pageInfo: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
};

export default WithdrawalsPage;
