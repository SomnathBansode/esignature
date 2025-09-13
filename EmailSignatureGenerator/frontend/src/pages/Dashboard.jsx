// src/pages/Dashboard.jsx
import { Link } from "react-router-dom";
import { useApp } from "../contexts/AppContext";

const Dashboard = () => {
  const { auth } = useApp();

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-4">
        Welcome, {auth?.user?.name || "User"}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Link to="/my-signatures" className="bg-gray-200 p-4 rounded-lg">
          My Signatures
        </Link>
        <Link to="/profile" className="bg-gray-200 p-4 rounded-lg">
          Profile
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
