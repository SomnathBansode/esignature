import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile, setAdminMode } from "./redux/slices/userSlice";
import { Toaster } from "react-hot-toast";

import Navbar from "./components/Navbar.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import PublicRoute from "./components/PublicRoute.jsx";

import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import Dashboard from "./pages/user/Dashboard.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import NotFound from "./pages/NotFound.jsx";
import SignatureListPage from "./pages/SignatureListPage.jsx";
import UnsubscribePage from "./pages/UnsubscribePage.jsx";

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user, loading, isAdminMode } = useSelector((state) => state.user);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      dispatch(fetchProfile());
    } else {
      dispatch({ type: "user/logout" });
    }
  }, [dispatch]);

  useEffect(() => {
    if (user?.role === "admin" && !loading) {
      if (location.pathname === "/admin/dashboard" && !isAdminMode) {
        dispatch(setAdminMode(true));
      } else if (location.pathname === "/dashboard" && isAdminMode) {
        dispatch(setAdminMode(false));
      }
    }
  }, [user, loading, location.pathname, isAdminMode, dispatch]);

  return (
    <>
      <Navbar />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2000,
          style: {
            background: "#f7fafc",
            color: "#1a202c",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "12px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          },
          success: {
            style: {
              background: "#f0fff4",
              color: "#2f855a",
              border: "1px solid #9ae6b4",
            },
          },
          error: {
            style: {
              background: "#fff5f5",
              color: "#c53030",
              border: "1px solid #feb2b2",
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/unsubscribe"
          element={
            <PublicRoute>
              <UnsubscribePage />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute adminOnly={true}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/signatures"
          element={
            <PrivateRoute>
              <SignatureListPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
