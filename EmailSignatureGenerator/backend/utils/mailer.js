// import nodemailer from "nodemailer";

// // Create a transporter for SMTP
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // Verify transporter connection on startup
// transporter.verify(function (error, success) {
//   if (error) {
//     console.error("Email transporter verification failed:", error);
//   } else {
//     console.log("Email transporter is ready to send messages");
//     console.log("Using email account:", process.env.EMAIL_USER);
//   }
// });

// // Reusable HTML email template
// const generateEmailTemplate = ({
//   title,
//   greeting,
//   message,
//   ctaText,
//   ctaLink,
//   footerText,
//   email,
// }) => {
//   return `
//     <!DOCTYPE html>
//     <html lang="en">
//     <head>
//       <meta charset="UTF-8">
//       <meta name="viewport" content="width=device-width, initial-scale=1.0">
//       <title>${title}</title>
//       <style>
//         /* Inline Tailwind-like styles for email client compatibility */
//         body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f4f7fa; margin: 0; padding: 0; }
//         .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
//         .header { background: linear-gradient(90deg, #2563eb, #7c3aed); padding: 24px; text-align: center; }
//         .header h1 { font-size: 24px; color: #ffffff; margin: 0; font-weight: 700; }
//         .content { padding: 24px; color: #1f2937; }
//         .content p { font-size: 16px; line-height: 1.6; margin: 12px 0; }
//         .cta-button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; margin: 20px 0; transition: background-color 0.2s; }
//         .cta-button:hover { background-color: #1d4ed8; }
//         .footer { background-color: #f4f7fa; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; }
//         .footer a { color: #2563eb; text-decoration: none; font-weight: 500; }
//         .footer a:hover { text-decoration: underline; }
//         @media only screen and (max-width: 600px) {
//           .container { width: 90%; margin: 10px; }
//           .header h1 { font-size: 20px; }
//           .content p { font-size: 14px; }
//           .cta-button { padding: 10px 20px; font-size: 14px; }
//         }
//       </style>
//     </head>
//     <body>
//       <div class="container">
//         <div class="header">
//           <h1>Email Signature Generator</h1>
//         </div>
//         <div class="content">
//           <p>${greeting}</p>
//           <p>${message}</p>
//           <p style="font-size: 14px; color: #6b7280;">If you don't see this email in your inbox, please check your spam or junk folder and add us to your contacts.</p>
//           ${
//             ctaText && ctaLink
//               ? `<a href="${ctaLink}" class="cta-button">${ctaText}</a>`
//               : ""
//           }
//         </div>
//         <div class="footer">
//           <p>${footerText}</p>
//           <p><a href="${
//             process.env.CLIENT_ORIGIN || "https://your-netlify-site.netlify.app"
//           }">Email Signature Generator</a></p>
//           <p>Email Signature Generator, 123 Business St, Tech City, TX 12345</p>
//           <p><a href="${
//             process.env.CLIENT_ORIGIN || "https://your-netlify-site.netlify.app"
//           }/unsubscribe?email=${encodeURIComponent(email)}">Unsubscribe</a></p>
//         </div>
//       </div>
//     </body>
//     </html>
//   `;
// };

import nodemailer from "nodemailer";
import sendgridTransport from "nodemailer-sendgrid";

// Create a transporter for SendGrid
const transporter = nodemailer.createTransport(
  sendgridTransport({
    apiKey: process.env.SENDGRID_API_KEY,
  })
);

// Verify transporter connection on startup
transporter.verify(function (error, success) {
  if (error) {
    console.error("SendGrid transporter verification failed:", error);
  } else {
    console.log("SendGrid transporter is ready to send messages");
    console.log("Using email account:", process.env.EMAIL_USER);
  }
});

