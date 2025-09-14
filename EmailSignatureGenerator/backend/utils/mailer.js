import nodemailer from "nodemailer";

// Create a reusable transporter object using the default SMTP transport
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail email
    pass: process.env.EMAIL_PASS, // Your App-Specific Password
  },
  port: 587, // Explicitly use TLS port
  secure: false, // Use STARTTLS
  tls: {
    rejectUnauthorized: false,
  },
  debug: true, // Enable debug output
  logger: true, // Log SMTP interactions
});

// Function to send emails
export const sendEmail = async (to, subject, text, html) => {
  try {
    console.log(`Attempting to send email to: ${to}`);
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    });
    console.log(`Email sent successfully to: ${to}`);
  } catch (error) {
    console.error("Detailed Email Error:", {
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command,
      stack: error.stack,
    });
    throw new Error(`Email sending failed: ${error.message}`);
  }
};
