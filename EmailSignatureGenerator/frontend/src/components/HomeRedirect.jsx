import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";

const HomeRedirect = () => {
  const { user, isAdminMode, loading } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && user && location.pathname === "/login") {
      console.log("HomeRedirect post-login:", { user, isAdminMode });
      navigate(
        user.role === "admin" && isAdminMode
          ? "/admin/dashboard"
          : "/dashboard",
        { replace: true }
      );
    }
  }, [user, isAdminMode, loading, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return null;
};

export default HomeRedirect;
