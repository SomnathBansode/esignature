import bcrypt from "bcrypt";
import { query } from "../config/db.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/mailer.js";
import crypto from "crypto";

const sign = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

// REGISTER
export const register = async (req, res, next) => {
  const { name, email, password, role } = req.body;
  console.log(
    `📝 Register request: email=${email}, origin=${req.headers.origin}`
  );
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

    // Try to send welcome email, but don't fail the API if it errors
    let emailSent = true;
    try {
      const emailText = `Hi ${
        user.name
      },\n\nWelcome to Email Signature Generator! Your account is ready.\n\nVisit: ${
        process.env.CLIENT_ORIGIN || "https://esignaturewebapp.netlify.app"
      }`;
      const emailHtmlOptions = {
        title: "Welcome to Email Signature Generator",
        greeting: `Hi ${user.name},`,
        message:
          "Your account is ready! Create your first professional email signature to enhance your emails.",
        ctaText: "Create Signature",
        ctaLink: `${
          process.env.CLIENT_ORIGIN || "https://esignaturewebapp.netlify.app"
        }/signatures/create`,
        footerText:
          "We’re excited to have you with us! Contact support@yourdomain.com if you need help.",
        email: user.email,
      };
      await sendEmail(
        user.email,
        "Welcome to Email Signature Generator",
        emailText,
        emailHtmlOptions
      );
      console.log(`✅ Welcome email sent to ${user.email}`);
    } catch (emailError) {
      emailSent = false;
      console.error(
        `❌ Failed to send welcome email to ${user.email}:`,
        emailError
      );
    }

    return res.status(201).json({ user, token, emailSent });
  } catch (error) {
    console.error(`❌ Error in register for ${email}:`, error);
    next(error);
  }
};

// LOGIN
export const login = async (req, res, next) => {
  const { email, password } = req.body;
  console.log(`📝 Login request: email=${email}, origin=${req.headers.origin}`);
  try {
    const { rows } = await query(
      "SELECT id, name, email, password_hash, role, is_active FROM signature_app.users WHERE lower(email) = lower($1)",
      [email]
    );
    const user = rows[0];
    if (!user)
      return res.status(401).json({ error: "Invalid email or password" });
    if (!user.is_active)
      return res.status(403).json({ error: "Account is suspended" });

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid)
      return res.status(401).json({ error: "Invalid email or password" });

    const token = sign({ id: user.id, role: user.role });
    await query(
      "UPDATE signature_app.users SET current_token = $1 WHERE id = $2",
      [token, user.id]
    );

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error(`❌ Error in login for ${email}:`, error);
    next(error);
  }
};

// FORGOT PASSWORD
export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  console.log(
    `📝 Forgot password request: email=${email}, origin=${req.headers.origin}`
  );
  try {
    const { rows } = await query(
      "SELECT id, name, email, is_active FROM signature_app.users WHERE lower(email) = lower($1)",
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "Email not found" });
    if (!user.is_active)
      return res.status(403).json({ error: "Account is suspended" });

    const resetToken = crypto.randomBytes(20).toString("hex");
    const expires = Date.now() + 30 * 60 * 1000; // 30 minutes

    await query(
      "UPDATE signature_app.users SET reset_token = $1, reset_token_expiration = $2 WHERE lower(email) = lower($3)",
      [resetToken, expires, email]
    );

    let emailSent = true;
    try {
      const resetLink = `${
        process.env.CLIENT_ORIGIN || "https://esignaturewebapp.netlify.app"
      }/reset-password?token=${resetToken}`;
      const emailText = `Hi ${user.name},\n\nYou requested a password reset. Use the link (valid 30 mins):\n\n${resetLink}`;
      const emailHtmlOptions = {
        title: "Reset Your Password",
        greeting: `Hi ${user.name},`,
        message:
          "You requested a password reset. Click below to set a new password (link valid for 30 minutes).",
        ctaText: "Reset Password",
        ctaLink: resetLink,
        footerText:
          "Didn’t request this? Ignore this email or contact support@yourdomain.com.",
        email: user.email,
      };
      await sendEmail(
        user.email,
        "Reset Password - Email Signature Generator",
        emailText,
        emailHtmlOptions
      );
      console.log(`✅ Reset email sent to ${user.email}`);
    } catch (emailError) {
      emailSent = false;
      console.error(
        `❌ Failed to send reset email to ${user.email}:`,
        emailError
      );
    }

    return res.status(200).json({
      message: "If that email exists, a password reset link has been sent.",
      emailSent,
    });
  } catch (error) {
    console.error(`❌ Error in forgotPassword for ${email}:`, error);
    next(error);
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;
  console.log(
    `📝 Reset password request: token=${token}, origin=${req.headers.origin}`
  );
  try {
    const { rows } = await query(
      "SELECT id, reset_token, reset_token_expiration, email, name, is_active FROM signature_app.users WHERE reset_token = $1",
      [token]
    );
    const user = rows[0];
    if (!user) return res.status(400).json({ error: "Invalid token" });
    if (!user.is_active)
      return res.status(403).json({ error: "Account is suspended" });
    if (Date.now() > user.reset_token_expiration)
      return res.status(400).json({ error: "Token has expired" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query(
      "UPDATE signature_app.users SET password_hash = $1, reset_token = NULL, reset_token_expiration = NULL, current_token = NULL WHERE id = $2",
      [hashedPassword, user.id]
    );

    let emailSent = true;
    try {
      const websiteUrl =
        process.env.CLIENT_ORIGIN || "https://esignaturewebapp.netlify.app";
      const emailText = `Hi ${user.name},\n\nYour password has been reset.\n\nVisit: ${websiteUrl}/login`;
      const emailHtmlOptions = {
        title: "Password Reset Successful",
        greeting: `Hi ${user.name},`,
        message:
          "Your password has been reset successfully. Log in with your new password to continue.",
        ctaText: "Log In Now",
        ctaLink: `${websiteUrl}/login`,
        footerText:
          "Thank you for using Email Signature Generator! Contact support@yourdomain.com if you need help.",
        email: user.email,
      };
      await sendEmail(
        user.email,
        "Password Reset Success - Email Signature Generator",
        emailText,
        emailHtmlOptions
      );
      console.log(`✅ Reset success email sent to ${user.email}`);
    } catch (emailError) {
      emailSent = false;
      console.error(
        `❌ Failed to send reset success email to ${user.email}:`,
        emailError
      );
    }

    return res.status(200).json({
      message: "Password reset successfully.",
      emailSent,
    });
  } catch (error) {
    console.error(`❌ Error in resetPassword:`, error);
    next(error);
  }
};
