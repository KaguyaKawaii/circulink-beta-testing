// utils/sendEmail.js
import { Resend } from "resend";

let resend;

// ✅ Initialize Resend with API key
if (process.env.RESEND_API_KEY) {
  try {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log("✅ Resend initialized successfully");
    console.log("📧 Email service is ACTIVE (sending to: stephenpatingomadero@gmail.com)");
  } catch (initError) {
    console.error("❌ Failed to initialize Resend:", initError.message);
    resend = null;
  }
} else {
  console.warn("⚠️ RESEND_API_KEY missing. Email sending disabled.");
}

// Your email address for testing
const TEST_EMAIL = "stephenpatingomadero@gmail.com";

const sendEmail = async (options) => {
  try {
    // Log email attempt
    console.log("=".repeat(50));
    console.log("📧 EMAIL ATTEMPT");
    console.log("=".repeat(50));
    console.log("Original recipient:", options.to);
    console.log("Subject:", options.subject);
    console.log("DISABLE_EMAIL:", process.env.DISABLE_EMAIL);
    console.log("RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);

    // ✅ Skip sending emails if disabled (for local/dev)
    if (process.env.DISABLE_EMAIL === "true") {
      console.log("📧 EMAIL DISABLED BY CONFIG - Logging content:");
      
      // Extract and log any OTP or important info
      const otpMatch = options.text?.match(/\b\d{6}\b/) || options.html?.match(/\b\d{6}\b/);
      if (otpMatch) {
        console.log(`🔐 OTP CODE: ${otpMatch[0]}`);
      }
      
      console.log("=".repeat(50));
      return { messageId: "disabled-" + Date.now() };
    }

    if (!options.to) {
      throw new Error("No recipient email provided");
    }

    // ✅ If resend is not initialized, log and return
    if (!resend) {
      console.log("📭 Email skipped - Resend not initialized");
      
      // Log any OTP for debugging
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

    // ✅ FORCE ALL EMAILS TO GO TO YOUR TEST EMAIL
    console.log(`📧 Redirecting email from ${options.to} to ${TEST_EMAIL} (Resend.dev testing mode)`);
    
    // Add note in email content that it was redirected
    const redirectedHtml = `
      <div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 10px; margin-bottom: 20px; border-radius: 5px;">
        <p style="margin: 0; color: #856404;">
          <strong>⚠️ TEST MODE - Email Redirected</strong><br>
          This email was originally intended for: <strong>${options.to}</strong><br>
          Sent to test email: <strong>${TEST_EMAIL}</strong> (Resend.dev restriction)
        </p>
      </div>
      ${options.html}
    `;

    // Add note in text version if provided
    let redirectedText = options.text;
    if (options.text) {
      redirectedText = `[TEST MODE - Originally intended for: ${options.to}]\n\n${options.text}`;
    }

    console.log(`📧 Sending actual email via Resend to test address: ${TEST_EMAIL}`);

    // Send email via Resend to your test email only
    const { data, error } = await resend.emails.send({
      from: "USA-FLD <onboarding@resend.dev>",
      to: [TEST_EMAIL], // Always send to your test email
      subject: `[TEST] ${options.subject} (for: ${options.to})`,
      html: redirectedHtml,
      text: redirectedText,
    });

    if (error) {
      console.error("❌ Resend API error:", error);
      throw error;
    }

    console.log(`✅ Email sent successfully to test address: ${TEST_EMAIL}`);
    console.log("📬 Message ID:", data?.id);
    console.log(`📧 Original recipient was: ${options.to}`);
    
    // Log OTP for debugging
    const otpMatch = options.html?.match(/\b\d{6}\b/) || options.text?.match(/\b\d{6}\b/);
    if (otpMatch) {
      console.log(`🔐 OTP sent: ${otpMatch[0]}`);
    }
    
    console.log("=".repeat(50));

    return data;

  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    console.error("Error details:", error);

    // Always log OTP when email fails
    const otpMatch = options.text?.match(/\b\d{6}\b/) || options.html?.match(/\b\d{6}\b/);
    if (otpMatch) {
      console.log(`=================================`);
      console.log(`🔐 OTP CODE (Email failed): ${otpMatch[0]}`);
      console.log(`📧 Failed recipient: ${options.to}`);
      console.log(`❌ Error: ${error.message}`);
      console.log(`=================================`);
    }

    return { 
      messageId: "failed-but-logged", 
      error: error.message,
      otpLogged: !!otpMatch
    };
  }
};

export default sendEmail;