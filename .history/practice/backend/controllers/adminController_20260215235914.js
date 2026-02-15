const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Admin = require("../models/Admin");
const Reservation = require("../models/Reservation");
const User = require("../models/User");
const SystemSettings = require("../models/SystemSettings");
const sendEmail = require("../utils/sendEmail");

// Helper function to generate OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Helper function to send OTP (using actual email service)
const sendOTP = async (email, otpCode, adminName = "Admin", loginTime = new Date()) => {
  try {
    const subject = "Learning Resource Center - Admin Verification Code";
    const formattedTime = loginTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: 'short'
    });

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Login Verification</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            background-color: #ffffff;
            padding: 40px 20px;
            min-height: 100vh;
          }
          
          .email-container {
            max-width: 580px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border: 1px solid #dddddd;
          }
          
          .header {
            background: #ffffff;
            color: #333333;
            text-align: center;
            padding: 35px 30px;
            border-bottom: 3px solid #CC0000;
          }
          
          .institution-name {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 5px;
            color: #333333;
            letter-spacing: 0.5px;
          }
          
          .department-name {
            font-size: 16px;
            color: #666666;
            font-weight: normal;
            margin-bottom: 8px;
          }
          
          .email-title {
            font-size: 18px;
            color: #CC0000;
            font-weight: bold;
            margin-top: 10px;
          }
          
          .content {
            padding: 35px 30px;
          }
          
          .greeting {
            font-size: 16px;
            color: #333333;
            margin-bottom: 25px;
            line-height: 1.6;
            text-align: center;
          }
          
          .greeting strong {
            color: #333333;
            font-weight: bold;
          }
          
          .otp-section {
            background: #f8f8f8;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 30px 25px;
            text-align: center;
            margin: 30px 0;
          }
          
          .otp-label {
            font-size: 14px;
            color: #666666;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            margin-bottom: 20px;
            font-weight: bold;
          }
          
          .otp-code {
            font-size: 42px;
            font-weight: bold;
            color: #CC0000;
            letter-spacing: 8px;
            font-family: Arial, sans-serif;
            background: #ffffff;
            padding: 20px 30px;
            border-radius: 6px;
            border: 1px solid #dddddd;
            display: inline-block;
            margin: 10px 0;
          }
          
          .expiry-notice {
            font-size: 14px;
            color: #666666;
            font-weight: normal;
            margin-top: 15px;
            font-style: italic;
          }
          
          .details-section {
            background: #f8f8f8;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 25px;
            margin: 30px 0;
          }
          
          .details-title {
            font-size: 15px;
            color: #333333;
            font-weight: bold;
            margin-bottom: 18px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .detail-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e8e8e8;
          }
          
          .detail-item:last-child {
            border-bottom: none;
          }
          
          .detail-label {
            color: #666666;
            font-weight: normal;
            font-size: 14px;
          }
          
          .detail-value {
            color: #333333;
            font-weight: bold;
            font-size: 14px;
          }
          
          .security-section {
            background: #f8f8f8;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 25px;
            margin: 30px 0;
          }
          
          .security-title {
            font-size: 15px;
            color: #333333;
            font-weight: bold;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .security-list {
            list-style: none;
            padding: 0;
          }
          
          .security-item {
            color: #666666;
            font-size: 14px;
            line-height: 1.6;
            padding: 6px 0;
            padding-left: 20px;
            position: relative;
          }
          
          .security-item::before {
            content: '•';
            color: #CC0000;
            font-weight: bold;
            position: absolute;
            left: 8px;
          }
          
          .footer {
            text-align: center;
            padding: 30px;
            background: #f8f8f8;
            border-top: 1px solid #e0e0e0;
          }
          
          .footer-text {
            color: #666666;
            font-size: 13px;
            line-height: 1.6;
            margin-bottom: 8px;
          }
          
          .contact-info {
            color: #666666;
            font-size: 13px;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
          }
          
          .institution-brand {
            color: #CC0000;
            font-weight: bold;
          }
          
          @media (max-width: 600px) {
            body {
              padding: 20px 15px;
            }
            
            .content {
              padding: 25px 20px;
            }
            
            .otp-code {
              font-size: 36px;
              letter-spacing: 6px;
              padding: 18px 25px;
            }
            
            .header {
              padding: 25px 20px;
            }
            
            .footer {
              padding: 25px 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <div class="institution-name">University of San Agustin</div>
            <div class="department-name">Learning Resource Center</div>
            <div class="email-title">Admin Portal Security Verification</div>
          </div>
          
          <!-- Content -->
          <div class="content">
            <div class="greeting">
              Hello <strong>${adminName}</strong>,<br>
              You are attempting to access the Learning Resource Center Admin Portal. Please use the following verification code to complete your authentication.
            </div>
            
            <!-- OTP Section -->
            <div class="otp-section">
              <div class="otp-label">Your Verification Code</div>
              <div class="otp-code">${otpCode}</div>
              <div class="expiry-notice">This code will expire in 10 minutes</div>
            </div>
            
            <!-- Login Details -->
            <div class="details-section">
              <div class="details-title">Authentication Details</div>
              <div class="detail-item">
                <span class="detail-label">Request Time:</span>
                <span class="detail-value">${formattedTime}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Administrator:</span>
                <span class="detail-value">${adminName}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">System Access:</span>
                <span class="detail-value">University of San Agustin – FLD Learning Resource Center Admin Portal</span>
              </div>
            </div>
            
            <!-- Security Notice -->
            <div class="security-section">
              <div class="security-title">Security Information</div>
              <ul class="security-list">
                <li class="security-item">This verification code is for authorized system access only.</li>
                <li class="security-item">Do not share this code with anyone.</li>
                <li class="security-item">Please ensure you are accessing the official University of San Agustin – FLD Learning Resource Center Admin Portal.</li>
              </ul>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="footer-text">
              This is an automated security message from the <span class="institution-brand">University of San Agustin – FLD Learning Resource Center Admin Portal</span>.
            </div>
            <div class="footer-text">
              Please do not forward or share this email.
            </div>
            
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
LEARNING RESOURCE CENTER - ADMIN VERIFICATION CODE

Hello ${adminName},

You are attempting to access the Learning Resource Center Admin Portal. Use the following verification code to complete your authentication:

VERIFICATION CODE: ${otpCode}
EXPIRES IN: 10 minutes

AUTHENTICATION DETAILS:
- Request Time: ${formattedTime}
- Administrator: ${adminName}
- System Access: Learning Resource Center Admin Portal

SECURITY INFORMATION:
- This verification code is valid for single use only
- Do not share this code with anyone
- Ensure you are accessing the official Learning Resource Center portal

This is an automated security message from the Learning Resource Center Admin System.

For assistance, contact: lrc-support@usa.edu.ph | +63 (033) 123-4567
    `;

    await sendEmail({
      to: email,
      subject: subject,
      text: text,
      html: html
    });

    console.log(`✅ Professional OTP email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send professional OTP email:", error);
    return false;
  }
};

// Controller functions
exports.registerAdmin = async (req, res) => {
  try {
    const { username, password, name, email } = req.body;
    if (!username || !password || !name || !email) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingAdmin = await Admin.findOne({ username: username.toLowerCase() });
    if (existingAdmin) {
      return res.status(409).json({ message: "Username already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = new Admin({
      username: username.toLowerCase(),
      password: hashedPassword,
      name,
      email,
    });

    await newAdmin.save();
    res.status(201).json({ message: "Admin account created successfully." });
  } catch (err) {
    console.error("Admin registration error:", err);
    res.status(500).json({ message: "Failed to create admin account." });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || "Unknown";
    
    // Find admin and include virtual field
    const admin = await Admin.findOne({ username: username.toLowerCase() });
    
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Check if account is locked
    if (admin.isLocked) {
      const remainingTime = Math.ceil((admin.lockUntil - Date.now()) / 1000 / 60);
      return res.status(423).json({ 
        message: `Account locked. Try again in ${remainingTime} minutes.`,
        locked: true,
        remainingTime 
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    
    if (!isMatch) {
      // Increment login attempts
      admin.loginAttempts += 1;
      
      // Lock account after 5 failed attempts for 5 minutes
      if (admin.loginAttempts >= 5) {
        admin.lockUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
        await admin.save();
        return res.status(423).json({ 
          message: "Account locked due to too many failed attempts. Try again in 5 minutes.",
          locked: true,
          remainingTime: 5
        });
      }
      
      await admin.save();
      const remainingAttempts = 5 - admin.loginAttempts;
      return res.status(401).json({ 
        message: `Invalid credentials. ${remainingAttempts} attempts remaining.`,
        remainingAttempts 
      });
    }

    // Reset login attempts on successful password verification
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;

    // Generate and send OTP
    const otpCode = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    admin.otp = {
      code: otpCode,
      expiresAt: otpExpires
    };

    await admin.save();

    // Send OTP to admin's email using actual email service
    const otpSent = await sendOTP(admin.email, otpCode, admin.name, new Date(), ipAddress);
    
    if (!otpSent) {
      // Clear OTP if email failed
      admin.otp = undefined;
      await admin.save();
      
      return res.status(500).json({ message: "Failed to send OTP. Please try again." });
    }

    res.status(200).json({
      message: "OTP sent to your email",
      requiresOTP: true,
      adminId: admin._id,
      email: admin.email // For display purposes only
    });

  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { adminId, otp } = req.body;
    
    if (!adminId || !otp) {
      return res.status(400).json({ message: "Admin ID and OTP are required." });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    // Check if OTP exists and is not expired
    if (!admin.otp || !admin.otp.code || admin.otp.expiresAt < Date.now()) {
      return res.status(401).json({ message: "OTP has expired. Please request a new one." });
    }

    // Verify OTP
    if (admin.otp.code !== otp) {
      return res.status(401).json({ message: "Invalid OTP." });
    }

    // Clear OTP after successful verification
    admin.otp = undefined;
    await admin.save();

    // Return admin data for login success
    res.status(200).json({
      message: "Login successful",
      admin: {
        _id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      },
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { adminId } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || "Unknown";
    
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    // Generate new OTP
    const otpCode = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    admin.otp = {
      code: otpCode,
      expiresAt: otpExpires
    };

    await admin.save();

    // Send new OTP using actual email service
    const otpSent = await sendOTP(admin.email, otpCode, admin.name, new Date(), ipAddress);
    
    if (!otpSent) {
      // Clear OTP if email failed
      admin.otp = undefined;
      await admin.save();
      
      return res.status(500).json({ message: "Failed to send OTP. Please try again." });
    }

    res.status(200).json({
      message: "New OTP sent to your email",
      email: admin.email
    });

  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getSummaryCounts = async (req, res) => {
  try {
    const reservations = await Reservation.countDocuments();
    const users = await User.countDocuments();

    res.status(200).json({ reservations, users });
  } catch (err) {
    console.error("Summary fetch error:", err);
    res.status(500).json({ message: "Failed to fetch summary counts." });
  }
};

exports.updateAdminProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, name, email } = req.body;

    if (!username || !name || !email) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingAdmin = await Admin.findOne({ 
      username: username.toLowerCase(), 
      _id: { $ne: id } 
    });
    
    if (existingAdmin) {
      return res.status(409).json({ message: "Username already exists." });
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      {
        username: username.toLowerCase(),
        name,
        email,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      admin: {
        _id: updatedAdmin._id,
        username: updatedAdmin.username,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
        createdAt: updatedAdmin.createdAt,
        updatedAt: updatedAdmin.updatedAt
      }
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Failed to update profile." });
  }
};

exports.updateAdminPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required." });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters long." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    admin.password = hashedPassword;
    admin.updatedAt = Date.now();
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (err) {
    console.error("Password update error:", err);
    res.status(500).json({ message: "Failed to update password." });
  }
};

exports.getSystemSettings = async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    
    if (!settings) {
      settings = new SystemSettings({
        emailNotifications: true,
        reservationAlerts: true,
        systemAlerts: true,
        autoBackup: true,
        backupFrequency: "daily",
        sessionTimeout: 30,
        twoFactorAuth: false,
        loginAlerts: true,
        passwordExpiry: 90,
        smtpServer: "",
        smtpPort: 587,
        senderEmail: ""
      });
      await settings.save();
    }

    res.status(200).json({
      success: true,
      settings
    });
  } catch (err) {
    console.error("Get system settings error:", err);
    res.status(500).json({ message: "Failed to fetch system settings." });
  }
};

exports.updateSystemSettings = async (req, res) => {
  try {
    const settingsData = req.body;

    let settings = await SystemSettings.findOne();
    
    if (!settings) {
      settings = new SystemSettings(settingsData);
    } else {
      Object.assign(settings, settingsData);
      settings.updatedAt = Date.now();
    }

    await settings.save();

    res.status(200).json({
      success: true,
      message: "System settings updated successfully",
      settings
    });
  } catch (err) {
    console.error("Update system settings error:", err);
    res.status(500).json({ message: "Failed to update system settings." });
  }
};