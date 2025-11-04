import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// 🟢 Simple Toast Component
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

export default function Login({ session, loading }) {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const redirectBase =
    typeof import.meta !== "undefined" && import.meta.env.VITE_APP_URL
      ? import.meta.env.VITE_APP_URL
      : window.location.origin;

  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 6000);
  };

  // 🟢 1. Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && session) navigate("/dashboard", { replace: true });
  }, [navigate, session, loading]);

  // 🟢 2. Listen for auth changes (Google / Email login)
  useEffect(() => {
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!active) return;
        if (event === "SIGNED_IN" && currentSession?.user) {
          await ensureProfile(currentSession.user, formData.name);
          navigate("/dashboard", { replace: true });
        }
      }
    );
    return () => {
      active = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, [navigate, formData.name]);

  // 🟢 Ensure user profile exists
  const ensureProfile = async (user, nameFromForm) => {
    if (!user?.id) return;
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id, role, name")
        .eq("id", user.id)
        .maybeSingle();

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
          name,
          role: existing?.role || "user",
        },
        { onConflict: "id" }
      );
    } catch (err) {
      console.error("ensureProfile error:", err);
    }
  };

  // 🟢 Email/Password Sign In or Sign Up
  const handleSubmit = async () => {
    setAuthLoading(true);
    setMessage("");

    try {
      if (isSignUp) {
        if (!formData.name?.trim()) {
          showMessage("कृपया अपना पूरा नाम दर्ज करें।", "error");
          setAuthLoading(false);
          return;
        }
        if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
          showMessage("कृपया एक वैध ईमेल पता दर्ज करें।", "error");
          setAuthLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          showMessage("पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।", "error");
          setAuthLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          showMessage("पासवर्ड मेल नहीं खा रहे हैं!", "error");
          setAuthLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { name: formData.name },
            emailRedirectTo: `${redirectBase}/dashboard`,
          },
        });

        if (error) throw error;

        const user = data?.user;
        if (user) {
          await ensureProfile(user, formData.name);
          showMessage("खाता सफलतापूर्वक बन गया है!", "success");
        } else {
          showMessage("ईमेल की पुष्टि करें।", "info");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        if (data?.user) {
          await ensureProfile(data.user, formData.name);
          showMessage("लॉगिन सफल! Redirect हो रहा है...", "success");
        }
      }
    } catch (err) {
      showMessage(err?.message || "प्रमाणीकरण असफल रहा।", "error");
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  // 🟢 Google Login
  const handleGoogleLogin = async () => {
    showMessage("Redirecting to Google...", "info");
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${redirectBase}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error) {
      showMessage(error?.message || "Google login failed", "error");
      console.error(error);
      setAuthLoading(false);
    }
  };

  // 🟢 Forgot Password
  const handleForgotPassword = async () => {
    if (!formData.email?.trim()) {
      showMessage("Please enter your email.", "error");
      return;
    }
    setAuthLoading(true);
    showMessage("Sending reset link...", "info");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${redirectBase}/reset-password`,
      });
      if (error) throw error;
      showMessage("Reset email sent. Check inbox.", "success");
    } catch (error) {
      showMessage(error?.message || "Failed to send email.", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  if (loading) return null;

  // 🟢 UI (unchanged)
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
            <div
              className={`w-1/2 rounded-3xl flex flex-col items-center justify-center text-white p-12 transition-all duration-700 ${
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
                    ? "Sign in to access your projects."
                    : "Create an account to start managing your projects."}
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

            {/* 🔹 Right Form Section */}
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
                      <img
                        src="https://www.svgrepo.com/show/475656/google-color.svg"
                        alt="Google"
                        className="w-5 h-5"
                      />
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
                  <p className="text-center text-gray-600 mb-6 text-sm">
                    Fill in your details to get started
                  </p>
                )}

                <div className="space-y-5">
                  {isSignUp && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        onKeyPress={handleKeyPress}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      onKeyPress={handleKeyPress}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          placeholder="Re-enter your password"
                          value={formData.confirmPassword}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              confirmPassword: e.target.value,
                            })
                          }
                          onKeyPress={handleKeyPress}
                          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
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
                    ) : isSignUp ? (
                      "CREATE ACCOUNT"
                    ) : (
                      "SIGN IN"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
