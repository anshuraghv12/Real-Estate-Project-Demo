// src/App.jsx
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import ResetPassword from "./pages/ResetPassword";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Protected Route Component
function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setAuthenticated(!!session);
      } catch (error) {
        console.error("Auth check error:", error);
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Auth Handler Component
function AuthHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle OAuth redirect with hash fragments
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      // Parse hash parameters
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      
      if (accessToken) {
        // Set session from URL
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        }).then(({ data, error }) => {
          if (error) {
            console.error("Error handling OAuth redirect:", error);
          } else if (data?.session) {
            console.log("✅ OAuth login successful");
            // Clear hash from URL
            window.history.replaceState(null, "", window.location.pathname);
            navigate("/dashboard", { replace: true });
          }
        });
      }
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth event:", event);
        
        if (event === "SIGNED_IN" && session) {
          // Ensure we're not already on dashboard
          if (window.location.pathname !== "/dashboard") {
            navigate("/dashboard", { replace: true });
          }
        }
        
        if (event === "SIGNED_OUT") {
          navigate("/", { replace: true });
        }

        if (event === "PASSWORD_RECOVERY") {
          navigate("/reset-password", { replace: true });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
}

// Loading Component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="text-center">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-indigo-200 rounded-full"></div>
          <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="text-gray-700 font-semibold mt-6 text-lg">Loading Application...</p>
      </div>
    </div>
  );
}

export default function App() {
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Check initial auth state
    const initialize = async () => {
      try {
        await supabase.auth.getSession();
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setInitializing(false);
      }
    };

    initialize();
  }, []);

  if (initializing) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <AuthHandler />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}