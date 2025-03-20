import { createClient } from '@supabase/supabase-js';

// These values should be stored in environment variables
// For development purposes, they're hardcoded here
const supabaseUrl = 'https://your-supabase-project-url.supabase.co';
const supabaseAnonKey = 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export { supabase }; 