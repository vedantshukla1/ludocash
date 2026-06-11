import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminApi';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [page, search]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminService.getUsers({ page, limit: 20, search });
      setUsers(data.users);
      setTotal(data.pagination.total);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const viewUser = async (userId) => {
    setSelectedUser(userId);
    try {
      const { data } = await adminService.getUser(userId);
      setUserDetail(data);
    } catch (_) {}
  };

  const handleBlock = async (userId, isBlocked) => {
    try {
      await adminService.blockUser(userId, isBlocked);
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isBlocked } : u));
      if (userDetail?.user?._id === userId) {
        setUserDetail((prev) => ({ ...prev, user: { ...prev.user, isBlocked } }));
      }
    } catch (_) {}
  };

  const handleAdjustWallet = async (userId) => {
    const amt = parseFloat(adjustAmount);
    if (isNaN(amt)) return alert('Enter a valid amount');
    try {
      const { data } = await adminService.adjustWallet(userId, { adjustment: amt, reason: adjustReason });
      alert(`Wallet adjusted. New balance: ₹${data.wallet.balance}`);
      setAdjustAmount('');
      setAdjustReason('');
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 style={styles.title}>👥 Users</h1>

      <div style={styles.toolbar}>
        <input
          placeholder="🔍 Search by name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ ...styles.searchInput }}
        />
        <span style={styles.count}>{total} users total</span>
      </div>

      <div style={styles.tableWrap}>
        <table>
          <thead>
            <tr style={styles.thead}>
              {['Name', 'Email', 'Balance', 'Games', 'Wins', 'State', 'Joined', 'Status', 'Actions'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={styles.loading}>Loading...</td></tr>
            ) : users.map((u) => (
              <tr key={u._id} style={styles.tr}>
                <td style={styles.td}>
                  <button style={styles.nameBtn} onClick={() => viewUser(u._id)}>{u.name}</button>
                </td>
                <td style={styles.td}>{u.email}</td>
                <td style={styles.td}>₹{u.wallet?.balance?.toFixed(0)}</td>
                <td style={styles.td}>{u.stats?.totalGames}</td>
                <td style={styles.td}>{u.stats?.wins}</td>
                <td style={styles.td}>{u.state || '-'}</td>
                <td style={styles.td}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, backgroundColor: u.isBlocked ? '#ff444422' : '#44dd8822', color: u.isBlocked ? '#FF4444' : '#44DD88' }}>
                    {u.isBlocked ? 'Blocked' : 'Active'}
                  </span>
                </td>
                <td style={styles.td}>
                  <button
                    style={{ ...styles.actionBtn, color: u.isBlocked ? '#44DD88' : '#FF4444' }}
                    onClick={() => handleBlock(u._id, !u.isBlocked)}
                  >
                    {u.isBlocked ? 'Unblock' : 'Block'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={styles.pagination}>
        <button style={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
        <span style={styles.pageInfo}>Page {page} / {totalPages}</span>
        <button style={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>

      {/* User detail modal */}
      {selectedUser && userDetail && (
        <div style={styles.modalBg} onClick={() => { setSelectedUser(null); setUserDetail(null); }}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>👤 {userDetail.user.name}</h2>
              <button style={styles.closeBtn} onClick={() => { setSelectedUser(null); setUserDetail(null); }}>✕</button>
            </div>

            <div style={styles.detailGrid}>
              <div><span style={styles.detailLabel}>Email:</span> {userDetail.user.email}</div>
              <div><span style={styles.detailLabel}>State:</span> {userDetail.user.state || '-'}</div>
              <div><span style={styles.detailLabel}>Balance:</span> ₹{userDetail.user.wallet?.balance?.toFixed(0)}</div>
              <div><span style={styles.detailLabel}>Withdrawable:</span> ₹{userDetail.user.wallet?.withdrawable?.toFixed(0)}</div>
              <div><span style={styles.detailLabel}>Bonus:</span> ₹{userDetail.user.wallet?.bonus?.toFixed(0)}</div>
              <div><span style={styles.detailLabel}>Games:</span> {userDetail.user.stats?.totalGames}</div>
              <div><span style={styles.detailLabel}>Wins:</span> {userDetail.user.stats?.wins}</div>
              <div><span style={styles.detailLabel}>Earnings:</span> ₹{userDetail.user.stats?.totalEarnings?.toFixed(0)}</div>
            </div>

            {/* Wallet adjustment */}
            <div style={styles.adjustSection}>
              <h4 style={styles.adjustTitle}>💰 Adjust Wallet</h4>
              <div style={styles.adjustRow}>
                <input
                  placeholder="Amount (+/-)"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  type="number"
                  style={{ width: 120 }}
                />
                <input
                  placeholder="Reason"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  style={styles.adjustBtn}
                  onClick={() => handleAdjustWallet(userDetail.user._id)}
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Recent transactions */}
            <h4 style={styles.adjustTitle}>Recent Transactions</h4>
            <div style={styles.txnList}>
              {userDetail.recentTransactions.slice(0, 8).map((t) => (
                <div key={t._id} style={styles.txnItem}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{t.type}</span>
                  <span style={{ color: ['deposit','winning','bonus','refund'].includes(t.type) ? '#44DD88' : '#FF4444' }}>
                    {['deposit','winning','bonus','refund'].includes(t.type) ? '+' : '-'}₹{Math.abs(t.amount)}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                    {new Date(t.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  title: { color: '#FFD700', fontSize: 24, fontWeight: 900, marginBottom: 20 },
  toolbar: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 },
  searchInput: { width: 300 },
  count: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  tableWrap: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    border: '1px solid rgba(255,215,0,0.15)',
    overflow: 'hidden',
    overflowX: 'auto',
  },
  thead: { background: 'rgba(255,215,0,0.1)' },
  th: { padding: '12px 14px', color: '#FFD700', fontSize: 12, fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.05)' },
  td: { padding: '12px 14px', color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  loading: { padding: 30, textAlign: 'center', color: '#FFD700' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  nameBtn: { background: 'none', border: 'none', color: '#4488FF', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  actionBtn: { background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  pagination: { display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, justifyContent: 'center' },
  pageBtn: {
    padding: '8px 18px',
    background: 'rgba(255,215,0,0.1)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: 8,
    color: '#FFD700',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
  },
  pageInfo: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  modalBg: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#1a0a2e',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: 16,
    padding: 28,
    width: 560,
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { color: '#FFD700', fontSize: 20, fontWeight: 900 },
  closeBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 20, cursor: 'pointer' },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginBottom: 20,
    padding: 16,
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    fontSize: 13,
    color: '#fff',
  },
  detailLabel: { color: 'rgba(255,255,255,0.4)', marginRight: 4 },
  adjustSection: { marginBottom: 20 },
  adjustTitle: { color: '#FFD700', fontWeight: 800, marginBottom: 10, fontSize: 14 },
  adjustRow: { display: 'flex', gap: 8 },
  adjustBtn: {
    padding: '0 18px',
    background: '#FFD700',
    border: 'none',
    borderRadius: 8,
    color: '#1a0a2e',
    fontWeight: 900,
    fontSize: 13,
    cursor: 'pointer',
  },
  txnList: { display: 'flex', flexDirection: 'column', gap: 6 },
  txnItem: { display: 'flex', gap: 16, justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 },
};

export default UsersPage;
