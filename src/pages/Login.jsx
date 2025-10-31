import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react"; // Loader2 icon added
import { supabase } from "../lib/supabaseClient";

// Simple Toast Component (A temporary solution until we implement a proper global toast system)
const Toast = ({ message, type }) => {
  if (!message) return null;

  const colorClasses = {
    success: "bg-green-50 text-green-700 border border-green-200",
    error: "bg-red-50 text-red-700 border border-red-200",
    info: "bg-blue-50 text-blue-700 border border-blue-200",
  };

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 p-4 rounded-xl text-sm font-medium z-50 shadow-lg transition-opacity duration-300 ${
        colorClasses[type] || colorClasses.info
      }`}
    >
      {message}
    </div>
  );
};

// Update the component signature to receive session and loading props from App.jsx
export default function Login({ session, loading }) {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [authLoading, setAuthLoading] = useState(false); // Renamed to avoid confusion with prop
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // Fix: Handling VITE_APP_URL environment variable 
  // We use the safer check to avoid the 'empty-import-meta' warning in some envs
  const redirectBase = (typeof import.meta !== 'undefined' && import.meta.env.VITE_APP_URL) 
    ? import.meta.env.VITE_APP_URL 
    : window.location.origin;
  const redirectUrl = `${redirectBase}/dashboard`; 

  // Show message helper
  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 6000); // 6 seconds visibility for toast
  };

  // 1. Initial Redirect Check (Using Props from App.jsx)
  useEffect(() => {
    // If global loading is complete AND a session exists, navigate immediately.
    if (!loading && session) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, session, loading]);


  // 2. Auth State Change Listener (Handles OAuth completion and real-time sign in/out)
  useEffect(() => {
    let mounted = true;

    // Supabase will automatically redirect to the login page after sign out,
    // and the App.jsx listener handles SIGNED_IN. We primarily use this 
    // listener to handle profile creation immediately after sign in (especially OAuth).
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      try {
        if (!mounted) return;

        if (event === "SIGNED_IN" && currentSession?.user) {
          // Immediately ensure profile exists/is updated
          await ensureProfile(currentSession.user, formData.name); 
          
          // App.jsx handles the final dashboard navigation, but we can re-confirm here.
          if (window.location.pathname !== "/dashboard") {
             navigate("/dashboard", { replace: true });
          }
        }
      } catch (err) {
        console.error("Auth state change handling error:", err);
        showMessage("An error occurred during sign-in process.", "error");
      }
    });

    return () => {
      mounted = false;
      if (listener?.subscription) listener.subscription.unsubscribe();
    };
  }, [navigate, formData.name]);


  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // helper to ensure profile exists or is updated (Handles Google/SignUp)
  const ensureProfile = async (user, nameFromForm) => {
    if (!user?.id) return;
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id, role, name")
        .eq("id", user.id)
        .maybeSingle(); // Use maybeSingle to handle case where no profile exists yet

      // Determine the name to use: existing profile name > Google metadata name > form name
      const name = 
        existing?.name || 
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        nameFromForm || 
        "User";

      await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email,
          name: name,
          // Crucial: Preserve existing role if it exists (for Admin assignment)
          role: existing?.role || "user", 
        },
        { onConflict: "id" }
      );
    } catch (err) {
      console.error("ensureProfile error:", err);
      // NOTE: We don't show a toast here as it runs in the background listener/submit
    }
  };

  const handleSubmit = async () => {
    setAuthLoading(true);
    setMessage("");

    try {
      if (isSignUp) {
        // --- CLIENT REQUIREMENT: Toast message for error and validation ---
        if (!formData.name?.trim()) {
          showMessage("कृपया अपना पूरा नाम दर्ज करें।", "error"); // Hindi (Latin) message
          setAuthLoading(false);
          return;
        }
        // Basic email format check
        if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
          showMessage("कृपया एक वैध (valid) ईमेल पता दर्ज करें।", "error"); // Hindi (Latin) message
          setAuthLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          showMessage("पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।", "error"); // Hindi (Latin) message
          setAuthLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          showMessage("पासवर्ड मेल नहीं खा रहे हैं!", "error"); // Hindi (Latin) message
          setAuthLoading(false);
          return;
        }

        // Sign up user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { name: formData.name },
            emailRedirectTo: redirectUrl,
          },
        });

        if (signUpError) throw signUpError;

        const user = signUpData?.user ?? null;
        const session = signUpData?.session ?? null;

        if (session) {
          // If auto-login happens (e.g., using Deep Link email), we ensure profile and navigate
          await ensureProfile(user, formData.name);
          showMessage("खाता सफलतापूर्वक बन गया है! रीडायरेक्ट हो रहा है...", "success"); // Hindi (Latin) message
          // Navigation is handled by the useEffect listener for consistency
        } else {
          showMessage("खाता बन गया है! कृपया अपने खाते को सत्यापित (verify) करने के लिए अपना ईमेल देखें।", "success"); // Hindi (Latin) message
        }
      } else {
        // Sign in
        if (!formData.email?.trim() || !formData.password?.trim()) {
          showMessage("कृपया ईमेल और पासवर्ड दर्ज करें।", "error"); // Hindi (Latin) message
          setAuthLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        
        if (error) throw error;

        const user = data?.user ?? null;
        if (user) {
          await ensureProfile(user, formData.name);
          showMessage("लॉगिन सफल! रीडायरेक्ट हो रहा है...", "success"); // Hindi (Latin) message
          // Navigation is handled by the useEffect listener
        } else {
          // Should not happen, but for safety
          showMessage("लॉगिन सफल रहा लेकिन कोई यूजर सेशन नहीं मिला।", "error"); // Hindi (Latin) message
        }
      }
    } catch (error) {
      // Catch network, Supabase specific errors
      showMessage(error?.message || "प्रमाणीकरण (Authentication) विफल रहा। क्रेडेंशियल्स जांचें।", "error"); // Hindi (Latin) message
      console.error("Auth error:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    showMessage("प्रमाणीकरण के लिए Google पर रीडायरेक्ट हो रहा है...", "info"); // Hindi (Latin) message
    setAuthLoading(true);
    try {
      // Ensure the redirectUrl is correct for Vercel deployment
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
      // The browser will redirect, no need for further action here.
    } catch (error) {
      showMessage(error?.message || "Google साइन-इन विफल रहा। कृपया पुनः प्रयास करें।", "error"); // Hindi (Latin) message
      console.error("Google sign-in error:", error);
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    // ... (Your existing forgot password logic is fine)
    if (!formData.email?.trim()) {
      showMessage("पासवर्ड रीसेट करने के लिए कृपया अपना ईमेल दर्ज करें।", "error"); // Hindi (Latin) message
      return;
    }

    setAuthLoading(true);
    showMessage("रीसेट लिंक भेजा जा रहा है...", "info"); // Hindi (Latin) message

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${redirectBase}/reset-password`,
      });
      if (error) throw error;
      showMessage("पासवर्ड रीसेट ईमेल भेजा गया है! कृपया अपना इनबॉक्स देखें।", "success"); // Hindi (Latin) message
    } catch (error) {
      showMessage(error?.message || "रीसेट ईमेल भेजने में विफल। जांचें कि ईमेल मौजूद है या नहीं।", "error"); // Hindi (Latin) message
      console.error("Reset password error:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  // If the component is globally recognized as loading, show nothing here.
  // The App.jsx LoadingScreen takes over.
  if (loading) {
    return null; 
  }


  return (
    <>
      <Toast message={message} type={messageType} />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <div className="relative w-full max-w-5xl h-[650px] rounded-3xl overflow-hidden shadow-2xl">
          <div
            className={`absolute inset-0 flex transition-all duration-700 ease-in-out ${
              isSignUp ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* Left/Right Panel with Swap Animation (No Change) */}
            <div
              className={`w-1/2 rounded-3xl flex flex-col items-center justify-center text-white p-12 transition-all duration-700
                ${
                  isSignUp
                    ? "bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-500"
                    : "bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600"
                }`}
            >
              <div className="text-center space-y-6">
                <h1 className="text-5xl font-bold">
                  {isSignUp ? "Already a Client?" : "Welcome Back!"}
                </h1>
                <p className="text-lg opacity-90 max-w-md mx-auto leading-relaxed">
                  {isSignUp
                    ? "Sign in to access your projects and manage your data seamlessly"
                    : "Create an account to start managing your projects and tracking progress efficiently"}
                </p>
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setMessage("");
                    setMessageType("");
                  }}
                  className="mt-8 px-10 py-3.5 border-2 border-white rounded-full text-white font-semibold hover:bg-white hover:text-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {isSignUp ? "SIGN IN" : "SIGN UP"}
                </button>
              </div>
            </div>

            {/* Form Panel (Changes Applied Here) */}
            <div className="w-1/2 bg-white flex items-center justify-center p-12">
              <div className="w-full max-w-md">
                <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">
                  {isSignUp ? "Create Account" : "Sign In"}
                </h2>

                {!isSignUp && (
                  <div className="mb-8">
                    <button
                      onClick={handleGoogleLogin}
                      disabled={authLoading}
                      className="w-full flex items-center justify-center gap-3 px-6 py-3.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span className="font-medium text-gray-700">Continue with Google</span>
                    </button>
                    <div className="relative my-8">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-500 font-medium">
                          Or continue with email
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {isSignUp && (
                  <p className="text-center text-gray-600 mb-6 text-sm">Fill in your details to get started</p>
                )}

                <div className="space-y-5">
                  {isSignUp && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        name="name"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {isSignUp && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          placeholder="Re-enter your password"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          onKeyPress={handleKeyPress}
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {!isSignUp && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={authLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {authLoading ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Processing...
                      </span>
                    ) : (
                      isSignUp ? "CREATE ACCOUNT" : "SIGN IN"
                    )}
                  </button>

                  {/* Removed the static message div here and replaced with global Toast */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
