import React from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { token, user, loading } = useSelector((state) => state.user);

  // Wait for loading to finish before deciding
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  // No token/user after loading: redirect to login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Admin-only check
  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  // All checks passed: render children
  return children;
};

export default PrivateRoute;
