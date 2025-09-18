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

  // NEW: mobile hamburger state
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/", { replace: true });
    toast.success("Logged out successfully");
    setIsMenuOpen(false);
  };

  const handleHomeClick = () => {
    navigate("/", { replace: true });
    setIsMenuOpen(false);
  };

  const handleToggleMode = () => {
    setModalAction(() => () => {
      dispatch(toggleAdminMode());
      const redirectPath = !isAdminMode ? "/admin/dashboard" : "/dashboard";
      navigate(redirectPath, { replace: true });
      toast.success(`Switched to ${!isAdminMode ? "admin" : "user"} mode`);
      setIsMenuOpen(false);
    });
    setIsModalOpen(true);
  };

  const handleDashboardClick = () => {
    const redirectPath =
      user?.role === "admin" && isAdminMode ? "/admin/dashboard" : "/dashboard";
    navigate(redirectPath, { replace: true });
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav className="bg-white shadow-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Brand */}
            <span
              onClick={handleHomeClick}
              className="text-xl sm:text-2xl font-bold text-blue-700 hover:underline cursor-pointer"
            >
              Email Signature App
            </span>

            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-6">
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
                    onClick={() =>
                      navigate("/forgot-password", { replace: true })
                    }
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
                        aria-hidden="true"
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

            {/* Mobile hamburger */}
            <div className="md:hidden">
              <button
                aria-label="Toggle navigation menu"
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((v) => !v)}
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {isMenuOpen ? (
                  // Close icon
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  // Hamburger icon
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu (collapsible) */}
        <div
          className={`md:hidden border-t transition-all duration-200 ease-out ${
            isMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
          } overflow-hidden`}
        >
          <div className="px-4 py-3 space-y-3">
            {!user ? (
              <>
                <button
                  onClick={() => {
                    navigate("/login", { replace: true });
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left text-gray-700 hover:text-blue-600"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    navigate("/register", { replace: true });
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left text-gray-700 hover:text-green-600"
                >
                  Register
                </button>
                <button
                  onClick={() => {
                    navigate("/forgot-password", { replace: true });
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left text-gray-700 hover:text-blue-600"
                >
                  Forgot Password
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleDashboardClick}
                  className="block w-full text-left text-gray-700 hover:text-purple-600"
                >
                  Dashboard
                </button>

                {user.role === "admin" && (
                  <button
                    onClick={handleToggleMode}
                    className="block w-full text-left px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md"
                  >
                    {isAdminMode ? "User Mode" : "Admin Mode"}
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  Logout
                </button>
              </>
            )}
          </div>
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