// Reusable HTML email template
const generateEmailTemplate = ({
  title,
  greeting,
  message,
  ctaText,
  ctaLink,
  footerText,
  email,
}) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        /* Inline Tailwind-like styles for email client compatibility */
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f4f7fa; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(90deg, #2563eb, #7c3aed); padding: 24px; text-align: center; }
        .header h1 { font-size: 24px; color: #ffffff; margin: 0; font-weight: 700; }
        .content { padding: 24px; color: #1f2937; }
        .content p { font-size: 16px; line-height: 1.6; margin: 12px 0; }
        .cta-button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; margin: 20px 0; transition: background-color 0.2s; }
        .cta-button:hover { background-color: #1d4ed8; }
        .footer { background-color: #f4f7fa; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; }
        .footer a { color: #2563eb; text-decoration: none; font-weight: 500; }
        .footer a:hover { text-decoration: underline; }
        @media only screen and (max-width: 600px) {
          .container { width: 90%; margin: 10px; }
          .header h1 { font-size: 20px; }
          .content p { font-size: 14px; }
          .cta-button { padding: 10px 20px; font-size: 14px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Email Signature Generator</h1>
        </div>
        <div class="content">
          <p>${greeting}</p>
          <p>${message}</p>
          <p style="font-size: 14px; color: #6b7280;">If you don't see this email in your inbox, please check your spam or junk folder and add us to your contacts.</p>
          ${
            ctaText && ctaLink
              ? `<a href="${ctaLink}" class="cta-button">${ctaText}</a>`
              : ""
          }
        </div>
        <div class="footer">
          <p>${footerText}</p>
          <p><a href="${
            process.env.CLIENT_ORIGIN || "https://esignaturewebapp.netlify.app"
          }">Email Signature Generator</a></p>
          <p>Email Signature Generator, 123 Business St, Tech City, TX 12345</p>
          <p><a href="${
            process.env.CLIENT_ORIGIN || "https://esignaturewebapp.netlify.app"
          }/unsubscribe?email=${encodeURIComponent(email)}">Unsubscribe</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send email function with comprehensive error handling and debugging
export const sendEmail = async (to, subject, text, htmlOptions) => {
  try {
    console.log(`Attempting to send email to: ${to}`);
    console.log(`Using email account: ${process.env.EMAIL_USER}`);
    console.log(`Email subject: ${subject}`);

    // Validate required environment variables
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error(
        "SendGrid API key not configured. Check SENDGRID_API_KEY environment variable."
      );
    }

    // Validate recipient email
    if (!to || !to.includes("@")) {
      throw new Error(`Invalid recipient email: ${to}`);
    }

    const html = generateEmailTemplate({ ...htmlOptions, email: to });

    const mailOptions = {
      from: `"Email Signature Generator" <${
        process.env.EMAIL_USER || "no-reply@esignaturewebapp.com"
      }>`,
      to,
      subject,
      text,
      html,
      headers: {
        "X-PM-Message-Stream": "outbound",
        "List-Unsubscribe": `<${
          process.env.CLIENT_ORIGIN || "https://esignaturewebapp.netlify.app"
        }/unsubscribe?email=${encodeURIComponent(to)}>`,
      },
    };

    console.log("Mail options prepared:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      hasHtml: !!mailOptions.html,
      hasText: !!mailOptions.text,
    });

    // Send the email
    const result = await transporter.sendMail(mailOptions);

    console.log(`Email sent successfully to ${to}`);
    console.log(`Raw result:`, result); // Log full result for debugging
    console.log(
      `Message ID:`,
      result.messageId || "Not provided by SendGrid"
    );
    console.log(`Response:`, result.response || "Not provided by SendGrid");

    return result;
  } catch (error) {
    console.error("Error sending email:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response,
      stack: error.stack,
    });

    // Check for specific common errors
    if (error.responseCode === 401) {
      console.error("Authentication failed. Check your SendGrid API key.");
    } else if (error.responseCode === 403) {
      console.error(
        "Forbidden. Check if sender email is verified in SendGrid."
      );
    } else if (error.code === "ECONNECTION") {
      console.error("Connection failed. Check SendGrid API status.");
    } else if (error.code === "EENVELOPE") {
      console.error("Invalid envelope. Check recipient email address.");
    }

    throw new Error(`Email sending failed: ${error.message}`);
  }
};

// Test email function for debugging
export const testEmail = async () => {
  try {
    console.log("Testing email configuration...");

    const testEmail = process.env.EMAIL_USER || "test@example.com";

    const result = await sendEmail(
      testEmail,
      "Test Email - Email Signature Generator",
      "This is a test email to verify your email configuration is working correctly.",
      {
        title: "Test Email",
        greeting: "Hello!",
        message:
          "This is a test email to verify your email configuration is working correctly.",
        ctaText: "Visit Website",
        ctaLink:
          process.env.CLIENT_ORIGIN || "https://esignaturewebapp.netlify.app",
        footerText: "Test email from Email Signature Generator",
        email: testEmail,
      }
    );

    console.log("Test email sent successfully!");
    return result;
  } catch (error) {
    console.error("Test email failed:", error);
    throw error;
  }
};

// Export transporter for direct access if needed
export { transporter };

