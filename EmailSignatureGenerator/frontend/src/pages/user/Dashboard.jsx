// src/pages/user/Dashboard.jsx
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

const Dashboard = () => {
  const location = useLocation();

  useEffect(() => {
    // This will run every time the navigate triggers a refresh
    console.log("Dashboard refreshed!", location.state?.refresh);
  }, [location.state?.refresh]);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">User Dashboard</h1>
      {/* Dashboard content */}
    </div>
  );
};

export default Dashboard;
