import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const { user, isAdminMode, loading } = useSelector((state) => state.user);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-xl font-semibold">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-gradient-to-r from-blue-100 to-purple-100">
      <h1 className="text-5xl font-bold text-blue-700">
        Welcome to Email Signature App
      </h1>
      <p className="text-lg text-gray-600 max-w-lg text-center">
        Create professional email signatures easily. Register or login to get
        started!
      </p>
      <div className="flex gap-6">
        {user ? (
          <button
            onClick={() =>
              navigate(
                user.role === "admin" && isAdminMode
                  ? "/admin/dashboard"
                  : "/dashboard",
                { replace: true }
              )
            }
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Dashboard
          </button>
        ) : (
          <>
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/register", { replace: true })}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Register
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;
