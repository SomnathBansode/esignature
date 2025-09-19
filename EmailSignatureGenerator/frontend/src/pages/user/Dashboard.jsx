// frontend/src/pages/user/Dashboard.jsx
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "@/redux/slices/userSlice";
import {
  FiFilePlus, // Create Signature
  FiList, // My Signatures
  FiGrid, // Browse Templates
  FiLogOut, // Logout
  FiArrowRight, // Card CTA arrow
} from "react-icons/fi";

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading } = useSelector((state) => state.user);

  if (loading) {
    return (
      <div className="flex items-center justify-center mt-24 text-gray-600">
        Loading...
      </div>
    );
  }

  // Small presentational card (matches AdminDashboard vibe)
  const DashboardCard = ({ onClick, Icon, title, desc, cta = "Open" }) => (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_6px_24px_rgba(2,6,23,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(2,6,23,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    >
      {/* Accent line */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

      {/* Hover arrow */}
      <div className="absolute top-4 right-4 opacity-0 transition group-hover:opacity-100">
        <FiArrowRight className="h-6 w-6 text-indigo-500 translate-x-0 group-hover:translate-x-1 transition" />
      </div>

      <div className="flex flex-col h-full">
        {/* Icon + Title */}
        <div className="flex items-center gap-4 mb-3">
          <div className="rounded-xl p-3 bg-indigo-50 group-hover:bg-indigo-100 transition">
            <Icon className="text-indigo-600" size={22} />
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-gray-900">
            {title}
          </h3>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm sm:text-base flex-grow">{desc}</p>

        {/* CTA */}
        <div className="mt-5 text-sm font-semibold text-indigo-600 inline-flex items-center">
          {cta}
          <FiArrowRight className="ml-2 transition group-hover:translate-x-1" />
        </div>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header with gradient accent (matches AdminDashboard) */}
      <div className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-gray-200">
        <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">
                Dashboard
              </h1>
              {user && (
                <p className="mt-1 text-gray-600">
                  Welcome back,{" "}
                  <span className="font-semibold">{user.name}</span>
                </p>
              )}
            </div>

            {/* Quick actions row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <button
                onClick={() => navigate("/signatures/create")}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                Create Signature
              </button>
              <button
                onClick={() => navigate("/signatures")}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                My Signatures
              </button>
              <button
                onClick={() => navigate("/templates")}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                Browse Templates
              </button>
              <button
                onClick={() => dispatch(logout())}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile summary card */}
        {user && (
          <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_6px_24px_rgba(2,6,23,0.06)]">
            <h2 className="text-lg font-extrabold text-gray-900 mb-3">
              Your Profile
            </h2>
            <div className="grid sm:grid-cols-2 gap-3 text-gray-700">
              <div>
                <span className="text-gray-500 text-sm">Name</span>
                <div className="font-semibold">{user.name}</div>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Email</span>
                <div className="font-semibold">{user.email}</div>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Role</span>
                <div className="font-semibold capitalize">{user.role}</div>
              </div>
            </div>
          </div>
        )}

        {/* Action cards (match AdminDashboard style) */}
        <section className="grid gap-6 sm:gap-7 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <DashboardCard
            onClick={() => navigate("/signatures/create")}
            Icon={FiFilePlus}
            title="Create Signature"
            desc="Build a fresh email signature from a template with your details."
            cta="Start Building"
          />
          <DashboardCard
            onClick={() => navigate("/signatures")}
            Icon={FiList}
            title="My Signatures"
            desc="View, copy HTML, and export PNG for your saved signatures."
            cta="Open Library"
          />
          <DashboardCard
            onClick={() => navigate("/templates")}
            Icon={FiGrid}
            title="Browse Templates"
            desc="Explore professionally designed presets and pick your style."
            cta="Explore Templates"
          />
          <DashboardCard
            onClick={() => dispatch(logout())}
            Icon={FiLogOut}
            title="Logout"
            desc="End your session securely across protected routes."
            cta="Sign Out"
          />
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
