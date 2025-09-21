// src/pages/ForgotPasswordPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { forgotPassword, clearMessages } from "../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";
import { useSpring, animated } from "@react-spring/web";
import toast from "react-hot-toast";
import gsap from "gsap";

const ForgotPasswordPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, successMessage, error } = useSelector((s) => s.user);

  const [busyLocal, setBusyLocal] = useState(false);

  const formRef = useRef(null);
  const animatedRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const loaderProps = useSpring({
    opacity: loading || busyLocal ? 1 : 0,
    scale: loading || busyLocal ? 1 : 0.8,
    config: { tension: 220, friction: 18 },
  });

  useEffect(() => {
    dispatch(clearMessages());
    if (user && !loading) {
      navigate(user.role === "admin" ? "/admin/dashboard" : "/dashboard", {
        replace: true,
      });
    }
    if (formRef.current && !animatedRef.current) {
      animatedRef.current = true;
      gsap.fromTo(
        formRef.current,
        { opacity: 0, y: 32 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }
      );
    }
  }, [user, loading, dispatch, navigate]);

  const onSubmit = async (data) => {
    setBusyLocal(true);
    try {
      // run API + default inline loader toast
      await toast.promise(
        dispatch(forgotPassword({ email: data.email })).unwrap(),
        {
          loading: "Sending reset link…",
          // 3s success toast that survives navigation
          success:
            "Check your email for the reset link. If you don't see it, check your spam folder.",
          error: (err) => err || "Failed to send reset link",
        },
        { success: { duration: 3000 }, loading: { duration: 10000 } } // loading safety
      );

      setBusyLocal(false);
      reset();

      // navigate immediately — toast will stay for 3s because <Toaster> is at app root
      navigate("/login", { replace: true });
    } catch (err) {
      setBusyLocal(false);
      // error toast already shown by toast.promise; no extra toast needed
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div
        ref={formRef}
        className="w-[92%] max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl border border-gray-100"
      >
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            Forgot Password
          </h1>
          <p className="text-sm text-gray-500">We’ll email you a reset link</p>
        </div>

        {successMessage && (
          <p className="text-green-600 text-center mb-4">{successMessage}</p>
        )}
        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              autoComplete="email"
              className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                errors.email ? "border-red-400" : "border-gray-300"
              }`}
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Invalid email address",
                },
              })}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || busyLocal}
            className="relative bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center"
            style={{ minHeight: 48 }}
          >
            {loading || busyLocal ? (
              <animated.div
                style={{
                  ...loaderProps,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div className="w-6 h-6 rounded-full bg-white/30 animate-pulse" />
              </animated.div>
            ) : (
              "Send reset link"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <span
            onClick={() => navigate("/login")}
            className="text-blue-600 hover:underline cursor-pointer font-medium"
          >
            Back to Login
          </span>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
