// frontend/src/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "./contexts/AppContext";

const ProtectedRoute = ({ children, role }) => {
  const { auth } = useApp();

  if (!auth?.token) return <Navigate to="/login" replace />; // Redirect to login if not authenticated

  if (role && auth?.user?.role !== role) {
    return <Navigate to="/dashboard" replace />; // Redirect to dashboard if not admin
  }

  return children;
};

export default ProtectedRoute;
