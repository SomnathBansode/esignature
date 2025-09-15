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
  const { name, email, password, role } = req.body;
  try {
    const { rows } = await query(
      "SELECT * FROM signature_app.users WHERE lower(email) = lower($1)",
      [email]
    );

    if (rows.length > 0) {
      return res.status(400).json({ error: "Email is already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role || "user";

    const { rows: newUser } = await query(
      "SELECT * FROM signature_app.register_user($1, $2, $3, $4)",
      [name, email.toLowerCase(), hashedPassword, userRole]
    );
    const user = newUser[0];
    const token = sign({ id: user.id, role: user.role });

    // Send registration email
    const emailText = `Hi ${
      user.name
    },\n\nWelcome to Email Signature Generator! Your account is ready. Start creating professional email signatures now.\n\nVisit: ${
      process.env.CLIENT_ORIGIN || "https://your-netlify-site.netlify.app"
    }`;
    const emailHtmlOptions = {
      title: "Welcome to Email Signature Generator",
      greeting: `Hi ${user.name},`,
      message:
        "Your account is ready! Create your first professional email signature to enhance your emails.",
      ctaText: "Create Signature",
      ctaLink: `${
        process.env.CLIENT_ORIGIN || "https://your-netlify-site.netlify.app"
      }/signatures/create`,
      footerText:
        "We’re excited to have you with us! Contact support@yourdomain.com if you need help.",
    };
    await sendEmail(
      user.email,
      "Welcome to Email Signature Generator",
      emailText,
      emailHtmlOptions
    );

    res.json({ user, token });
  } catch (error) {
    next(error);
  }
};

// User Login
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
    const { rows } = await query(
      "SELECT id, name, email FROM signature_app.users WHERE lower(email) = lower($1)",
      [email]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: "Email not found" });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    const expires = Date.now() + 1800000; // 30 minutes expiry

    await query(
      "UPDATE signature_app.users SET reset_token = $1, reset_token_expiration = $2 WHERE lower(email) = lower($3)",
      [resetToken, expires, email]
    );

    const resetLink = `${
      process.env.CLIENT_ORIGIN || "https://your-netlify-site.netlify.app"
    }/reset-password?token=${resetToken}`;
    const emailText = `Hi ${user.name},\n\nYou requested a password reset for Email Signature Generator. Click the link below to reset your password (valid for 30 minutes):\n\n${resetLink}\n\nIf you didn’t request this, please ignore this email.`;
    const emailHtmlOptions = {
      title: "Reset Your Password",
      greeting: `Hi ${user.name},`,
      message:
        "You requested a password reset. Click below to set a new password (link valid for 30 minutes).",
      ctaText: "Reset Password",
      ctaLink: resetLink,
      footerText:
        "Didn’t request this? Ignore this email or contact support@yourdomain.com.",
    };
    await sendEmail(
      user.email,
      "Reset Password - Email Signature Generator",
      emailText,
      emailHtmlOptions
    );

    res.status(200).json({
      message:
        "Password reset link sent to your email. Please check your spam folder if you don’t see it.",
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password function
export const resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;

  try {
    const { rows } = await query(
      "SELECT id, reset_token, reset_token_expiration, email, name FROM signature_app.users WHERE reset_token = $1",
      [token]
    );

    const user = rows[0];
    if (!user) {
      return res.status(400).json({ error: "Invalid token" });
    }

    if (Date.now() > user.reset_token_expiration) {
      return res.status(400).json({ error: "Token has expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query(
      "UPDATE signature_app.users SET password_hash = $1, reset_token = NULL, reset_token_expiration = NULL WHERE id = $2",
      [hashedPassword, user.id]
    );

    const websiteUrl =
      process.env.CLIENT_ORIGIN || "https://your-netlify-site.netlify.app";
    const emailText = `Hi ${user.name},\n\nYour password for Email Signature Generator has been reset. Log in now to continue creating signatures.\n\nVisit: ${websiteUrl}/login`;
    const emailHtmlOptions = {
      title: "Password Reset Successful",
      greeting: `Hi ${user.name},`,
      message:
        "Your password has been reset successfully. Log in with your new password to continue creating signatures.",
      ctaText: "Log In Now",
      ctaLink: `${websiteUrl}/login`,
      footerText:
        "Thank you for using Email Signature Generator! Contact support@yourdomain.com if you need help.",
    };
    await sendEmail(
      user.email,
      "Password Reset Success - Email Signature Generator",
      emailText,
      emailHtmlOptions
    );

    res.status(200).json({
      message:
        "Password reset successfully. Check your email (and spam folder) for confirmation.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    next(error);
  }
};
