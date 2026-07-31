import React, { useState } from 'react';
import { DEFAULT_SLOTS, saveData } from '../utils/storage';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function RoutineSetupModal({ isOpen, onComplete }) {
  const [activeDay, setActiveDay] = useState('Monday');
  
  // Semester Dates State
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const defaultEnd = new Date();
    defaultEnd.setMonth(defaultEnd.getMonth() + 4);
    return defaultEnd.toISOString().split('T')[0];
  });

  // Initialize timetable state for Mon-Fri
  const [routine, setRoutine] = useState(() => {
    const initial = {};
    DAYS.forEach((day) => {
      initial[day] = DEFAULT_SLOTS.map((slot, index) => {
        if (day !== 'Friday' && index === 3) return 'Lunch Break';
        if (day === 'Friday' && index === 4) return 'Lunch Break';
        return '';
      });
    });
    return initial;
  });

  if (!isOpen) return null;

  const handleSubjectChange = (day, slotIndex, value) => {
    setRoutine((prev) => ({
      ...prev,
      [day]: prev[day].map((subject, idx) => (idx === slotIndex ? value : subject))
    }));
  };

  const handleSave = () => {
    saveData('ROUTINE', routine);
    saveData('SEMESTER', { startDate, endDate });
    onComplete();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2>Welcome! Set Up Your Semester</h2>
        
        {/* Semester Dates Config */}
        <div style={styles.dateSection}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#007acc' }}>1. Select Semester Duration</p>
          <div style={styles.dateRow}>
            <div>
              <label style={styles.label}>Start Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
            <div>
              <label style={styles.label}>End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
          </div>
        </div>

        <p style={{ margin: '16px 0 8px 0', fontWeight: 'bold', color: '#007acc' }}>2. Weekly Class Routine</p>

        {/* Day Selection Tabs */}
        <div style={styles.tabContainer}>
          {DAYS.map((day) => (
            <button
              key={day}
              style={{
                ...styles.tab,
                backgroundColor: activeDay === day ? '#007acc' : '#333',
                color: activeDay === day ? '#fff' : '#ccc'
              }}
              onClick={() => setActiveDay(day)}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        {/* 8 Time Slots */}
        <div style={styles.slotsContainer}>
          {DEFAULT_SLOTS.map((slotTime, idx) => {
            const isLunch = routine[activeDay][idx] === 'Lunch Break';

            return (
              <div key={idx} style={styles.slotRow}>
                <span style={styles.slotTime}>{slotTime}</span>
                <input
                  type="text"
                  placeholder={isLunch ? 'Lunch Break' : `Subject for Slot ${idx + 1}`}
                  value={routine[activeDay][idx]}
                  disabled={isLunch}
                  onChange={(e) => handleSubjectChange(activeDay, idx, e.target.value)}
                  style={{
                    ...styles.input,
                    backgroundColor: isLunch ? '#2a2a2a' : '#121212',
                    color: isLunch ? '#ff9800' : '#fff',
                    fontStyle: isLunch ? 'italic' : 'normal'
                  }}
                />
              </div>
            );
          })}
        </div>

        <button style={styles.saveBtn} onClick={handleSave}>
          Save Semester & Routine
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000
  },
  modal: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    padding: '20px',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '92%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  dateSection: {
    backgroundColor: '#252526',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '10px'
  },
  dateRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-between'
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    color: '#aaa',
    marginBottom: '4px'
  },
  dateInput: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #444',
    backgroundColor: '#121212',
    color: '#fff',
    fontSize: '0.85rem'
  },
  tabContainer: {
    display: 'flex',
    gap: '6px',
    marginBottom: '12px'
  },
  tab: {
    flex: 1,
    padding: '8px 0',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  slotsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px'
  },
  slotRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  slotTime: {
    width: '95px',
    fontSize: '0.8rem',
    color: '#aaa'
  },
  input: {
    flex: 1,
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #444',
    outline: 'none',
    fontSize: '0.85rem'
  },
  saveBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#4CAF50',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer'
  }
};