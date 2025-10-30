import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // success, error, info

  // Get redirect URL from environment or fallback
  const redirectBase = import.meta.env.VITE_APP_URL || window.location.origin;
  const redirectUrl = `${redirectBase}/dashboard`;

  // Show message helper
  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 6000);
  };

  useEffect(() => {
    let mounted = true;

    // If already signed in, go to dashboard
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data?.session) {
          navigate("/dashboard");
        }
      } catch (err) {
        console.error("Error checking session:", err);
      }
    };
    init();

    // Listen for auth state changes (handles OAuth redirects)
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === "SIGNED_IN" && session?.user) {
          const u = session.user;
          const nameFromMeta =
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.user_metadata?.given_name ||
            formData.name ||
            null;

          // upsert profile with default role 'user' if not set
          await supabase.from("profiles").upsert(
            {
              id: u.id,
              email: u.email,
              name: nameFromMeta,
              role: "user",
            },
            { onConflict: "id" }
          );

          navigate("/dashboard");
        }
      } catch (err) {
        console.error("Auth state change handling error:", err);
      }
    });

    return () => {
      mounted = false;
      if (listener?.subscription) listener.subscription.unsubscribe();
    };
  }, [navigate, formData.name]);

  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // helper to ensure profile exists
  const ensureProfile = async (user, name) => {
    if (!user?.id) return;
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();

      await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email,
          name: name || user.user_metadata?.name || "",
          role: existing?.role || "user",
        },
        { onConflict: "id" }
      );
    } catch (err) {
      console.error("ensureProfile error:", err);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setMessage("");

    try {
      if (isSignUp) {
        // Validations
        if (!formData.name?.trim()) {
          showMessage("Please enter your full name.", "error");
          setLoading(false);
          return;
        }
        if (!formData.email?.trim()) {
          showMessage("Please enter a valid email.", "error");
          setLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          showMessage("Password must be at least 6 characters.", "error");
          setLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          showMessage("Passwords do not match!", "error");
          setLoading(false);
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

        // Upsert profile with default role 'user'
        if (user?.id) {
          await supabase.from("profiles").upsert(
            {
              id: user.id,
              email: user.email,
              name: formData.name,
              role: "user",
            },
            { onConflict: "id" }
          );
        }

        if (session) {
          await ensureProfile(user, formData.name);
          showMessage("Account created successfully!", "success");
          setTimeout(() => navigate("/dashboard"), 1000);
        } else {
          showMessage("Account created! Please check your email to verify your account.", "success");
        }
      } else {
        // Sign in
        if (!formData.email?.trim() || !formData.password?.trim()) {
          showMessage("Please enter email and password.", "error");
          setLoading(false);
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
          showMessage("Login successful!", "success");
          setTimeout(() => navigate("/dashboard"), 500);
        } else {
          showMessage("Login succeeded but no user session found.", "error");
        }
      }
    } catch (error) {
      showMessage(error?.message || "Authentication failed.", "error");
      console.error("Auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    showMessage("Redirecting to Google...", "info");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
    } catch (error) {
      showMessage(error?.message || "Google sign-in failed", "error");
      console.error("Google sign-in error:", error);
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email?.trim()) {
      showMessage("Please enter your email to reset password.", "error");
      return;
    }

    setLoading(true);
    showMessage("Sending reset link...", "info");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${redirectBase}/reset-password`,
      });
      if (error) throw error;
      showMessage("Password reset email sent! Please check your inbox.", "success");
    } catch (error) {
      showMessage(error?.message || "Failed to send reset email.", "error");
      console.error("Reset password error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="relative w-full max-w-5xl h-[650px]">
        <div
          className={`absolute inset-0 flex transition-all duration-700 ease-in-out ${
            isSignUp ? "flex-row-reverse" : "flex-row"
          }`}
        >
          {/* Left/Right Panel with Swap Animation */}
          <div
            className={`w-1/2 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-white p-12 transition-all duration-700
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

          {/* Form Panel */}
          <div className="w-1/2 bg-white rounded-3xl shadow-2xl flex items-center justify-center p-12">
            <div className="w-full max-w-md">
              <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">
                {isSignUp ? "Create Account" : "Sign In"}
              </h2>

              {!isSignUp && (
                <div className="mb-8">
                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
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
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? "Processing..." : isSignUp ? "CREATE ACCOUNT" : "SIGN IN"}
                </button>

                {message && (
                  <div
                    className={`p-4 rounded-xl text-sm text-center font-medium ${
                      messageType === "success"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : messageType === "error"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}