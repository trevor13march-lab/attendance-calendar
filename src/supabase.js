import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wpfnymrfsacnjfscopzm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwZm55bXJmc2Fjbmpmc2NvcHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NzE2MTIsImV4cCI6MjEwMTE0NzYxMn0.sKp-UYBLsvsYxrgaJJW9JHuH_KRcPKvCohMrVcHgITw'; // Replace with key from step 2

export const supabase = createClient(supabaseUrl, supabaseAnonKey);