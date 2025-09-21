import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import {
  register as registerThunk,
  clearMessages,
} from "../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useSpring, animated } from "@react-spring/web";
import toast from "react-hot-toast";
import gsap from "gsap";

const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((s) => s.user);

  const [showPassword, setShowPassword] = useState(false);
  const [busyLocal, setBusyLocal] = useState(false);
  const [success, setSuccess] = useState(false);

  const formRef = useRef(null);
  const animatedRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const loaderProps = useSpring({
    opacity: (loading || busyLocal) && !success ? 1 : 0,
    scale: (loading || busyLocal) && !success ? 1 : 0.8,
    config: { tension: 220, friction: 18 },
  });

  const successProps = useSpring({
    opacity: success ? 1 : 0,
    scale: success ? 1 : 0.9,
    config: { tension: 270, friction: 16 },
    onRest: () => {
      if (success)
        navigate(user?.role === "admin" ? "/admin/dashboard" : "/dashboard", {
          replace: true,
        });
    },
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
      await dispatch(
        registerThunk({
          name: data.name,
          email: data.email,
          password: data.password,
        })
      ).unwrap();
      setBusyLocal(false);
      setSuccess(true);
      toast.success("Registration successful! Welcome!");
      reset();
    } catch (err) {
      setBusyLocal(false);
      toast.error(err || "Registration failed");
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
            Create an account
          </h1>
          <p className="text-sm text-gray-500">
            Start generating beautiful email signatures
          </p>
        </div>

        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <input
              type="text"
              placeholder="Full name"
              autoComplete="name"
              className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                errors.name ? "border-red-400" : "border-gray-300"
              }`}
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>

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

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="new-password"
              className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                errors.password ? "border-red-400" : "border-gray-300"
              }`}
              {...register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "At least 6 characters" },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || busyLocal}
            className="relative bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center"
            style={{ minHeight: 48 }}
          >
            {success ? (
              <animated.div style={successProps} className="text-green-300">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </animated.div>
            ) : loading || busyLocal ? (
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
              "Register"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-blue-600 hover:underline cursor-pointer font-medium"
          >
            Login
          </span>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
