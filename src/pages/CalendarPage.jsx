import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { saveDateOverride, fetchUserOverrides } from '../utils/calendarApi';
import { getStoredData, saveData } from '../utils/storage';
import SaturdayRoutineModal from '../components/SaturdayRoutineModal';
import AuthModal from '../components/AuthModal';
import ShareCalendarModal from '../components/ShareCalendarModal';
import ImportCalendarModal from '../components/ImportCalendarModal';
import './CalendarPage.css';

export default function CalendarPage() {
  const [user, setUser] = useState(null);
  const stored = getStoredData();
  const [data, setData] = useState({
    semester: stored.semester || { startDate: '', endDate: '' },
    overrides: stored.overrides || {}
  });

  // Modal selection state
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isSatModalOpen, setIsSatModalOpen] = useState(false);

  // Share & Import modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importUrlUserId, setImportUrlUserId] = useState('');
  const [bannerNotice, setBannerNotice] = useState(null);

  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // 1. Check for shareable URL parameters on initial mount (?import=... or ?import_calendar=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryUserId = params.get('import') || params.get('import_calendar');
    if (queryUserId) {
      setImportUrlUserId(queryUserId);
      setIsImportModalOpen(true);
    }
  }, []);

  // 2. Fetch user & listen for auth state changes
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
        // Fall back to stored local data on logout
        const local = getStoredData();
        setData({
          semester: local.semester || { startDate: '', endDate: '' },
          overrides: local.overrides || {}
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. Fetch user data from Supabase DB (Semester dates & overrides)
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
    const semesterData = userRow?.data?.semester || data.semester || { startDate: '', endDate: '' };

    const mergedData = {
      semester: semesterData,
      overrides: overrides || {}
    };

    setData(mergedData);
    saveData('SEMESTER', mergedData.semester);
    saveData('OVERRIDES', mergedData.overrides);
  };

  // 4. Save semester dates to Supabase DB and local storage
  const saveUserData = async (newData) => {
    setData(newData);
    saveData('SEMESTER', newData.semester);
    saveData('OVERRIDES', newData.overrides);

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

    // 1. Update state & localStorage
    const updatedData = {
      ...data,
      overrides: {
        ...(data.overrides || {}),
        [selectedDate]: { status: newStatus, routineDay: null }
      }
    };
    setData(updatedData);
    saveData('OVERRIDES', updatedData.overrides);

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
    saveData('OVERRIDES', updatedData.overrides);

    if (user) {
      await saveDateOverride(user.id, selectedDate, 'WORKING', assignedRoutine);
    }

    setIsSatModalOpen(false);
  };

  // Callback when a calendar is imported via User ID or JSON file
  const handleImportSuccess = (newSemester, newOverrides) => {
    const updated = {
      semester: newSemester || data.semester,
      overrides: newOverrides || {}
    };

    setData(updated);
    saveData('SEMESTER', updated.semester);
    saveData('OVERRIDES', updated.overrides);

    setBannerNotice({
      type: 'success',
      text: '🎉 Calendar successfully imported! Your calendar profile now reflects the shared schedule.'
    });

    setTimeout(() => {
      setBannerNotice(null);
    }, 6000);
  };

  // Calculations
  const calculateTotalWorkingDays = () => {
    if (!data.semester?.startDate || !data.semester?.endDate) return 0;

    const [sY, sM, sD] = data.semester.startDate.split('-').map(Number);
    const [eY, eM, eD] = data.semester.endDate.split('-').map(Number);

    const semStart = new Date(sY, sM - 1, sD);
    const semEnd = new Date(eY, eM - 1, eD);

    let current = new Date(semStart);
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

  const calculatePassedWorkingDays = () => {
    if (!data.semester?.startDate || !data.semester?.endDate) return 0;

    const [sY, sM, sD] = data.semester.startDate.split('-').map(Number);
    const [eY, eM, eD] = data.semester.endDate.split('-').map(Number);

    const semStart = new Date(sY, sM - 1, sD);
    const semEnd = new Date(eY, eM - 1, eD);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today < semStart) return 0;

    let current = new Date(semStart);
    const limitDate = today <= semEnd ? new Date(today.getTime() - 86400000) : semEnd;
    let count = 0;

    while (current <= limitDate) {
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

  const calculateTotalOffDays = () => {
    if (!data.semester?.startDate || !data.semester?.endDate) return 0;

    const [sY, sM, sD] = data.semester.startDate.split('-').map(Number);
    const [eY, eM, eD] = data.semester.endDate.split('-').map(Number);

    const semStart = new Date(sY, sM - 1, sD);
    const semEnd = new Date(eY, eM - 1, eD);

    let current = new Date(semStart);
    let count = 0;

    while (current <= semEnd) {
      const dateStr = formatDateStr(current);
      const dayOfWeek = current.getDay();
      const override = data.overrides ? data.overrides[dateStr] : null;

      if (override) {
        if (override.status === 'OFF' || override.status === 'HOLIDAY' || override.status === 'ABSENT' || override.status === 'MEDICAL_LEAVE') {
          count++;
        }
      } else {
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          count++;
        }
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  const calculateDaysLeft = () => {
    return calculateRemainingWorkingDays();
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
    <div className="calendar-container" style={{ paddingBottom: '90px' }}>

      {/* Global Success / Notice Banner */}
      {bannerNotice && (
        <div style={{
          backgroundColor: '#1b5e20',
          border: '1px solid #4CAF50',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          color: '#e8f5e9',
          fontSize: '0.9rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <span>{bannerNotice.text}</span>
          <button
            onClick={() => setBannerNotice(null)}
            style={{ background: 'none', border: 'none', color: '#c8e6c9', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Semester Prompt */}
      {(!data.semester?.startDate || !data.semester?.endDate) && (
        <div style={{ backgroundColor: '#ff980022', border: '1px solid #ff9800', padding: '10px 14px', borderRadius: '6px', marginBottom: '15px', color: '#ffb74d', fontSize: '0.85rem' }}>
          ⚠️ Please select Semester Start and End dates to calculate remaining working days.
        </div>
      )}

      {/* Semester Inputs & Action Bar */}
      <div className="semester-box" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: '1 1 auto' }}>
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

        {/* Share & Import Action Buttons with Profile at the opposite corner */}
        <div className="semester-actions-row">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="semester-action-btn share-btn"
            title="Export calendar and get your shareable User ID"
          >
            <span>📤</span>
            <span className="btn-label-desktop">Share / Export</span>
            <span className="btn-label-mobile">Share</span>
          </button>

          <button
            onClick={() => {
              setImportUrlUserId('');
              setIsImportModalOpen(true);
            }}
            className="semester-action-btn import-btn"
            title="Import another student's calendar via User ID"
          >
            <span>📥</span>
            <span className="btn-label-desktop">Import Calendar</span>
            <span className="btn-label-mobile">Import</span>
          </button>

          <div className="semester-profile-wrapper">
            <AuthModal user={user} />
          </div>
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
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
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
            if (status === 'WORKING') { bgColor = '#162e1a'; borderColor = '#4CAF50'; }
            else if (status === 'OFF') { bgColor = '#2e2010'; borderColor = '#ff9800'; }
            else if (status === 'HOLIDAY') { bgColor = '#33290c'; borderColor = '#ffc107'; }
            else if (status === 'ABSENT') { bgColor = '#301414'; borderColor = '#f44336'; }
            else if (status === 'EXAM') { bgColor = '#10282e'; borderColor = '#00bcd4'; }
            else if (status === 'MEDICAL_LEAVE') { bgColor = '#122030'; borderColor = '#2196F3'; }
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
                <span className="status-tag" style={{ color: status === 'HOLIDAY' ? '#ffd54f' : borderColor }}>
                  {status === 'MEDICAL_LEAVE' ? 'MEDICAL' : status.replace('_', ' ')}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Working Days Counter Footer */}
      <div className="sticky-footer" style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px'
      }}>
        <span>💼 Total Working Days: <strong style={{ color: '#4CAF50', fontSize: '1.2rem' }}>{calculateTotalWorkingDays()}</strong></span>
        <span>⏳ Total Days Left: <strong style={{ color: '#2196F3', fontSize: '1.2rem' }}>{calculateDaysLeft()}</strong></span>
        <span>🏖️ Total Off Days: <strong style={{ color: '#ff9800', fontSize: '1.2rem' }}>{calculateTotalOffDays()}</strong></span>
      </div>

      {/* Status Selection Modal */}
      {isStatusModalOpen && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.modal}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.05rem' }}>Set Status for {selectedDate}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button style={{ ...modalStyles.btn, backgroundColor: '#162e1a', color: '#4CAF50', borderColor: '#4CAF50' }} onClick={() => applyStatusChange('WORKING')}>Working Day</button>
              <button style={{ ...modalStyles.btn, backgroundColor: '#2e2010', color: '#ff9800', borderColor: '#ff9800' }} onClick={() => applyStatusChange('OFF')}>Off</button>
              <button style={{ ...modalStyles.btn, backgroundColor: '#33290c', color: '#ffd54f', borderColor: '#ffc107' }} onClick={() => applyStatusChange('HOLIDAY')}>Holiday</button>
              <button style={{ ...modalStyles.btn, backgroundColor: '#301414', color: '#f44336', borderColor: '#f44336' }} onClick={() => applyStatusChange('ABSENT')}>Absent</button>
              <button style={{ ...modalStyles.btn, backgroundColor: '#10282e', color: '#00bcd4', borderColor: '#00bcd4' }} onClick={() => applyStatusChange('EXAM')}>Exam</button>
              <button style={{ ...modalStyles.btn, backgroundColor: '#122030', color: '#2196F3', borderColor: '#2196F3' }} onClick={() => applyStatusChange('MEDICAL_LEAVE')}>Medical Leave</button>
            </div>
            <button style={{ ...modalStyles.btn, marginTop: '12px', backgroundColor: '#333', color: '#aaa', borderColor: '#555' }} onClick={() => setIsStatusModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Share / Export Calendar Modal */}
      <ShareCalendarModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        user={user}
        semester={data.semester}
        overrides={data.overrides}
      />

      {/* Import & Mirror Calendar Modal */}
      <ImportCalendarModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        targetUser={user}
        initialUserId={importUrlUserId}
        onImportSuccess={handleImportSuccess}
      />

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