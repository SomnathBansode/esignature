import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";

const UnsubscribePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const email = query.get("email");
    if (email) {
      const unsubscribe = async () => {
        setLoading(true);
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/auth/unsubscribe`,
            { email }
          );
          setMessage(response.data.message);
          toast.success(response.data.message, { duration: 2000 });
          setTimeout(() => navigate("/"), 2000);
        } catch (err) {
          setError(err.response?.data?.error || "Failed to unsubscribe");
          toast.error(err.response?.data?.error || "Failed to unsubscribe", {
            duration: 2000,
          });
        } finally {
          setLoading(false);
        }
      };
      unsubscribe();
    } else {
      setError("No email provided");
      toast.error("No email provided", { duration: 2000 });
      setTimeout(() => navigate("/"), 2000);
    }
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 to-purple-100">
      <div className="max-w-md w-full mx-auto p-8 bg-white rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Unsubscribe
        </h2>
        {loading && (
          <div className="text-center">
            <ClipLoader size={30} color="#2563eb" />
          </div>
        )}
        {message && <p className="text-green-600 text-center">{message}</p>}
        {error && <p className="text-red-600 text-center">{error}</p>}
      </div>
    </div>
  );
};

export default UnsubscribePage;
