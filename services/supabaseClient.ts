import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cdetflijohdkngvwekbd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXRmbGlqb2hka25ndndla2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDcxNjksImV4cCI6MjA4MTAyMzE2OX0.6Cds_3pnJ3Kk5uveL1eRo6sXX0oF2-Ur8_KC_BN7uiE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);