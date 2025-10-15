// src/pages/projects/ProjectsList.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setProjects(data);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Projects</h2>
        <button onClick={()=>navigate("/projects/new")} className="px-4 py-2 bg-orange-400 text-white rounded">+ New Project</button>
      </div>

      <div className="space-y-4">
        {projects.length === 0 && <div>No projects yet.</div>}
        {projects.map((p) => (
          <div key={p.id} className="bg-white p-4 rounded shadow">
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">{p.client_name}</div>
                <div className="text-sm text-gray-600">{p.site_address}</div>
                <div className="text-xs text-gray-500">{p.form_type} • {new Date(p.created_at).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{p.project_cost ? `${p.project_cost} ${p.currency}` : "-"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
