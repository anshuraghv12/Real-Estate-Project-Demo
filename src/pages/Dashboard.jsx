import React, { useEffect, useState } from "react";
import { Search, Plus, Trash2, LogOut, X, Filter, Building2, Mail, MapPin, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & filter related
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("client_email");
  const [areaOperator, setAreaOperator] = useState("eq");
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
  const [profile, setProfile] = useState(null);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const navigate = useNavigate();

  // Enhanced toast with auto-dismiss
  const pushToast = (message, type = "info", ttl = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, ttl);
  };

  // Initialize and fetch user data
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session ?? null;
        const currentUser = session?.user ?? null;

        if (!mounted) return;

        if (!currentUser) {
          navigate("/");
          return;
        }

        setUser(currentUser);

        // Fetch profile to check role
        const { data: profileData, error: profileErr } = await supabase
          .from("profiles")
          .select("id, name, email, role")
          .eq("id", currentUser.id)
          .single();

        if (!profileErr && profileData) {
          setProfile(profileData);
          await fetchProjects(currentUser, profileData);
        } else {
          pushToast("Profile not found. Please contact support.", "error");
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
  }, [navigate]);

  // Fetch projects based on user role - FIXED ACCESS CONTROL
  const fetchProjects = async (currentUser = user, profileData = profile) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("properties")
        .select(
          "id, client_name, client_email, site_address, country, city, project_area, project_cost, currency, created_at, created_by"
        )
        .order("created_at", { ascending: false });

      // FIXED: Only admin sees all projects
      // Regular users ONLY see projects where client_email matches their email
      if (profileData?.role === "admin") {
        // Admin sees everything - no filter
      } else {
        // Regular user - only see projects assigned to their email
        if (currentUser?.email) {
          query = query.eq("client_email", currentUser.email);
        } else {
          // No email, show nothing
          setProjects([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching properties:", error);
        pushToast("Failed to load projects.", "error");
        setProjects([]);
      } else {
        setProjects(data || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      pushToast("Failed to load projects.", "error");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering
  const filteredProjects = projects.filter((project) => {
    const term = searchTerm.trim().toLowerCase();

    // Text search filter
    if (term) {
      switch (filterBy) {
        case "client_email":
          if (!project.client_email?.toLowerCase().includes(term)) return false;
          break;
        case "client_name":
          if (!project.client_name?.toLowerCase().includes(term)) return false;
          break;
        case "site_address":
          if (!project.site_address?.toLowerCase().includes(term)) return false;
          break;
        case "city":
          if (!project.city?.toLowerCase().includes(term)) return false;
          break;
        case "project_area":
          if (!project.project_area?.toString().includes(term)) return false;
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

  // Delete project with confirmation - ADMIN ONLY
  const handleDelete = async (id) => {
    // CRITICAL: Check if user is admin
    if (profile?.role !== "admin") {
      pushToast("Only admins can delete projects.", "error");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    
    try {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) {
        console.error("Delete failed:", error);
        pushToast("Failed to delete project.", "error");
      } else {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        pushToast("Project deleted successfully.", "success");
      }
    } catch (err) {
      console.error("Delete error:", err);
      pushToast("Failed to delete project.", "error");
    }
  };

  // Enhanced logout
  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (!confirmed) return;
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        pushToast("Logout failed. Please try again.", "error");
      } else {
        pushToast("Logged out successfully.", "success");
        setTimeout(() => navigate("/"), 500);
      }
    } catch (err) {
      console.error("Logout error:", err);
      pushToast("Logout failed. Please try again.", "error");
    }
  };

  // Validate and create project - ADMIN ONLY
  const handleCreateProject = async (e) => {
    e?.preventDefault();
    
    // CRITICAL: Check if user is admin
    if (profile?.role !== "admin") {
      pushToast("Only admins can create projects.", "error");
      setDrawerOpen(false);
      return;
    }
    
    // Validation
    if (!newProject.client_name?.trim()) {
      pushToast("Client name is required.", "error");
      return;
    }
    if (!newProject.client_email?.trim()) {
      pushToast("Client email is required.", "error");
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newProject.client_email)) {
      pushToast("Please enter a valid email address.", "error");
      return;
    }
    
    if (!newProject.site_address?.trim()) {
      pushToast("Site address is required.", "error");
      return;
    }

    const payload = {
      client_name: newProject.client_name.trim(),
      client_email: newProject.client_email.trim().toLowerCase(),
      site_address: newProject.site_address.trim(),
      city: newProject.city?.trim() || null,
      country: newProject.country?.trim() || null,
      project_area: newProject.project_area ? Number(newProject.project_area) : null,
      project_cost: newProject.project_cost ? Number(newProject.project_cost) : null,
      currency: newProject.currency || "INR",
      created_by: user?.id ?? null,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from("properties")
        .insert([payload])
        .select()
        .single();
        
      if (error) {
        console.error("Insert error:", error);
        pushToast("Failed to create project. Please try again.", "error");
      } else {
        await fetchProjects(user, profile);
        pushToast("Project created successfully!", "success");
        setDrawerOpen(false);
        
        // Reset form
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
      pushToast("Failed to create project. Please try again.", "error");
    }
  };

  // Format date helper
  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "-";
    }
  };

  // Handle unauthorized create attempt
  const handleCreateClick = () => {
    if (profile?.role !== "admin") {
      pushToast("Only administrators can create new projects.", "error");
      return;
    }
    setDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Toast Notifications */}
      <div className="fixed right-6 top-6 z-50 flex flex-col gap-3 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all transform animate-slide-in ${
              t.type === "success"
                ? "bg-green-500 text-white"
                : t.type === "error"
                ? "bg-red-500 text-white"
                : "bg-blue-500 text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              {t.type === "success" && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              )}
              {t.type === "error" && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
              )}
              <span>{t.message}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Projects Dashboard</h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${profile?.role === "admin" ? "bg-purple-500" : "bg-blue-500"}`}></div>
                  <span className="text-gray-600">
                    {profile?.name || profile?.email || "Loading..."}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    profile?.role === "admin" 
                      ? "bg-purple-100 text-purple-700" 
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {profile?.role === "admin" ? "Admin" : "User"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {/* ONLY show "New Project" button to admins */}
              {profile?.role === "admin" ? (
                <button
                  onClick={handleCreateClick}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl hover:from-indigo-700 hover:to-purple-700 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  <Plus size={18} />
                  New Project
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl border border-blue-200">
                  <AlertCircle size={18} />
                  <span className="text-sm font-medium">View Only Access</span>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 px-6 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-all"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filter Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search By</label>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="client_email">Client Email</option>
                <option value="client_name">Client Name</option>
                <option value="site_address">Site Address</option>
                <option value="city">City</option>
                <option value="project_area">Project Area</option>
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Term</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search by ${filterBy.replace("_", " ")}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Area Filter Operator */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Area Condition</label>
              <select
                value={areaOperator}
                onChange={(e) => setAreaOperator(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="lt">Less Than (&lt;)</option>
                <option value="eq">Equal To (=)</option>
                <option value="gt">Greater Than (&gt;)</option>
              </select>
            </div>

            {/* Area Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Area Value (sqft)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={areaValue}
                  onChange={(e) => setAreaValue(e.target.value)}
                  placeholder="e.g. 1500"
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                {areaValue && (
                  <button
                    onClick={() => setAreaValue("")}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 font-medium transition-all"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Clear All Filters */}
          {(searchTerm || areaValue) && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setAreaValue("");
                  setAreaOperator("eq");
                }}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Enhanced Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Client</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Site Address</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">City</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Area (sqft)</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Cost</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Created</th>
                  {/* ONLY show Actions column to admins */}
                  {profile?.role === "admin" && (
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={profile?.role === "admin" ? "8" : "7"} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-500 font-medium">Loading projects...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProjects.length > 0 ? (
                  filteredProjects.slice(0, itemsPerPage).map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                            {p.client_name?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <span className="font-medium text-gray-900">{p.client_name || "-"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail size={16} className="text-gray-400" />
                          <span className="text-sm">{p.client_email || "-"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin size={16} className="text-gray-400" />
                          <span className="text-sm">{p.site_address || "-"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{p.city || "-"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">
                          {p.project_area ? `${p.project_area} sqft` : "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {p.project_cost ? `${p.currency || ""} ${Number(p.project_cost).toLocaleString()}` : "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">{formatDate(p.created_at)}</span>
                      </td>
                      {/* ONLY show delete button to admins */}
                      {profile?.role === "admin" && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete project"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={profile?.role === "admin" ? "8" : "7"} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Building2 size={48} className="text-gray-300" />
                        <div>
                          <p className="text-gray-600 font-medium mb-1">No projects found</p>
                          <p className="text-sm text-gray-500">
                            {profile?.role === "admin" 
                              ? "Create a new project to get started" 
                              : "No projects assigned to your email"}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Enhanced Footer */}
          {filteredProjects.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <span className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{Math.min(filteredProjects.length, itemsPerPage)}</span> of{" "}
                  <span className="font-semibold">{filteredProjects.length}</span> projects
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Rows per page</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="border-2 border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Drawer for Creating Project - ADMIN ONLY */}
      {drawerOpen && profile?.role === "admin" && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer */}
          <div className="ml-auto w-full max-w-lg bg-white h-full shadow-2xl relative overflow-auto animate-slide-left">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Create New Project</h2>
                  <p className="text-sm text-gray-500 mt-1">Fill in the project details below</p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                  title="Close"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-5">
              {/* Client Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={newProject.client_name}
                  onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Full name of the client"
                />
              </div>

              {/* Client Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Client Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newProject.client_email}
                  onChange={(e) => setNewProject({ ...newProject, client_email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="client@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">User with this email will be able to view this project</p>
              </div>

              {/* Site Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Site Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newProject.site_address}
                  onChange={(e) => setNewProject({ ...newProject, site_address: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                  placeholder="Complete site address"
                  rows="3"
                />
              </div>

              {/* City and Country */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                  <input
                    value={newProject.city}
                    onChange={(e) => setNewProject({ ...newProject, city: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="e.g. Mumbai"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                  <input
                    value={newProject.country}
                    onChange={(e) => setNewProject({ ...newProject, country: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="e.g. India"
                  />
                </div>
              </div>

              {/* Project Area, Cost, Currency */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Area (sqft)</label>
                  <input
                    type="number"
                    value={newProject.project_area}
                    onChange={(e) => setNewProject({ ...newProject, project_area: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="1200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Project Cost</label>
                  <input
                    type="number"
                    value={newProject.project_cost}
                    onChange={(e) => setNewProject({ ...newProject, project_cost: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="500000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Currency</label>
                  <select
                    value={newProject.currency}
                    onChange={(e) => setNewProject({ ...newProject, currency: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="px-6 py-2.5 border-2 border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}