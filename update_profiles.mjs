import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://duwismgfvafkotjjdext.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1d2lzbWdmdmFma290ampkZXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDQ4MzYsImV4cCI6MjA5Njg4MDgzNn0.npyahEW7F8G6_6JGNX8c8PyAoYCsb2vYUPqt3KR8mag';

async function updateProfiles() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  // Login as CEO to get permissions to update profiles
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
    email: 'ceo@sbs.com', 
    password: 'password123' 
  });
  
  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }
  
  console.log('Logged in successfully. Updating profiles...');

  // Get all profiles
  const { data: profiles, error: fetchError } = await supabase.from('profiles').select('id, full_name');
  
  if (fetchError) {
    console.error('Error fetching profiles:', fetchError.message);
    return;
  }

  for (const profile of profiles) {
    if (profile.full_name && profile.full_name.includes('Test ')) {
      const newName = profile.full_name.replace('Test ', '');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: newName })
        .eq('id', profile.id);
        
      if (updateError) {
        console.error(`Error updating profile ${profile.id}:`, updateError.message);
      } else {
        console.log(`Updated profile ${profile.full_name} -> ${newName}`);
      }
    }
  }
  
  console.log('Profile update finished.');
}

updateProfiles();
