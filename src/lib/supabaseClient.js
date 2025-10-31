import { createClient } from '@supabase/supabase-js';

// Vercel/Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// CRITICAL: Runtime check for missing keys
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY) are missing or undefined. Check your Vercel settings.");
    // Throw an error to stop app execution early and show the error in the console.
    throw new Error("Missing Supabase configuration. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.");
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
