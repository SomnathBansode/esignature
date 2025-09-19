import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout, toggleAdminMode } from "../redux/slices/userSlice";
import { useSpring, animated } from "@react-spring/web";
import toast from "react-hot-toast";
import {
  Bars3Icon,
  XMarkIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowLeftEndOnRectangleIcon,
  HomeIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  KeyIcon,
  SparklesIcon, // For a modern logo feel
} from "@heroicons/react/24/outline";
import ConfirmModal from "./ConfirmModal.jsx"; // Assuming this component exists

const Navbar = () => {
  const { user, isAdminMode } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Animation for mobile menu
  const menuAnimation = useSpring({
    maxHeight: isMenuOpen ? 500 : 0, // Adjust maxHeight as needed
    opacity: isMenuOpen ? 1 : 0,
    from: { opacity: 0, maxHeight: 0 },
    config: { tension: 250, friction: 25 },
    delay: isMenuOpen ? 0 : 200, // delay closing animation slightly
  });

  // Animation for individual links (hover effect)
  const linkHoverSpring = (hovered) =>
    useSpring({
      transform: hovered ? "translateY(-2px)" : "translateY(0px)",
      color: hovered ? "#4F46E5" : "#6B7280", // Tailwind indigo-600 for hover
      config: { tension: 300, friction: 10 },
    });

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
      toast.success(`Switched to ${!isAdminMode ? "admin" : "user"} mode`, {
        icon: !isAdminMode ? "🛡️" : "👤",
      });
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

  const NavLink = ({
    to,
    onClick,
    children,
    title,
    icon: Icon,
    colorClass,
  }) => {
    const [isHovered, setIsHovered] = useState(false);
    const styles = linkHoverSpring(isHovered);

    const handleClick = () => {
      if (onClick) onClick();
      if (to) navigate(to, { replace: true });
      setIsMenuOpen(false); // Close menu on click
    };

    return (
      <animated.a
        onClick={handleClick}
        className={`flex items-center gap-2 text-sm font-medium ${
          colorClass || "text-gray-600"
        } hover:text-indigo-600 transition-all duration-200 cursor-pointer px-3 py-2 rounded-md`}
        title={title}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={styles}
      >
        {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
        {children}
      </animated.a>
    );
  };

  return (
    <>
      <nav className="bg-white shadow-lg border-b border-gray-100 sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Brand */}
            <a
              onClick={handleHomeClick}
              className="flex items-center gap-2 text-2xl font-extrabold text-indigo-700 hover:text-indigo-900 transition-colors cursor-pointer tracking-tight"
              title="Go to Home"
            >
              <SparklesIcon className="h-7 w-7 text-indigo-500" />
              SignatureGen
            </a>

            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-6">
              {!user ? (
                <>
                  <NavLink
                    to="/login"
                    title="Log in to your account"
                    icon={ArrowRightStartOnRectangleIcon}
                    colorClass="text-gray-700"
                  >
                    Login
                  </NavLink>
                  <NavLink
                    to="/register"
                    title="Create a new account"
                    icon={UserCircleIcon}
                    colorClass="text-gray-700"
                  >
                    Register
                  </NavLink>
                  <NavLink
                    to="/forgot-password"
                    title="Reset your password"
                    icon={KeyIcon}
                    colorClass="text-gray-700"
                  >
                    Forgot Password
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink
                    onClick={handleDashboardClick}
                    title="Go to Dashboard"
                    icon={HomeIcon}
                    colorClass="text-gray-700"
                  >
                    Dashboard
                  </NavLink>
                  {user.role === "admin" && (
                    <NavLink
                      onClick={handleToggleMode}
                      title={
                        isAdminMode
                          ? "Switch to User Mode"
                          : "Switch to Admin Mode"
                      }
                      icon={isAdminMode ? UserCircleIcon : ShieldCheckIcon}
                      colorClass="text-gray-700"
                    >
                      {isAdminMode ? "User Mode" : "Admin Mode"}
                    </NavLink>
                  )}
                  <NavLink
                    onClick={handleLogout}
                    title="Log out of your account"
                    icon={ArrowLeftEndOnRectangleIcon}
                    colorClass="text-red-500 hover:text-red-700"
                  >
                    Logout
                  </NavLink>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <div className="md:hidden">
              <button
                aria-label="Toggle navigation menu"
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((v) => !v)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
              >
                {isMenuOpen ? (
                  <XMarkIcon className="h-7 w-7" aria-hidden="true" />
                ) : (
                  <Bars3Icon className="h-7 w-7" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu (collapsible) */}
        <animated.div
          style={menuAnimation}
          className="md:hidden bg-white border-t border-gray-100 overflow-hidden shadow-inner"
        >
          <div className="px-4 py-3 space-y-2">
            {!user ? (
              <>
                <NavLink
                  to="/login"
                  title="Log in to your account"
                  icon={ArrowRightStartOnRectangleIcon}
                  colorClass="text-gray-700"
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  title="Create a new account"
                  icon={UserCircleIcon}
                  colorClass="text-gray-700"
                >
                  Register
                </NavLink>
                <NavLink
                  to="/forgot-password"
                  title="Reset your password"
                  icon={KeyIcon}
                  colorClass="text-gray-700"
                >
                  Forgot Password
                </NavLink>
              </>
            ) : (
              <>
                <NavLink
                  onClick={handleDashboardClick}
                  title="Go to Dashboard"
                  icon={HomeIcon}
                  colorClass="text-gray-700"
                >
                  Dashboard
                </NavLink>
                {user.role === "admin" && (
                  <NavLink
                    onClick={handleToggleMode}
                    title={
                      isAdminMode
                        ? "Switch to User Mode"
                        : "Switch to Admin Mode"
                    }
                    icon={isAdminMode ? UserCircleIcon : ShieldCheckIcon}
                    colorClass="text-gray-700"
                  >
                    {isAdminMode ? "User Mode" : "Admin Mode"}
                  </NavLink>
                )}
                <NavLink
                  onClick={handleLogout}
                  title="Log out of your account"
                  icon={ArrowLeftEndOnRectangleIcon}
                  colorClass="text-red-500 hover:text-red-700"
                >
                  Logout
                </NavLink>
              </>
            )}
          </div>
        </animated.div>
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
