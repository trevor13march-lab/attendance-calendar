import { useEffect, useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

import {
  fetchUserOverrides,
  getDefaultStatus
} from '../utils/calendarUtils.js';

import { supabase } from '../supabase';
import {
  getTimetableFromStorage,
  saveTimetableToStorage
} from '../utils/storage.js';
import {
  getCourseCodesForDay,
  normalizeCourseCode
} from '../utils/predictionEngine.js';

import '../styles/PredictionPage.css';

const API_URL = 'http://localhost:5000';

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};


export default function PredictionPage() {
  const [attendance, setAttendance] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [timetable, setTimetable] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeMonth, setActiveMonth] = useState(new Date());
  const [predictionDays, setPredictionDays] = useState(14);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');

      const savedTimetable = getTimetableFromStorage();

      setTimetable(savedTimetable);

      const timetableResponse = await fetch(
        `${API_URL}/api/cuims/timetable`
      );

      if (timetableResponse.ok) {
        const timetableResult = await timetableResponse.json();

        if (timetableResult.success && timetableResult.timetable) {
          const normalizedTimetable = saveTimetableToStorage(
            timetableResult.timetable
          );

          setTimetable(normalizedTimetable);
        }
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (user) {
        const userOverrides = await fetchUserOverrides(user.id);

        setOverrides(userOverrides || {});
      }

      const response = await fetch(
        `${API_URL}/api/cuims/attendance`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            'Unable to fetch attendance. Please login to CUIMS first.'
        );
      }

      setAttendance(result.attendance || []);

      setMessage(
        'Current attendance loaded successfully.'
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          'Unable to load attendance prediction.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getDateStatus = (date) => {
    const dateStr = formatDate(date);

    if (overrides[dateStr]) {
      return overrides[dateStr].status;
    }

    return getDefaultStatus(date);
  };

  const isPastDate = (date) => {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const checkDate = new Date(date);

    checkDate.setHours(0, 0, 0, 0);

    return checkDate < today;
  };

  const today = useMemo(() => {
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    return current;
  }, []);

  const predictionEndDate = useMemo(() => {
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + predictionDays);
    return endDate;
  }, [predictionDays, today]);

  const predictionEndDateString = formatDate(predictionEndDate);

  const isWorkingDay = (date) => {
    return getDateStatus(date) === 'WORKING';
  };

  const handleDateClick = (date) => {
    const dateStr = formatDate(date);

    if (
      isPastDate(date) ||
      date <= today ||
      date > predictionEndDate
    ) {
      return;
    }

    if (!isWorkingDay(date)) {
      return;
    }

    setSelectedDates((previousDates) => {
      if (previousDates.includes(dateStr)) {
        return previousDates.filter(
          (item) => item !== dateStr
        );
      }

      return [...previousDates, dateStr];
    });
  };

  const handlePredictionDaysChange = (event) => {
    const nextDays = Number(event.target.value);
    const nextEndDate = new Date(today);

    nextEndDate.setDate(nextEndDate.getDate() + nextDays);

    setPredictionDays(nextDays);
    setSelectedDates((previousDates) =>
      previousDates.filter(
        (date) => date <= formatDate(nextEndDate)
      )
    );
  };

  const futureSchedule = useMemo(() => {
    const futureClasses = {};
    const missedClasses = {};
    const cursor = new Date(today);

    cursor.setDate(cursor.getDate() + 1);

    while (cursor <= predictionEndDate) {
      const dateStr = formatDate(cursor);

      if (getDateStatus(cursor) === 'WORKING') {
        const isPlannedAbsence = selectedDates.includes(dateStr);
        const coursesForDate = getCourseCodesForDay(
          timetable,
          cursor,
          overrides
        );

        coursesForDate.forEach((course) => {
          const courseCode = normalizeCourseCode(course);

          if (!courseCode) {
            return;
          }

          futureClasses[courseCode] =
            (futureClasses[courseCode] || 0) + 1;

          if (isPlannedAbsence) {
            missedClasses[courseCode] =
              (missedClasses[courseCode] || 0) + 1;
          }
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return { futureClasses, missedClasses };
  }, [
    overrides,
    predictionEndDate,
    selectedDates,
    timetable,
    today
  ]);

  const predictedAttendance = useMemo(() => {
    return attendance.map((subject) => {
      const courseCode = normalizeCourseCode(
        subject.courseCode
      );

      const futureClasses =
        futureSchedule.futureClasses[courseCode] || 0;
      const missedClasses =
        futureSchedule.missedClasses[courseCode] || 0;

      const currentDelivered = Number(
        subject.eligibleDelivered ??
          subject.totalDelivered ??
          0
      );

      const currentAttended = Number(
        subject.eligibleAttended ??
          subject.totalAttended ??
          0
      );

      const projectedDelivered =
        currentDelivered +
        futureClasses;

      const projectedAttended =
        Math.max(
          0,
          currentAttended +
            futureClasses -
            missedClasses
        );

      const projectedPercentage =
        projectedDelivered > 0
          ? Number(
              (
                (projectedAttended /
                  projectedDelivered) *
                100
              ).toFixed(2)
            )
          : 0;

      return {
        ...subject,
        futureClasses,
        missedClasses,
        projectedDelivered,
        projectedAttended,
        projectedPercentage
      };
    });
  }, [
    attendance,
    futureSchedule
  ]);

  const affectedSubjects =
    predictedAttendance.filter(
      (subject) =>
        subject.futureClasses > 0
    );

  const clearPrediction = () => {
    setSelectedDates([]);
  };

  const tileClassName = ({
    date,
    view
  }) => {
    if (view !== 'month') {
      return '';
    }

    const dateStr = formatDate(date);

    const classes = [];

    if (isPastDate(date)) {
      classes.push(
        'prediction-past-date'
      );
    }

    if (date > predictionEndDate) {
      classes.push(
        'prediction-outside-range'
      );
    }

    if (!isWorkingDay(date)) {
      classes.push(
        'prediction-off-date'
      );
    }

    if (
      selectedDates.includes(dateStr)
    ) {
      classes.push(
        'prediction-selected-date'
      );
    }

    return classes.join(' ');
  };

  const tileDisabled = ({
    date,
    view
  }) => {
    if (view !== 'month') {
      return false;
    }

    return (
      date <= today ||
      date > predictionEndDate ||
      !isWorkingDay(date)
    );
  };

  if (loading) {
    return (
      <div className="prediction-page">
        <div className="prediction-loading">
          Loading attendance prediction...
        </div>
      </div>
    );
  }

  return (
    <div className="prediction-page">

      <div className="prediction-header">

        <div>
          <h1>
            Attendance Prediction
          </h1>

          <p>
            Select future working days you
            plan to miss. Your predicted
            attendance will update
            automatically for every subject.
          </p>
        </div>

        <button
          className="prediction-refresh-button"
          onClick={loadData}
        >
          Refresh Attendance
        </button>

      </div>

      <div className="prediction-range-control">
        <div className="prediction-range-label">
          <strong>Prediction horizon</strong>
          <span>
            Next {predictionDays} days, ending {predictionEndDateString}
          </span>
        </div>

        <input
          type="range"
          min="7"
          max="150"
          step="1"
          value={predictionDays}
          onChange={handlePredictionDaysChange}
          aria-label="Prediction horizon in days"
        />

        <div className="prediction-range-scale">
          <span>7 days</span>
          <span>5 months</span>
        </div>
      </div>

      {error && (
        <div className="prediction-error">
          {error}
        </div>
      )}

      {message && !error && (
        <div className="prediction-message">
          {message}
        </div>
      )}

      <div className="prediction-main-grid">

        <div className="prediction-calendar-card">

          <div className="prediction-card-header">

            <h2>
              Select Planned Leave Days
            </h2>

            <span>
              Selected: {selectedDates.length}
            </span>

          </div>

          <p className="prediction-card-description">
            Future working days are assumed attended.
            Tap a date to mark all scheduled classes
            as planned absences.
          </p>

          <Calendar
            onClickDay={handleDateClick}
            value={null}
            activeStartDate={activeMonth}
            onActiveStartDateChange={({
              activeStartDate
            }) =>
              setActiveMonth(
                activeStartDate
              )
            }
            tileClassName={
              tileClassName
            }
            tileDisabled={
              tileDisabled
            }
            minDate={today}
            maxDate={predictionEndDate}
          />

          <div className="prediction-legend">

            <div>
              <span className="legend-working" />
              Working Day
            </div>

            <div>
              <span className="legend-selected" />
              Planned Absence
            </div>

            <div>
              <span className="legend-off" />
              Off / Holiday
            </div>

          </div>

          {selectedDates.length > 0 && (

            <button
              className="prediction-clear-button"
              onClick={clearPrediction}
            >
              Clear Selected Dates
            </button>

          )}

        </div>

        <div className="prediction-summary-card">

          <h2>
            Prediction Summary
          </h2>

          <div className="prediction-summary-item">

            <span>
              Planned Absence Days
            </span>

            <strong>
              {selectedDates.length}
            </strong>

          </div>

          <div className="prediction-summary-item">

            <span>
              Affected Subjects
            </span>

            <strong>
              {affectedSubjects.length}
            </strong>

          </div>

          <p className="prediction-summary-note">
            Future classes count as attended unless
            their date is marked as a planned absence.
          </p>

          {selectedDates.length > 0 && (

            <div className="selected-date-list">

              <h3>
                Selected Dates
              </h3>

              {selectedDates
                .slice()
                .sort()
                .map((date) => (

                  <div
                    className="selected-date-item"
                    key={date}
                  >

                    <span>
                      {date}
                    </span>

                    <button
                      onClick={() =>
                        setSelectedDates(
                          (
                            previousDates
                          ) =>
                            previousDates.filter(
                              (
                                item
                              ) =>
                                item !==
                                date
                            )
                        )
                      }
                    >
                      ×
                    </button>

                  </div>

                ))}

            </div>

          )}

        </div>

      </div>

      <div className="prediction-table-card">

        <div className="prediction-card-header">

          <div>

            <h2>
              Subject-wise Prediction
            </h2>

            <p>
              Your current attendance
              compared with attendance
              after missing the selected
              dates.
            </p>

          </div>

        </div>

        <div className="prediction-table-wrapper">

          <table className="prediction-table">

            <thead>

              <tr>
                <th>
                  Course
                </th>

                <th>
                  Current %
                </th>

                <th>
                  Future Classes
                </th>

                <th>
                  Classes Missed
                </th>

                <th>
                  Projected %
                </th>

                <th>
                  Status
                </th>
              </tr>

            </thead>

            <tbody>

              {predictedAttendance.map(
                (subject) => {

                  const currentDelivered = Number(
                    subject.eligibleDelivered ??
                      subject.totalDelivered ??
                      0
                  );

                  const currentAttended = Number(
                    subject.eligibleAttended ??
                      subject.totalAttended ??
                      0
                  );

                  const currentPercentage =
                    currentDelivered > 0
                      ? (currentAttended /
                          currentDelivered) *
                        100
                      : 0;

                  const isBelowRequirement =
                    subject.projectedPercentage <
                    75;

                  return (

                    <tr
                      key={
                        subject.courseCode
                      }
                    >

                      <td>

                        <div className="course-cell">

                          <strong>
                            {
                              subject.courseCode
                            }
                          </strong>

                          <span>
                            {
                              subject.title
                            }
                          </span>

                        </div>

                      </td>

                      <td>
                        {currentPercentage.toFixed(
                          2
                        )}
                        %
                      </td>

                      <td>
                        {subject.futureClasses}
                      </td>

                      <td>
                        {
                          subject.missedClasses
                        }
                      </td>

                      <td
                        className={
                          isBelowRequirement
                            ? 'percentage-danger'
                            : 'percentage-safe'
                        }
                      >
                        {subject.projectedPercentage.toFixed(
                          2
                        )}
                        %
                      </td>

                      <td>

                        <span
                          className={
                            isBelowRequirement
                              ? 'attendance-status danger'
                              : 'attendance-status safe'
                          }
                        >

                          {isBelowRequirement
                            ? 'Below 75%'
                            : 'Safe'}

                        </span>

                      </td>

                    </tr>

                  );
                }
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}