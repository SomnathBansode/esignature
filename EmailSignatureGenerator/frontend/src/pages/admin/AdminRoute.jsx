// frontend/src/pages/admin/AdminRoute.jsx
import { useApp } from "../../contexts/AppContext";
import { Navigate, Outlet } from "react-router-dom"; // Use Outlet instead of Router

export default function AdminRoute({ children }) {
  const { auth } = useApp();

  // not logged in -> to login
  if (!auth?.token) {
    return <Navigate to="/login" replace />;
  }

  // logged in but not admin -> send to dashboard/home
  if (auth?.user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  // admin -> allow
  return children;
}
