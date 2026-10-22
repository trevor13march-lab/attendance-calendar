import React, { useState, useEffect } from 'react';
import { extractUserId, fetchFullCalendar, importCalendarFromUser } from '../utils/calendarApi';

export default function ImportCalendarModal({
  isOpen,
  onClose,
  targetUser,
  initialUserId = '',
  onImportSuccess
}) {
  const [sourceInput, setSourceInput] = useState(initialUserId);
  const [mode, setMode] = useState('replace'); // 'replace' | 'merge'
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('userid'); // 'userid' | 'file'

  useEffect(() => {
    if (initialUserId) {
      setSourceInput(initialUserId);
      handlePreview(initialUserId);
    }
  }, [initialUserId, isOpen]);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSourceInput(text.trim());
        setPreviewData(null);
        setErrorMessage('');
      }
    } catch {
      // Fallback
      const text = prompt('Paste the User ID or Share Link:');
      if (text) {
        setSourceInput(text.trim());
        setPreviewData(null);
        setErrorMessage('');
      }
    }
  };

  const handlePreview = async (overrideId) => {
    const raw = overrideId !== undefined ? overrideId : sourceInput;
    const cleanId = extractUserId(raw);

    if (!cleanId) {
      setErrorMessage('Please enter a valid 36-character User ID or Share Link.');
      setPreviewData(null);
      return;
    }

    setPreviewLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const res = await fetchFullCalendar(cleanId);
    setPreviewLoading(false);

    if (res.success) {
      setPreviewData(res);
      setErrorMessage('');
    } else {
      setPreviewData(null);
      setErrorMessage(res.error || 'Failed to fetch calendar for this User ID.');
    }
  };

  const handleExecuteImport = async () => {
    const cleanId = extractUserId(sourceInput);
    if (!cleanId) {
      setErrorMessage('Please enter a valid User ID before importing.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await importCalendarFromUser(targetUser?.id, cleanId, { mode });
      setLoading(false);

      if (result.success) {
        setSuccessMessage(`Successfully imported ${result.count} calendar items! Your profile now reflects this calendar.`);

        if (onImportSuccess) {
          onImportSuccess(result.semester, result.overrides);
        }

        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMessage(result.error || 'Failed to import calendar.');
      }
    } catch (err) {
      setLoading(false);
      setErrorMessage(err.message || 'An unexpected error occurred during import.');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json.semester && !json.overrides) {
          setErrorMessage('Invalid calendar backup file format.');
          return;
        }

        const semester = json.semester || { startDate: '', endDate: '' };
        const overrides = json.overrides || {};

        if (onImportSuccess) {
          onImportSuccess(semester, overrides);
        }

        setSuccessMessage(`Imported ${Object.keys(overrides).length} overrides from JSON backup!`);
        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (err) {
        setErrorMessage('Failed to read JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>📥</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>Import & Mirror Calendar</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#888' }}>
                Load a classmate's schedule to reflect their exact calendar profile
              </p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Tab Switcher */}
        <div style={styles.tabBar}>
          <button
            onClick={() => setActiveTab('userid')}
            style={{
              ...styles.tabBtn,
              borderBottom: activeTab === 'userid' ? '2px solid #00bcd4' : '2px solid transparent',
              color: activeTab === 'userid' ? '#00bcd4' : '#888'
            }}
          >
            🔑 Via User ID / Share Link
          </button>
          <button
            onClick={() => setActiveTab('file')}
            style={{
              ...styles.tabBtn,
              borderBottom: activeTab === 'file' ? '2px solid #00bcd4' : '2px solid transparent',
              color: activeTab === 'file' ? '#00bcd4' : '#888'
            }}
          >
            📁 Via JSON Backup File
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {errorMessage && (
            <div style={styles.errorBox}>
              ⚠️ {errorMessage}
            </div>
          )}

          {successMessage && (
            <div style={styles.successBox}>
              🎉 {successMessage}
            </div>
          )}

          {activeTab === 'userid' ? (
            <>
              <div style={{ marginBottom: '14px' }}>
                <label style={styles.inputLabel}>Enter or Paste Source User ID:</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    type="text"
                    placeholder="e.g. 4c7c9a3b-be74-4f7a-802a-e89389732f65 or share link"
                    value={sourceInput}
                    onChange={(e) => {
                      setSourceInput(e.target.value);
                      setPreviewData(null);
                      setErrorMessage('');
                    }}
                    style={styles.input}
                  />
                  <button onClick={handlePaste} style={styles.pasteBtn} title="Paste from clipboard">
                    📋 Paste
                  </button>
                </div>
              </div>

              <button
                onClick={() => handlePreview()}
                disabled={previewLoading || !sourceInput.trim()}
                style={styles.previewBtn}
              >
                {previewLoading ? '⏳ Checking Calendar...' : '🔍 Check & Preview Calendar'}
              </button>

              {/* Preview Details */}
              {previewData && (
                <div style={styles.previewCard}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#4CAF50' }}>
                      ✓ Schedule Found for User
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#888' }}>
                      ID: {previewData.userId.slice(0, 8)}...
                    </span>
                  </div>

                  <div style={styles.previewGrid}>
                    <div style={styles.previewItem}>
                      <span style={styles.pLabel}>Semester Dates</span>
                      <span style={styles.pValue}>
                        {previewData.semester?.startDate && previewData.semester?.endDate
                          ? `${previewData.semester.startDate} → ${previewData.semester.endDate}`
                          : 'None'}
                      </span>
                    </div>
                    <div style={styles.previewItem}>
                      <span style={styles.pLabel}>Total Events</span>
                      <span style={{ ...styles.pValue, color: '#00bcd4' }}>
                        {previewData.stats.total} days
                      </span>
                    </div>
                    <div style={styles.previewItem}>
                      <span style={styles.pLabel}>Exams</span>
                      <span style={{ ...styles.pValue, color: '#ff9800' }}>
                        {previewData.stats.exam}
                      </span>
                    </div>
                    <div style={styles.previewItem}>
                      <span style={styles.pLabel}>Holidays / Off</span>
                      <span style={{ ...styles.pValue, color: '#e57373' }}>
                        {previewData.stats.holiday + previewData.stats.off}
                      </span>
                    </div>
                  </div>

                  {/* Mode Selection */}
                  <div style={{ marginTop: '12px', borderTop: '1px solid #333', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#ccc', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                      Import Mode:
                    </span>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={mode === 'replace'}
                        onChange={() => setMode('replace')}
                      />
                      <div>
                        <strong style={{ color: '#fff', fontSize: '0.82rem' }}>Replace & Mirror (Recommended)</strong>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#888' }}>
                          Completely mirrors their calendar profile (replaces your current overrides and semester).
                        </span>
                      </div>
                    </label>

                    <label style={{ ...styles.radioLabel, marginTop: '6px' }}>
                      <input
                        type="radio"
                        name="importMode"
                        value="merge"
                        checked={mode === 'merge'}
                        onChange={() => setMode('merge')}
                      />
                      <div>
                        <strong style={{ color: '#fff', fontSize: '0.82rem' }}>Merge with Current</strong>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#888' }}>
                          Adds source events on top of your existing calendar without deleting other days.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '14px' }}>
                Select an exported <code>.json</code> file to restore or mirror a calendar offline.
              </p>
              <label style={styles.fileLabel}>
                📁 Choose JSON Backup File
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          {activeTab === 'userid' && (
            <button
              onClick={handleExecuteImport}
              disabled={loading || !sourceInput.trim()}
              style={{
                ...styles.confirmBtn,
                opacity: loading || !sourceInput.trim() ? 0.6 : 1,
              }}
            >
              {loading ? '⏳ Importing & Reflecting...' : '📥 Confirm & Reflect Calendar'}
            </button>
          )}
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
    padding: '4px'
  },
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid #2a2a2a',
    backgroundColor: '#161616'
  },
  tabBtn: {
    flex: 1,
    padding: '10px 14px',
    background: 'none',
    border: 'none',
    fontSize: '0.82rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  body: {
    padding: '16px 20px',
    overflowY: 'auto'
  },
  inputLabel: {
    fontSize: '0.82rem',
    fontWeight: 'bold',
    color: '#ccc',
    display: 'block'
  },
  input: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    border: '1px solid #444',
    borderRadius: '6px',
    padding: '9px 12px',
    color: '#fff',
    fontSize: '0.85rem',
    fontFamily: 'Consolas, monospace',
    outline: 'none',
    boxSizing: 'border-box'
  },
  pasteBtn: {
    backgroundColor: '#262626',
    border: '1px solid #444',
    color: '#00bcd4',
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.82rem'
  },
  previewBtn: {
    width: '100%',
    backgroundColor: '#1b2d30',
    border: '1px solid #00bcd4',
    color: '#00bcd4',
    padding: '9px 14px',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '0.84rem',
    cursor: 'pointer',
    marginBottom: '12px'
  },
  previewCard: {
    backgroundColor: '#1a1f1b',
    border: '1px solid #2e7d32',
    borderRadius: '8px',
    padding: '12px 14px',
    marginBottom: '12px'
  },
  previewGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginTop: '6px'
  },
  previewItem: {
    backgroundColor: '#121212',
    padding: '8px',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  pLabel: {
    fontSize: '0.68rem',
    color: '#777',
    textTransform: 'uppercase'
  },
  pValue: {
    fontSize: '0.82rem',
    fontWeight: 'bold',
    color: '#eee',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  radioLabel: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
    cursor: 'pointer',
    backgroundColor: '#121212',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #2a2a2a'
  },
  errorBox: {
    backgroundColor: '#381e1e',
    border: '1px solid #f44336',
    borderRadius: '6px',
    padding: '10px 14px',
    color: '#ff8a80',
    fontSize: '0.82rem',
    marginBottom: '12px'
  },
  successBox: {
    backgroundColor: '#1b381e',
    border: '1px solid #4CAF50',
    borderRadius: '6px',
    padding: '10px 14px',
    color: '#a5d6a7',
    fontSize: '0.82rem',
    marginBottom: '12px'
  },
  fileLabel: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: '#1e3438',
    color: '#00bcd4',
    border: '1px solid #00bcd4',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    cursor: 'pointer'
  },
  footer: {
    padding: '12px 20px',
    borderTop: '1px solid #2a2a2a',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    backgroundColor: '#1a1a1a'
  },
  cancelBtn: {
    backgroundColor: '#292929',
    border: '1px solid #444',
    color: '#aaa',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  confirmBtn: {
    backgroundColor: '#00838f',
    border: '1px solid #00bcd4',
    color: '#fff',
    padding: '8px 18px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};
