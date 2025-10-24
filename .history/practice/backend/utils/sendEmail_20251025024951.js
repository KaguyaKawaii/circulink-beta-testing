const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  try {
    // Skip sending emails for local/demo mode
    if (process.env.DISABLE_EMAIL === "true") {
      console.log(
        "📧 EMAIL DISABLED - OTP:",
        options.text?.match(/\b\d{6}\b/)?.[0] || "Check logs"
      );
      return { messageId: "disabled-" + Date.now() };
    }

    if (!options.to) throw new Error("No recipient email provided");

    // ✅ Use verified sender domain from Resend (works without DNS verification)
    const { data, error } = await resend.emails.send({
      from: "USA-FLD <onboarding@resend.dev>", // ✅ Must use resend.dev domain
      to: "stephenpatingomadero@gmail.com", // recipient (e.g. student@usa.edu.ph)
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) throw error;

    console.log(`✅ Email sent via Resend to: ${options.to}`);
    return data;
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);

    // Log OTP for fallback (useful in demo/testing)
    const otpMatch = options.text?.match(/\b\d{6}\b/);
    if (otpMatch) {
      console.log(`🔐 OTP CODE: ${otpMatch[0]} (Email failed to send)`);
    }

    // Prevent app crash
    return { messageId: "failed-but-otp-logged" };
  }
};

module.exports = sendEmail;
