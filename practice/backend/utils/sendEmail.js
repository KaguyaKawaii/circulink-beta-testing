// utils/sendEmail.js
import { Resend } from "resend";

let resend = null;

// Initialize Resend
if (process.env.RESEND_API_KEY) {
  try {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log("✅ Resend initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize Resend:", error.message);
  }
} else {
  console.warn("⚠️ RESEND_API_KEY missing. Email sending disabled.");
}

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    console.log("=".repeat(50));
    console.log("📧 EMAIL ATTEMPT");
    console.log("Recipient:", to);
    console.log("Subject:", subject);

    // Disable email in development
    if (process.env.DISABLE_EMAIL === "true") {
      console.log("⚠️ Email sending disabled (DISABLE_EMAIL=true)");

      const otpMatch = text?.match(/\b\d{6}\b/) || html?.match(/\b\d{6}\b/);
      if (otpMatch) {
        console.log("🔐 OTP:", otpMatch[0]);
      }

      return { messageId: "disabled-" + Date.now() };
    }

    if (!resend) {
      console.log("📭 Email skipped - Resend not initialized");
      return { messageId: "no-resend" };
    }

    if (!to) {
      throw new Error("Recipient email is required");
    }

    const { data, error } = await resend.emails.send({
      from: "CircuLink <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
      text,
    });

    if (error) {
      throw error;
    }

    console.log("✅ Email sent successfully");
    console.log("📬 Message ID:", data?.id);

    const otpMatch = text?.match(/\b\d{6}\b/) || html?.match(/\b\d{6}\b/);
    if (otpMatch) {
      console.log("🔐 OTP sent:", otpMatch[0]);
    }

    console.log("=".repeat(50));

    return data;

  } catch (error) {
    console.error("❌ Email sending failed:", error.message);

    const otpMatch = text?.match(/\b\d{6}\b/) || html?.match(/\b\d{6}\b/);
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