import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout, toggleAdminMode } from "../redux/slices/userSlice";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal.jsx";

const Navbar = () => {
  const { user, isAdminMode } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/", { replace: true });
    toast.success("Logged out successfully");
  };

  const handleHomeClick = () => {
    navigate("/", { replace: true });
  };

  const handleToggleMode = () => {
    const confirmMessage = isAdminMode
      ? "Switch to user dashboard? You will access user features."
      : "Switch to admin dashboard? You will access admin features.";
    setModalAction(() => () => {
      dispatch(toggleAdminMode());
      const redirectPath = !isAdminMode ? "/admin/dashboard" : "/dashboard";
      navigate(redirectPath, { replace: true });
      toast.success(`Switched to ${!isAdminMode ? "admin" : "user"} mode`);
    });
    setIsModalOpen(true);
  };

  const handleDashboardClick = () => {
    const redirectPath =
      user?.role === "admin" && isAdminMode ? "/admin/dashboard" : "/dashboard";
    navigate(redirectPath, { replace: true });
  };

  return (
    <>
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
                onClick={() => navigate("/login", { replace: true })}
                className="text-gray-700 hover:text-blue-600 cursor-pointer transition"
              >
                Login
              </span>
              <span
                onClick={() => navigate("/register", { replace: true })}
                className="text-gray-700 hover:text-green-600 cursor-pointer transition"
              >
                Register
              </span>
              <span
                onClick={() => navigate("/forgot-password", { replace: true })}
                className="text-gray-700 hover:text-blue-600 cursor-pointer transition"
              >
                Forgot Password
              </span>
            </>
          ) : (
            <>
              <span
                onClick={handleDashboardClick}
                className="text-gray-700 hover:text-purple-600 cursor-pointer transition"
              >
                Dashboard
              </span>
              {user.role === "admin" && (
                <button
                  onClick={handleToggleMode}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 shadow-md"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                  {isAdminMode ? "User Mode" : "Admin Mode"}
                </button>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </nav>
      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={modalAction}
        message={
          isAdminMode
            ? "Switch to user dashboard? You will access user features."
            : "Switch to admin dashboard? You will access admin features."
        }
      />
    </>
  );
};

export default Navbar;
