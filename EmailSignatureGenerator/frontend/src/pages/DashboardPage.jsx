import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../redux/slices/userSlice";

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.user);

  if (loading) return <div className="text-center mt-20">Loading...</div>;

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      {user && (
        <div className="flex flex-col gap-2">
          <p>Welcome, {user.name}</p>
          <p>Email: {user.email}</p>
          <p>Role: {user.role}</p>
          <button
            onClick={() => dispatch(logout())}
            className="mt-4 bg-red-500 text-white p-2 rounded"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
