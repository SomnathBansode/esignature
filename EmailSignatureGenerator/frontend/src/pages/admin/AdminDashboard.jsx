// frontend/src/pages/admin/AdminDashboard.jsx
import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FiLayers,
  FiEdit3,
  FiUsers,
  FiList,
  FiChevronRight,
} from "react-icons/fi";

const AdminDashboard = () => {
  const { user } = useSelector((s) => s.user);
  const navigate = useNavigate();

  // Gate: only admins
  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  const Card = ({ to, icon: Icon, title, desc, cta = "Open" }) => (
    <Link
      to={to}
      className="group rounded-2xl border bg-white shadow-sm hover:shadow-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="p-6 sm:p-8 min-h-[180px] flex flex-col justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl p-4 bg-gradient-to-br from-blue-50 to-blue-100">
            <Icon className="text-blue-600" size={28} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold">{title}</h3>
            <p className="mt-1 text-gray-600 text-sm sm:text-base">{desc}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="inline-flex items-center text-blue-700 group-hover:text-blue-800 font-medium">
            {cta}
            <FiChevronRight className="ml-1" />
          </span>
          <div className="hidden sm:block h-2 w-2 rounded-full bg-blue-200 group-hover:bg-blue-300" />
        </div>
      </div>
    </Link>
  );

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Admin</h1>
        <p className="text-gray-600 mt-1">
          Quick links to manage templates, build new layouts, and oversee users.
        </p>
      </header>

      <section className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Card
          to="/admin/templates"
          icon={FiLayers}
          title="Manage Templates"
          desc="Browse all templates, edit HTML, update placeholders, or delete."
          cta="Open templates"
        />
        <Card
          to="/admin/templates/builder"
          icon={FiEdit3}
          title="Template Builder"
          desc="Design new signatures visually. Export production-safe HTML."
          cta="Open builder"
        />
        <Card
          to="/admin/users"
          icon={FiUsers}
          title="Manage Users"
          desc="Search users, suspend/activate accounts, and set roles."
          cta="Open users"
        />
        <Card
          to="/signatures"
          icon={FiList}
          title="My Signatures"
          desc="See your saved signatures. Copy HTML or download assets."
          cta="Open signatures"
        />
      </section>
    </div>
  );
};

export default AdminDashboard;
