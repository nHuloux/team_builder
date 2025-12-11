import { createClient } from '@supabase/supabase-js';

// Safe access to environment variables to prevent "import.meta.env is undefined" errors
const getEnvVar = (key: string, fallback: string): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key] || fallback;
    }
  } catch (e) {
    console.warn('Environment variables not accessible, using fallback');
  }
  return fallback;
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL', 'https://cdetflijohdkngvwekbd.supabase.co');
const SUPABASE_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXRmbGlqb2hka25ndndla2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDcxNjksImV4cCI6MjA4MTAyMzE2OX0.6Cds_3pnJ3Kk5uveL1eRo6sXX0oF2-Ur8_KC_BN7uiE');

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);