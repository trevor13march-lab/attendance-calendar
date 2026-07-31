import React, { useState } from 'react';
import { getStoredData, saveData } from '../utils/storage';
import SaturdayRoutineModal from '../components/SaturdayRoutineModal';
import './CalendarPage.css';

export default function CalendarPage() {
  const [data, setData] = useState(getStoredData());
  const [selectedSatDate, setSelectedSatDate] = useState(null);
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

  const formatDateStr = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleSemesterDateChange = (field, value) => {
    const updatedSemester = {
      ...(data.semester || {}),
      [field]: value
    };
    saveData('SEMESTER', updatedSemester);
    setData(prev => ({ ...prev, semester: updatedSemester }));
  };

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  // Toggle Day Status Sequence
  const toggleDayStatus = (dateStr, dayOfWeek) => {
    const currentOverride = data.overrides ? data.overrides[dateStr] : null;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let currentStatus = currentOverride?.status || (isWeekend ? 'OFF' : 'WORKING');
    let nextStatus = 'WORKING';

    if (currentStatus === 'WORKING') {
      nextStatus = 'OFF';
    } else if (currentStatus === 'OFF') {
      nextStatus = 'HOLIDAY';
    } else if (currentStatus === 'HOLIDAY') {
      nextStatus = 'ABSENT';
    } else if (currentStatus === 'ABSENT') {
      nextStatus = 'EXAM';
    } else if (currentStatus === 'EXAM') {
      nextStatus = 'MEDICAL_LEAVE';
    } else if (currentStatus === 'MEDICAL_LEAVE') {
      nextStatus = 'WORKING';
    }

    if (dayOfWeek === 6 && nextStatus === 'WORKING') {
      setSelectedSatDate(dateStr);
      setIsSatModalOpen(true);
      return;
    }

    const updatedOverrides = {
      ...(data.overrides || {}),
      [dateStr]: { 
        status: nextStatus,
        routineDay: nextStatus === 'WORKING' ? currentOverride?.routineDay : null 
      }
    };

    saveData('OVERRIDES', updatedOverrides);
    setData(prev => ({ ...prev, overrides: updatedOverrides }));
  };

  const handleSaturdayRoutineSelect = (assignedRoutine) => {
    const updatedOverrides = {
      ...(data.overrides || {}),
      [selectedSatDate]: { status: 'WORKING', routineDay: assignedRoutine }
    };

    saveData('OVERRIDES', updatedOverrides);
    setData(prev => ({ ...prev, overrides: updatedOverrides }));
    setIsSatModalOpen(false);
    setSelectedSatDate(null);
  };

  // Remaining Working Days from TODAY onwards
  const calculateRemainingWorkingDays = () => {
    if (!data.semester || !data.semester.startDate || !data.semester.endDate) return 0;

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

  // Helper to check if date falls inside current semester limits
  const isInSemesterRange = (dateObj) => {
    if (!data.semester?.startDate || !data.semester?.endDate) return false;
    
    const [sY, sM, sD] = data.semester.startDate.split('-').map(Number);
    const [eY, eM, eD] = data.semester.endDate.split('-').map(Number);

    const semStart = new Date(sY, sM - 1, sD);
    const semEnd = new Date(eY, eM - 1, eD);
    
    // Normalize time to compare pure dates
    const checkDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    
    return checkDate >= semStart && checkDate <= semEnd;
  };

  const isToday = (dateStr) => {
    const todayStr = formatDateStr(new Date());
    return dateStr === todayStr;
  };

  return (
    <div className="calendar-container">
      
      {/* Semester Duration Inputs */}
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
          <button className="nav-btn" onClick={handlePrevMonth}>&lt;</button>
          <button className="nav-btn" onClick={handleNextMonth}>&gt;</button>
        </div>
      </div>

      {/* Status Legend */}
      <p className="legend-text">
        Click any day to cycle: <br />
        <span style={{ color: '#4CAF50', fontWeight: 'bold' }}> Working</span> | 
        <span style={{ color: '#ff9800', fontWeight: 'bold' }}> Off</span> | 
        <span style={{ color: '#ff9800', fontWeight: 'bold' }}> Holiday</span> | 
        <span style={{ color: '#f44336', fontWeight: 'bold' }}> Absent</span> | 
        <span style={{ color: '#00bcd4', fontWeight: 'bold' }}> Exam</span> | 
        <span style={{ color: '#2196F3', fontWeight: 'bold' }}> Medical Leave</span>
      </p>

      {/* Week Grid */}
      <div className="week-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="week-header-cell">{d}</div>
        ))}
      </div>

      {/* Month Grid */}
      <div className="month-grid">
        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <div key={`empty-${index}`} className="empty-cell" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, index) => {
          const dayNum = index + 1;
          const { dateStr, dayOfWeek, status, label, dateObj } = getDayInfo(dayNum);

          const isInsideSem = isInSemesterRange(dateObj);

          let bgColor = '#1e1e1e'; // Neutral dark for dates outside semester
          let borderColor = '#333';
          let textColor = '#777';

          if (isInsideSem) {
            textColor = '#fff';
            if (status === 'WORKING') {
              bgColor = '#1e3822';
              borderColor = '#4CAF50';
            } else if (status === 'OFF' || status === 'HOLIDAY') {
              bgColor = '#382f1e';
              borderColor = '#ff9800';
            } else if (status === 'ABSENT') {
              bgColor = '#381e1e';
              borderColor = '#f44336';
            } else if (status === 'EXAM') {
              bgColor = '#1e3438';
              borderColor = '#00bcd4';
            } else if (status === 'MEDICAL_LEAVE') {
              bgColor = '#1e2c38';
              borderColor = '#2196F3';
            }
          }

          const isTodayDate = isToday(dateStr);

          return (
            <div
              key={dateStr}
              onClick={() => toggleDayStatus(dateStr, dayOfWeek)}
              className={`day-cell ${isTodayDate ? 'today-cell' : ''} ${!isInsideSem ? 'out-of-range' : ''}`}
              style={{
                backgroundColor: bgColor,
                borderColor: borderColor,
                color: textColor
              }}
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

      {/* Remaining Working Days Footer */}
      <div className="sticky-footer">
        <span>📊 Remaining Working Days: <strong style={{ color: '#4CAF50', fontSize: '1.2rem' }}>{calculateRemainingWorkingDays()}</strong></span>
      </div>

      <SaturdayRoutineModal
        isOpen={isSatModalOpen}
        date={selectedSatDate}
        onClose={() => setIsSatModalOpen(false)}
        onSelectRoutine={handleSaturdayRoutineSelect}
      />
    </div>
  );
}