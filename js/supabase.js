// Supabase Configuration
// Replace these with your actual Supabase project credentials
const SUPABASE_URL = "https://ovdccxatstsqjxgbwtuu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92ZGNjeGF0c3RzcWp4Z2J3dHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzA5ODMsImV4cCI6MjA3NTg0Njk4M30.gEAfS9raajJj4PRq2RrHcuXempdFkHAK1czwaF3lUTw";

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other modules
window.supabaseClient = supabase;
