import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../redux/slices/userSlice";

const Navbar = () => {
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/", { replace: true });
  };

  const handleHomeClick = () => {
    navigate("/");
  };

  return (
    <nav className="bg-white shadow-md py-4 px-8 flex justify-between items-center">
      <span
        onClick={handleHomeClick}
        className="text-2xl font-bold text-blue-700 hover:underline cursor-pointer"
      >
        Email Signature App
      </span>

      <div className="flex items-center gap-6">
        {!user ? (
          <>
            <span
              onClick={() => navigate("/login")}
              className="text-gray-700 hover:text-blue-600 cursor-pointer transition"
            >
              Login
            </span>
            <span
              onClick={() => navigate("/register")}
              className="text-gray-700 hover:text-green-600 cursor-pointer transition"
            >
              Register
            </span>
            <span
              onClick={() => navigate("/forgot-password")}
              className="text-gray-700 hover:text-blue-600 cursor-pointer transition"
            >
              Forgot Password
            </span>
          </>
        ) : (
          <>
            <span
              onClick={() =>
                navigate(
                  user.role === "admin" ? "/admin/dashboard" : "/dashboard"
                )
              }
              className="text-gray-700 hover:text-purple-600 cursor-pointer transition"
            >
              Dashboard
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
