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

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data?.session) navigate("/dashboard");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate("/dashboard");
    });

    return () => {
      mounted = false;
      if (listener?.subscription) listener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setLoading(true);
    setMessage("");

    try {
      if (isSignUp) {
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

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        }, { data: { name: formData.name } });

        if (signUpError) throw signUpError;

        const user = signUpData?.user ?? null;
        const session = signUpData?.session ?? null;

        if (user?.id) {
          await supabase.from("profiles").upsert({
            id: user.id,
            email: user.email,
            name: formData.name
          }, { onConflict: "id" });
        }

        if (session) navigate("/dashboard");
        else {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password
          });
          if (signInError) setMessage("Account created. Please check your email to confirm.");
          else navigate("/dashboard");
        }

      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        if (data?.user) navigate("/dashboard");
      }
    } catch (error) {
      setMessage(error?.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setMessage("Redirecting to Google...");
    try {
      const redirectUrl = window.location.origin + "/dashboard";
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectUrl } });
      if (error) throw error;
    } catch (error) {
      setMessage(error.message || "Google sign-in failed");
    }
  };

  const handleKeyPress = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="relative w-full max-w-5xl h-[600px]">
        <div
          className={`absolute inset-0 flex transition-all duration-700 ease-in-out ${isSignUp ? "flex-row-reverse" : "flex-row"}`}
        >
          {/* Left/Right Panel with Swap Animation */}
          <div
            className={`w-1/2 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-white p-12 transition-all duration-700
              ${isSignUp
                ? "bg-gradient-to-br from-purple-700 via-purple-600 to-purple-500"
                : "bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400"}`}
          >
            <h1 className="text-4xl font-bold mb-4">{isSignUp ? "Already a Client?" : "Welcome Back!"}</h1>
            <p className="text-center text-lg mb-8 opacity-90">
              {isSignUp
                ? "Sign in to access your projects and manage your data"
                : "Create an account to manage your projects and track progress"}
            </p>
            <button
              onClick={() => { setIsSignUp(!isSignUp); setMessage(""); }}
              className="px-12 py-3 border-2 border-white rounded-full text-white font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300"
            >
              {isSignUp ? "SIGN IN" : "SIGN UP"}
            </button>
          </div>

          {/* Form Panel */}
          <div className="w-1/2 bg-white rounded-3xl shadow-2xl flex items-center justify-center p-12">
            <div className="w-full max-w-md">
              <h2 className="text-3xl font-bold mb-6 text-center">{isSignUp ? "Client Registration" : "Client Login"}</h2>

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
                      <span className="px-4 bg-white text-gray-500">or use your email & password</span>
                    </div>
                  </div>
                </div>
              )}

              {isSignUp && (
                <p className="text-center text-gray-600 mb-6 text-sm">
                  or register with your email
                </p>
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
                  <div className="text-right">
                    <button
                      type="button"
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
                  <p className={`text-center text-sm ${message.toLowerCase().includes("success") ? "text-green-600" : "text-red-600"}`}>
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
