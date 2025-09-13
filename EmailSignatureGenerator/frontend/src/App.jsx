// frontend/src/App.jsx
import { Routes, Route } from "react-router-dom";
import Nav from "./components/Nav";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateSignature from "./pages/CreateSignature";
import EditSignature from "./pages/EditSignature";
import MySignatures from "./pages/MySignatures";
import BrowseTemplates from "./pages/BrowseTemplates";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageTemplates from "./pages/admin/ManageTemplates";
import ManageUsers from "./pages/admin/ManageUsers";
import ProtectedRoute from "./ProtectedRoute"; // Custom Protected Route for authenticated users
import Register from "./pages/Register";
function App() {
  return (
    <>
      <Nav />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} /> {/* Register Page */}
        {/* User Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/browse-templates"
          element={
            <ProtectedRoute>
              <BrowseTemplates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-signature"
          element={
            <ProtectedRoute>
              <CreateSignature />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit-signature/:id"
          element={
            <ProtectedRoute>
              <EditSignature />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-signatures"
          element={
            <ProtectedRoute>
              <MySignatures />
            </ProtectedRoute>
          }
        />
        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/manage-templates"
          element={
            <ProtectedRoute role="admin">
              <ManageTemplates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/manage-users"
          element={
            <ProtectedRoute role="admin">
              <ManageUsers />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
