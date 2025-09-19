// frontend/src/pages/admin/AdminDashboard.jsx
import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FiLayers,
  FiEdit3,
  FiUsers,
  FiList,
  FiArrowRight,
} from "react-icons/fi";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";

const AdminDashboard = () => {
  const { user, isAdminMode } = useSelector((s) => s.user);
  const navigate = useNavigate();

  // Gate: only admins
  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  // Small, presentational card component
  const DashboardCard = ({ to, Icon, title, desc, cta = "Explore" }) => (
    <Link
      to={to}
      className="group relative block rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_6px_24px_rgba(2,6,23,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(2,6,23,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
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
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header with gradient accent */}
      <div className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-gray-200">
        <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">
                Admin Dashboard
              </h1>
              <p className="mt-1 text-gray-600">
                Manage templates, build new layouts, and oversee user accounts.
              </p>
            </div>

            {user?.role === "admin" && (
              <div className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-indigo-700 text-sm font-semibold">
                <ShieldCheckIcon className="h-4 w-4" />
                {isAdminMode ? "Admin Mode Active" : "Admin Access"}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick actions */}
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => navigate("/admin/templates")}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            Manage Templates
          </button>
          <button
            onClick={() => navigate("/admin/templates/builder")}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            Open Builder
          </button>
          <button
            onClick={() => navigate("/admin/users")}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            Manage Users
          </button>
          <button
            onClick={() => navigate("/signatures")}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            My Signatures
          </button>
        </div>

        {/* Cards grid */}
        <section className="grid gap-6 sm:gap-7 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <DashboardCard
            to="/admin/templates"
            Icon={FiLayers}
            title="Manage Templates"
            desc="Browse, edit HTML, update placeholders, and delete existing email signature templates."
            cta="View Templates"
          />
          <DashboardCard
            to="/admin/templates/builder"
            Icon={FiEdit3}
            title="Template Builder"
            desc="Visually craft new signature designs. Export clean, production-ready HTML."
            cta="Start Building"
          />
          <DashboardCard
            to="/admin/users"
            Icon={FiUsers}
            title="Manage Users"
            desc="Search and manage user accounts, suspend or activate, and assign roles."
            cta="Access Users"
          />
          <DashboardCard
            to="/signatures"
            Icon={FiList}
            title="My Signatures"
            desc="Open your saved signatures to copy HTML or download assets quickly."
            cta="Go to My Signatures"
          />
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
