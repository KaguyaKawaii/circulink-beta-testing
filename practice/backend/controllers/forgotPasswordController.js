import User from "../models/User.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

// PH time helper
function nowPH() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 480 * 60000);
}

// Nodemailer transporter — uses env vars
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const requestOtp = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Email not registered." });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = new Date(nowPH().getTime() + 10 * 60 * 1000);
    await user.save();

    await transporter.sendMail({
      from: '"USA-FLD" <no-reply@usa.edu.ph>',
      to: user.email,
      subject: "Password Reset OTP — USA-FLD",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
          <h2 style="color: #CC0000; text-align: center;">USA-FLD Password Reset</h2>
          <p style="font-size: 16px;">Hello <b>${user.name}</b>,</p>
          <p style="font-size: 16px;">Use the OTP code below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #CC0000; letter-spacing: 4px;">${otp}</span>
          </div>
          <p style="font-size: 14px; color: #555;">This OTP is valid for <b>10 minutes</b>.</p>
        </div>
      `,
    });

    res.json({ message: "OTP sent to your email." });
  } catch (error) {
    console.error("OTP request error:", error);
    res.status(500).json({ message: "Failed to send OTP." });
  }
};

export const verifyOtpAndResetPassword = async (req, res) => {
  const { email, otp, newPassword, confirmPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP." });
    if (user.otpExpiry < nowPH()) return res.status(400).json({ message: "OTP expired." });
    if (newPassword !== confirmPassword) return res.status(400).json({ message: "Passwords do not match." });

    user.password = await bcrypt.hash(newPassword, 10);
    user.skipPasswordHash = true; // avoids double hashing if pre-save hook exists
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ message: "Failed to reset password." });
  }
};