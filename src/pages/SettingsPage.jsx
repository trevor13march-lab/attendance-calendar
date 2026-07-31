import React, { useState } from 'react';
import { getStoredData, saveData } from '../utils/storage';
import RoutineSetupModal from '../components/RoutineSetupModal';

export default function SettingsPage() {
  const [data, setData] = useState(getStoredData());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(data.semester.startDate);
  const [endDate, setEndDate] = useState(data.semester.endDate);

  const handleSaveDates = () => {
    const updatedSemester = { startDate, endDate };
    saveData('SEMESTER', updatedSemester);
    setData(prev => ({ ...prev, semester: updatedSemester }));
    alert('Semester dates updated!');
  };

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all saved calendar data and routines?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div style={{ padding: '20px', paddingBottom: '90px', color: '#fff', maxWidth: '650px', margin: '0 auto' }}>
      <h2>Settings</h2>

      {/* Semester Config */}
      <div style={styles.section}>
        <h3>Semester Dates</h3>
        <div style={styles.row}>
          <label>Start Date:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.row}>
          <label>End Date:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={styles.input}
          />
        </div>
        <button style={styles.saveBtn} onClick={handleSaveDates}>Save Semester Dates</button>
      </div>

      {/* Routine Config */}
      <div style={styles.section}>
        <h3>Routine Management</h3>
        <button style={styles.actionBtn} onClick={() => setIsModalOpen(true)}>
          ✏️ Edit Weekly Routine (Mon–Fri)
        </button>
      </div>

      {/* Danger Zone */}
      <div style={styles.section}>
        <h3 style={{ color: '#f44336' }}>Reset App</h3>
        <button style={{ ...styles.actionBtn, backgroundColor: '#381e1e', borderColor: '#f44336', color: '#f44336' }} onClick={handleResetData}>
          🗑️ Clear All App Data
        </button>
      </div>

      <RoutineSetupModal
        isOpen={isModalOpen}
        onComplete={() => {
          setIsModalOpen(false);
          setData(getStoredData());
        }}
      />
    </div>
  );
}

const styles = {
  section: {
    backgroundColor: '#1e1e1e',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #333'
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  input: {
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #444',
    backgroundColor: '#121212',
    color: '#fff'
  },
  saveBtn: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#007acc',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '8px'
  },
  actionBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #555',
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};