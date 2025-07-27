import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ngrqwmvuhvjkeohesbxs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg";

// Use a simpler client setup focused on reliable auth
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // Simplified auth options that focus on reliability
    autoRefreshToken: true,
    persistSession: true,
    storageKey: 'urbanista-auth-token',
    
    // Enable session detection for OAuth flows
    detectSessionInUrl: true
  }
});

// Create a utility function to check if current session is valid
export const isSessionValid = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Session validation error:", error);
      return false;
    }
    
    return !!data.session;
  } catch (e) {
    console.error("Error checking session validity:", e);
    return false;
  }
};

// Simplified sign out that focuses on reliability
export const clearAuthState = async () => {
  try {
    // First set local keys to ensure UI updates even if API call fails
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('urbanista-auth-token');
      sessionStorage.removeItem('urbanista-user-role');
    }
    
    // Then do the API call to sign out
    await supabase.auth.signOut();
    
    return true;
  } catch (error) {
    console.error("Error during sign out:", error);
    
    // Manually clear storage as fallback
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('urbanista-auth-token');
      sessionStorage.removeItem('urbanista-user-role');
    }
    
    return false;
  }
};

// Utility function to directly sign in without side effects
export const directSignIn = async (email: string, password: string) => {
  try {
    // First clear any existing session
    await supabase.auth.signOut();
    
    // Small delay to ensure previous session is cleared
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Attempt sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    return {
      success: true,
      user: data.user,
      session: data.session
    };
  } catch (error) {
    console.error("Direct sign in error:", error);
    return {
      success: false,
      error
    };
  }
};
