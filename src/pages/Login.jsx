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

  // Get redirect URL from environment or fallback
  const redirectBase = import.meta.env.VITE_APP_URL || window.location.origin;
  const redirectUrl = `${redirectBase}/dashboard`;

  useEffect(() => {
    let mounted = true;

    // If already signed in, go to dashboard
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data?.session) {
          // session exists -> navigate to dashboard
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
          // Ensure profile exists/upsert
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

          // finally navigate
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

  // helper to ensure profile exists (called after email/password sign-in)
  const ensureProfile = async (user, name) => {
    if (!user?.id) return;
    try {
      // try fetch
      const { data: existing, error: fetchErr } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();

      if (fetchErr && fetchErr.code !== "PGRST116") {
        // If fetch error other than "No rows", log it
        // note: PGRST116 is "result not found" code from PostgREST; safe to ignore
        // but we won't block user for this.
        console.warn("Profile fetch warning:", fetchErr);
      }

      // upsert if not exists
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
        // validations
        if (formData.password !== formData.confirmPassword) {
          setMessage("Passwords do not match!");
          setLoading(false);
          return;
        }
        if (!formData.name?.trim()) {
          setMessage("Please enter your full name.");
          setLoading(false);
          return;
        }
        if (!formData.email?.trim()) {
          setMessage("Please enter a valid email.");
          setLoading(false);
          return;
        }

        // Sign up user with redirect for email confirmation
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
          {
            email: formData.email,
            password: formData.password,
          },
          {
            data: { name: formData.name },
            redirectTo: redirectUrl,
          }
        );

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
          // If signed in immediately (rare with email verification), ensure profile and redirect
          await ensureProfile(user, formData.name);
          navigate("/dashboard");
        } else {
          // Email verification flow - show message
          setMessage("Account created. Please check your email to confirm (link will open the dashboard).");
        }
      } else {
        // Sign in with email/password
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;

        const user = data?.user ?? null;
        if (user) {
          // ensure profile exists (and create if missing)
          await ensureProfile(user, formData.name);
          navigate("/dashboard");
        } else {
          setMessage("Login succeeded but no user session found.");
        }
      }
    } catch (error) {
      // supabase v2 errors often have .message
      setMessage(error?.message || "Authentication failed.");
      console.error("Auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setMessage("Redirecting to Google...");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
      // OAuth will redirect the user away; on return, onAuthStateChange handler will upsert profile and navigate.
    } catch (error) {
      setMessage(error?.message || "Google sign-in failed");
      console.error("Google sign-in error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setMessage("Please enter your email to reset password.");
      return;
    }

    setLoading(true);
    setMessage("Sending reset link...");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${redirectBase}/reset-password`,
      });
      if (error) throw error;
      setMessage("Password reset email sent. Please check your inbox.");
    } catch (error) {
      setMessage(error?.message || "Failed to send reset email.");
      console.error("Reset password error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="relative w-full max-w-5xl h-[600px]">
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
                  ? "bg-gradient-to-br from-purple-700 via-purple-600 to-purple-500"
                  : "bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400"
              }`}
          >
            <h1 className="text-4xl font-bold mb-4">
              {isSignUp ? "Already a Client?" : "Welcome Back!"}
            </h1>
            <p className="text-center text-lg mb-8 opacity-90">
              {isSignUp
                ? "Sign in to access your projects and manage your data"
                : "Create an account to manage your projects and track progress"}
            </p>
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage("");
              }}
              className="px-12 py-3 border-2 border-white rounded-full text-white font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300"
            >
              {isSignUp ? "SIGN IN" : "SIGN UP"}
            </button>
          </div>

          {/* Form Panel */}
          <div className="w-1/2 bg-white rounded-3xl shadow-2xl flex items-center justify-center p-12">
            <div className="w-full max-w-md">
              <h2 className="text-3xl font-bold mb-6 text-center">
                {isSignUp ? "Client Registration" : "Client Login"}
              </h2>

              {!isSignUp && (
                <div className="mb-6">
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
                  >
                    <span className="font-medium text-gray-700">Sign in with Google</span>
                  </button>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">
                        or use your email & password
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {isSignUp && (
                <p className="text-center text-gray-600 mb-6 text-sm">or register with your email</p>
              )}

              <div className="space-y-4">
                {isSignUp && (
                  <input
                    type="text"
                    name="name"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {isSignUp && (
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm Password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      className="w-full px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                )}

                {!isSignUp && (
                  <div className="text-right mb-4">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? "Processing..." : isSignUp ? "REGISTER" : "LOGIN"}
                </button>

                {message && (
                  <p
                    className={`text-center text-sm ${
                      message.toLowerCase().includes("success") || message.toLowerCase().includes("check")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
