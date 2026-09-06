import { supabase } from '../supabase';
import {
  formatDate as formatDateUtil,
  getDefaultStatus as getDefaultStatusUtil,
  fetchUserOverrides as fetchUserOverridesUtil,
  saveUserOverride as saveUserOverrideUtil,
  deleteUserOverride as deleteUserOverrideUtil,
  getDateStatus as getDateStatusUtil,
  isWorkingDay as isWorkingDayUtil,
  isOffDay as isOffDayUtil
} from './calendarUtils.js';

export const formatDate = formatDateUtil;
export const getDefaultStatus = getDefaultStatusUtil;
export const fetchUserOverrides = async (userId) =>
  fetchUserOverridesUtil(userId);
export const saveUserOverride = saveUserOverrideUtil;
export const deleteUserOverride = deleteUserOverrideUtil;
export const getDateStatus = getDateStatusUtil;
export const isWorkingDay = isWorkingDayUtil;
export const isOffDay = isOffDayUtil;

export const saveDateOverride = async (
  userId,
  dateStr,
  status,
  routineDay = null
) => {
  const { error } = await supabase
    .from('calendar_overrides')
    .upsert(
      {
        user_id: userId,
        date: dateStr,
        status,
        routine_day: routineDay,
        updated_at: new Date()
      },
      { onConflict: 'user_id, date' }
    );

  if (error) {
    console.error('Error saving date override:', error.message);
  }
};

export const deleteDateOverride = async (userId, dateStr) => {
  const { error } = await supabase
    .from('calendar_overrides')
    .delete()
    .eq('user_id', userId)
    .eq('date', dateStr);

  if (error) {
    console.error('Error deleting override:', error.message);
  }
};

export const copyExamsAndHolidaysFromUser = async (
  targetUserId,
  sourceUserId
) => {
  const { data: sourceOverrides, error: fetchError } = await supabase
    .from('calendar_overrides')
    .select('date, status, routine_day')
    .eq('user_id', sourceUserId)
    .in('status', ['EXAM', 'HOLIDAY']);

  if (fetchError) {
    console.error('Error fetching source user overrides:', fetchError.message);
    return { success: false, error: fetchError.message };
  }

  if (!sourceOverrides || sourceOverrides.length === 0) {
    return { success: true, count: 0 };
  }

  const payload = sourceOverrides.map((row) => ({
    user_id: targetUserId,
    date: row.date,
    status: row.status,
    routine_day: row.routine_day,
    updated_at: new Date()
  }));

  const { error: upsertError } = await supabase
    .from('calendar_overrides')
    .upsert(payload, { onConflict: 'user_id, date' });

  if (upsertError) {
    console.error('Error copying overrides:', upsertError.message);
    return { success: false, error: upsertError.message };
  }

  return { success: true, count: payload.length };
};