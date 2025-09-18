import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal.jsx";

const AdminUsers = () => {
  const { token } = useSelector((state) => state.user);
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalAction, setModalAction] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUsers(data);
    } catch (error) {
      toast.error("Failed to fetch users: " + error.message);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSuspendUser = async (user) => {
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/admin/users/${user.id}`,
        { is_active: !user.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(
        `User ${user.is_active ? "suspended" : "activated"} successfully`
      );
      fetchUsers(); // Refresh user list
    } catch (error) {
      toast.error(
        `Failed to update user: ${error.response?.data?.error || error.message}`
      );
    }
  };

  const handleDeleteUser = async (user) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/admin/users/${user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("User deleted successfully");
      fetchUsers(); // Refresh user list
    } catch (error) {
      toast.error(
        `Failed to delete user: ${error.response?.data?.error || error.message}`
      );
    }
  };

  const openModal = (user, action) => {
    setSelectedUser(user);
    setModalAction(action);
    setIsModalOpen(true);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Manage Users</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 text-left">Name</th>
              <th className="py-2 px-4 text-left">Email</th>
              <th className="py-2 px-4 text-left">Role</th>
              <th className="py-2 px-4 text-left">Status</th>
              <th className="py-2 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b">
                <td className="py-2 px-4">{user.name}</td>
                <td className="py-2 px-4">{user.email}</td>
                <td className="py-2 px-4">{user.role}</td>
                <td className="py-2 px-4">
                  {user.is_active ? "Active" : "Suspended"}
                </td>
                <td className="py-2 px-4">
                  <button
                    onClick={() => openModal(user, "suspend")}
                    className={`px-3 py-1 rounded ${
                      user.is_active
                        ? "bg-yellow-500 hover:bg-yellow-600"
                        : "bg-green-500 hover:bg-green-600"
                    } text-white mr-2`}
                  >
                    {user.is_active ? "Suspend" : "Activate"}
                  </button>
                  <button
                    onClick={() => openModal(user, "delete")}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => {
          if (modalAction === "suspend") {
            handleSuspendUser(selectedUser);
          } else if (modalAction === "delete") {
            handleDeleteUser(selectedUser);
          }
        }}
        message={
          modalAction === "suspend"
            ? `Are you sure you want to ${
                selectedUser?.is_active ? "suspend" : "activate"
              } ${selectedUser?.email}?`
            : `Are you sure you want to delete ${selectedUser?.email}? This action cannot be undone.`
        }
      />
    </div>
  );
};

export default AdminUsers;
