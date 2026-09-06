import { supabase } from '../supabase';

/**
 * Returns default status for a date based on day of week:
 * - Mon-Fri: 'WORKING'
 * - Sat-Sun: 'OFF'
 */
export const getDefaultStatus = (dateObj) => {
  const dayOfWeek = dateObj.getDay();
  return (dayOfWeek === 0 || dayOfWeek === 6) ? 'OFF' : 'WORKING';
};

/**
 * Fetch user's date overrides from Supabase
 */
export const fetchUserOverrides = async (userId) => {
  const { data, error } = await supabase
    .from('calendar_overrides')
    .select('date, status, routine_day')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching calendar overrides:', error.message);
    return {};
  }

  // Convert array to a key-value dictionary { "YYYY-MM-DD": { status, routineDay } }
  const overrideMap = {};
  data.forEach((row) => {
    overrideMap[row.date] = {
      status: row.status,
      routineDay: row.routine_day,
    };
  });

  return overrideMap;
};

/**
 * Save or update a date override for the logged-in user
 */
export const saveDateOverride = async (userId, dateStr, status, routineDay = null) => {
  const { error } = await supabase
    .from('calendar_overrides')
    .upsert({
      user_id: userId,
      date: dateStr,
      status: status,
      routine_day: routineDay,
      updated_at: new Date(),
    }, { onConflict: 'user_id, date' });

  if (error) {
    console.error('Error saving date override:', error.message);
  }
};

/**
 * Delete a date override (resets the day to its default status)
 */
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
/**
 * Copy 'EXAM' and 'HOLIDAY' overrides from a source user to the target user
 */
export const copyExamsAndHolidaysFromUser = async (targetUserId, sourceUserId) => {
  // 1. Fetch source user's EXAM and HOLIDAY entries
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

  // 2. Format payload for target user
  const payload = sourceOverrides.map((row) => ({
    user_id: targetUserId,
    date: row.date,
    status: row.status,
    routine_day: row.routine_day,
    updated_at: new Date(),
  }));

  // 3. Upsert into database
  const { error: upsertError } = await supabase
    .from('calendar_overrides')
    .upsert(payload, { onConflict: 'user_id, date' });

  if (upsertError) {
    console.error('Error copying overrides:', upsertError.message);
    return { success: false, error: upsertError.message };
  }

  return { success: true, count: payload.length };
};