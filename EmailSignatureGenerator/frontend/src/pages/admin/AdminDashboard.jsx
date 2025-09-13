// frontend/src/pages/admin/AdminDashboard.jsx
import { useState, useEffect } from "react";
import { api } from "../../utils/api"; // Assuming api.js is set up to make API calls
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api("/admin/stats");
        setStats(response); // Update stats
      } catch (error) {
        console.error("Error fetching stats:", error);
        navigate("/dashboard"); // Redirect if not authorized
      }
    };

    fetchStats();
  }, [navigate]);

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-4">Admin Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 border rounded bg-white">
          <h3 className="text-xl font-semibold">Total Users</h3>
          <p className="text-2xl">{stats.total_users}</p>
        </div>
        <div className="p-4 border rounded bg-white">
          <h3 className="text-xl font-semibold">Total Signatures</h3>
          <p className="text-2xl">{stats.total_signatures}</p>
        </div>
        <div className="p-4 border rounded bg-white">
          <h3 className="text-xl font-semibold">Popular Templates</h3>
          <ul>
            {stats.popular_templates.map((template, index) => (
              <li key={index}>
                {template.name}: {template.uses} uses
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
