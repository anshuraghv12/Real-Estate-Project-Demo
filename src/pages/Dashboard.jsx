import React, { useState, useEffect } from "react";
import { Search, Plus, Trash2, LogOut } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("client_name");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState("Active");

  const navigate = useNavigate();

  // Fetch properties data
  useEffect(() => {
    const fetchProperties = async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(
          "id, client_name, site_address, country, city, project_area, project_cost, currency, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching properties:", error);
      } else {
        setProjects(data || []);
      }
    };

    fetchProperties();
  }, []);

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    const term = searchTerm.toLowerCase();
    switch (filterBy) {
      case "client_name":
        return project.client_name?.toLowerCase().includes(term);
      case "site_address":
        return project.site_address?.toLowerCase().includes(term);
      case "project_area":
        return (project.project_area?.toString() || "").includes(term);
      default:
        return true;
    }
  });

  // Delete project
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;

    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (!error) {
      setProjects(projects.filter((p) => p.id !== id));
    } else {
      console.error("❌ Delete failed:", error);
      alert("Failed to delete project.");
    }
  };

  // Add new project
  const handleAddNew = () => navigate("/projects/new");

  // Logout
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigate("/"); // redirect to login page after logout
    } else {
      alert("Logout failed: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Projects</h1>
          <div className="flex gap-4">
            <button
              onClick={handleAddNew}
              className="bg-orange-100 text-orange-600 px-4 py-2 rounded hover:bg-orange-200 flex items-center gap-2 font-medium"
            >
              <Plus size={20} />
              New Project
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-100 text-red-600 px-4 py-2 rounded hover:bg-red-200 flex items-center gap-2 font-medium"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        {/* <div className="flex gap-6 mb-6 border-b">
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
        </div> */}

        {/* Search + Filter */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="client_name">Filter by Email</option>
            <option value="site_address">Filter by Site Address</option>
            <option value="project_area">Filter by Project Area</option>
          </select>
          <div className="relative flex-1 max-w-xs">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder={`Search by ${filterBy.replace("_", " ")}`}
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
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Client Name</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Site Address</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">City</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Project Area</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Project Cost</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Created At</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length > 0 ? (
                filteredProjects.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">{p.client_name}</td>
                    <td className="px-6 py-4 text-gray-600">{p.site_address}</td>
                    <td className="px-6 py-4 text-gray-600">{p.city || "-"}</td>
                    <td className="px-6 py-4 text-gray-600">{p.project_area || "-"}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {p.project_cost ? `${p.project_cost} ${p.currency || ""}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-red-500 hover:text-red-700 inline-flex items-center gap-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
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
