// src/pages/projects/ProjectsList.jsx
// Deprecated stub: ProjectsList
// Note: This file previously contained a second projects listing page which
// duplicated functionality found in `src/pages/Dashboard.jsx`.
// To avoid confusion we keep this file as a lightweight stub. The Dashboard
// implements the canonical projects UI (filters, drawer, admin checks).

import React from "react";
import { Navigate } from "react-router-dom";

export default function ProjectsList() {
  // Redirect to dashboard — primary projects UX lives there.
  return <Navigate to="/dashboard" replace />;
}
