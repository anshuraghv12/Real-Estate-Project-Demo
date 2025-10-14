import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const CreateProject = () => {
  const [formData, setFormData] = useState({
    client_name: "",
    site_address: "",
    country: "",
    state: "",
    city: "",
    pin: "",
    rpa_authority: "",
    site_area: "",
    site_area_unit: "",
    project_area: "",
    project_area_unit: "",
    no_basements: "",
    no_floors: "",
    building_profile: "",
    project_cost: "",
    currency: "",
    project_description: "",
    architect_name: "",
    architecture_firm: "",
    contact_email: "",
    contact_phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // 🔹 Handle Input Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🔹 Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        client_name: formData.client_name,
        site_address: formData.site_address,
        country: formData.country,
        state: formData.state || null,
        city: formData.city,
        pin: formData.pin || null,
        rpa_authority: formData.rpa_authority || null,
        site_area: parseFloat(formData.site_area) || null,
        site_area_unit: formData.site_area_unit || null,
        project_area: parseFloat(formData.project_area) || null,
        project_area_unit: formData.project_area_unit || null,
        no_basements: parseInt(formData.no_basements, 10) || null,
        no_floors: parseInt(formData.no_floors, 10) || null,
        building_profile: formData.building_profile || null,
        project_cost: parseFloat(formData.project_cost) || null,
        currency: formData.currency || null,
      };

      console.log("🧾 Payload:", payload);

      const { data, error } = await supabase.from("properties").insert([payload]);

      if (error) throw error;

      console.log("✅ Data stored in Supabase:", data);
      setSuccessMessage("Project created successfully!");
      setFormData({
        client_name: "",
        site_address: "",
        country: "",
        state: "",
        city: "",
        pin: "",
        rpa_authority: "",
        site_area: "",
        site_area_unit: "",
        project_area: "",
        project_area_unit: "",
        no_basements: "",
        no_floors: "",
        building_profile: "",
        project_cost: "",
        currency: "",
      });
    } catch (err) {
      console.error("❌ Supabase insert error:", err);
      setErrorMessage(err.message || "Failed to store data in Supabase.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-2xl p-8">
        <h1 className="text-3xl font-semibold text-center text-blue-600 mb-6">
          Create New Project
        </h1>

        {/* Success / Error messages */}
        {successMessage && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {Object.keys(formData).map((key) => (
            <div key={key}>
              <label
                htmlFor={key}
                className="block text-gray-700 font-medium capitalize"
              >
                {key.replace(/_/g, " ")}
              </label>
              <input
                type={key.includes("date") ? "date" : "text"}
                id={key}
                name={key}
                value={formData[key]}
                onChange={handleChange}
                required={!["project_description"].includes(key)}
                className="w-full border border-gray-300 rounded-lg p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-all duration-300 font-medium"
          >
            {loading ? "Submitting..." : "Submit Project"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateProject;
