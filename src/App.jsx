// src/App.jsx
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateProject from "./pages/projects/CreateProject";
import ProjectsList from "./pages/projects/ProjectsList";

// Small wrapper to handle Supabase auth events
function AuthHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for Supabase auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN") {
          // Redirect user to dashboard when signed in
          navigate("/dashboard");
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  return null; // this component just handles the redirect
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Auth listener to handle login redirects */}
      <AuthHandler />

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects/new" element={<CreateProject />} />
        <Route path="/projects" element={<ProjectsList />} />
      </Routes>
    </BrowserRouter>
  );
}
