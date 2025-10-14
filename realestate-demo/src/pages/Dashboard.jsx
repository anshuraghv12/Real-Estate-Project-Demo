import React, { useState, useEffect } from "react";
import { Search, Plus, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState("Active");

  // Fetch projects from Supabase
  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase.from("projects").select(`
        id,
        site_address,
        project_area,
        status,
        created_at,
        client_id,
        clients (email, name)
      `);

      if (error) {
        console.error("Error fetching projects:", error);
      } else {
        setProjects(data || []);
      }
    };
    fetchProjects();
  }, []);

  // Filter logic: Email, Site Address, Project Area
  const filteredProjects = projects.filter((project) => {
    const clientEmail = project.clients?.email || "";
    const siteAddress = project.site_address || "";
    const projectArea = project.project_area?.toString() || "";

    const term = searchTerm.toLowerCase();
    return (
      clientEmail.toLowerCase().includes(term) ||
      siteAddress.toLowerCase().includes(term) ||
      projectArea.toLowerCase().includes(term)
    );
  });

  const handleDelete = async (id) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (!error) {
      setProjects(projects.filter((p) => p.id !== id));
    } else {
      console.error("Delete failed:", error);
    }
  };

  const navigate = useNavigate();
  
  const handleAddNew = () => {
    navigate("/projects/new");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Projects</h1>
          <button
            onClick={handleAddNew}
            className="bg-orange-100 text-orange-600 px-4 py-2 rounded hover:bg-orange-200 flex items-center gap-2 font-medium"
          >
            <Plus size={20} />
            New Project
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mb-6 border-b">
          <button
            onClick={() => setActiveTab("Active")}
            className={`pb-3 px-1 font-medium text-sm ${
              activeTab === "Active"
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-500"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab("Archived")}
            className={`pb-3 px-1 font-medium text-sm ${
              activeTab === "Archived"
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-500"
            }`}
          >
            Archived
          </button>
        </div>

        {/* Search */}
        <div className="mb-4 flex items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Email, Site Address, or Project Area"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Client Email</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Site Address</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Project Area</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Created At</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">
                      {project.clients?.email || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {project.site_address || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {project.project_area || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {project.status || "Proposed"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(project.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="text-red-500 hover:text-red-700 inline-flex items-center gap-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No projects found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
          <span>
            Showing 1 - {Math.min(itemsPerPage, filteredProjects.length)} of{" "}
            {filteredProjects.length} entries
          </span>
          <div className="flex items-center gap-2">
            <span>Items per page</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
