import React, { useEffect, useState } from "react";
import { Search, Plus, Trash2, LogOut, X, Filter, Building2, Mail, MapPin, AlertCircle, Loader2 } from "lucide-react";
import { supabase, logoutUser } from "../lib/supabaseClient.js"; 
import { useNavigate } from "react-router-dom";

// --- Custom Confirmation Modal Component ---
const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100">
                <div className="flex items-center gap-3 mb-4 border-b pb-3">
                    <AlertCircle size={24} className="text-red-500" />
                    <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
                </div>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function ProjectsDashboard() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Search & filter related
    const [searchTerm, setSearchTerm] = useState("");
    const [filterBy, setFilterBy] = useState("client_email");
    const [areaOperator, setAreaOperator] = useState("eq");
    const [areaValue, setAreaValue] = useState("");

    // Pagination / UI
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

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
                
                // Get current session
                const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) {
                    console.error("Session error:", sessionError);
                    navigate("/", { replace: true });
                    return;
                }

                const session = sessionData?.session;
                const currentUser = session?.user;

                if (!mounted) return;

                // Auth Guard
                if (!currentUser) {
                    console.log("No user found, redirecting to login");
                    navigate("/", { replace: true });
                    return;
                }

                console.log("Current user:", currentUser.email);
                setUser(currentUser);

                // Fetch profile to check role
                const { data: profileData, error: profileErr } = await supabase
                    .from("profiles")
                    .select("id, name, email, role")
                    .eq("id", currentUser.id)
                    .single();

                if (profileErr) {
                    console.error("Profile fetch error:", profileErr);
                    pushToast("Profile not found. Please contact support.", "error");
                    return;
                }

                if (!profileData) {
                    console.error("No profile data found");
                    pushToast("Profile not found. Please contact support.", "error");
                    return;
                }

                console.log("Profile loaded:", profileData.email, "Role:", profileData.role);
                setProfile(profileData);
                
                // Fetch projects after profile is confirmed
                await fetchProjects(currentUser, profileData);
                
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

    // IMPROVED: Fetch projects with better error handling and logging
    const fetchProjects = async (currentUser = user, profileData = profile) => {
        if (!currentUser || !profileData) {
            console.log("Missing user or profile data");
            return;
        }

        try {
            console.log("Fetching projects for:", profileData.email, "Role:", profileData.role);
            
            let query = supabase
                .from("properties")
                .select("*")
                .order("created_at", { ascending: false });

            // Apply RLS-compatible filters
            if (profileData?.role !== "admin") {
                // Regular user - filter by their profile email (not auth email)
                console.log("User role - filtering by profile email:", profileData.email);
                query = query.eq("client_email", profileData.email);
            } else {
                console.log("Admin role - fetching all properties");
            }

            const { data, error } = await query;
            
            if (error) {
                console.error("Error fetching properties:", error);
                pushToast(`Failed to load projects: ${error.message}`, "error");
                setProjects([]);
                return;
            }

            console.log("Properties fetched:", data?.length || 0, "records");
            
            if (data && data.length > 0) {
                console.log("Sample property:", data[0]);
            }
            
            setProjects(data || []);
            
            if (!data || data.length === 0) {
                if (profileData.role === "admin") {
                    pushToast("No properties found in database", "info");
                } else {
                    pushToast(`No properties assigned to ${profileData.email}`, "info");
                }
            }
            
        } catch (err) {
            console.error("Fetch error:", err);
            pushToast("Failed to load projects.", "error");
            setProjects([]);
        }
    };

    // Client-side filtering logic
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
                    const areaString = project.project_area?.toString() || '';
                    if (!areaString.includes(term)) return false;
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

    // Delete confirmation handler
    const handleConfirmDelete = (id) => {
        if (profile?.role !== "admin") {
            pushToast("Only admins can delete projects.", "error");
            return;
        }

        setModalConfig({
            isOpen: true,
            title: "Confirm Deletion",
            message: "Are you sure you want to permanently delete this project? This action cannot be undone.",
            onConfirm: () => {
                setModalConfig({ isOpen: false, title: '', message: '', onConfirm: () => {} });
                handleDelete(id);
            },
            onCancel: () => setModalConfig({ isOpen: false, title: '', message: '', onConfirm: () => {} }),
        });
    };
    
    // Delete project core logic
    const handleDelete = async (id) => {
        try {
            setDeleteLoading(true);
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
        } finally {
             setDeleteLoading(false);
        }
    };

    // Enhanced logout
    const handleLogout = () => {
        setModalConfig({
            isOpen: true,
            title: "Confirm Logout",
            message: "Are you sure you want to sign out of your account?",
            onConfirm: async () => {
                setModalConfig({ isOpen: false, title: '', message: '', onConfirm: () => {} });
                try {
                    const { success, message: errorMessage } = await logoutUser(); 

                    if (!success) {
                        pushToast(errorMessage || "Logout failed. Please try again.", "error");
                    } else {
                        pushToast("Logged out successfully. Redirecting...", "success");
                    }
                } catch (err) {
                    console.error("Logout error:", err);
                    pushToast("Logout failed. Please try again.", "error");
                }
            },
            onCancel: () => setModalConfig({ isOpen: false, title: '', message: '', onConfirm: () => {} }),
        });
    };

    // Validate and create project - ADMIN ONLY
    const handleCreateProject = async (e) => {
        e?.preventDefault();
        setCreateLoading(true);
        
        if (profile?.role !== "admin") {
            pushToast("Only admins can create projects.", "error");
            setCreateLoading(false);
            setDrawerOpen(false);
            return;
        }
        
        // Validation
        if (!newProject.client_name?.trim()) {
            pushToast("Client name is required.", "error");
            setCreateLoading(false);
            return;
        }
        if (!newProject.client_email?.trim()) {
            pushToast("Client email is required.", "error");
            setCreateLoading(false);
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newProject.client_email)) {
            pushToast("Please enter a valid client email address.", "error");
            setCreateLoading(false);
            return;
        }
        
        if (!newProject.site_address?.trim()) {
            pushToast("Site address is required.", "error");
            setCreateLoading(false);
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

        console.log("Creating project with payload:", payload);

        try {
            const { data, error } = await supabase
                .from("properties")
                .insert([payload])
                .select()
                .single();
                
            if (error) {
                console.error("Insert error:", error);
                pushToast(`Failed to create project: ${error.message}`, "error");
            } else {
                console.log("Project created:", data);
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
            pushToast("Failed to create project due to an unexpected error.", "error");
        } finally {
            setCreateLoading(false);
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
            {/* Confirmation Modal */}
            <ConfirmationModal 
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
                onCancel={modalConfig.onCancel}
            />

            {/* Enhanced Toast Notifications */}
            <style>
                {`
                @keyframes slide-in {
                    0% { transform: translateX(100%); opacity: 0; }
                    100% { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-in {
                    animation: slide-in 0.3s forwards;
                }
                @keyframes slide-left {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(0); }
                }
                .animate-slide-left {
                    animation: slide-left 0.4s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
                }
                `}
            </style>
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
                            {t.type === "info" && <AlertCircle size={20} />}
                            <span>{t.message}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="max-w-7xl mx-auto p-6">
                {/* Enhanced Header */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
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
                            {profile?.role === "admin" ? (
                                <button
                                    onClick={handleCreateClick}
                                    disabled={createLoading}
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl hover:from-indigo-700 hover:to-purple-700 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:scale-100"
                                >
                                    {createLoading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={18} />
                                            New Project
                                        </>
                                    )}
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
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
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
                                onChange={(e) => setSearchTerm("") || setFilterBy(e.target.value)}
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
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
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
                                            {profile?.role === "admin" && (
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleConfirmDelete(p.id)}
                                                            disabled={deleteLoading}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                                            title="Delete project"
                                                        >
                                                            {deleteLoading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
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

            {/* Enhanced Drawer for Creating Project */}
            {drawerOpen && profile?.role === "admin" && (
                <div className="fixed inset-0 z-40 flex">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setDrawerOpen(false)}
                    />

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

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setDrawerOpen(false)}
                                    disabled={createLoading}
                                    className="px-6 py-2.5 border-2 border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:scale-100"
                                >
                                    {createLoading ? (
                                        <span className="flex items-center">
                                            <Loader2 size={18} className="animate-spin mr-2" />
                                            Creating...
                                        </span>
                                    ) : (
                                        "Create Project"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
                                          