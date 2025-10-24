const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  try {
    if (!options.to) {
      console.error("⚠️ sendEmail skipped: No recipient email provided!", options);
      return;
    }

    // Validate environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("❌ Email configuration missing: EMAIL_USER or EMAIL_PASS not set in environment variables");
      throw new Error("Email service not configured properly");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Additional options for better reliability
      pool: true,
      maxConnections: 1,
      maxMessages: 5
    });

    // Verify transporter configuration
    await transporter.verify();
    console.log("✅ Email transporter verified successfully");

    const mailOptions = {
      from: `"USA-FLD System" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully to:", options.to);
    console.log("📧 Message ID:", info.messageId);
    
    return info;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error(`Email could not be sent: ${error.message}`);
  }
};

module.exports = sendEmail;