import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const { token } = useSelector((state) => state.user);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/admin/stats`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setStats(response.data);
        console.log("Dashboard refreshed!", response.data);
      } catch (error) {
        console.error(
          "Failed to fetch stats:",
          error.response?.data?.error || error.message
        );
        toast.error("Failed to load dashboard stats");
        setStats({
          total_users: 0,
          total_signatures: 0,
          popular_templates: [],
          recent_activity: [],
        });
      }
    };
    fetchStats();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Admin Dashboard
        </h1>
        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800">
                Total Users
              </h2>
              <p className="text-2xl text-blue-600">{stats.total_users}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800">
                Total Signatures
              </h2>
              <p className="text-2xl text-blue-600">{stats.total_signatures}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800">
                Popular Templates
              </h2>
              <ul className="mt-4 space-y-2">
                {stats.popular_templates.map((template) => (
                  <li key={template.id} className="text-gray-600">
                    {template.name}: {template.uses} uses
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md col-span-1 md:col-span-2 lg:col-span-3">
              <h2 className="text-xl font-semibold text-gray-800">
                Recent Activity
              </h2>
              <ul className="mt-4 space-y-2">
                {stats.recent_activity.map((activity, index) => (
                  <li key={index} className="text-gray-600">
                    {activity.description} at{" "}
                    {new Date(activity.timestamp).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">Loading stats...</p>
        )}
        <div className="mt-6 flex space-x-4">
          <Link
            to="/admin/users"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Manage Users
          </Link>
          <Link
            to="/admin/templates"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Manage Templates
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
