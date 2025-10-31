import { useEffect, useState, useMemo } from "react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
// FIXED: Added .js extension to resolve potential module import error
import { supabase } from "./lib/supabaseClient.js"; 
import ResetPassword from "./pages/ResetPassword";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Auth Context (Handles single source of truth for session/loading state)
const AuthStatusContext = ({ children }) => {
// [Rest of the AuthStatusContext logic remains the same]
// ...
// (Retaining the code I provided earlier, just ensuring the import is correct)
// ...

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. App Initialization: Initial session check
    const initialCheck = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (e) {
        console.error("Initial session check failed:", e);
      } finally {
        setLoading(false);
      }
    };

    initialCheck();

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Log for debugging
        console.log("Auth event:", event, "Session:", !!session); 

        setSession(session);
        
        if (event === "SIGNED_IN" && session) {
          // User just signed in, navigate to dashboard
          if (window.location.pathname !== "/dashboard") {
            navigate("/dashboard", { replace: true });
          }
        }
        
        if (event === "SIGNED_OUT") {
          // User signed out, navigate to login
          navigate("/", { replace: true });
        }

        if (event === "PASSWORD_RECOVERY") {
          navigate("/reset-password", { replace: true });
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  // Provide loading and session status to children
  const contextValue = useMemo(() => ({ session, loading }), [session, loading]);
  
  return children(contextValue);
};

// Protected Route Component
function ProtectedRoute({ children, session, loading }) {
  if (loading) {
    // Show a global loading screen while checking auth status
    return <LoadingScreen />; 
  }

  // If loading is done and no session, redirect to login page (/)
  if (!session) {
    return <Navigate to="/" replace />;
  }

  // If session exists, render the component
  return children;
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
  // Removed initializing state as AuthStatusContext handles initial checks
  // This keeps the root App component simpler.

  return (
    <BrowserRouter>
      {/* AuthStatusContext handles all session logic and state updates */}
      <AuthStatusContext>
        {({ session, loading }) => (
          <Routes>
            {/* Public Routes - Login and ResetPassword */}
            <Route path="/" element={<Login session={session} loading={loading} />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected Routes - Dashboard and other private pages */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute session={session} loading={loading}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect to the login page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </AuthStatusContext>
    </BrowserRouter>
  );
}
