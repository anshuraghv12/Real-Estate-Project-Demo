import { createClient } from '@supabase/supabase-js';

// Vercel/Vite environment variables
// Note: We use process.env fallback for broader Vercel compatibility, although import.meta.env should work in Vite.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// CRITICAL: Ensure keys are present. If this fails, the app will show a clear error.
if (!supabaseUrl || !supabaseAnonKey) {
    // If the keys are missing at runtime (Vercel issue), throw a clean error.
    const errorMessage = "FATAL: Supabase configuration keys are missing. Please check Vercel Environment Variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";
    console.error(errorMessage);
    // Throwing an error here stops React and makes the page blank, 
    // but the console error is unavoidable now.
    throw new Error(errorMessage);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Utility: Log out the current user safely
 */
export const logoutUser = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error("Logout error:", err);
        return { success: false, message: err.message };
    }
};
