import React, { useState } from 'react';
import { ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';

export default function CreateProject() {
  const [formData, setFormData] = useState({
    clientName: '',
    siteAddress: '',
    country: '',
    state: '',
    city: '',
    pin: '',
    rpaAuthority: '',
    siteArea: '',
    siteAreaUnit: 'sq ft',
    projectArea: '',
    projectAreaUnit: 'sq ft',
    noBasements: '',
    noFloors: '',
    buildingProfile: '',
    projectCost: '',
    currency: 'Lakhs',
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const countryData = {
    India: {
      states: ['Rajasthan', 'Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Punjab'],
      cities: {
        Rajasthan: ['Jodhpur', 'Jaipur', 'Udaipur', 'Bikaner'],
        Delhi: ['New Delhi', 'Delhi'],
        Maharashtra: ['Mumbai', 'Pune', 'Nagpur'],
        Karnataka: ['Bangalore', 'Mysore'],
        'Tamil Nadu': ['Chennai', 'Coimbatore'],
        Gujarat: ['Ahmedabad', 'Surat'],
        Punjab: ['Chandigarh', 'Amritsar'],
      }
    },
    USA: {
      states: ['California', 'Texas', 'New York', 'Florida', 'Illinois'],
      cities: {
        California: ['Los Angeles', 'San Francisco', 'San Diego'],
        Texas: ['Houston', 'Dallas', 'Austin'],
        'New York': ['New York City', 'Buffalo'],
        Florida: ['Miami', 'Orlando'],
        Illinois: ['Chicago', 'Springfield'],
      }
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'country' && { state: '', city: '' })
    }));
  };

  const handleStateChange = (state) => {
    setFormData(prev => ({
      ...prev,
      state,
      city: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Validation
    if (!formData.clientName.trim()) {
      setErrorMessage('Client Name is required');
      return;
    }
    if (!formData.siteAddress.trim()) {
      setErrorMessage('Site Address is required');
      return;
    }
    if (!formData.country) {
      setErrorMessage('Country is required');
      return;
    }
    if (!formData.state) {
      setErrorMessage('State is required');
      return;
    }
    if (!formData.city) {
      setErrorMessage('City is required');
      return;
    }
    if (!formData.noBasements) {
      setErrorMessage('Number of Basements is required');
      return;
    }
    if (!formData.noFloors) {
      setErrorMessage('Number of Floors is required');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call - Replace with your actual backend call
      const payload = {
        client_name: formData.clientName,
        site_address: formData.siteAddress,
        country: formData.country,
        state: formData.state,
        city: formData.city,
        pin: formData.pin,
        rpa_authority: formData.rpaAuthority,
        site_area: formData.siteArea ? parseFloat(formData.siteArea) : null,
        site_area_unit: formData.siteAreaUnit,
        project_area: formData.projectArea ? parseFloat(formData.projectArea) : null,
        project_area_unit: formData.projectAreaUnit,
        no_basements: parseInt(formData.noBasements, 10),
        no_floors: parseInt(formData.noFloors, 10),
        building_profile: formData.buildingProfile,
        project_cost: formData.projectCost ? parseFloat(formData.projectCost) : null,
        currency: formData.currency,
      };

      // Replace this with your actual backend call
      console.log('Submitting data:', payload);
      
      // Simulating API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      setSuccessMessage('Project created successfully!');
      setTimeout(() => {
        setFormData({
          clientName: '',
          siteAddress: '',
          country: '',
          state: '',
          city: '',
          pin: '',
          rpaAuthority: '',
          siteArea: '',
          siteAreaUnit: 'sq ft',
          projectArea: '',
          projectAreaUnit: 'sq ft',
          noBasements: '',
          noFloors: '',
          buildingProfile: '',
          projectCost: '',
          currency: 'Lakhs',
        });
        setSuccessMessage('');
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Error creating project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      clientName: '',
      siteAddress: '',
      country: '',
      state: '',
      city: '',
      pin: '',
      rpaAuthority: '',
      siteArea: '',
      siteAreaUnit: 'sq ft',
      projectArea: '',
      projectAreaUnit: 'sq ft',
      noBasements: '',
      noFloors: '',
      buildingProfile: '',
      projectCost: '',
      currency: 'Lakhs',
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const states = formData.country ? countryData[formData.country]?.states || [] : [];
  const cities = formData.country && formData.state 
    ? countryData[formData.country]?.cities[formData.state] || [] 
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Create a Project</h1>
          <p className="text-gray-600 text-lg">Fill in the project details to get started</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="text-green-600" size={24} />
            <span className="text-green-800 font-medium">{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="text-red-600" size={24} />
            <span className="text-red-800 font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="space-y-6">
            {/* Client Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => handleInputChange('clientName', e.target.value)}
                placeholder="Enter client name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            {/* Site Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Site Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.siteAddress}
                onChange={(e) => handleInputChange('siteAddress', e.target.value)}
                placeholder="Enter site address"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            {/* Country and State */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white appearance-none cursor-pointer transition"
                >
                  <option value="">Select Country</option>
                  {Object.keys(countryData).map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  disabled={!formData.country}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white appearance-none cursor-pointer transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select State</option>
                  {states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* City and PIN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  disabled={!formData.state}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white appearance-none cursor-pointer transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select City</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">PIN Code</label>
                <input
                  type="text"
                  value={formData.pin}
                  onChange={(e) => handleInputChange('pin', e.target.value)}
                  placeholder="Enter PIN code"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* RPA Authority */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">RPA Authority</label>
              <input
                type="text"
                value={formData.rpaAuthority}
                onChange={(e) => handleInputChange('rpaAuthority', e.target.value)}
                placeholder="Enter RPA Authority"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            {/* Site Area and Project Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Site Area</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.siteArea}
                    onChange={(e) => handleInputChange('siteArea', e.target.value)}
                    placeholder="0"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                  <select
                    value={formData.siteAreaUnit}
                    onChange={(e) => handleInputChange('siteAreaUnit', e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white appearance-none transition"
                  >
                    <option value="sq ft">sq ft</option>
                    <option value="sq m">sq m</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Project Area</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.projectArea}
                    onChange={(e) => handleInputChange('projectArea', e.target.value)}
                    placeholder="0"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                  <select
                    value={formData.projectAreaUnit}
                    onChange={(e) => handleInputChange('projectAreaUnit', e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white appearance-none transition"
                  >
                    <option value="sq ft">sq ft</option>
                    <option value="sq m">sq m</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Basements, Floors, Building Profile */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  No of Basements <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.noBasements}
                  onChange={(e) => handleInputChange('noBasements', e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  No of Floors <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.noFloors}
                  onChange={(e) => handleInputChange('noFloors', e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Building Profile</label>
                <input
                  type="text"
                  value={formData.buildingProfile}
                  onChange={(e) => handleInputChange('buildingProfile', e.target.value)}
                  placeholder="e.g., Residential"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Project Cost */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Project Cost</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.projectCost}
                  onChange={(e) => handleInputChange('projectCost', e.target.value)}
                  placeholder="0"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white appearance-none transition"
                >
                  <option value="Lakhs">Lakhs</option>
                  <option value="Crores">Crores</option>
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-6 py-3 border-2 border-gray-800 text-gray-800 font-semibold rounded-lg hover:bg-gray-100 transition duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className={`flex-1 px-6 py-3 font-semibold rounded-lg text-white transition duration-200 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600'
                }`}
              >
                {loading ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}