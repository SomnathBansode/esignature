import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ClipLoader } from "react-spinners";

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.user);
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  useEffect(() => {
    if (!user || user.role !== "admin") navigate("/login");
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/admin/stats`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setStats(response.data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to fetch stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user, token, navigate]);

  if (loading) return <div className="text-center mt-20">Loading...</div>;
  if (error)
    return <div className="text-center mt-20 text-red-500">{error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white shadow rounded">
            <h2 className="text-xl font-semibold">Total Users</h2>
            <p className="text-2xl">{stats.total_users}</p>
          </div>
          <div className="p-4 bg-white shadow rounded">
            <h2 className="text-xl font-semibold">Total Signatures</h2>
            <p className="text-2xl">{stats.total_signatures}</p>
          </div>
          <div className="p-4 bg-white shadow rounded col-span-2">
            <h2 className="text-xl font-semibold">Popular Templates</h2>
            <ul>
              {stats.popular_templates.map((template) => (
                <li key={template.id}>
                  {template.name}: {template.uses} uses
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
