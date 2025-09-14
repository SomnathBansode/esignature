import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { register, clearMessages } from "../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { ClipLoader } from "react-spinners";
import gsap from "gsap";

const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error, successMessage } = useSelector(
    (state) => state.user
  );
  const [showPassword, setShowPassword] = React.useState(false);
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
    if (user && !successMessage) {
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

    if (successMessage && messageRef.current) {
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
                if (user.role === "admin") navigate("/admin/dashboard");
                else navigate("/dashboard");
              },
            });
          },
        }
      );
    }
  }, [user, navigate, dispatch, successMessage]);

  const onSubmit = async (data) => {
    await dispatch(
      register({ name: data.name, email: data.email, password: data.password })
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 to-purple-100">
      <div
        ref={formRef}
        className="max-w-md w-full mx-auto p-8 bg-white rounded-xl shadow-lg border border-gray-200"
        style={{ opacity: 1 }}
      >
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Register
        </h2>
        {error && (
          <div className="text-red-500 text-center mb-4 bg-red-50 p-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}
        {successMessage && (
          <div
            ref={messageRef}
            className="text-green-500 text-center mb-4 bg-green-50 p-3 rounded-lg border border-green-200"
            style={{ opacity: 1 }}
          >
            {successMessage}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <input
              type="text"
              placeholder="Name"
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              {...formRegister("name", {
                required: "Name is required",
              })}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>
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
            {loading ? <ClipLoader size={20} color="#fff" /> : "Register"}
          </button>
        </form>
        <div className="mt-6 text-center space-y-2 text-gray-600">
          <p>
            Already have an account?{" "}
            <span
              onClick={() => navigate("/login")}
              className="text-blue-600 hover:underline cursor-pointer font-medium"
            >
              Login here
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
