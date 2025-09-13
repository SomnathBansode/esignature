// frontend/src/pages/admin/ManageUsers.jsx
import { useState, useEffect } from "react";
import { api } from "../../utils/api"; // API utility for making calls

const ManageUsers = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api("/admin/users");
        setUsers(response); // Set users from the API response
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  const handleDelete = async (userId) => {
    try {
      await api(`/users/${userId}`, { method: "DELETE" });
      setUsers(users.filter((user) => user.id !== userId)); // Remove deleted user from the list
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-4">Manage Users</h2>
      <ul>
        {users.map((user) => (
          <li
            key={user.id}
            className="flex justify-between items-center p-4 border-b"
          >
            <div>
              {user.name} ({user.email})
            </div>
            <div>
              <button
                onClick={() => handleDelete(user.id)}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ManageUsers;
