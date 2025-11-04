import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const appUrl = import.meta.env.VITE_APP_URL;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are missing. Check your .env file.");
}

// ✅ Create Supabase client with full auth configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    flowType: "pkce",
    redirectTo: `${appUrl}/dashboard`, // redirect after successful Google login
  },
});

// ✅ Logout function
export const logoutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Clean any Supabase session data in localStorage
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-") || k.includes("supabase"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}

    return { success: true };
  } catch (err) {
    console.error("Logout error:", err);
    return { success: false, message: err.message };
  }
};
