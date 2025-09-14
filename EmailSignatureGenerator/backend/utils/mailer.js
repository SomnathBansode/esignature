import nodemailer from "nodemailer";

// Create a reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: "Gmail", // You can use 'gmail' or other email service
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail email
    pass: process.env.EMAIL_PASS, // Your App-Specific Password or normal password
  },
});

// Function to send emails
export const sendEmail = async (to, subject, text, html) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER, // sender address
      to, // recipient address
      subject, // Subject line
      text, // plain text body
      html, // html body
    });
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Email sending failed");
  }
};
