import bcrypt from "bcrypt";
import { query } from "../config/db.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/mailer.js";
import crypto from "crypto";

// JWT Signing Function
const sign = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Register User
export const register = async (req, res, next) => {
  const { name, email, password, role } = req.body; // Include role from request
  try {
    // Check if the email already exists
    const { rows } = await query(
      "SELECT * FROM signature_app.users WHERE lower(email) = lower($1)",
      [email]
    );

    if (rows.length > 0) {
      return res.status(400).json({ error: "Email is already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role || "user"; // Default to 'user' if no role is provided

    // Register the user with the provided or default role
    const { rows: newUser } = await query(
      "SELECT * FROM signature_app.register_user($1, $2, $3, $4)",
      [name, email.toLowerCase(), hashedPassword, userRole]
    );
    const user = newUser[0];
    const token = sign({ id: user.id, role: user.role });

    // Send registration email
    const emailText = `Hello ${user.name},\n\nWelcome to our service! Your registration was successful.`;
    const emailHtml = `<p>Hello ${user.name},</p><p>Welcome to our service! Your registration was successful.</p>`;
    await sendEmail(
      user.email,
      "Registration Successful",
      emailText,
      emailHtml
    );

    res.json({ user, token });
  } catch (error) {
    next(error);
  }
};

// User Login
// backend/routes/authRoutes.js
export const login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const { rows } = await query(
      "SELECT id, name, email, password_hash, role FROM signature_app.users WHERE lower(email) = lower($1)",
      [email]
    );

    const user = rows[0];
    if (!user) throw new Error("User not found");

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) throw new Error("Invalid credentials");

    const token = sign({ id: user.id, role: user.role });
    res.json({ user, token });
  } catch (error) {
    next(error);
  }
};
// Forgot Password function
export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    // Step 1: Check if user exists by email
    const { rows } = await query(
      "SELECT id, name, email FROM signature_app.users WHERE lower(email) = lower($1)",
      [email]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: "Email not found" });
    }

    // Step 2: Generate a reset token and expiration time
    const resetToken = crypto.randomBytes(20).toString("hex");
    const expires = Date.now() + 3600000; // 1 hour from now

    // Step 3: Store the reset token and expiration in the database
    await query(
      "UPDATE signature_app.users SET reset_token = $1, reset_token_expiration = $2 WHERE lower(email) = lower($3)",
      [resetToken, expires, email]
    );

    // Step 4: Generate the reset password link
    const resetLink = `${process.env.CLIENT_ORIGIN}/reset-password?token=${resetToken}`;

    // Step 5: Send the email with the reset password link
    const emailText = `Hello ${user.name},\n\nClick the following link to reset your password:\n\n${resetLink}`;
    const emailHtml = `
      <p>Hello ${user.name},</p>
      <p>Click the following link to reset your password:</p>
      <a href="${resetLink}" target="_blank" style="text-decoration: none; color: #007bff; font-weight: bold;">Reset Password</a>
    `;
    await sendEmail(user.email, "Password Reset", emailText, emailHtml);

    res
      .status(200)
      .json({ message: "Password reset link sent to your email." });
  } catch (error) {
    next(error); // Pass error to next middleware
  }
};

// Reset Password function
export const resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;

  try {
    // Fetch the user based on the token
    const { rows } = await query(
      "SELECT id, reset_token, reset_token_expiration, email, name FROM signature_app.users WHERE reset_token = $1",
      [token]
    );

    const user = rows[0];
    if (!user) {
      return res.status(400).json({ error: "Invalid token" });
    }

    // Check if the token has expired
    if (Date.now() > user.reset_token_expiration) {
      return res.status(400).json({ error: "Token has expired" });
    }

    // Hash the new password and update it in the DB
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password and clear the reset token
    await query(
      "UPDATE signature_app.users SET password_hash = $1, reset_token = NULL, reset_token_expiration = NULL WHERE id = $2",
      [hashedPassword, user.id]
    );

    // Website URL for redirect
    const websiteUrl = process.env.CLIENT_ORIGIN || "http://localhost:3000"; // Ensure CLIENT_ORIGIN is in your .env file

    // Send email confirmation after successful password reset
    const emailText = `Hello ${user.name},\n\nYour password has been successfully reset. You can now log in with your new password. Visit our website: ${websiteUrl}`;

    const emailHtml = `
      <p>Hello ${user.name},</p>
      <p>Your password has been successfully reset. You can now log in with your new password.</p>
      <p>Visit our website to log in: <a href="${websiteUrl}" target="_blank">${websiteUrl}</a></p>
    `;

    // Send the confirmation email with the website link
    await sendEmail(
      user.email,
      "Password Reset Successful",
      emailText,
      emailHtml
    );

    res.status(200).json({
      message: "Password successfully reset and confirmation email sent",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    next(error);
  }
};
