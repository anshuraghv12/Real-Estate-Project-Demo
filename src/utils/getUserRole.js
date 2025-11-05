// src/utils/getUserRole.js
import { supabase } from "../lib/supabaseClient";

/**
 * Fetches the current user's role from the profiles table
 * @returns {Promise<string|null>} - Returns "admin" or "user", or null if not found
 */
export const getUserRole = async () => {
  try {
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error("Error fetching user:", userError);
      return null;
    }

    if (!user) {
      console.log("No authenticated user found");
      return null;
    }

    // Fetch the user's profile with role
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching role from profiles:", error);
      return null;
    }

    // Return the role, default to "user" if not set
    return data?.role || "user";
  } catch (err) {
    console.error("Unexpected error in getUserRole:", err);
    return null;
  }
};

/**
 * Checks if the current user is an admin
 * @returns {Promise<boolean>}
 */
export const isAdmin = async () => {
  const role = await getUserRole();
  return role === "admin";
};

/**
 * Gets full user profile including role
 * @returns {Promise<Object|null>}
 */
export const getUserProfile = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Unexpected error in getUserProfile:", err);
    return null;
  }
};