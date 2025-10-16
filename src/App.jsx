// src/App.jsx
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import ResetPassword from "./pages/ResetPassword";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateProject from "./pages/projects/CreateProject";
import ProjectsList from "./pages/projects/ProjectsList";

function AuthHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      supabase.auth
        .getSessionFromUrl({ storeSession: true })
        .then(({ data, error }) => {
          if (error) console.error("Error handling OAuth redirect:", error);
          else {
            console.log("✅ OAuth login successful:", data.session);
            navigate("/dashboard");
          }
        });
    }

    
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN") navigate("/dashboard");
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthHandler />
      <Routes>
        
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects/new" element={<CreateProject />} />
        <Route path="/projects" element={<ProjectsList />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  );
}
