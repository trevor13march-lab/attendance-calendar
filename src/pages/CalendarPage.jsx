import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { saveDateOverride, fetchUserOverrides, copyExamsAndHolidaysFromUser } from '../utils/calendarApi';
import SaturdayRoutineModal from '../components/SaturdayRoutineModal';
import AuthModal from '../components/AuthModal';
import './CalendarPage.css';

export default function CalendarPage() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState({ semester: { startDate: '', endDate: '' }, overrides: {} });

  // Modal selection state
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isSatModalOpen, setIsSatModalOpen] = useState(false);

  // Copy modal state
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [sourceUserId, setSourceUserId] = useState('');
  const [copyLoading, setCopyLoading] = useState(false);

  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // 1. Fetch user & listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) fetchUserData(currentUser.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserData(currentUser.id);
      } else {
        // Reset to default empty state on logout
        setData({ semester: { startDate: '', endDate: '' }, overrides: {} });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch user data from Supabase DB (Semester dates & overrides)
  const fetchUserData = async (userId) => {
    const { data: userRow, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user semester data:', error.message);
    }

    const overrides = await fetchUserOverrides(userId);
    const semesterData = userRow?.data?.semester || { startDate: '', endDate: '' };

    setData({
      semester: semesterData,
      overrides: overrides || {}
    });
  };

  // 3. Save semester dates to Supabase DB (or local state if logged out)
  const saveUserData = async (newData) => {
    setData(newData);
    if (user) {
      const { error } = await supabase
        .from('user_data')
        .upsert({ id: user.id, data: { semester: newData.semester }, updated_at: new Date() });

      if (error) console.error('Error saving semester data:', error.message);
    }
  };

  const formatDateStr = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleSemesterDateChange = (field, value) => {
    const updatedData = {
      ...data,
      semester: { ...(data.semester || {}), [field]: value }
    };
    saveUserData(updatedData);
  };

  // Open modal on day click
  const handleDayClick = (dateStr, dayOfWeek) => {
    setSelectedDate(dateStr);
    setSelectedDayOfWeek(dayOfWeek);
    setIsStatusModalOpen(true);
  };

  const applyStatusChange = async (newStatus) => {
    setIsStatusModalOpen(false);

    if (selectedDayOfWeek === 6 && newStatus === 'WORKING') {
      setIsSatModalOpen(true);
      return;
    }

    // 1. Update local UI state
    const updatedData = {
      ...data,
      overrides: {
        ...(data.overrides || {}),
        [selectedDate]: { status: newStatus, routineDay: null }
      }
    };
    setData(updatedData);

    // 2. Persist override to Supabase calendar_overrides table
    if (user) {
      await saveDateOverride(user.id, selectedDate, newStatus, null);
    }
  };

  const handleSaturdayRoutineSelect = async (assignedRoutine) => {
    const updatedData = {
      ...data,
      overrides: {
        ...(data.overrides || {}),
        [selectedDate]: { status: 'WORKING', routineDay: assignedRoutine }
      }
    };
    setData(updatedData);

    if (user) {
      await saveDateOverride(user.id, selectedDate, 'WORKING', assignedRoutine);
    }

    setIsSatModalOpen(false);
  };

  // Handler to copy Exams & Holidays from another user
  const handleCopyExamsAndHolidays = async () => {
    if (!user) {
      alert('Please log in to import data.');
      return;
    }
    if (!sourceUserId.trim()) {
      alert('Please enter a valid User ID.');
      return;
    }

    setCopyLoading(true);
    const result = await copyExamsAndHolidaysFromUser(user.id, sourceUserId.trim());
    setCopyLoading(false);

    if (result.success) {
      alert(`Successfully imported ${result.count} exam/holiday entries!`);
      setIsCopyModalOpen(false);
      setSourceUserId('');
      // Refresh local calendar state to display copied items
      fetchUserData(user.id);
    } else {
      alert(`Failed to import data: ${result.error}`);
    }
  };

  const calculateRemainingWorkingDays = () => {
    if (!data.semester?.startDate || !data.semester?.endDate) return 0;

    const [sY, sM, sD] = data.semester.startDate.split('-').map(Number);
    const [eY, eM, eD] = data.semester.endDate.split('-').map(Number);

    const semStart = new Date(sY, sM - 1, sD);
    const semEnd = new Date(eY, eM - 1, eD);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let current = semStart > today ? new Date(semStart) : new Date(today);
    let count = 0;

    while (current <= semEnd) {
      const dateStr = formatDateStr(current);
      const dayOfWeek = current.getDay();
      const override = data.overrides ? data.overrides[dateStr] : null;

      if (override) {
        if (override.status === 'WORKING') count++;
      } else {
        if (dayOfWeek >= 1 && dayOfWeek <= 5) count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  const getDayInfo = (dayNum) => {
    const dateObj = new Date(year, month, dayNum);
    const dateStr = formatDateStr(dateObj);
    const dayOfWeek = dateObj.getDay();
    const override = data.overrides ? data.overrides[dateStr] : null;

    let status = '';
    let label = '';

    if (override) {
      status = override.status;
      if (override.routineDay && status === 'WORKING') {
        label = `(${override.routineDay.slice(0, 3)} Routine)`;
      }
    } else {
      status = (dayOfWeek === 0 || dayOfWeek === 6) ? 'OFF' : 'WORKING';
    }

    return { dateStr, dayOfWeek, status, label, dateObj };
  };

  const isInSemesterRange = (dateObj) => {
    if (!data.semester?.startDate || !data.semester?.endDate) return false;
    const [sY, sM, sD] = data.semester.startDate.split('-').map(Number);
    const [eY, eM, eD] = data.semester.endDate.split('-').map(Number);
    const semStart = new Date(sY, sM - 1, sD);
    const semEnd = new Date(eY, eM - 1, eD);
    const checkDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    return checkDate >= semStart && checkDate <= semEnd;
  };

  const isToday = (dateStr) => formatDateStr(new Date()) === dateStr;

  return (
    <div className="calendar-container">
      <AuthModal user={user} />

      {/* Semester Prompt */}
      {(!data.semester?.startDate || !data.semester?.endDate) && (
        <div style={{ backgroundColor: '#ff980022', border: '1px solid #ff9800', padding: '10px', borderRadius: '6px', marginBottom: '15px', color: '#ffb74d', fontSize: '0.85rem' }}>
          ⚠️ Please select Semester Start and End dates to calculate remaining working days.
        </div>
      )}

      {/* Semester Inputs & Import Action */}
      <div className="semester-box" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="date-picker-group">
          <label className="date-label">Sem Start:</label>
          <input
            type="date"
            value={data.semester?.startDate || ''}
            onChange={(e) => handleSemesterDateChange('startDate', e.target.value)}
            className="date-input"
          />
        </div>
        <div className="date-picker-group">
          <label className="date-label">Sem End:</label>
          <input
            type="date"
            value={data.semester?.endDate || ''}
            onChange={(e) => handleSemesterDateChange('endDate', e.target.value)}
            className="date-input"
          />
        </div>

        {user && (
          <button
            onClick={() => setIsCopyModalOpen(true)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#1e3438',
              color: '#00bcd4',
              border: '1px solid #00bcd4',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              height: '38px'
            }}
          >
            📋 Import Exams/Holidays
          </button>
        )}
      </div>

      {/* Month Navigation */}
      <div className="header-row">
        <h2>{monthNames[month]} {year}</h2>
        <div>
          <button className="nav-btn" onClick={() => setViewDate(new Date(year, month - 1, 1))}>&lt;</button>
          <button className="nav-btn" onClick={() => setViewDate(new Date(year, month + 1, 1))}>&gt;</button>
        </div>
      </div>

      {/* Week Headers */}
      <div className="week-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="week-header-cell">{d}</div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className="month-grid">
        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <div key={`empty-${index}`} className="empty-cell" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, index) => {
          const dayNum = index + 1;
          const { dateStr, dayOfWeek, status, label, dateObj } = getDayInfo(dayNum);
          const isInsideSem = isInSemesterRange(dateObj);

          let bgColor = '#1e1e1e';
          let borderColor = '#333';
          let textColor = '#777';

          if (isInsideSem) {
            textColor = '#fff';
            if (status === 'WORKING') { bgColor = '#1e3822'; borderColor = '#4CAF50'; }
            else if (status === 'OFF' || status === 'HOLIDAY') { bgColor = '#382f1e'; borderColor = '#ff9800'; }
            else if (status === 'ABSENT') { bgColor = '#381e1e'; borderColor = '#f44336'; }
            else if (status === 'EXAM') { bgColor = '#1e3438'; borderColor = '#00bcd4'; }
            else if (status === 'MEDICAL_LEAVE') { bgColor = '#1e2c38'; borderColor = '#2196F3'; }
          }

          return (
            <div
              key={dateStr}
              onClick={() => isInsideSem && handleDayClick(dateStr, dayOfWeek)}
              className={`day-cell ${isToday(dateStr) ? 'today-cell' : ''} ${!isInsideSem ? 'out-of-range' : ''}`}
              style={{ backgroundColor: bgColor, borderColor: borderColor, color: textColor }}
            >
              <span className="day-num">{dayNum}</span>
              {isInsideSem && label && <span className="routine-label">{label}</span>}
              {isInsideSem && (
                <span className="status-tag" style={{ color: borderColor }}>
                  {status === 'MEDICAL_LEAVE' ? 'MEDICAL\nLEAVE' : status.replace('_', ' ')}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Working Days Counter */}
      <div className="sticky-footer">
        <span>📊 Remaining Working Days: <strong style={{ color: '#4CAF50', fontSize: '1.2rem' }}>{calculateRemainingWorkingDays()}</strong></span>
      </div>

      {/* Status Selection Modal */}
      {isStatusModalOpen && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.modal}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.05rem' }}>Set Status for {selectedDate}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button style={{ ...modalStyles.btn, backgroundColor: '#1e3822', color: '#4CAF50', borderColor: '#4CAF50' }} onClick={() => applyStatusChange('WORKING')}>Working Day</button>
              <button style={{ ...modalStyles.btn, backgroundColor: '#382f1e', color: '#ff9800', borderColor: '#ff9800' }} onClick={() => applyStatusChange('OFF')}>Off</button>
              <button style={{ ...modalStyles.btn, backgroundColor: '#382f1e', color: '#ffb74d', borderColor: '#ffb74d' }} onClick={() => applyStatusChange('HOLIDAY')}>Holiday</button>
              <button style={{ ...modalStyles.btn, backgroundColor: '#381e1e', color: '#f44336', borderColor: '#f44336' }} onClick={() => applyStatusChange('ABSENT')}>Absent</button>
              <button style={{ ...modalStyles.btn, backgroundColor: '#1e3438', color: '#00bcd4', borderColor: '#00bcd4' }} onClick={() => applyStatusChange('EXAM')}>Exam</button>
              <button style={{ ...modalStyles.btn, backgroundColor: '#1e2c38', color: '#2196F3', borderColor: '#2196F3' }} onClick={() => applyStatusChange('MEDICAL_LEAVE')}>Medical Leave</button>
            </div>
            <button style={{ ...modalStyles.btn, marginTop: '12px', backgroundColor: '#333', color: '#aaa', borderColor: '#555' }} onClick={() => setIsStatusModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Copy Exams/Holidays Modal */}
      {isCopyModalOpen && (
        <div style={modalStyles.overlay}>
          <div style={{ ...modalStyles.modal, width: '320px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.05rem', color: '#00bcd4' }}>Import Exams & Holidays</h3>
            <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '15px' }}>
              Paste the User ID of the student whose Exam and Holiday schedule you want to copy into your calendar.
            </p>
            <input
              type="text"
              placeholder="Enter Source User ID..."
              value={sourceUserId}
              onChange={(e) => setSourceUserId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #444',
                backgroundColor: '#111',
                color: '#fff',
                fontSize: '0.85rem',
                marginBottom: '15px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={copyLoading}
                onClick={handleCopyExamsAndHolidays}
                style={{ ...modalStyles.btn, flex: 1, backgroundColor: '#1e3438', color: '#00bcd4', borderColor: '#00bcd4' }}
              >
                {copyLoading ? 'Importing...' : 'Import'}
              </button>
              <button
                onClick={() => setIsCopyModalOpen(false)}
                style={{ ...modalStyles.btn, flex: 1, backgroundColor: '#333', color: '#aaa', borderColor: '#555' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <SaturdayRoutineModal
        isOpen={isSatModalOpen}
        date={selectedDate}
        onClose={() => setIsSatModalOpen(false)}
        onSelectRoutine={handleSaturdayRoutineSelect}
      />
    </div>
  );
}

const modalStyles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', width: '280px', textAlign: 'center', color: '#fff', border: '1px solid #444' },
  btn: { border: '1px solid', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }
};