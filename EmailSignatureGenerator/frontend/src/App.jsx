// frontend/src/App.jsx
import React, { useEffect, useRef } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { Toaster } from "react-hot-toast";
import UnsubscribePage from "@/pages/UnsubscribePage.jsx";
import { fetchProfile, setAdminMode, logout } from "./redux/slices/userSlice";
import TemplateListPage from "@/pages/TemplateListPage.jsx";
import Navbar from "./components/Navbar.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import PublicRoute from "./components/PublicRoute.jsx";
import HomeRedirect from "./components/HomeRedirect.jsx";

import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import Dashboard from "./pages/user/Dashboard.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminTemplates from "./pages/admin/AdminTemplates.jsx";
import AdminTemplateBuilder from "./pages/admin/AdminTemplateBuilder.jsx";
import SignatureListPage from "./pages/SignatureListPage.jsx";
import SignatureCreationPage from "./pages/SignatureCreationPage.jsx";
import SignatureEditPage from "./pages/SignatureEditPage.jsx";
import NotFound from "./pages/NotFound.jsx";

function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user, loading, isAdminMode, token } = useSelector((s) => s.user);

  // ----- axios one-time setup + global interceptors -----
  const reqIdRef = useRef(null);
  const resIdRef = useRef(null);

  useEffect(() => {
    axios.defaults.baseURL = import.meta.env.VITE_API_URL;
    axios.defaults.withCredentials = false;

    // eject old interceptors (HMR/StrictMode safe)
    if (reqIdRef.current !== null) {
      axios.interceptors.request.eject(reqIdRef.current);
      reqIdRef.current = null;
    }
    if (resIdRef.current !== null) {
      axios.interceptors.response.eject(resIdRef.current);
      resIdRef.current = null;
    }

    // attach auth header
    reqIdRef.current = axios.interceptors.request.use((config) => {
      const t = localStorage.getItem("token");
      if (t && !config.headers?.Authorization) {
        config.headers = { ...config.headers, Authorization: `Bearer ${t}` };
      }
      return config;
    });

    // handle 401/403 globally
    resIdRef.current = axios.interceptors.response.use(
      (res) => res,
      (error) => {
        const status = error?.response?.status;
        const msg = error?.response?.data?.error || error.message;

        if (status === 401) {
          dispatch(logout());
          navigate("/login", {
            replace: true,
            state: { error: msg || "Session expired. Please log in again." },
          });
        } else if (status === 403 && msg === "Account is suspended") {
          dispatch(logout());
          navigate("/login", {
            replace: true,
            state: { error: "Your account has been suspended" },
          });
        }
        return Promise.reject(error);
      }
    );

    return () => {
      if (reqIdRef.current !== null) {
        axios.interceptors.request.eject(reqIdRef.current);
        reqIdRef.current = null;
      }
      if (resIdRef.current !== null) {
        axios.interceptors.response.eject(resIdRef.current);
        resIdRef.current = null;
      }
    };
  }, [dispatch, navigate]);

  // ----- boot: fetch profile if we have a token -----
  useEffect(() => {
    const tokenStored = localStorage.getItem("token");
    if (tokenStored && !user && !loading) {
      dispatch(fetchProfile());
    }
    if (!tokenStored) {
      dispatch(logout());
      if (
        location.pathname.startsWith("/admin") ||
        location.pathname === "/dashboard" ||
        location.pathname.startsWith("/signatures")
      ) {
        navigate("/login", { replace: true });
      }
    }
  }, [dispatch, loading, user, location.pathname, navigate]);

  // ----- admin-mode auto toggle -----
  useEffect(() => {
    if (!loading && user?.role === "admin") {
      const onAdmin = location.pathname.startsWith("/admin/");
      if (onAdmin && !isAdminMode) {
        dispatch(setAdminMode(true));
        axios
          .post(
            `/api/admin/log-admin-mode`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .catch(() => {});
      } else if (location.pathname === "/dashboard" && isAdminMode) {
        dispatch(setAdminMode(false));
      }
    }
  }, [user, loading, location.pathname, isAdminMode, dispatch, token]);

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
        <Route path="/redirect" element={<HomeRedirect />} />

        {/* public */}
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

        {/* user */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* admin */}
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute adminOnly={true}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <PrivateRoute adminOnly={true}>
              <AdminUsers />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/templates"
          element={
            <PrivateRoute adminOnly={true}>
              <AdminTemplates />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/templates/builder"
          element={
            <PrivateRoute adminOnly={true}>
              <AdminTemplateBuilder />
            </PrivateRoute>
          }
        />

        {/* signatures */}
        <Route
          path="/signatures"
          element={
            <PrivateRoute>
              <SignatureListPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/signatures/create"
          element={
            <PrivateRoute>
              <SignatureCreationPage />
            </PrivateRoute>
          }
        />
        <Route path="/unsubscribe" element={<UnsubscribePage />} />
        <Route
          path="/templates/create"
          element={<SignatureCreationPage allowSave={false} />}
        />
        <Route path="/templates" element={<TemplateListPage />} />
        <Route
          path="/signatures/edit/:id"
          element={
            <PrivateRoute>
              <SignatureEditPage />
            </PrivateRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
