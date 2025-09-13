// frontend/src/pages/ResetPassword.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "../utils/api";

const ResetPassword = () => {
  const { token } = useParams(); // Token from URL
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setMessage("");

      // Call the resetPassword API
      const response = await api("/auth/reset-password", {
        method: "POST",
        body: { token, newPassword },
      });

      setMessage(response.message);
      setNewPassword(""); // Clear password field after success
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  };

  return (
    <div className="container">
      <h1 className="text-center">Reset Password</h1>
      {message && <p className="text-success">{message}</p>}
      {error && <p className="text-error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="newPassword">New Password:</label>
          <input
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            placeholder="Enter your new password"
          />
        </div>
        <button type="submit">Submit New Password</button>
      </form>
    </div>
  );
};

export default ResetPassword;
