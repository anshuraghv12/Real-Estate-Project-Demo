import React, { useEffect, useState, useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import { supabase } from "./lib/supabaseClient.js";

function AuthStatusProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session ?? null);
      } catch (err) {
        console.error("Supabase auth init error:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("Auth event:", event);
      setSession(newSession);

      if (event === "SIGNED_IN") navigate("/dashboard", { replace: true });
      if (event === "SIGNED_OUT") navigate("/", { replace: true });
      if (event === "PASSWORD_RECOVERY") navigate("/reset-password", { replace: true });
    });

    return () => subscription.subscription.unsubscribe();
  }, [navigate]);

  const value = useMemo(() => ({ session, loading }), [session, loading]);
  return children(value);
}

function ProtectedRoute({ session, loading, children }) {
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/" replace />;
  return children;
}

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
  return (
    <BrowserRouter>
      <AuthStatusProvider>
        {({ session, loading }) => (
          <Routes>
            {/* Public routes */}
            <Route
              path="/"
              element={
                loading ? (
                  <LoadingScreen />
                ) : session ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Login />
                )
              }
            />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute session={session} loading={loading}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Default fallback */}
            <Route
              path="*"
              element={<Navigate to={session ? "/dashboard" : "/"} replace />}
            />
          </Routes>
        )}
      </AuthStatusProvider>
    </BrowserRouter>
  );
}
