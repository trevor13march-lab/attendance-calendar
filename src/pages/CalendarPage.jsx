import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
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

  // 2. Fetch user data from Supabase DB
  const fetchUserData = async (userId) => {
    const { data: userRow, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching data:', error.message);
    }

    if (userRow && userRow.data) {
      setData(userRow.data);
    } else {
      const initialData = { semester: { startDate: '', endDate: '' }, overrides: {} };
      setData(initialData);
    }
  };

  // 3. Save updated data to Supabase DB (or local state if logged out)
  const saveUserData = async (newData) => {
    setData(newData);
    if (user) {
      const { error } = await supabase
        .from('user_data')
        .upsert({ id: user.id, data: newData, updated_at: new Date() });

      if (error) console.error('Error saving data:', error.message);
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

  // Open modal on day click instead of cycling
  const handleDayClick = (dateStr, dayOfWeek) => {
    setSelectedDate(dateStr);
    setSelectedDayOfWeek(dayOfWeek);
    setIsStatusModalOpen(true);
  };

  const applyStatusChange = (newStatus) => {
    setIsStatusModalOpen(false);

    if (selectedDayOfWeek === 6 && newStatus === 'WORKING') {
      setIsSatModalOpen(true);
      return;
    }

    const updatedData = {
      ...data,
      overrides: {
        ...(data.overrides || {}),
        [selectedDate]: { status: newStatus, routineDay: null }
      }
    };
    saveUserData(updatedData);
  };

  const handleSaturdayRoutineSelect = (assignedRoutine) => {
    const updatedData = {
      ...data,
      overrides: {
        ...(data.overrides || {}),
        [selectedDate]: { status: 'WORKING', routineDay: assignedRoutine }
      }
    };
    saveUserData(updatedData);
    setIsSatModalOpen(false);
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

      {/* Semester Inputs */}
      <div className="semester-box">
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
                  {status.replace('_', ' ')}
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

      {/* Explicit Status Selection Modal */}
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