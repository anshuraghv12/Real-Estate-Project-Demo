import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

const CreateProject = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    client_name: "",
    site_address: "",
    country: "",
    state: "",
    city: "",
    pin: "",
    rpa_authority: "",
    site_area: "",
    site_area_unit: "sq.ft",
    project_area: "",
    project_area_unit: "sq.ft",
    no_basements: "",
    no_floors: "",
    building_profile: "",
    project_cost: "",
    currency: "INR",
  });

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [submitted, setSubmitted] = useState(false);

  const countryOptions = ["India", "USA", "UK", "Canada", "Australia"];
  const stateOptions = [
    "Maharashtra",
    "Gujarat",
    "Delhi",
    "Karnataka",
    "Tamil Nadu",
    "Rajasthan",
    "Uttar Pradesh",
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setToast({ message: "", type: "" });

    try {
      const payload = {
        client_name: formData.client_name,
        site_address: formData.site_address,
        country: formData.country,
        state: formData.state,
        city: formData.city,
        pin: formData.pin,
        rpa_authority: formData.rpa_authority,
        site_area: parseFloat(formData.site_area) || null,
        site_area_unit: formData.site_area_unit,
        project_area: parseFloat(formData.project_area) || null,
        project_area_unit: formData.project_area_unit,
        no_basements: parseInt(formData.no_basements) || null,
        no_floors: parseInt(formData.no_floors) || null,
        building_profile: formData.building_profile,
        project_cost: parseFloat(formData.project_cost) || null,
        currency: formData.currency,
      };

      const { data, error } = await supabase.from("properties").insert([payload]);

      if (error) throw error;

      setToast({ message: "🎉 Project created successfully!", type: "success" });
      setSubmitted(true);
      setFormData({
        client_name: "",
        site_address: "",
        country: "",
        state: "",
        city: "",
        pin: "",
        rpa_authority: "",
        site_area: "",
        site_area_unit: "sq.ft",
        project_area: "",
        project_area_unit: "sq.ft",
        no_basements: "",
        no_floors: "",
        building_profile: "",
        project_cost: "",
        currency: "INR",
      });
    } catch (err) {
      setToast({
        message: err.message || "Failed to save project.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-10 px-4">
      {toast.message && (
        <div
          className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg text-white z-50 transition-all ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="max-w-3xl mx-auto bg-white shadow-2xl rounded-2xl p-8 border-t-8 border-blue-600">
        <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">
          Create New Project
        </h1>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Client Name */}
            <div>
              <label className="font-semibold text-gray-700">Client Name *</label>
              <input
                type="text"
                name="client_name"
                value={formData.client_name}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Site Address */}
            <div>
              <label className="font-semibold text-gray-700">Site Address *</label>
              <input
                type="text"
                name="site_address"
                value={formData.site_address}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Country Dropdown */}
            <div>
              <label className="font-semibold text-gray-700">Country</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Country</option>
                {countryOptions.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            {/* State Dropdown */}
            <div>
              <label className="font-semibold text-gray-700">State</label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select State</option>
                {stateOptions.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className="font-semibold text-gray-700">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Pin */}
            <div>
              <label className="font-semibold text-gray-700">Pin Code</label>
              <input
                type="text"
                name="pin"
                value={formData.pin}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Site Area */}
            <div>
              <label className="font-semibold text-gray-700">Site Area</label>
              <div className="flex items-center">
                <input
                  type="number"
                  name="site_area"
                  value={formData.site_area}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-l-lg mt-1 focus:ring-2 focus:ring-blue-400"
                />
                <span className="bg-gray-100 px-3 py-2 border border-l-0 rounded-r-lg mt-1 text-gray-700">
                  {formData.site_area_unit}
                </span>
              </div>
            </div>

            {/* Project Area */}
            <div>
              <label className="font-semibold text-gray-700">Project Area</label>
              <div className="flex items-center">
                <input
                  type="number"
                  name="project_area"
                  value={formData.project_area}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-l-lg mt-1 focus:ring-2 focus:ring-blue-400"
                />
                <span className="bg-gray-100 px-3 py-2 border border-l-0 rounded-r-lg mt-1 text-gray-700">
                  {formData.project_area_unit}
                </span>
              </div>
            </div>

            {/* Basements */}
            <div>
              <label className="font-semibold text-gray-700">No. of Basements</label>
              <input
                type="number"
                name="no_basements"
                value={formData.no_basements}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Floors */}
            <div>
              <label className="font-semibold text-gray-700">No. of Floors</label>
              <input
                type="number"
                name="no_floors"
                value={formData.no_floors}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Building Profile */}
            <div className="md:col-span-2">
              <label className="font-semibold text-gray-700">Building Profile</label>
              <textarea
                name="building_profile"
                value={formData.building_profile}
                onChange={handleChange}
                rows="2"
                className="w-full p-2 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Project Cost */}
            <div>
              <label className="font-semibold text-gray-700">Project Cost</label>
              <div className="flex items-center">
                <input
                  type="number"
                  name="project_cost"
                  value={formData.project_cost}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-l-lg mt-1 focus:ring-2 focus:ring-blue-400"
                />
                <span className="bg-gray-100 px-3 py-2 border border-l-0 rounded-r-lg mt-1 text-gray-700">
                  {formData.currency}
                </span>
              </div>
            </div>

            {/* Submit */}
            <div className="md:col-span-2 text-center mt-6">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all font-semibold"
              >
                {loading ? "Submitting..." : "Create Project"}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-10">
            <h2 className="text-2xl font-semibold text-green-600 mb-4">
              ✅ Project Created Successfully!
            </h2>
            <button
              onClick={() => navigate("/Dashboard")}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all font-semibold"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateProject;
