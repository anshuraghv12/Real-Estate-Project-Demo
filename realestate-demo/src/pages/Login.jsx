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

  // Auto-redirect if user already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) navigate("/dashboard");
    });
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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

        // Sign up user with email & password
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name, // Save name in user metadata
            },
          },
        });

        if (error) throw error;
        if (data?.user) {
          setMessage("Account created successfully!");
          navigate("/dashboard"); // Redirect after signup
        }
      } else {
        // Sign in user with email & password
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
        if (data?.user) {
          setMessage("Logged in successfully!");
          navigate("/dashboard"); // Redirect after login
        }
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setMessage("Redirecting to Google...");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/dashboard", // Redirect after Google login
        },
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error.message);
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
          {/* Gradient Panel */}
          <div
            className={`w-1/2 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-white p-12 transition-all duration-700 ${
              isSignUp
                ? "bg-gradient-to-br from-pink-400 via-purple-400 to-purple-500"
                : "bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700"
            }`}
          >
            <h1 className="text-4xl font-bold mb-4">
              {isSignUp ? "Welcome Back!" : "Hello, Students!"}
            </h1>
            <p className="text-center text-lg mb-8 opacity-90">
              {isSignUp
                ? "Enter your personal details to use all site features"
                : "Create your account to start practice tests, attend exams, and check scores"}
            </p>
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage("");
              }}
              className="px-12 py-3 border-2 border-white rounded-full text-white font-semibold hover:bg-white hover:text-purple-600 transition-all duration-300"
            >
              {isSignUp ? "SIGN IN" : "SIGN UP"}
            </button>
          </div>

          {/* Form Panel */}
          <div className="w-1/2 bg-white rounded-3xl shadow-2xl flex items-center justify-center p-12">
            <div className="w-full max-w-md">
              <h2 className="text-3xl font-bold mb-6 text-center">
                {isSignUp ? "Create Account" : "Sign In"}
              </h2>

              {!isSignUp && (
                <div className="mb-6">
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
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
                  or use your email for registration
                </p>
              )}

              <div className="space-y-4">
                {isSignUp && (
                  <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                )}

                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                      className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                      className="text-sm text-gray-600 hover:text-purple-600 transition-colors"
                    >
                      Forget Your Password?
                    </button>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? "Loading..." : isSignUp ? "SIGN UP" : "SIGN IN"}
                </button>

                {message && (
                  <p
                    className={`text-center text-sm ${
                      message.includes("success") ? "text-green-600" : "text-red-600"
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
