// src/pages/NotFound.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiArrowLeft,
  FiMail,
  FiSearch,
  FiAlertTriangle,
  FiRefreshCw,
} from "react-icons/fi";

const NotFound = () => {
  const navigate = useNavigate();

  const quickLinks = [
    { label: "Dashboard", path: "/dashboard", icon: FiHome },
    { label: "Email Signatures", path: "/signatures", icon: FiMail },
    { label: "Create New", path: "/templates", icon: FiSearch },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Animated 404 */}
        <div className="relative mb-8">
          <div className="text-8xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 select-none">
            404
          </div>

          {/* Floating Elements */}
          <div
            className="absolute top-0 left-1/4 w-4 h-4 bg-yellow-400 rounded-full animate-bounce"
            style={{ animationDelay: "0s" }}
          ></div>
          <div
            className="absolute top-8 right-1/4 w-3 h-3 bg-pink-400 rounded-full animate-bounce"
            style={{ animationDelay: "0.5s" }}
          ></div>
          <div
            className="absolute bottom-4 left-1/3 w-2 h-2 bg-green-400 rounded-full animate-bounce"
            style={{ animationDelay: "1s" }}
          ></div>

          {/* Warning Icon */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center animate-pulse">
              <FiAlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Oops! Page Not Found
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            The page you're looking for seems to have wandered off into the
            digital void.
          </p>
          <p className="text-gray-500">
            Don't worry, it happens to the best of us. Let's get you back on
            track!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <button
            onClick={() => navigate(-1)}
            className="group inline-flex items-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-xl font-semibold border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
          >
            <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>

          <Link
            to="/"
            className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <FiHome className="w-5 h-5" />
            Go to Home
          </Link>

          <button
            onClick={() => window.location.reload()}
            className="group inline-flex items-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-700 transition-all duration-200"
          >
            <FiRefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
            Refresh Page
          </button>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Quick Links to Get You Started
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <Link
                  key={index}
                  to={link.path}
                  className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all duration-200"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-blue-700">
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-blue-800 text-sm">
            <strong>Still can't find what you're looking for?</strong>
            <span className="ml-1">
              Try checking the URL for typos or contact support if you believe
              this is an error.
            </span>
          </p>
        </div>

        {/* Fun Animation */}
        <div className="mt-8 opacity-50">
          <div className="flex justify-center items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div
              className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="w-2 h-2 bg-pink-400 rounded-full animate-pulse"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
