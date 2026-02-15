import { Resend } from "resend";

let resend;

// ✅ Only initialize if API key exists
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else {
  console.warn("⚠️ RESEND_API_KEY missing. Email sending disabled.");
}

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

    const { data, error } = await resend.emails.send({
      from: "USA-FLD <onboarding@resend.dev>",
      to: options.to, // ✅ use dynamic recipient
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
    const otpMatch = options.text?.match(/\b\d{6}\b/);
    if (otpMatch) {
      console.log(`🔐 OTP CODE: ${otpMatch[0]} (Email failed to send)`);
    }

    return { messageId: "failed-but-otp-logged" };
  }
};

export default sendEmail;
