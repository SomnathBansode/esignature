import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { loginUser, clearMessages } from "../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import gsap from "gsap";

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading } = useSelector((state) => state.user);
  const [showPassword, setShowPassword] = React.useState(false);
  const formRef = useRef(null);
  const animatedRef = useRef(false);

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    dispatch(clearMessages());
    if (user && !loading) {
      console.log("User exists, redirecting:", user);
      if (user.role === "admin")
        navigate("/admin/dashboard", { replace: true });
      else navigate("/dashboard", { replace: true });
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
          onComplete: () => {
            if (formRef.current) formRef.current.style.opacity = "1";
          },
        }
      );
    }
  }, [user, navigate, dispatch, loading]);

  const onSubmit = async (data) => {
    console.log("Submitting login for email:", data.email);
    try {
      const promise = dispatch(
        loginUser({ email: data.email, password: data.password })
      ).unwrap();
      await toast.promise(
        promise,
        {
          loading: "Logging in...",
          success: "Login successful! Welcome back!",
          error: (err) => err || "Invalid credentials",
        },
        { duration: 2000 }
      );
      console.log("Toast completed, redirecting to dashboard");
      setTimeout(() => {
        dispatch(clearMessages());
        if (user && user.role === "admin")
          navigate("/admin/dashboard", { replace: true });
        else navigate("/dashboard", { replace: true });
      }, 2000);
    } catch (err) {
      console.log("Login error:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 to-purple-100">
      <div
        ref={formRef}
        className="max-w-md w-full mx-auto p-8 bg-white rounded-xl shadow-lg border border-gray-200"
        style={{ opacity: 1 }}
      >
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Login
        </h2>
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
              onClick={() => navigate("/forgot-password")}
              className="text-blue-600 hover:underline cursor-pointer font-medium"
            >
              Forgot Password?
            </span>
          </p>
          <p>
            Don't have an account?{" "}
            <span
              onClick={() => navigate("/register")}
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
