// src/pages/user/Dashboard.jsx
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { logout } from "@/redux/slices/userSlice";

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user, loading, isAdminMode } = useSelector((state) => state.user);

  // Keep your refresh log behavior
  useEffect(() => {
    // Runs whenever a navigation sets state: { refresh: true }
    if (location.state?.refresh) {
      console.log("Dashboard refreshed!", location.state.refresh);
    }
  }, [location.state?.refresh]);

  // If still loading user/session
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <ClipLoader size={36} />
      </div>
    );
  }

  // If no session, bounce to login
  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome, <span className="text-blue-700">{user.name}</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Here’s a quick look at your account.
          </p>
        </div>

        <button
          onClick={() => dispatch(logout())}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <Card label="Email" value={user.email} />
        <Card label="Role" value={user.role} />
        {isAdmin && (
          <Card
            label="Admin Mode"
            value={isAdminMode ? "Enabled" : "Disabled"}
          />
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-3">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/signatures")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            My Signatures
          </button>
          <button
            onClick={() => navigate("/signatures/create")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Create Signature
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Edit Profile
          </button>
          {isAdmin && isAdminMode && (
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Admin Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Card = ({ label, value }) => (
  <div className="rounded-xl border p-4 bg-white shadow-sm">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-lg font-semibold break-all">{value || "—"}</div>
  </div>
);

export default Dashboard;
