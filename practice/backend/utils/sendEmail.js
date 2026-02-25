// utils/sendEmail.js
import { Resend } from "resend";

let resend;

// ✅ Only initialize if API key exists
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else {
  console.warn("⚠️ RESEND_API_KEY missing. Email sending disabled.");
}

// ✅ TESTING MODE: Only send to this email
const TEST_EMAIL = "stephenpatingomadero@gmail.com";
const isDevelopment = process.env.NODE_ENV !== 'production';

const sendEmail = async (options) => {
  try {
    // ✅ Skip sending emails if disabled (for local/dev)
    if (process.env.DISABLE_EMAIL === "true") {
      console.log(
        "📧 EMAIL DISABLED - OTP:",
        options.text?.match(/\b\d{6}\b/)?.[0] || "Check logs"
      );
      return { messageId: "disabled-" + Date.now() };
    }

    if (!options.to) throw new Error("No recipient email provided");

    // ✅ If resend is not initialized, skip safely
    if (!resend) {
      console.log("📭 Email skipped (No API Key)");
      return { messageId: "no-api-key" };
    }

    // ✅ DEVELOPMENT MODE: Only send to test email
    if (isDevelopment && options.to !== TEST_EMAIL) {
      console.log(`🔐 DEVELOPMENT MODE - OTP for ${options.to}:`);
      
      // Extract OTP from email content
      const otpMatch = options.html?.match(/\b\d{6}\b/) || options.text?.match(/\b\d{6}\b/);
      const otp = otpMatch ? otpMatch[0] : 'N/A';
      
      console.log(`=================================`);
      console.log(`📧 EMAIL WOULD BE SENT TO: ${options.to}`);
      console.log(`🔑 OTP CODE: ${otp}`);
      console.log(`📋 SUBJECT: ${options.subject}`);
      console.log(`=================================`);
      
      // Return success without actually sending
      return { 
        messageId: "test-mode-" + Date.now(),
        note: `Email would be sent to ${options.to} with OTP: ${otp}`
      };
    }

    // ✅ PRODUCTION MODE: Send email normally
    // OR Development mode but sending to test email
    const { data, error } = await resend.emails.send({
      from: "USA-FLD <onboarding@resend.dev>",
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) throw error;

    console.log(`✅ Email sent via Resend to: ${options.to}`);
    return data;

  } catch (error) {
    console.error("❌ Email sending failed:", error.message);

    // Log OTP fallback
    const otpMatch = options.text?.match(/\b\d{6}\b/) || options.html?.match(/\b\d{6}\b/);
    if (otpMatch) {
      console.log(`=================================`);
      console.log(`🔐 OTP CODE: ${otpMatch[0]} (Email failed to send)`);
      console.log(`📧 Intended recipient: ${options.to}`);
      console.log(`=================================`);
    }

    return { messageId: "failed-but-otp-logged" };
  }
};

export default sendEmail;