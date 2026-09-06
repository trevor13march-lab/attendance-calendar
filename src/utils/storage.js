const KEYS = {
  ROUTINE: 'attendance_app_routine',
  OVERRIDES: 'attendance_app_overrides',
  SEMESTER: 'attendance_app_semester'
};

// Default empty timetable template
export const DEFAULT_SLOTS = [
  "9:30 - 10:20",
  "10:20 - 11:10",
  "11:10 - 12:00",
  "12:00 - 1:00", // Mon-Thu Lunch, Fri Slot 4 Lunch
  "1:00 - 1:50",
  "1:50 - 2:40",
  "2:40 - 3:30",
  "3:30 - 4:20"
];

export const getStoredData = () => {
  const routine = localStorage.getItem(KEYS.ROUTINE);
  const overrides = localStorage.getItem(KEYS.OVERRIDES);
  const semester = localStorage.getItem(KEYS.SEMESTER);

  return {
    routine: routine ? JSON.parse(routine) : null,
    overrides: overrides ? JSON.parse(overrides) : {},
    semester: semester ? JSON.parse(semester) : {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 4)).toISOString().split('T')[0]
    }
  };
};

export const saveData = (key, data) => {
  localStorage.setItem(KEYS[key], JSON.stringify(data));
};