import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminApi';

const SettingsPage = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminService.getSettings()
      .then((r) => setSettings(r.data.settings))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminService.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (_) { alert('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const update = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));
  const updateCut = (mode, value) =>
    setSettings((prev) => ({ ...prev, platformCutPercent: { ...prev.platformCutPercent, [mode]: Number(value) } }));

  if (loading) return <div style={styles.loading}>Loading settings...</div>;

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>⚙️ Settings</h1>
        <button style={{ ...styles.saveBtn, ...(saved ? styles.saveBtnSuccess : {}) }} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? '✅ Saved!' : '💾 Save Changes'}
        </button>
      </div>

      {/* Maintenance mode */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🔧 Maintenance Mode</h3>
        <div style={styles.toggleRow}>
          <div>
            <div style={styles.settingLabel}>Block new games</div>
            <div style={styles.settingDesc}>When ON, no new games can be started. Existing games continue.</div>
          </div>
          <div
            style={{ ...styles.toggle, ...(settings.maintenanceMode ? styles.toggleOn : {}) }}
            onClick={() => update('maintenanceMode', !settings.maintenanceMode)}
          >
            <div style={{ ...styles.toggleThumb, ...(settings.maintenanceMode ? styles.toggleThumbOn : {}) }} />
          </div>
        </div>
        {settings.maintenanceMode && (
          <div style={styles.warning}>⚠️ Maintenance mode is ON. No new games will start.</div>
        )}
      </div>

      {/* Platform cut */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>💰 Platform Cut (%)</h3>
        {Object.entries(settings.platformCutPercent || {}).map(([mode, val]) => (
          <div key={mode} style={styles.settingRow}>
            <label style={styles.settingLabel}>{mode}</label>
            <div style={styles.inputRow}>
              <input
                type="number"
                min={0}
                max={50}
                value={val}
                onChange={(e) => updateCut(mode, e.target.value)}
                style={{ width: 80 }}
              />
              <span style={styles.settingDesc}>%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Withdrawal limits */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>💸 Withdrawal Limits</h3>
        <div style={styles.settingRow}>
          <label style={styles.settingLabel}>Minimum (₹)</label>
          <input
            type="number"
            value={settings.minWithdrawal}
            onChange={(e) => update('minWithdrawal', Number(e.target.value))}
            style={{ width: 120 }}
          />
        </div>
        <div style={styles.settingRow}>
          <label style={styles.settingLabel}>Maximum (₹)</label>
          <input
            type="number"
            value={settings.maxWithdrawal}
            onChange={(e) => update('maxWithdrawal', Number(e.target.value))}
            style={{ width: 120 }}
          />
        </div>
      </div>

      {/* Announcement banner */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📢 Announcement Banner</h3>
        <div style={styles.settingDesc}>Shown to all users in the app. Leave empty to hide.</div>
        <textarea
          value={settings.announcementBanner}
          onChange={(e) => update('announcementBanner', e.target.value)}
          placeholder="e.g. Server maintenance on Sunday 2AM-4AM IST"
          style={{ ...styles.textarea }}
          rows={3}
        />
        {settings.announcementBanner && (
          <div style={styles.bannerPreview}>
            📢 {settings.announcementBanner}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  loading: { color: '#FFD700', padding: 40, textAlign: 'center' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { color: '#FFD700', fontSize: 24, fontWeight: 900 },
  saveBtn: { padding: '10px 24px', background: 'linear-gradient(135deg, #FFD700, #FF8C00)', border: 'none', borderRadius: 8, color: '#1a0a2e', fontWeight: 900, fontSize: 14, cursor: 'pointer' },
  saveBtnSuccess: { background: 'linear-gradient(135deg, #44DD88, #22BB66)', color: '#fff' },
  section: { background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 24, marginBottom: 16, border: '1px solid rgba(255,215,0,0.1)' },
  sectionTitle: { color: '#FFD700', fontSize: 16, fontWeight: 800, marginBottom: 16 },
  settingRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  settingLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600, textTransform: 'capitalize' },
  settingDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  inputRow: { display: 'flex', alignItems: 'center', gap: 8 },
  toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  toggle: {
    width: 52, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.15)',
    cursor: 'pointer', position: 'relative', transition: 'background 0.3s', border: '1px solid rgba(255,255,255,0.2)',
  },
  toggleOn: { background: '#44DD88', border: '1px solid #44DD88' },
  toggleThumb: {
    position: 'absolute', top: 3, left: 3, width: 20, height: 20,
    borderRadius: 10, background: '#fff', transition: 'left 0.3s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  toggleThumbOn: { left: 27 },
  warning: {
    marginTop: 12, padding: '10px 14px',
    background: 'rgba(255,68,68,0.15)', border: '1px solid rgba(255,68,68,0.4)',
    borderRadius: 8, color: '#FF6B6B', fontSize: 13,
  },
  textarea: {
    width: '100%', marginTop: 10, resize: 'vertical',
    background: 'rgba(255,255,255,0.07)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
    padding: '10px 14px', fontSize: 14,
  },
  bannerPreview: {
    marginTop: 10, padding: '10px 14px',
    background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: 8, color: '#FFD700', fontSize: 13, fontWeight: 600,
  },
};

export default SettingsPage;
