import { createClient } from '@supabase/supabase-js';

// Access environment variables provided by Vite/Vercel
// Fallback to hardcoded strings only for local testing if env vars are missing
const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || 'https://cdetflijohdkngvwekbd.supabase.co';
const SUPABASE_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXRmbGlqb2hka25ndndla2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDcxNjksImV4cCI6MjA4MTAyMzE2OX0.6Cds_3pnJ3Kk5uveL1eRo6sXX0oF2-Ur8_KC_BN7uiE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);