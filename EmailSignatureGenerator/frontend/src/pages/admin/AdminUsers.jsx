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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUsers(data);
    } catch (error) {
      toast.error("Failed to fetch users: " + error.message);
    } finally {
      setLoading(false);
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
      fetchUsers();
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
      fetchUsers();
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

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role) => {
    switch (role.toLowerCase()) {
      case "admin":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "moderator":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "user":
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  User Management
                </h1>
                <p className="text-gray-600 mt-1 text-sm">
                  Manage user accounts, roles, and permissions
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 sm:gap-6 text-sm">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-gray-900">
                  {users.length}
                </div>
                <div className="text-gray-600">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-green-600">
                  {users.filter((u) => u.is_active).length}
                </div>
                <div className="text-gray-600">Active</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-red-600">
                  {users.filter((u) => !u.is_active).length}
                </div>
                <div className="text-gray-600">Suspended</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Refresh */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-5 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                aria-label="Search users"
              />
            </div>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 flex items-center justify-center"
              aria-label="Refresh users"
            >
              {loading ? (
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
              Refresh
            </button>
          </div>
        </div>

        {/* Users: Table (sm+) and Cards (mobile) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-10 sm:py-12">
              <div className="text-center">
                <svg
                  className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p className="text-gray-600">Loading users...</p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 sm:py-12 px-4">
              <svg
                className="w-14 h-14 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                No users found
              </h3>
              <p className="text-gray-600 text-sm sm:text-base">
                {searchTerm
                  ? "Try adjusting your search criteria"
                  : "No users available to display"}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card List */}
              <ul className="sm:hidden divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <li key={user.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-semibold text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500 break-all">
                            {user.email}
                          </div>
                          <div className="mt-1">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium border ${getRoleColor(
                                user.role
                              )}`}
                            >
                              {user.role}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center">
                            <span
                              className={`inline-flex items-center text-xs font-medium ${
                                user.is_active
                                  ? "text-green-700"
                                  : "text-red-700"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  user.is_active ? "bg-green-500" : "bg-red-500"
                                }`}
                              />
                              {user.is_active ? "Active" : "Suspended"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => openModal(user, "suspend")}
                          className={`inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium transition ${
                            user.is_active
                              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-200"
                              : "bg-green-100 text-green-800 hover:bg-green-200 border border-green-200"
                          }`}
                        >
                          {user.is_active ? "Suspend" : "Activate"}
                        </button>
                        <button
                          onClick={() => openModal(user, "delete")}
                          className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 border border-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(
                              user.role
                            )}`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div
                              className={`w-2 h-2 rounded-full mr-2 ${
                                user.is_active ? "bg-green-500" : "bg-red-500"
                              }`}
                            ></div>
                            <span
                              className={`text-sm font-medium ${
                                user.is_active
                                  ? "text-green-700"
                                  : "text-red-700"
                              }`}
                            >
                              {user.is_active ? "Active" : "Suspended"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openModal(user, "suspend")}
                              className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                user.is_active
                                  ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-200"
                                  : "bg-green-100 text-green-800 hover:bg-green-200 border border-green-200"
                              }`}
                            >
                              {user.is_active ? "Suspend" : "Activate"}
                            </button>
                            <button
                              onClick={() => openModal(user, "delete")}
                              className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200 border border-red-200 transition-all duration-200"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalAction === "suspend"
            ? selectedUser?.is_active
              ? "Suspend User"
              : "Activate User"
            : "Delete User"
        }
        onConfirm={() => {
          if (modalAction === "suspend") {
            handleSuspendUser(selectedUser);
          } else if (modalAction === "delete") {
            handleDeleteUser(selectedUser);
          }
        }}
        confirmText={
          modalAction === "suspend"
            ? selectedUser?.is_active
              ? "Suspend User"
              : "Activate User"
            : "Delete User"
        }
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
