import { createClient } from '@supabase/supabase-js';

// VITE environment variables को एक्सेस करने का तरीका
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// महत्वपूर्ण: सुनिश्चित करें कि keys मौजूद हैं। अगर Vercel पर env variables 
// सही से सेट नहीं हैं, तो यह undefined होगा और ऐप क्रैश हो जाएगा।

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY) are missing or undefined. Check your .env file or Vercel environment settings.");
    // अगर variables नहीं मिलते हैं, तो एक dummy client export करें, 
    // ताकि क्रैश न हो, लेकिन console error दिखे।
    // प्रोडक्शन में, आपको Vercel settings में ये keys जोड़नी होंगी।
    // हम एक खाली ऑब्जेक्ट एक्सपोर्ट नहीं कर सकते, इसलिए error throw करेंगे 
    // ताकि यह क्रैश जल्दी हो और आपको कारण पता चले।
    throw new Error("Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Utility: log out the current user safely
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
