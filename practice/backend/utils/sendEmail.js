// utils/sendEmail.js
import { Resend } from "resend";

let resend;

// Initialize Resend safely
try {
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY is missing. Emails will not send.");
  } else {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log("✅ Resend initialized successfully");
  }
} catch (error) {
  console.error("❌ Resend initialization failed:", error.message);
}

const sendEmail = async ({ to, subject, html = "", text = "" }) => {
  console.log("=".repeat(50));
  console.log("📧 EMAIL ATTEMPT");
  console.log("Recipient:", to);
  console.log("Subject:", subject);

  try {
    // Disable email sending if configured
    if (process.env.DISABLE_EMAIL === "true") {
      console.log("⚠️ Email sending disabled (DISABLE_EMAIL=true)");

      const otpMatch = text.match(/\b\d{6}\b/) || html.match(/\b\d{6}\b/);
      if (otpMatch) {
        console.log("🔐 OTP:", otpMatch[0]);
      }

      return { messageId: "disabled-" + Date.now() };
    }

    if (!resend) {
      throw new Error("Resend not initialized");
    }

    if (!to) {
      throw new Error("Recipient email is required");
    }

    const response = await resend.emails.send({
      from: "stephenpatingomadero@gmail.com",
      to,
      subject,
      html,
      text,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    console.log("✅ Email sent successfully");
    console.log("📬 Message ID:", response.data?.id);

    const otpMatch = text.match(/\b\d{6}\b/) || html.match(/\b\d{6}\b/);
    if (otpMatch) {
      console.log("🔐 OTP sent:", otpMatch[0]);
    }

    console.log("=".repeat(50));

    return response.data;

  } catch (error) {
    console.error("❌ Email sending failed:", error.message);

    const otpMatch = text.match(/\b\d{6}\b/) || html.match(/\b\d{6}\b/);
    if (otpMatch) {
      console.log("🔐 OTP (email failed):", otpMatch[0]);
    }

    return {
      messageId: "failed",
      error: error.message
    };
  }
};

export default sendEmail;