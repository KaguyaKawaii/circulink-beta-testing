// utils/sendEmail.js
import { Resend } from "resend";

let resend;

// ✅ Initialize Resend with API key
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log("✅ Resend initialized successfully");
} else {
  console.warn("⚠️ RESEND_API_KEY missing. Email sending disabled.");
}

const sendEmail = async (options) => {
  try {
    // ✅ Skip sending emails if disabled (for local/dev)
    if (process.env.DISABLE_EMAIL === "true") {
      console.log(
        "📧 EMAIL DISABLED - OTP:",
        options.text?.match(/\b\d{6}\b/)?.[0] || options.html?.match(/\b\d{6}\b/)?.[0] || "Check logs"
      );
      return { messageId: "disabled-" + Date.now() };
    }

    if (!options.to) {
      throw new Error("No recipient email provided");
    }

    // ✅ If resend is not initialized, skip safely
    if (!resend) {
      console.log("📭 Email skipped (No API Key)");
      
      // Log OTP for debugging
      const otpMatch = options.html?.match(/\b\d{6}\b/) || options.text?.match(/\b\d{6}\b/);
      if (otpMatch) {
        console.log(`=================================`);
        console.log(`🔐 OTP CODE: ${otpMatch[0]}`);
        console.log(`📧 Intended recipient: ${options.to}`);
        console.log(`📋 Subject: ${options.subject}`);
        console.log(`=================================`);
      }
      
      return { messageId: "no-api-key" };
    }

    console.log(`📧 Sending email to: ${options.to}`);

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: "USA-FLD <onboarding@resend.dev>",
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error("❌ Resend API error:", error);
      throw error;
    }

    console.log(`✅ Email sent successfully to: ${options.to}`);
    
    // Log OTP for debugging (without exposing in production logs if not needed)
    if (process.env.NODE_ENV !== 'production') {
      const otpMatch = options.html?.match(/\b\d{6}\b/) || options.text?.match(/\b\d{6}\b/);
      if (otpMatch) {
        console.log(`🔐 OTP sent: ${otpMatch[0]}`);
      }
    }

    return data;

  } catch (error) {
    console.error("❌ Email sending failed:", error.message);

    // Always log OTP when email fails (for debugging)
    const otpMatch = options.text?.match(/\b\d{6}\b/) || options.html?.match(/\b\d{6}\b/);
    if (otpMatch) {
      console.log(`=================================`);
      console.log(`🔐 OTP CODE (Email failed): ${otpMatch[0]}`);
      console.log(`📧 Failed recipient: ${options.to}`);
      console.log(`❌ Error: ${error.message}`);
      console.log(`=================================`);
    }

    // Return a fallback but don't throw - we don't want to break the app
    return { 
      messageId: "failed-but-logged", 
      error: error.message,
      otpLogged: !!otpMatch 
    };
  }
};

export default sendEmail;