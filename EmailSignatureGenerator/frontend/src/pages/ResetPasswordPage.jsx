import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { resetPassword, clearMessages } from "../redux/slices/userSlice";
import { useNavigate, useLocation } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { ClipLoader } from "react-spinners";
import gsap from "gsap";

const ResetPasswordPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, error, successMessage } = useSelector(
    (state) => state.user
  );
  const [showPassword, setShowPassword] = React.useState(false);
  const [token, setToken] = React.useState("");
  const formRef = useRef(null);
  const messageRef = useRef(null);
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
    if (tokenFromUrl) setToken(tokenFromUrl);
    else {
      dispatch({
        type: "user/resetPassword/rejected",
        payload: "Invalid or missing reset token. Please request a new one.",
      });
    }
    if (user) {
      if (user.role === "admin") navigate("/admin/dashboard");
      else navigate("/dashboard");
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

    if ((successMessage || error) && messageRef.current) {
      gsap.fromTo(
        messageRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          onComplete: () => {
            gsap.to(messageRef.current, {
              opacity: 0,
              duration: 0.5,
              delay: 1, // Flash for 1 second
              onComplete: () => {
                dispatch(clearMessages());
                if (successMessage) navigate("/login");
              },
            });
          },
        }
      );
    }
  }, [user, navigate, location, dispatch, successMessage, error]);

  const onSubmit = async (data) => {
    if (!token) {
      dispatch({
        type: "user/resetPassword/rejected",
        payload: "No reset token provided",
      });
      return;
    }
    await dispatch(resetPassword({ token, newPassword: data.newPassword }));
  };

  if (!token && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 to-purple-100">
        <div className="max-w-md w-full mx-auto p-8 bg-white rounded-xl shadow-lg border border-gray-200 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            Reset Password
          </h2>
          <div className="text-red-500 mb-4 bg-red-50 p-3 rounded-lg border border-red-200">
            {error}
          </div>
          <button
            onClick={() => navigate("/forgot-password")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

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
        {(successMessage || error) && (
          <div
            ref={messageRef}
            className={`text-center mb-4 p-3 rounded-lg border ${
              successMessage
                ? "text-green-500 bg-green-50 border-green-200"
                : "text-red-500 bg-red-50 border-red-200"
            }`}
            style={{ opacity: 1 }}
          >
            {successMessage || error}
          </div>
        )}
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
