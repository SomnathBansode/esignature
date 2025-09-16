import nodemailer from "nodemailer";
import sendgridTransport from "nodemailer-sendgrid";

// Create a transporter for SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Reusable HTML email template
const generateEmailTemplate = ({
  title,
  greeting,
  message,
  ctaText,
  ctaLink,
  footerText,
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
          <p style="font-size: 14px; color: #6b7280;">If you don’t see this email in your inbox, please check your spam or junk folder and add us to your contacts.</p>
          ${
            ctaText && ctaLink
              ? `<a href="${ctaLink}" class="cta-button">${ctaText}</a>`
              : ""
          }
        </div>
        <div class="footer">
          <p>${footerText}</p>
          <p><a href="${
            process.env.CLIENT_ORIGIN || "https://your-netlify-site.netlify.app"
          }">Email Signature Generator</a></p>
          <p>Email Signature Generator, 123 Business St, Tech City, TX 12345</p>
          <p><a href="${
            process.env.CLIENT_ORIGIN || "https://your-netlify-site.netlify.app"
          }/unsubscribe?email={{email}}">Unsubscribe</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send email function with anti-spam best practices
// export const sendEmail = async (to, subject, text, htmlOptions) => {
//   try {
//     const html = generateEmailTemplate({ ...htmlOptions, email: to });
//     await transporter.sendMail({
//       from: `"Email Signature Generator" <${process.env.EMAIL_USER}>`,
//       to,
//       subject,
//       text,
//       html,
//       headers: {
//         "X-PM-Message-Stream": "outbound",
//         "List-Unsubscribe": `<${
//           process.env.CLIENT_ORIGIN || "https://your-netlify-site.netlify.app"
//         }/unsubscribe?email=${encodeURIComponent(to)}>`,
//       },
//     });
//     console.log(`Email sent to ${to}`);
//   } catch (error) {
//     console.error("Error sending email:", error);
//     throw new Error("Email sending failed");
//   }
// };

export const sendEmail = async (to, subject, text, htmlOptions) => {
  try {
    console.log(`Attempting to send email to ${to} with subject: ${subject}`);
    console.log(`Using EMAIL_USER: ${process.env.EMAIL_USER}`);
    console.log(`HTML Options:`, htmlOptions);

    // Verify transporter before sending
    await transporter.verify((error, success) => {
      if (error) {
        console.error("Transporter verification failed:", error);
        throw new Error("SMTP transporter verification failed");
      } else {
        console.log("SMTP transporter is ready");
      }
    });

    const html = generateEmailTemplate({ ...htmlOptions, email: to });
    const mailOptions = {
      from: `"Email Signature Generator" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
      headers: {
        "X-PM-Message-Stream": "outbound",
        "List-Unsubscribe": `<${
          process.env.CLIENT_ORIGIN || "https://your-netlify-site.netlify.app"
        }/unsubscribe?email=${encodeURIComponent(to)}>`,
      },
    };
    console.log("Mail options:", mailOptions);

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}, Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};
