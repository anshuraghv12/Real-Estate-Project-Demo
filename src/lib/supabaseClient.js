
//Real-Estate-Project-Demo\src\lib\supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client with session detection so OAuth redirects are handled
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // detectSessionInUrl reads the URL after an OAuth redirect and creates a session automatically
    detectSessionInUrl: true,
    // Keep default persistence
    persistSession: true,
  },
});

/**
 * Utility: log out the current user safely
 */
export const logoutUser = async () => {
  try {
    // signOut removes session from Supabase client and will trigger onAuthStateChange
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // also attempt to clear local storage keys Supabase may use
    try {
      localStorage.removeItem("sb:token");
    } catch (e) {
      // noop
    }
    return { success: true };
  } catch (err) {
    console.error("Logout error:", err);
    return { success: false, message: err.message };
  }
};
