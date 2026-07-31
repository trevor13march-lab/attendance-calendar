import React, { useState, useEffect } from 'react';
import { getStoredData, saveData } from '../utils/storage';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DashboardPage() {
  const [data, setData] = useState(getStoredData());
  const [todayStr, setTodayStr] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState({});

  useEffect(() => {
    const today = new Date();
    const dateFormatted = today.toISOString().split('T')[0];
    setTodayStr(dateFormatted);

    // Load saved attendance records from localStorage if available
    const savedLogs = localStorage.getItem('attendance_app_logs');
    if (savedLogs) {
      setAttendanceRecords(JSON.parse(savedLogs));
    }
  }, []);

  const todayObj = new Date();
  const dayIndex = todayObj.getDay(); // 0 = Sun, 6 = Sat
  const dayName = DAYS_OF_WEEK[dayIndex];

  // Check for overrides on today's date
  const todayOverride = data.overrides[todayStr];

  // Determine today's status & routine
  let todayStatus = todayOverride ? todayOverride.status : (dayIndex === 0 || dayIndex === 6 ? 'OFF' : 'WORKING');
  let mappedRoutineDay = dayName;

  if (todayOverride && todayOverride.routineDay) {
    mappedRoutineDay = todayOverride.routineDay;
  }

  const todayRoutine = (data.routine && data.routine[mappedRoutineDay]) ? data.routine[mappedRoutineDay] : [];

  // Toggle class attendance state: 'PRESENT' -> 'ABSENT' -> 'MEDICAL' -> 'PRESENT'
  const toggleClassAttendance = (slotIndex) => {
    const key = `${todayStr}_slot_${slotIndex}`;
    const currentStatus = attendanceRecords[key] || 'NONE';

    let nextStatus = 'PRESENT';
    if (currentStatus === 'PRESENT') nextStatus = 'ABSENT';
    else if (currentStatus === 'ABSENT') nextStatus = 'MEDICAL';
    else if (currentStatus === 'MEDICAL') nextStatus = 'NONE';

    const updated = { ...attendanceRecords, [key]: nextStatus };
    setAttendanceRecords(updated);
    localStorage.setItem('attendance_app_logs', JSON.stringify(updated));
  };

  return (
    <div style={{ padding: '20px', paddingBottom: '90px', color: '#fff', maxWidth: '650px', margin: '0 auto' }}>
      <h2>Today's Schedule</h2>
      <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '16px' }}>
        {dayName}, {todayStr} {mappedRoutineDay !== dayName && `(Following ${mappedRoutineDay}'s Routine)`}
      </p>

      {/* Special Day Banners */}
      {todayStatus === 'OFF' && (
        <div style={{ ...styles.banner, backgroundColor: '#381e1e', borderColor: '#f44336' }}>
          🎉 Today is marked as an <strong>OFF Day / Holiday</strong>. No classes scheduled!
        </div>
      )}

      {todayStatus === 'EXAM' && (
        <div style={{ ...styles.banner, backgroundColor: '#38301e', borderColor: '#ff9800' }}>
          📝 Today is marked for <strong>Exams</strong>. Good luck!
        </div>
      )}

      {todayStatus === 'MEDICAL_LEAVE' && (
        <div style={{ ...styles.banner, backgroundColor: '#1e2c38', borderColor: '#2196F3' }}>
          🏥 Today is marked as <strong>Medical Leave</strong>. All classes are excused.
        </div>
      )}

      {/* Class Slots Grid */}
      {todayStatus === 'WORKING' && todayRoutine.length > 0 && (
        <div style={styles.slotList}>
          {todayRoutine.map((subject, idx) => {
            const isLunch = subject === 'Lunch Break';
            const key = `${todayStr}_slot_${idx}`;
            const status = attendanceRecords[key] || 'NONE';

            let statusBg = '#2a2a2a';
            let statusText = 'Mark Status';

            if (status === 'PRESENT') {
              statusBg = '#1e3822';
              statusText = '✅ Present';
            } else if (status === 'ABSENT') {
              statusBg = '#381e1e';
              statusText = '❌ Absent';
            } else if (status === 'MEDICAL') {
              statusBg = '#1e2c38';
              statusText = '🏥 Medical Leave';
            }

            return (
              <div
                key={idx}
                style={{
                  ...styles.slotCard,
                  backgroundColor: isLunch ? '#222' : statusBg,
                  borderColor: isLunch ? '#444' : '#555'
                }}
              >
                <div>
                  <span style={styles.slotNum}>Slot {idx + 1}</span>
                  <div style={styles.subjectText}>{subject || 'No Subject Assigned'}</div>
                </div>

                {!isLunch ? (
                  <button
                    onClick={() => toggleClassAttendance(idx)}
                    style={styles.statusBtn}
                  >
                    {statusText}
                  </button>
                ) : (
                  <span style={styles.lunchTag}>🍱 Lunch Break</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  banner: {
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid',
    textAlign: 'center',
    marginBottom: '20px',
    fontSize: '1rem'
  },
  slotList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  slotCard: {
    padding: '14px 18px',
    borderRadius: '10px',
    border: '1px solid',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  slotNum: {
    fontSize: '0.75rem',
    color: '#888',
    textTransform: 'uppercase',
    fontWeight: 'bold'
  },
  subjectText: {
    fontSize: '1.05rem',
    fontWeight: 'bold',
    marginTop: '2px'
  },
  statusBtn: {
    padding: '8px 14px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#333',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '0.85rem'
  },
  lunchTag: {
    color: '#ff9800',
    fontSize: '0.85rem',
    fontStyle: 'italic',
    fontWeight: 'bold'
  }
};