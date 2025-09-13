// frontend/src/pages/ForgotPassword.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setMessage("");

      const response = await api("/auth/forgot-password", {
        method: "POST",
        body: { email },
      });

      setMessage(response.message);
      setEmail(""); // Clear email field after success
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  };

  return (
    <div className="container">
      <h1 className="text-center">Forgot Password</h1>
      {message && <p className="text-success">{message}</p>}
      {error && <p className="text-error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </div>
        <button type="submit">Reset Password</button>
      </form>
    </div>
  );
};

export default ForgotPassword;
