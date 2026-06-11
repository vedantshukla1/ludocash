import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminApi';

const STATUS_COLORS = {
  active: { bg: '#44dd8822', color: '#44DD88' },
  waiting: { bg: '#ffdd0022', color: '#FFD700' },
  completed: { bg: '#4488ff22', color: '#4488FF' },
  cancelled: { bg: '#ff444422', color: '#FF4444' },
};

const GamesPage = () => {
  const [games, setGames] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => { load(); }, [page, statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await adminService.getGames(params);
      setGames(data.games);
      setTotal(data.pagination.total);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const viewGame = async (gameId) => {
    try {
      const { data } = await adminService.getGame(gameId);
      setSelectedGame(data.game);
    } catch (_) {}
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 style={styles.title}>🎮 Games</h1>

      <div style={styles.filterRow}>
        {['', 'active', 'waiting', 'completed', 'cancelled'].map((s) => (
          <button
            key={s}
            style={{ ...styles.filterBtn, ...(statusFilter === s ? styles.filterBtnActive : {}) }}
            onClick={() => { setStatusFilter(s); setPage(1); }}
          >
            {s || 'All'}
          </button>
        ))}
        <span style={styles.count}>{total} games</span>
      </div>

      <div style={styles.tableWrap}>
        <table>
          <thead>
            <tr style={styles.thead}>
              {['Mode', 'Players', 'Entry', 'Prize Pool', 'Status', 'Created', 'Actions'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={styles.loading}>Loading...</td></tr>
            ) : games.map((g) => (
              <tr key={g._id} style={styles.tr}>
                <td style={styles.td}>{g.mode}</td>
                <td style={styles.td}>{g.players?.map((p) => p.name || p.userId?.name).join(', ') || '-'}</td>
                <td style={styles.td}>₹{g.entryFee}</td>
                <td style={{ ...styles.td, color: '#FFD700', fontWeight: 700 }}>₹{g.prizePool}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, ...(STATUS_COLORS[g.status] || {}) }}>
                    {g.status}
                  </span>
                </td>
                <td style={styles.td}>{new Date(g.createdAt).toLocaleDateString('en-IN')}</td>
                <td style={styles.td}>
                  <button style={styles.viewBtn} onClick={() => viewGame(g._id)}>View</button>
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

      {/* Game detail modal */}
      {selectedGame && (
        <div style={styles.modalBg} onClick={() => setSelectedGame(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>🎮 Game Details</h2>
              <button style={styles.closeBtn} onClick={() => setSelectedGame(null)}>✕</button>
            </div>

            <div style={styles.detailGrid}>
              <div><span style={styles.label}>Mode:</span> {selectedGame.mode}</div>
              <div><span style={styles.label}>Status:</span> {selectedGame.status}</div>
              <div><span style={styles.label}>Entry Fee:</span> ₹{selectedGame.entryFee}</div>
              <div><span style={styles.label}>Prize Pool:</span> ₹{selectedGame.prizePool}</div>
              <div><span style={styles.label}>Platform Cut:</span> ₹{selectedGame.platformCut}</div>
              {selectedGame.winner?.name && <div><span style={styles.label}>Winner:</span> {selectedGame.winner.name} ({selectedGame.winner.color})</div>}
              {selectedGame.startedAt && <div><span style={styles.label}>Started:</span> {new Date(selectedGame.startedAt).toLocaleString('en-IN')}</div>}
              {selectedGame.endedAt && <div><span style={styles.label}>Ended:</span> {new Date(selectedGame.endedAt).toLocaleString('en-IN')}</div>}
            </div>

            <h4 style={styles.sectionTitle}>Players</h4>
            <div style={styles.playerList}>
              {selectedGame.players?.map((p, i) => (
                <div key={i} style={styles.playerItem}>
                  <span style={{ color: getColorHex(p.color), fontWeight: 700 }}>●</span>
                  <span>{p.name || p.userId?.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{p.color}</span>
                </div>
              ))}
            </div>

            {selectedGame.gameState?.moveLog?.length > 0 && (
              <>
                <h4 style={styles.sectionTitle}>Move Log ({selectedGame.gameState.moveLog.length} moves)</h4>
                <div style={styles.moveLog}>
                  {selectedGame.gameState.moveLog.slice(-20).map((m, i) => (
                    <div key={i} style={styles.moveItem}>
                      <span style={{ color: getColorHex(m.color), fontWeight: 700 }}>{m.color}</span>
                      <span>rolled {m.dice}</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>piece #{m.pieceId} → pos {m.toPos}</span>
                      {m.killed && <span style={{ color: '#FF4444' }}>killed {m.killed}!</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const getColorHex = (c) => ({ red: '#FF4444', blue: '#4488FF', green: '#44DD88', yellow: '#FFD700' }[c] || '#fff');

const styles = {
  title: { color: '#FFD700', fontSize: 24, fontWeight: 900, marginBottom: 20 },
  filterRow: { display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' },
  filterBtn: { padding: '8px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  filterBtnActive: { background: 'rgba(255,215,0,0.15)', borderColor: '#FFD700', color: '#FFD700' },
  count: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginLeft: 'auto' },
  tableWrap: { background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,215,0,0.15)', overflow: 'hidden', overflowX: 'auto' },
  thead: { background: 'rgba(255,215,0,0.1)' },
  th: { padding: '12px 14px', color: '#FFD700', fontSize: 12, fontWeight: 700, textAlign: 'left' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.05)' },
  td: { padding: '12px 14px', color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  loading: { padding: 30, textAlign: 'center', color: '#FFD700' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  viewBtn: { padding: '5px 12px', background: 'rgba(68,136,255,0.15)', border: '1px solid #4488FF', borderRadius: 6, color: '#4488FF', fontWeight: 700, fontSize: 12, cursor: 'pointer' },
  pagination: { display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, justifyContent: 'center' },
  pageBtn: { padding: '8px 18px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 8, color: '#FFD700', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  pageInfo: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  modalBg: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#1a0a2e', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 16, padding: 28, width: 560, maxHeight: '80vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { color: '#FFD700', fontSize: 20, fontWeight: 900 },
  closeBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 20, cursor: 'pointer' },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20, padding: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 10, fontSize: 13, color: '#fff' },
  label: { color: 'rgba(255,255,255,0.4)', marginRight: 4 },
  sectionTitle: { color: '#FFD700', fontWeight: 800, marginBottom: 10, fontSize: 14, marginTop: 16 },
  playerList: { display: 'flex', flexDirection: 'column', gap: 6 },
  playerItem: { display: 'flex', gap: 10, alignItems: 'center', padding: '6px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 13 },
  moveLog: { maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 },
  moveItem: { display: 'flex', gap: 10, padding: '5px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: 12 },
};

export default GamesPage;
