const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const normalizeCourseCode = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
};

const isClassSlot = (value) => {
  if (!value) return false;

  const normalized = String(value).trim().toLowerCase();

  return (
    normalized !== '' &&
    normalized !== 'lunch break' &&
    normalized !== 'lunch' &&
    normalized !== 'free'
  );
};

export const getCourseCodesForDay = (timetable, date, overrides = {}) => {
  if (!timetable || !date) {
    return [];
  }

  const dateStr = formatDate(date);
  const override = overrides[dateStr];
  const dayOfWeek = date.getDay();
  const defaultDayName = DAY_NAMES[dayOfWeek];
  const routineDay =
    override && override.status === 'WORKING' && override.routineDay
      ? override.routineDay
      : defaultDayName;

  const daySchedule =
    timetable[routineDay] ||
    timetable[dayOfWeek] ||
    timetable[String(dayOfWeek)] ||
    timetable[String(routineDay)] ||
    [];

  const courseEntries = Array.isArray(daySchedule)
    ? daySchedule
    : daySchedule && typeof daySchedule === 'object'
      ? Array.isArray(daySchedule.courses)
        ? daySchedule.courses
        : Array.isArray(daySchedule.classes)
          ? daySchedule.classes
          : []
      : [];

  return courseEntries
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry;
      }

      if (entry && typeof entry === 'object') {
        return (
          entry.courseCode ||
          entry.course_code ||
          entry.code ||
          entry.course ||
          entry.subject ||
          ''
        );
      }

      return '';
    })
    .filter(isClassSlot);
};

export const getFutureWorkingDays = (
  routine,
  overrides,
  daysToCheck
) => {
  const upcomingDays = [];

  const current = new Date();
  current.setHours(0, 0, 0, 0);
  current.setDate(current.getDate() + 1);

  let checkedDays = 0;

  while (checkedDays < daysToCheck) {
    const dateStr = formatDate(current);
    const override = overrides?.[dateStr];

    let status;
    let routineDay;

    if (override) {
      status = override.status;
      routineDay = override.routineDay;
    } else {
      const dayOfWeek = current.getDay();

      status =
        dayOfWeek === 0 || dayOfWeek === 6
          ? 'OFF'
          : 'WORKING';
    }

    if (status === 'WORKING') {
      const actualRoutineDay =
        routineDay || DAY_NAMES[current.getDay()];

      const slots = routine?.[actualRoutineDay] || [];

      const subjects = slots.filter(isClassSlot);

      if (subjects.length > 0) {
        upcomingDays.push({
          date: dateStr,
          routineDay: actualRoutineDay,
          subjects
        });
      }
    }

    current.setDate(current.getDate() + 1);
    checkedDays++;
  }

  return upcomingDays;
};

export const calculatePrediction = (
  attendanceData,
  upcomingDays,
  dayPlans,
  timetable,
  overrides = {}
) => {
  return attendanceData.map((subject) => {
    let attended = Number(subject.attended) || 0;
    let delivered = Number(subject.delivered) || 0;

    upcomingDays.forEach((day) => {
      const plan = dayPlans?.[day.date] || 'attend';
      const timetableCourses = timetable
        ? getCourseCodesForDay(timetable, new Date(`${day.date}T00:00:00`), overrides)
        : day.subjects || [];

      const courseCode = normalizeCourseCode(
        subject.courseCode ||
          subject.course_code ||
          subject.code ||
          subject.subject ||
          subject.title ||
          ''
      );

      const subjectClasses = timetableCourses.filter((name) => {
        const candidate = normalizeCourseCode(name);

        return candidate && candidate === courseCode;
      }).length;

      if (subjectClasses > 0) {
        delivered += subjectClasses;

        if (plan === 'attend') {
          attended += subjectClasses;
        }
      }
    });

    const percentage =
      delivered > 0
        ? Number(((attended / delivered) * 100).toFixed(2))
        : 0;

    return {
      ...subject,
      predictedAttended: attended,
      predictedDelivered: delivered,
      predictedPercentage: percentage
    };
  });
};

export const calculateOverallPrediction = (subjects) => {
  const attended = subjects.reduce(
    (total, subject) =>
      total + (Number(subject.predictedAttended) || 0),
    0
  );

  const delivered = subjects.reduce(
    (total, subject) =>
      total + (Number(subject.predictedDelivered) || 0),
    0
  );

  return {
    attended,
    delivered,
    percentage:
      delivered > 0
        ? Number(((attended / delivered) * 100).toFixed(2))
        : 0
  };
};