import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zptxcmommymnzlzlzaht.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwdHhjbW9tbXltbnpsemx6YWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODE2NzEsImV4cCI6MjA4ODk1NzY3MX0.Z7XmGV8D0eliKan7oNasipcqpvAz7Pk_9J08AZB7O0Y';

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
