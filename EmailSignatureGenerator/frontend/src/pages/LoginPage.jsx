import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { loginUser, clearMessages } from "../redux/slices/userSlice";
import { useNavigate, useLocation } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import gsap from "gsap";

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdminMode, loading, error } = useSelector(
    (state) => state.user
  );
  const [showPassword, setShowPassword] = React.useState(false);
  const formRef = useRef(null);
  const animatedRef = useRef(false);

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  useEffect(() => {
    dispatch(clearMessages());
    if (location.state?.error) {
      toast.error(location.state.error);
    }
    if (user && !loading && location.pathname === "/login") {
      console.log("LoginPage redirect:", { user, isAdminMode });
      const redirectPath =
        user.role === "admin" && isAdminMode
          ? "/admin/dashboard"
          : "/dashboard";
      navigate(redirectPath, { replace: true });
    }

    if (formRef.current && !animatedRef.current) {
      animatedRef.current = true;
      gsap.fromTo(
        formRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
        }
      );
    }
  }, [
    user,
    isAdminMode,
    navigate,
    dispatch,
    loading,
    location.pathname,
    location.state,
  ]);

  const onSubmit = async (data) => {
    try {
      const result = await dispatch(loginUser(data)).unwrap();
      const redirectPath =
        result.role === "admin" && isAdminMode
          ? "/admin/dashboard"
          : "/dashboard";
      navigate(redirectPath, { replace: true });
      toast.success("Logged in successfully!");
      reset();
    } catch (error) {
      console.error("Login error:", error);
      toast.error(
        error.message ||
          "Login failed. Please check your connection or credentials."
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 to-purple-100">
      <div
        ref={formRef}
        className="max-w-md w-full mx-auto p-8 bg-white rounded-xl shadow-lg border border-gray-200"
      >
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Login
        </h2>
        {error && <p className="text-red-600 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
              {...formRegister("email", {
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Invalid email address",
                },
              })}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                errors.password ? "border-red-500" : "border-gray-300"
              }`}
              {...formRegister("password", {
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center disabled:opacity-50"
            disabled={loading}
          >
            {loading ? <ClipLoader size={20} color="#fff" /> : "Login"}
          </button>
        </form>
        <div className="mt-6 text-center space-y-2 text-gray-600">
          <p>
            <span
              onClick={() => navigate("/forgot-password", { replace: true })}
              className="text-blue-600 hover:underline cursor-pointer font-medium"
            >
              Forgot Password?
            </span>
          </p>
          <p>
            Don't have an account?{" "}
            <span
              onClick={() => navigate("/register", { replace: true })}
              className="text-blue-600 hover:underline cursor-pointer font-medium"
            >
              Register here
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
