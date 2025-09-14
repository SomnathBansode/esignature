import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { forgotPassword, clearMessages } from "../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import gsap from "gsap";

const ForgotPasswordPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading } = useSelector((state) => state.user);
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
    console.log("Submitting forgot password for email:", data.email);
    try {
      const promise = dispatch(forgotPassword({ email: data.email })).unwrap();
      await toast.promise(
        promise,
        {
          loading: "Sending reset link...",
          success: "Password reset link sent to your email!",
          error: (err) => err || "Failed to send reset link",
        },
        { duration: 2000 }
      );
      console.log("Toast completed, redirecting to /login");
      setTimeout(() => {
        dispatch(clearMessages());
        navigate("/login", { replace: true });
      }, 2000);
    } catch (err) {
      console.log("Forgot password error:", err);
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
          Forgot Password
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <input
              type="email"
              placeholder="Enter your email"
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
          <button
            type="submit"
            className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <ClipLoader size={20} color="#fff" />
            ) : (
              "Send Reset Link"
            )}
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

export default ForgotPasswordPage;
