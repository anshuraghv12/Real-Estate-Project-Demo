import React, { useEffect, useState, useMemo } from "react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
// FIX: Using direct import paths without React.lazy

// Direct Imports for Pages (To bypass dynamic import resolution issue)
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

// Supabase Import - assuming path is relative to src/
import { supabase } from "./lib/supabaseClient.js"; 

// 1. Auth Context Component: Manages global session state
function AuthStatusContext({ children }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                // Initial check
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                setSession(initialSession);
            } catch (e) {
                console.error("Initial Supabase Auth failed, likely bad config:", e);
                // On error, treat as not logged in
                setSession(null);
            } finally {
                setLoading(false);
            }

            // Set up listener for real-time changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                (event, newSession) => {
                    console.log("Auth event:", event);
                    setSession(newSession);
                    
                    if (event === "SIGNED_OUT" || event === "USER_DELETED") {
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
        };

        initializeAuth();
    }, [navigate]);

    const contextValue = useMemo(() => ({ session, loading }), [session, loading]);
    return children(contextValue);
}

// 2. Protected Route Component 
function ProtectedRoute({ children, session, loading }) {
    if (loading) {
        return <LoadingScreen />; 
    }
    // If loading is done and no session, redirect to login page (/)
    if (!session) {
        return <Navigate to="/" replace />;
    }
    return children;
}

// 3. Loading Component
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
            {/* Using AuthStatusContext to manage global session state */}
            <AuthStatusContext>
                {({ session, loading }) => (
                    <Routes>
                        {/* Public Routes */}
                        <Route 
                            path="/" 
                            // Login component receives session and loading props
                            element={<Login session={session} loading={loading} />} 
                        />
                        <Route path="/reset-password" element={<ResetPassword />} />

                        {/* Protected Routes */}
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute session={session} loading={loading}>
                                    <Dashboard />
                                </ProtectedRoute>
                            }
                        />

                        {/* Catch-all redirect */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                )}
            </AuthStatusContext>
        </BrowserRouter>
    );
}
