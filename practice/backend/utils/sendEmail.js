// utils/sendEmail.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html = "", text = "" }) => {
  console.log("=".repeat(50));
  console.log("📧 EMAIL ATTEMPT");
  console.log("Recipient:", to);
  console.log("Subject:", subject);

  try {
    if (!to) {
      throw new Error("Recipient email is required");
    }

    const mailOptions = {
      from: `CircuLink <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully");
    console.log("📬 Message ID:", info.messageId);

    const otpMatch = text.match(/\b\d{6}\b/) || html.match(/\b\d{6}\b/);
    if (otpMatch) {
      console.log("🔐 OTP sent:", otpMatch[0]);
    }

    console.log("=".repeat(50));

    return info;

  } catch (error) {
    console.error("❌ Email sending failed:", error.message);

    const otpMatch = text.match(/\b\d{6}\b/) || html.match(/\b\d{6}\b/);
    if (otpMatch) {
      console.log("🔐 OTP (email failed):", otpMatch[0]);
    }

    return {
      messageId: "failed",
      error: error.message,
    };
  }
};

export default sendEmail;