import { supabase } from '../supabase';

export const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const getDefaultStatus = (date) => {
  const day = date.getDay();

  if (day === 0 || day === 6) {
    return 'OFF';
  }

  return 'WORKING';
};

export const fetchUserOverrides = async (userId) => {
  try {
    if (!userId) {
      return {};
    }

    const { data, error } = await supabase
      .from('calendar_overrides')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error(
        'Error fetching calendar overrides:',
        error
      );

      return {};
    }

    const overrides = {};

    (data || []).forEach((item) => {
      if (!item.date) {
        return;
      }

      const dateKey =
        typeof item.date === 'string'
          ? item.date.split('T')[0]
          : formatDate(new Date(item.date));

      overrides[dateKey] = {
        status: item.status || 'WORKING',
        routineDay:
          item.routine_day ||
          item.routineDay ||
          null,
        ...item
      };
    });

    return overrides;
  } catch (error) {
    console.error(
      'Unable to fetch calendar overrides:',
      error
    );

    return {};
  }
};

export const saveUserOverride = async (
  userId,
  date,
  status,
  routineDay = null
) => {
  try {
    if (!userId) {
      throw new Error(
        'User is not logged in.'
      );
    }

    const dateString =
      typeof date === 'string'
        ? date.split('T')[0]
        : formatDate(date);

    const { data, error } = await supabase
      .from('calendar_overrides')
      .upsert(
        {
          user_id: userId,
          date: dateString,
          status,
          routine_day: routineDay,
          updated_at: new Date()
        },
        {
          onConflict: 'user_id,date'
        }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error(
      'Unable to save calendar override:',
      error
    );

    throw error;
  }
};

export const deleteUserOverride = async (
  userId,
  date
) => {
  try {
    if (!userId) {
      throw new Error(
        'User is not logged in.'
      );
    }

    const dateString =
      typeof date === 'string'
        ? date.split('T')[0]
        : formatDate(date);

    const { error } = await supabase
      .from('calendar_overrides')
      .delete()
      .eq('user_id', userId)
      .eq('date', dateString);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error(
      'Unable to delete calendar override:',
      error
    );

    throw error;
  }
};

export const getDateStatus = (
  date,
  overrides = {}
) => {
  const dateString = formatDate(date);

  if (overrides[dateString]) {
    return overrides[dateString].status;
  }

  return getDefaultStatus(date);
};

export const isWorkingDay = (
  date,
  overrides = {}
) => {
  return (
    getDateStatus(
      date,
      overrides
    ) === 'WORKING'
  );
};

export const isOffDay = (
  date,
  overrides = {}
) => {
  return (
    getDateStatus(
      date,
      overrides
    ) === 'OFF'
  );
};
