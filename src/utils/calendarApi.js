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
 * Safely extracts a 36-character UUID from a string (supports raw UUIDs, share URLs, or query strings).
 */
export const extractUserId = (input) => {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = trimmed.match(uuidRegex);
  return match ? match[0] : null;
};

/**
 * Fetch user's date overrides from Supabase
 */
export const fetchUserOverrides = async (userId) => {
  if (!userId) return {};

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
  (data || []).forEach((row) => {
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
  if (!userId) return;

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
  if (!userId) return;

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
 * Sync entire local calendar (semester + all overrides) to Supabase cloud
 */
export const syncUserCalendarToCloud = async (userId, semester, overrides) => {
  if (!userId) return { success: false, error: 'User is not logged in.' };

  try {
    // 1. Save semester in user_data
    if (semester && (semester.startDate || semester.endDate)) {
      const { error: userError } = await supabase
        .from('user_data')
        .upsert({
          id: userId,
          data: { semester },
          updated_at: new Date(),
        });
      if (userError) console.error('Error syncing semester data:', userError.message);
    }

    // 2. Save overrides
    const overrideEntries = Object.entries(overrides || {});
    if (overrideEntries.length > 0) {
      const payload = overrideEntries.map(([date, info]) => ({
        user_id: userId,
        date: date,
        status: typeof info === 'string' ? info : info?.status || 'WORKING',
        routine_day: info?.routineDay || null,
        updated_at: new Date(),
      }));

      const { error: overrideError } = await supabase
        .from('calendar_overrides')
        .upsert(payload, { onConflict: 'user_id, date' });

      if (overrideError) {
        console.error('Error syncing overrides:', overrideError.message);
        return { success: false, error: overrideError.message };
      }
    }

    return { success: true };
  } catch (err) {
    console.error('Exception during syncUserCalendarToCloud:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Fetches complete calendar data (semester dates + all overrides) for any valid User ID.
 */
export const fetchFullCalendar = async (userId) => {
  const cleanId = extractUserId(userId);
  if (!cleanId) {
    return {
      success: false,
      error: 'Invalid User ID format. Please provide a valid 36-character ID.'
    };
  }

  try {
    // 1. Fetch semester info from user_data
    const { data: userRow, error: userError } = await supabase
      .from('user_data')
      .select('data')
      .eq('id', cleanId)
      .maybeSingle();

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error fetching source user_data:', userError.message);
    }

    // 2. Fetch all overrides from calendar_overrides
    const { data: overridesData, error: overridesError } = await supabase
      .from('calendar_overrides')
      .select('date, status, routine_day')
      .eq('user_id', cleanId);

    if (overridesError) {
      console.error('Error fetching source calendar_overrides:', overridesError.message);
      return { success: false, error: overridesError.message };
    }

    const semester = userRow?.data?.semester || { startDate: '', endDate: '' };
    const overridesMap = {};
    const stats = {
      total: 0,
      working: 0,
      off: 0,
      holiday: 0,
      exam: 0,
      absent: 0,
      medical: 0,
      routines: 0
    };

    (overridesData || []).forEach((row) => {
      overridesMap[row.date] = {
        status: row.status,
        routineDay: row.routine_day,
      };
      stats.total++;
      const s = (row.status || '').toUpperCase();
      if (s === 'WORKING') stats.working++;
      else if (s === 'OFF') stats.off++;
      else if (s === 'HOLIDAY') stats.holiday++;
      else if (s === 'EXAM') stats.exam++;
      else if (s === 'ABSENT') stats.absent++;
      else if (s === 'MEDICAL_LEAVE') stats.medical++;

      if (row.routine_day) stats.routines++;
    });

    const hasData = (overridesData && overridesData.length > 0) || (semester.startDate && semester.endDate);

    if (!hasData) {
      return {
        success: false,
        error: 'No calendar schedule was found under this User ID.'
      };
    }

    return {
      success: true,
      userId: cleanId,
      semester,
      overrides: overridesMap,
      rawList: overridesData || [],
      stats
    };
  } catch (err) {
    console.error('Error in fetchFullCalendar:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Imports a shared calendar from a source User ID into the target user profile.
 * Mode:
 * - 'replace' (default): completely mirrors source calendar (deletes target user's existing overrides and sets source's).
 * - 'merge': adds/updates source overrides on top of existing target overrides.
 */
export const importCalendarFromUser = async (targetUserId, sourceUserId, { mode = 'replace' } = {}) => {
  // 1. Fetch source calendar
  const result = await fetchFullCalendar(sourceUserId);
  if (!result.success) {
    return result;
  }

  const { semester: sourceSemester, overrides: sourceOverrides, rawList: sourceList, stats } = result;

  // 2. If target user is logged in, sync changes to Supabase
  if (targetUserId) {
    try {
      // If replace mode, remove existing overrides for target user first
      if (mode === 'replace') {
        const { error: deleteError } = await supabase
          .from('calendar_overrides')
          .delete()
          .eq('user_id', targetUserId);

        if (deleteError) {
          console.error('Error clearing old overrides:', deleteError.message);
        }
      }

      // Upsert new overrides
      if (sourceList && sourceList.length > 0) {
        const payload = sourceList.map((row) => ({
          user_id: targetUserId,
          date: row.date,
          status: row.status,
          routine_day: row.routine_day,
          updated_at: new Date(),
        }));

        const { error: upsertError } = await supabase
          .from('calendar_overrides')
          .upsert(payload, { onConflict: 'user_id, date' });

        if (upsertError) {
          console.error('Error saving imported overrides to Supabase:', upsertError.message);
          return { success: false, error: upsertError.message };
        }
      }

      // Upsert semester info to target user_data
      if (sourceSemester && (sourceSemester.startDate || sourceSemester.endDate)) {
        const { error: userError } = await supabase
          .from('user_data')
          .upsert({
            id: targetUserId,
            data: { semester: sourceSemester },
            updated_at: new Date(),
          });

        if (userError) {
          console.error('Error saving semester dates to user_data:', userError.message);
        }
      }
    } catch (err) {
      console.error('Error saving import to Supabase:', err);
      return { success: false, error: err.message };
    }
  }

  return {
    success: true,
    semester: sourceSemester,
    overrides: sourceOverrides,
    count: sourceList.length,
    stats,
    sourceUserId: result.userId
  };
};

/**
 * Copy 'EXAM' and 'HOLIDAY' overrides from a source user to the target user (Legacy / specific import)
 */
export const copyExamsAndHolidaysFromUser = async (targetUserId, sourceUserId) => {
  const cleanId = extractUserId(sourceUserId);
  if (!cleanId) return { success: false, error: 'Invalid User ID format.' };

  const { data: sourceOverrides, error: fetchError } = await supabase
    .from('calendar_overrides')
    .select('date, status, routine_day')
    .eq('user_id', cleanId)
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
    updated_at: new Date(),
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