const KEYS = {
  ROUTINE: 'attendance_app_routine',
  TIMETABLE: 'attendance_app_timetable',
  OVERRIDES: 'attendance_app_overrides',
  SEMESTER: 'attendance_app_semester'
};

const LEGACY_KEYS = [
  'timetable',
  'weeklyTimetable',
  'cuimsTimetable',
  'attendanceTimetable'
];

const parseJson = (value) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const normalizeTimetable = (value) => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const normalized = {};
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];

  Object.entries(value).forEach(([key, entry]) => {
    const normalizedKey = dayNames.find(
      (day) => day.toLowerCase() === String(key).toLowerCase()
    ) || key;

    if (Array.isArray(entry)) {
      normalized[normalizedKey] = entry;
      return;
    }

    if (entry && typeof entry === 'object') {
      const candidate = Array.isArray(entry.courses)
        ? entry.courses
        : Array.isArray(entry.classes)
          ? entry.classes
          : [];

      normalized[normalizedKey] = candidate;
    }
  });

  return normalized;
};

export const getTimetableFromStorage = () => {
  const candidateValues = [
    parseJson(localStorage.getItem(KEYS.TIMETABLE)),
    parseJson(localStorage.getItem(KEYS.ROUTINE)),
    ...LEGACY_KEYS.map((key) => parseJson(localStorage.getItem(key)))
  ];

  const timetable = candidateValues.find((value) => value && typeof value === 'object');

  return normalizeTimetable(timetable || {});
};

export const saveTimetableToStorage = (timetable) => {
  const normalized = normalizeTimetable(timetable || {});

  localStorage.setItem(KEYS.TIMETABLE, JSON.stringify(normalized));
  localStorage.setItem(KEYS.ROUTINE, JSON.stringify(normalized));

  LEGACY_KEYS.forEach((key) => {
    localStorage.setItem(key, JSON.stringify(normalized));
  });

  return normalized;
};

export const DEFAULT_SLOTS = [
  '9:30 - 10:20',
  '10:20 - 11:10',
  '11:10 - 12:00',
  '12:00 - 1:00',
  '1:00 - 1:50',
  '1:50 - 2:40',
  '2:40 - 3:30',
  '3:30 - 4:20'
];

export const getStoredData = () => {
  const routine = parseJson(localStorage.getItem(KEYS.ROUTINE));
  const timetable = getTimetableFromStorage();
  const overrides = parseJson(localStorage.getItem(KEYS.OVERRIDES)) || {};
  const semester = parseJson(localStorage.getItem(KEYS.SEMESTER)) || {
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(
      new Date().setMonth(new Date().getMonth() + 4)
    ).toISOString().split('T')[0]
  };

  return {
    routine: routine || timetable,
    timetable,
    overrides,
    semester
  };
};

export const saveData = (key, data) => {
  const storageKey = KEYS[key] || key;
  localStorage.setItem(storageKey, JSON.stringify(data));
};