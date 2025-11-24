import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// IMPORTANT: Replace these with your actual Supabase project credentials
// You can find these in your Supabase Dashboard -> Project Settings -> API
// ------------------------------------------------------------------
const SUPABASE_URL = 'hhttps://hxfuvtffcqhwddpizzcq.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4ZnV2dGZmY3Fod2RkcGl6emNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDk2MDAsImV4cCI6MjA3OTU4NTYwMH0.wWs4VIJ2fkiAUVKaku8aylPd7pW-A0UMaYUj03KhiuM';

if (SUPABASE_URL.includes('xyzcompany')) {
    console.error("WARNING: You are using the default placeholder Supabase URL. Authentication will not work until you update lib/supabaseClient.ts with your real keys.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
