import React, { useState } from 'react';
import { syncUserCalendarToCloud } from '../utils/calendarApi';

export default function ShareCalendarModal({ isOpen, onClose, user, semester, overrides }) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  if (!isOpen) return null;

  const userId = user?.id || '';
  const shareUrl = userId ? `${window.location.origin}${window.location.pathname}?import=${userId}` : '';

  // Calculate summary counts
  const overrideEntries = Object.entries(overrides || {});
  const stats = {
    total: overrideEntries.length,
    exams: 0,
    holidays: 0,
    routines: 0,
    working: 0,
    off: 0,
    absent: 0,
    medical: 0,
  };

  overrideEntries.forEach(([_, info]) => {
    const s = (info?.status || '').toUpperCase();
    if (s === 'EXAM') stats.exams++;
    else if (s === 'HOLIDAY') stats.holidays++;
    else if (s === 'WORKING') stats.working++;
    else if (s === 'OFF') stats.off++;
    else if (s === 'ABSENT') stats.absent++;
    else if (s === 'MEDICAL_LEAVE') stats.medical++;

    if (info?.routineDay) stats.routines++;
  });

  const handleCopyId = async () => {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    } catch {
      // Fallback
      prompt('Copy your User ID:', userId);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      prompt('Copy your Share Link:', shareUrl);
    }
  };

  const handleSyncCloud = async () => {
    if (!userId) return;
    setSyncing(true);
    setSyncMessage(null);
    const result = await syncUserCalendarToCloud(userId, semester, overrides);
    setSyncing(false);
    if (result.success) {
      setSyncMessage({ type: 'success', text: 'Calendar synced with Supabase cloud!' });
    } else {
      setSyncMessage({ type: 'error', text: result.error || 'Failed to sync with cloud.' });
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleDownloadJSON = () => {
    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userId: userId || 'local_user',
      semester: semester || { startDate: '', endDate: '' },
      overrides: overrides || {}
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_calendar_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyJSON = async () => {
    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userId: userId || 'local_user',
      semester: semester || { startDate: '', endDate: '' },
      overrides: overrides || {}
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
    } catch {
      // Ignore
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>📤</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>Share My Calendar</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#888' }}>
                Export your schedule so another student can import and mirror it
              </p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <div style={styles.body}>
          {user ? (
            <>
              {/* User ID Section */}
              <div style={styles.card}>
                <div style={styles.labelRow}>
                  <span style={styles.fieldLabel}>Your Shareable User ID</span>
                  <span style={styles.badge}>Live Sync</span>
                </div>
                <div style={styles.codeRow}>
                  <code style={styles.codeBox}>{userId}</code>
                  <button
                    onClick={handleCopyId}
                    style={{
                      ...styles.actionBtn,
                      backgroundColor: copiedId ? '#2e7d32' : '#00bcd4',
                      color: '#fff',
                    }}
                  >
                    {copiedId ? '✓ Copied!' : '📋 Copy ID'}
                  </button>
                </div>
                <p style={styles.subtext}>
                  Give this User ID to anyone. When they click <strong>Import</strong> and enter your ID, their calendar will instantly reflect your schedule.
                </p>
              </div>

              {/* Shareable Link Section */}
              <div style={styles.card}>
                <div style={styles.labelRow}>
                  <span style={styles.fieldLabel}>Direct Share Link</span>
                </div>
                <div style={styles.codeRow}>
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    style={styles.urlInput}
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    onClick={handleCopyLink}
                    style={{
                      ...styles.actionBtn,
                      backgroundColor: copiedLink ? '#2e7d32' : '#2196F3',
                      color: '#fff',
                    }}
                  >
                    {copiedLink ? '✓ Copied!' : '🔗 Copy Link'}
                  </button>
                </div>
                <p style={styles.subtext}>
                  Anyone who opens this link will have the Import dialog pre-filled automatically.
                </p>
              </div>

              {/* Sync Status / Action */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '4px 0 10px 0' }}>
                <button
                  onClick={handleSyncCloud}
                  disabled={syncing}
                  style={styles.syncBtn}
                >
                  {syncing ? '⏳ Syncing to Cloud...' : '🔄 Push Latest Local Changes to Cloud'}
                </button>
              </div>

              {syncMessage && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  marginBottom: '10px',
                  backgroundColor: syncMessage.type === 'success' ? '#1b5e20' : '#b71c1c',
                  color: '#fff',
                }}>
                  {syncMessage.text}
                </div>
              )}
            </>
          ) : (
            <div style={{ ...styles.card, borderColor: '#ff9800', backgroundColor: '#261b0a' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                <div>
                  <h4 style={{ margin: '0 0 6px 0', color: '#ffb74d', fontSize: '0.95rem' }}>Account Required for User ID Sharing</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#e0e0e0', lineHeight: '1.4' }}>
                    To generate a shareable <strong>User ID</strong> that others can import from anywhere, please log in or create an account using the account bar at the top of the calendar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Calendar Summary */}
          <div style={styles.summaryCard}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
              Calendar Overview Being Shared:
            </div>
            <div style={styles.summaryGrid}>
              <div style={styles.statBox}>
                <span style={styles.statLabel}>Semester</span>
                <span style={styles.statValue}>
                  {semester?.startDate && semester?.endDate
                    ? `${semester.startDate} to ${semester.endDate}`
                    : 'Not set yet'}
                </span>
              </div>
              <div style={styles.statBox}>
                <span style={styles.statLabel}>Total Overrides</span>
                <span style={{ ...styles.statValue, color: '#4CAF50' }}>{stats.total} days</span>
              </div>
              <div style={styles.statBox}>
                <span style={styles.statLabel}>Exams</span>
                <span style={{ ...styles.statValue, color: '#00bcd4' }}>{stats.exams}</span>
              </div>
              <div style={styles.statBox}>
                <span style={styles.statLabel}>Holidays / Off</span>
                <span style={{ ...styles.statValue, color: '#ff9800' }}>{stats.holidays + stats.off}</span>
              </div>
              <div style={styles.statBox}>
                <span style={styles.statLabel}>Special Routines</span>
                <span style={{ ...styles.statValue, color: '#ab47bc' }}>{stats.routines}</span>
              </div>
            </div>
          </div>

          {/* Offline JSON Backup */}
          <div style={{ marginTop: '12px', borderTop: '1px solid #333', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.78rem', color: '#888', display: 'block', marginBottom: '8px' }}>
              Offline / File Backup Options:
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleDownloadJSON} style={styles.secondaryBtn}>
                💾 Download .JSON File
              </button>
              <button onClick={handleCopyJSON} style={styles.secondaryBtn}>
                {copiedJson ? '✓ JSON Copied!' : '📋 Copy JSON'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.closeFooterBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    padding: '16px',
    boxSizing: 'border-box'
  },
  modal: {
    backgroundColor: '#181818',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #333',
    boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
    color: '#fff',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #2a2a2a',
    backgroundColor: '#1f1f1f'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '1.2rem',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  body: {
    padding: '16px 20px',
    overflowY: 'auto'
  },
  card: {
    backgroundColor: '#202020',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '12px 14px',
    marginBottom: '12px'
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  fieldLabel: {
    fontSize: '0.82rem',
    fontWeight: 'bold',
    color: '#ccc',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  badge: {
    fontSize: '0.7rem',
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: '#1b5e20',
    color: '#81c784',
    fontWeight: 'bold'
  },
  codeRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  codeBox: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    border: '1px solid #383838',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '0.85rem',
    fontFamily: 'Consolas, monospace',
    color: '#00bcd4',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  urlInput: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    border: '1px solid #383838',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '0.8rem',
    color: '#eee',
    outline: 'none'
  },
  actionBtn: {
    border: 'none',
    borderRadius: '6px',
    padding: '8px 14px',
    fontSize: '0.82rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease'
  },
  subtext: {
    fontSize: '0.75rem',
    color: '#888',
    margin: '8px 0 0 0',
    lineHeight: '1.35'
  },
  syncBtn: {
    flex: 1,
    backgroundColor: '#222',
    border: '1px solid #444',
    color: '#4CAF50',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  summaryCard: {
    backgroundColor: '#1c1c1c',
    border: '1px solid #2e2e2e',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '6px'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '8px'
  },
  statBox: {
    backgroundColor: '#121212',
    padding: '8px 10px',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  statLabel: {
    fontSize: '0.7rem',
    color: '#777',
    textTransform: 'uppercase'
  },
  statValue: {
    fontSize: '0.85rem',
    fontWeight: 'bold',
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#242424',
    border: '1px solid #3a3a3a',
    color: '#ccc',
    padding: '7px 10px',
    borderRadius: '6px',
    fontSize: '0.78rem',
    cursor: 'pointer',
    fontWeight: '500'
  },
  footer: {
    padding: '12px 20px',
    borderTop: '1px solid #2a2a2a',
    display: 'flex',
    justifyContent: 'flex-end',
    backgroundColor: '#1a1a1a'
  },
  closeFooterBtn: {
    backgroundColor: '#333',
    border: '1px solid #555',
    color: '#fff',
    padding: '8px 18px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};
