import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleReset = async () => {
    const accessToken = searchParams.get("access_token");
    if (!accessToken) return setMessage("Invalid reset link.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword }, accessToken);
      if (error) throw error;
      setMessage("Password updated successfully!");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      setMessage(error?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-center">Reset Password</h2>
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-4 py-3 mb-4 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Updating..." : "Reset Password"}
        </button>
        {message && <p className="mt-4 text-center text-red-600">{message}</p>}
      </div>
    </div>
  );
}
import { toast } from "react-hot-toast";

const handleReset = async () => {
  const accessToken = searchParams.get("access_token");
  if (!accessToken) {
    toast.error("Invalid reset link.");
    return;
  }

  setLoading(true);
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword }, accessToken);
    if (error) throw error;
    toast.success("Password updated successfully!");
    setTimeout(() => navigate("/login"), 2000);
  } catch (error) {
    toast.error(error?.message || "Failed to reset password.");
  } finally {
    setLoading(false);
  }
};
