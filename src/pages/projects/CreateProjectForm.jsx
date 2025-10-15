import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

const CreateProjectForm = () => {
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState([]);
  const [project, setProject] = useState({
    client_id: "",
    site_address: "",
    country: "",
    state: "",
    city: "",
    pin: "",
    bpa_authority: "",
    site_area: "",
    project_area: "",
    basements: "",
    floors: "",
    building_profile: "",
    project_cost: "",
    status: "Proposed",
  });

  // Fetch clients for dropdown
  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase.from("clients").select("*");
      if (error) console.error(error);
      else setClients(data);
    };
    fetchClients();
  }, []);

  const handleChange = (e) => {
    setProject({ ...project, [e.target.name]: e.target.value });
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = async () => {
    const { data, error } = await supabase.from("projects").insert([project]);
    if (error) console.error(error);
    else alert("Project created successfully!");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded shadow">
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Project Details</h2>
          <select
            name="client_id"
            value={project.client_id}
            onChange={handleChange}
            className="border p-2 w-full mb-4 rounded"
          >
            <option value="">Select Client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            name="site_address"
            placeholder="Site Address"
            value={project.site_address}
            onChange={handleChange}
            className="border p-2 w-full mb-4 rounded"
          />
          <button onClick={nextStep} className="bg-orange-200 px-4 py-2 rounded">
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Location</h2>
          <input name="country" placeholder="Country" value={project.country} onChange={handleChange} className="border p-2 w-full mb-4 rounded"/>
          <input name="state" placeholder="State" value={project.state} onChange={handleChange} className="border p-2 w-full mb-4 rounded"/>
          <input name="city" placeholder="City" value={project.city} onChange={handleChange} className="border p-2 w-full mb-4 rounded"/>
          <input name="pin" placeholder="Pin" value={project.pin} onChange={handleChange} className="border p-2 w-full mb-4 rounded"/>
          <div className="flex justify-between">
            <button onClick={prevStep} className="bg-gray-200 px-4 py-2 rounded">Back</button>
            <button onClick={nextStep} className="bg-orange-200 px-4 py-2 rounded">Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Project Info</h2>
          <input name="bpa_authority" placeholder="BPA Authority" value={project.bpa_authority} onChange={handleChange} className="border p-2 w-full mb-4 rounded"/>
          <input name="site_area" placeholder="Site Area" value={project.site_area} onChange={handleChange} className="border p-2 w-full mb-4 rounded"/>
          <input name="project_area" placeholder="Project Area" value={project.project_area} onChange={handleChange} className="border p-2 w-full mb-4 rounded"/>
          <input name="basements" placeholder="Basements" value={project.basements} onChange={handleChange} className="border p-2 w-full mb-4 rounded"/>
          <input name="floors" placeholder="Floors" value={project.floors} onChange={handleChange} className="border p-2 w-full mb-4 rounded"/>
          <input name="building_profile" placeholder="Building Profile" value={project.building_profile} onChange={handleChange} className="border p-2 w-full mb-4 rounded"/>
          <div className="flex justify-between">
            <button onClick={prevStep} className="bg-gray-200 px-4 py-2 rounded">Back</button>
            <button onClick={nextStep} className="bg-orange-200 px-4 py-2 rounded">Next</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Cost & Status</h2>
          <input name="project_cost" placeholder="Project Cost" value={project.project_cost} onChange={handleChange} className="border p-2 w-full mb-4 rounded"/>
          <div className="flex justify-between">
            <button onClick={prevStep} className="bg-gray-200 px-4 py-2 rounded">Back</button>
            <button onClick={handleSubmit} className="bg-green-300 px-4 py-2 rounded">Submit</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateProjectForm;
