import React from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function SaturdayRoutineModal({ date, isOpen, onClose, onSelectRoutine }) {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>Saturday Working Day</h3>
        <p>Which day's routine should be followed on <strong>{date}</strong>?</p>
        
        <div style={styles.buttonContainer}>
          {DAYS.map((day) => (
            <button
              key={day}
              style={styles.dayButton}
              onClick={() => onSelectRoutine(day)}
            >
              Follow {day}'s Routine
            </button>
          ))}
        </div>

        <button style={styles.cancelButton} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    padding: '24px',
    borderRadius: '12px',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'center'
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    margin: '16px 0'
  },
  dayButton: {
    padding: '10px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#007acc',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  cancelButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #555',
    backgroundColor: 'transparent',
    color: '#ccc',
    cursor: 'pointer'
  }
};