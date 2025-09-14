import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { resetPassword, clearMessages } from "../redux/slices/userSlice";
import { useNavigate, useLocation } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import gsap from "gsap";

const ResetPasswordPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useSelector((state) => state.user);
  const [showPassword, setShowPassword] = React.useState(false);
  const [token, setToken] = React.useState("");
  const formRef = useRef(null);
  const animatedRef = useRef(false);

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    dispatch(clearMessages());
    const query = new URLSearchParams(location.search);
    const tokenFromUrl = query.get("token");
    if (tokenFromUrl) {
      console.log("Token found:", tokenFromUrl);
      setToken(tokenFromUrl);
    } else {
      console.log("No token found, setting error");
      toast.error("Invalid or missing reset token. Please request a new one.", {
        duration: 2000,
      });
      setTimeout(() => {
        dispatch(clearMessages());
        navigate("/forgot-password", { replace: true });
      }, 2000);
    }
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
  }, [user, navigate, location, dispatch, loading]);

  const onSubmit = async (data) => {
    if (!token) {
      console.log("No token provided, setting error");
      toast.error("No reset token provided", { duration: 2000 });
      return;
    }
    console.log("Submitting reset password with token:", token);
    try {
      const promise = dispatch(
        resetPassword({ token, newPassword: data.newPassword })
      ).unwrap();
      await toast.promise(
        promise,
        {
          loading: "Resetting password...",
          success: "Password reset successfully!",
          error: (err) => err || "Failed to reset password",
        },
        { duration: 2000 }
      );
      console.log("Toast completed, redirecting to /login");
      setTimeout(() => {
        dispatch(clearMessages());
        navigate("/login", { replace: true });
      }, 2000);
    } catch (err) {
      console.log("Reset password error:", err);
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
          Reset Password
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                errors.newPassword ? "border-red-500" : "border-gray-300"
              }`}
              {...formRegister("newPassword", {
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
            {errors.newPassword && (
              <p className="text-red-500 text-sm mt-1">
                {errors.newPassword.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center disabled:opacity-50"
            disabled={loading || !token}
          >
            {loading ? <ClipLoader size={20} color="#fff" /> : "Reset Password"}
          </button>
        </form>
        <div className="mt-6 text-center space-y-2 text-gray-600">
          <p>
            <span
              onClick={() => navigate("/login")}
              className="text-blue-600 hover:underline cursor-pointer font-medium"
            >
              Back to Login
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
