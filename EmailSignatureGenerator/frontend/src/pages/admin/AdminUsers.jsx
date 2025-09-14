import React from "react";
import LogoutButton from "../../components/LogoutButton";

const AdminUsers = () => {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Users</h1>
        <LogoutButton />
      </div>
      <p>Here you can manage all registered users.</p>
    </div>
  );
};

export default AdminUsers;
