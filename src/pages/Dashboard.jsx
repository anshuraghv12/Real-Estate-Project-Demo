import React, { useEffect, useState } from "react";
import { Search, Plus, Trash2, LogOut, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

/*
  ProjectsDashboard
  - Drawer for creating project (with client_email)
  - Toast notifications (simple implementation)
  - Advanced filters for project_area (<, =, >)
  - Access control: admin sees all, normal users see only their projects
  - Improved logout with confirmation + toast
*/

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & filter related
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("client_email"); // default now email
  const [areaOperator, setAreaOperator] = useState("eq"); // eq, lt, gt
  const [areaValue, setAreaValue] = useState("");

  // Pagination / UI
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Create project form
  const [newProject, setNewProject] = useState({
    client_name: "",
    client_email: "",
    site_address: "",
    country: "",
    city: "",
    project_area: "",
    project_cost: "",
    currency: "INR",
  });

  // Auth / user info
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // to check role (admin/user)

  // Toasts
  const [toasts, setToasts] = useState([]);

  const navigate = useNavigate();

  // helper: show toast
  const pushToast = (message, type = "info", ttl = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, ttl);
  };

  // Get current user and profile, then fetch projects
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session ?? null;
        const currentUser = session?.user ?? null;

        if (!mounted) return;
        setUser(currentUser);

        if (currentUser) {
          // fetch profile to check role (assumes profiles table with id=auth.user.id and role field)
          const { data: profileData, error: profileErr } = await supabase
            .from("profiles")
            .select("id, name, email, role")
            .eq("id", currentUser.id)
            .single();

          if (!profileErr) setProfile(profileData);
          else {
            // not critical - push a toast
            // console.log("No profile or error", profileErr);
          }

          // fetch projects based on role
          await fetchProjects(currentUser, profileData);
        } else {
          // no user - redirect to login
          navigate("/");
        }
      } catch (err) {
        console.error("Init error:", err);
        pushToast("Failed to initialize dashboard.", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch projects with optional user-based filtering
  const fetchProjects = async (currentUser = user, profileData = profile) => {
    try {
      setLoading(true);
      // If profileData exists and role === 'admin', fetch all projects
      // Otherwise, fetch only projects where client_email === current user's email or created_by === user.id
      let query = supabase
        .from("properties")
        .select(
          "id, client_name, client_email, site_address, country, city, project_area, project_cost, currency, created_at, created_by"
        )
        .order("created_at", { ascending: false });

      if (!profileData || profileData.role !== "admin") {
        // Try to filter by client_email = user's email OR created_by = user.id
        if (currentUser?.email) {
          query = query.or(`client_email.eq.${currentUser.email},created_by.eq.${currentUser.id}`);
        } else {
          query = query.eq("created_by", currentUser?.id || "");
        }
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching properties:", error);
        pushToast("Failed to load projects.", "error");
      } else {
        setProjects(data || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      pushToast("Failed to load projects.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Filtered projects in-memory (client side)
  const filteredProjects = projects.filter((project) => {
    const term = searchTerm.trim().toLowerCase();

    // Basic text filters
    if (term) {
      switch (filterBy) {
        case "client_email":
          if (!project.client_email) return false;
          if (!project.client_email.toLowerCase().includes(term)) return false;
          break;
        case "site_address":
          if (!project.site_address) return false;
          if (!project.site_address.toLowerCase().includes(term)) return false;
          break;
        case "project_area":
          if (project.project_area == null) return false;
          if (!project.project_area.toString().includes(term)) return false;
          break;
        default:
          break;
      }
    }

    // Area numeric filter
    if (areaValue !== "") {
      const num = Number(areaValue);
      const area = Number(project.project_area || 0);
      if (!Number.isFinite(num)) return false;

      if (areaOperator === "lt" && !(area < num)) return false;
      if (areaOperator === "eq" && !(area === num)) return false;
      if (areaOperator === "gt" && !(area > num)) return false;
    }

    return true;
  });

  // Delete project
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) {
        console.error("❌ Delete failed:", error);
        pushToast("Failed to delete project.", "error");
      } else {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        pushToast("Project deleted.", "success");
      }
    } catch (err) {
      console.error("Delete error:", err);
      pushToast("Failed to delete project.", "error");
    }
  };

  // Logout improved
  const handleLogout = async () => {
    const ok = window.confirm("Do you want to logout?");
    if (!ok) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        pushToast("Logout failed.", "error");
      } else {
        pushToast("Logged out.", "success");
        navigate("/");
      }
    } catch (err) {
      console.error("Logout error:", err);
      pushToast("Logout failed.", "error");
    }
  };

  // Create project (drawer submit)
  const handleCreateProject = async (e) => {
    e?.preventDefault();
    // Validate
    if (!newProject.client_name?.trim()) {
      pushToast("Please enter client name.", "error");
      return;
    }
    if (!newProject.client_email?.trim()) {
      pushToast("Please enter client email.", "error");
      return;
    }
    if (!newProject.site_address?.trim()) {
      pushToast("Please enter site address.", "error");
      return;
    }

    const payload = {
      ...newProject,
      project_area: newProject.project_area ? Number(newProject.project_area) : null,
      project_cost: newProject.project_cost ? Number(newProject.project_cost) : null,
      created_by: user?.id ?? null,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from("properties").insert([payload]).select().single();
      if (error) {
        console.error("Insert error:", error);
        pushToast("Failed to create project.", "error");
      } else {
        // refresh list — if admin, show all (re-fetch), otherwise add to state if allowed
        if (profile?.role === "admin") {
          await fetchProjects(user, profile);
        } else {
          setProjects((prev) => [data, ...prev]);
        }
        pushToast("Project created successfully.", "success");
        setDrawerOpen(false);
        // reset form
        setNewProject({
          client_name: "",
          client_email: "",
          site_address: "",
          country: "",
          city: "",
          project_area: "",
          project_cost: "",
          currency: "INR",
        });
      }
    } catch (err) {
      console.error("Create project error:", err);
      pushToast("Failed to create project.", "error");
    }
  };

  // Simple helper to show date nicely
  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return "-";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Toasts */}
      <div className="fixed right-6 top-6 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded shadow-md text-sm max-w-xs break-words ${
              t.type === "success"
                ? "bg-green-50 text-green-800 border border-green-100"
                : t.type === "error"
                ? "bg-red-50 text-red-800 border border-red-100"
                : "bg-white text-gray-800 border border-gray-200"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <div className="max-w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Projects</h1>
            <p className="text-sm text-gray-500 mt-1">
              {profile ? `Signed in as ${profile.name || profile.email} (${profile.role || "user"})` : "Loading..."}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 flex items-center gap-2 font-medium"
            >
              <Plus size={16} />
              New Project
            </button>

            <button
              onClick={handleLogout}
              className="bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded flex items-center gap-2 font-medium"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        {/* Filters row */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="client_email">Filter by Email</option>
            <option value="site_address">Filter by Site Address</option>
            <option value="project_area">Filter by Project Area</option>
          </select>

          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder={`Search by ${filterBy.replace("_", " ")}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Advanced area filters */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Area:</label>
            <select
              value={areaOperator}
              onChange={(e) => setAreaOperator(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none"
            >
              <option value="lt">&lt;</option>
              <option value="eq">=</option>
              <option value="gt">&gt;</option>
            </select>
            <input
              type="number"
              value={areaValue}
              onChange={(e) => setAreaValue(e.target.value)}
              className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none"
              placeholder="sqft"
            />
            <button
              onClick={() => {
                // clear area filter
                setAreaValue("");
                setAreaOperator("eq");
              }}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Client</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Email</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Site Address</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">City</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Area</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Cost</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Created</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length > 0 ? (
                filteredProjects.slice(0, itemsPerPage).map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">{p.client_name || "-"}</td>
                    <td className="px-6 py-4 text-gray-600">{p.client_email || "-"}</td>
                    <td className="px-6 py-4 text-gray-600">{p.site_address || "-"}</td>
                    <td className="px-6 py-4 text-gray-600">{p.city || "-"}</td>
                    <td className="px-6 py-4 text-gray-600">{p.project_area ?? "-"}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {p.project_cost ? `${p.project_cost} ${p.currency || ""}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(p.created_at)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-red-500 hover:text-red-700 inline-flex items-center gap-2"
                          title="Delete project"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    {loading ? "Loading projects..." : "No projects found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 text-sm text-gray-600 gap-3">
          <span>
            Showing {Math.min(filteredProjects.length, itemsPerPage)} of {filteredProjects.length} entries
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

      {/* Drawer for creating new project */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="ml-auto w-full max-w-md bg-white h-full shadow-2xl p-6 relative overflow-auto">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute right-4 top-4 text-gray-600 hover:text-gray-800"
              title="Close"
            >
              <X />
            </button>

            <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Client Name</label>
                <input
                  value={newProject.client_name}
                  onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded mt-1"
                  placeholder="Full name"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Client Email</label>
                <input
                  value={newProject.client_email}
                  onChange={(e) => setNewProject({ ...newProject, client_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded mt-1"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Site Address</label>
                <input
                  value={newProject.site_address}
                  onChange={(e) => setNewProject({ ...newProject, site_address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded mt-1"
                  placeholder="Street, locality..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-gray-600">City</label>
                  <input
                    value={newProject.city}
                    onChange={(e) => setNewProject({ ...newProject, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Country</label>
                  <input
                    value={newProject.country}
                    onChange={(e) => setNewProject({ ...newProject, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-sm text-gray-600">Project Area</label>
                  <input
                    type="number"
                    value={newProject.project_area}
                    onChange={(e) => setNewProject({ ...newProject, project_area: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded mt-1"
                    placeholder="e.g. 1200"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Project Cost</label>
                  <input
                    type="number"
                    value={newProject.project_cost}
                    onChange={(e) => setNewProject({ ...newProject, project_cost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded mt-1"
                    placeholder="numeric"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Currency</label>
                  <input
                    value={newProject.currency}
                    onChange={(e) => setNewProject({ ...newProject, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded mt-1"
                    placeholder="INR"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
