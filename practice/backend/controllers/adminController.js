import Admin from "../models/Admin.js";

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Reservation = require("../models/Reservation");
const User = require("../models/User");
const SystemSettings = require("../models/SystemSettings");
const sendEmail = require("../utils/sendEmail");
const mongoose = require("mongoose"); // Add this for debugging

// Helper function to generate OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Helper function to send OTP with better error handling
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
            font-family: monospace;
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
                <span class="detail-value">Learning Resource Center Admin Portal</span>
              </div>
            </div>
            
            <!-- Security Notice -->
            <div class="security-section">
              <div class="security-title">Security Information</div>
              <ul class="security-list">
                <li class="security-item">This verification code is for authorized system access only.</li>
                <li class="security-item">Do not share this code with anyone.</li>
                <li class="security-item">Please ensure you are accessing the official Learning Resource Center Admin Portal.</li>
              </ul>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="footer-text">
              This is an automated security message from the <span class="institution-brand">Learning Resource Center Admin Portal</span>.
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
    `;

    await sendEmail({
      to: email,
      subject: subject,
      text: text,
      html: html
    });

    console.log(`✅ OTP email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error);
    // For development/testing, log the OTP to console
    console.log(`🔐 DEVELOPMENT MODE - OTP for ${email}: ${otpCode}`);
    return false;
  }
};

// Controller functions
exports.registerAdmin = async (req, res) => {
  try {
    const { id_number, username, password, name, email } = req.body;
    
    // Validate required fields
    if (!id_number || !username || !password || !name || !email) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required (id_number, username, password, name, email)." 
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ 
      $or: [
        { username: username.toLowerCase() },
        { id_number: id_number }
      ]
    });
    
    if (existingAdmin) {
      if (existingAdmin.username === username.toLowerCase()) {
        return res.status(409).json({ 
          success: false,
          message: "Username already exists." 
        });
      }
      if (existingAdmin.id_number === id_number) {
        return res.status(409).json({ 
          success: false,
          message: "ID number already exists." 
        });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin
    const newAdmin = new Admin({
      id_number,
      username: username.toLowerCase(),
      password: hashedPassword,
      name,
      email: email.toLowerCase(),
      role: "admin",
      loginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newAdmin.save();

    // Return success without sensitive data
    res.status(201).json({ 
      success: true,
      message: "Admin account created successfully.",
      admin: {
        id: newAdmin._id,
        id_number: newAdmin.id_number,
        username: newAdmin.username,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role
      }
    });
  } catch (err) {
    console.error("Admin registration error:", err);
    
    // Handle duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({ 
        success: false,
        message: `${field} already exists.` 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Failed to create admin account. Please try again.",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// FIXED: Enhanced login with better error handling and debugging
exports.loginAdmin = async (req, res) => {
  try {
    console.log("=".repeat(50));
    console.log("🔐 ADMIN LOGIN ATTEMPT");
    console.log("=".repeat(50));
    
    const { username, password } = req.body;
    
    // Log request details
    console.log("📝 Request received:");
    console.log("  - Username/ID:", username);
    console.log("  - Password provided:", password ? "Yes" : "No");
    
    // Validate input
    if (!username || !password) {
      console.log("❌ Missing credentials");
      return res.status(400).json({ 
        success: false,
        message: "Username and password are required." 
      });
    }

    // Check database connection
    console.log("🔍 Checking database connection...");
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting"
    };
    console.log(`  - Database state: ${dbStates[dbState]} (${dbState})`);
    
    if (dbState !== 1) {
      console.error("❌ Database not connected");
      return res.status(500).json({ 
        success: false,
        message: "Database connection error. Please try again later." 
      });
    }

    // Find admin by username or id_number
    console.log("🔍 Searching for admin...");
    console.log("  - Query:", { 
      $or: [
        { username: username.toLowerCase() },
        { id_number: username }
      ]
    });
    
    let admin;
    try {
      admin = await Admin.findOne({ 
        $or: [
          { username: username.toLowerCase() },
          { id_number: username }
        ]
      });
    } catch (dbError) {
      console.error("❌ Database query error:", dbError);
      return res.status(500).json({ 
        success: false,
        message: "Database query error. Please try again." 
      });
    }
    
    console.log("  - Admin found:", admin ? "Yes" : "No");
    
    if (!admin) {
      console.log("❌ No admin found with username/ID:", username);
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials." 
      });
    }

    // Log admin details
    console.log("👤 Admin details:");
    console.log("  - ID:", admin._id);
    console.log("  - Username:", admin.username);
    console.log("  - ID Number:", admin.id_number);
    console.log("  - Name:", admin.name);
    console.log("  - Email:", admin.email);
    console.log("  - Role:", admin.role);
    console.log("  - Login attempts:", admin.loginAttempts);
    console.log("  - Lock until:", admin.lockUntil || "Not locked");
    console.log("  - Has OTP:", admin.otp ? "Yes" : "No");

    // Check if account is locked - FIXED: Handle case when lockUntil is undefined
    const isLocked = admin.lockUntil && admin.lockUntil > Date.now();
    console.log("  - Is locked:", isLocked ? "Yes" : "No");
    
    if (isLocked) {
      const remainingTime = Math.ceil((admin.lockUntil - Date.now()) / 1000 / 60);
      console.log("🔒 Account is locked. Remaining time:", remainingTime, "minutes");
      return res.status(423).json({ 
        success: false,
        message: `Account locked. Try again in ${remainingTime} minutes.`,
        locked: true,
        remainingTime 
      });
    }

    // Verify password
    console.log("🔑 Verifying password...");
    let isMatch;
    try {
      isMatch = await bcrypt.compare(password, admin.password);
    } catch (bcryptError) {
      console.error("❌ bcrypt compare error:", bcryptError);
      return res.status(500).json({ 
        success: false,
        message: "Password verification error. Please try again." 
      });
    }
    
    console.log("  - Password match:", isMatch ? "Yes" : "No");
    
    if (!isMatch) {
      // Increment login attempts
      admin.loginAttempts = (admin.loginAttempts || 0) + 1;
      console.log("⚠️ Failed login attempt. Attempts:", admin.loginAttempts);
      
      // Lock account after 5 failed attempts for 15 minutes
      if (admin.loginAttempts >= 5) {
        admin.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        console.log("🔒 Account locked until:", admin.lockUntil.toLocaleString());
        await admin.save();
        return res.status(423).json({ 
          success: false,
          message: "Account locked due to too many failed attempts. Try again in 15 minutes.",
          locked: true,
          remainingTime: 15
        });
      }
      
      await admin.save();
      const remainingAttempts = 5 - admin.loginAttempts;
      return res.status(401).json({ 
        success: false,
        message: `Invalid credentials. ${remainingAttempts} attempts remaining.`,
        remainingAttempts 
      });
    }

    // Reset login attempts on successful password verification
    console.log("✅ Password verified successfully. Resetting login attempts.");
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;

    // Generate and send OTP
    console.log("🔢 Generating OTP...");
    const otpCode = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    console.log("  - OTP expires at:", otpExpires.toLocaleString());

    admin.otp = {
      code: otpCode,
      expiresAt: otpExpires,
      attempts: 0
    };

    console.log("💾 Saving admin with OTP...");
    try {
      await admin.save();
      console.log("✅ Admin saved successfully");
    } catch (saveError) {
      console.error("❌ Error saving admin:", saveError);
      return res.status(500).json({ 
        success: false,
        message: "Error saving OTP. Please try again." 
      });
    }

    // Try to send OTP via email
    console.log("📧 Sending OTP email to:", admin.email);
    const otpSent = await sendOTP(admin.email, otpCode, admin.name, new Date());
    console.log("  - OTP sent successfully:", otpSent ? "Yes" : "No");
    
    // Check environment
    const isDevelopment = process.env.NODE_ENV === 'development';
    console.log("  - Environment:", isDevelopment ? "Development" : "Production");

    // Return success response
    const response = {
      success: true,
      message: otpSent ? "OTP sent to your email" : "OTP generated (check server console)",
      requiresOTP: true,
      adminId: admin._id,
      email: admin.email
    };

    // Only include OTP in development mode
    if (isDevelopment) {
      response.devOTP = otpCode;
      console.log(`🔐 DEVELOPMENT MODE - OTP for ${admin.email}: ${otpCode}`);
    } else {
      // In production, still log OTP to server console for debugging
      console.log(`🔐 PRODUCTION - OTP for ${admin.email}: ${otpCode}`);
    }

    console.log("✅ Login successful, OTP required");
    console.log("=".repeat(50));
    
    res.status(200).json(response);

  } catch (err) {
    console.error("=".repeat(50));
    console.error("❌ ADMIN LOGIN ERROR");
    console.error("=".repeat(50));
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    console.error("=".repeat(50));
    
    res.status(500).json({ 
      success: false,
      message: "Server error during login. Please try again.",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { adminId, otp } = req.body;
    
    if (!adminId || !otp) {
      return res.status(400).json({ 
        success: false,
        message: "Admin ID and OTP are required." 
      });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ 
        success: false,
        message: "Admin not found." 
      });
    }

    // Check if OTP exists
    if (!admin.otp || !admin.otp.code) {
      return res.status(401).json({ 
        success: false,
        message: "No OTP found. Please request a new one." 
      });
    }

    // Check if OTP is expired
    if (admin.otp.expiresAt < new Date()) {
      admin.otp = undefined;
      await admin.save();
      return res.status(401).json({ 
        success: false,
        message: "OTP has expired. Please request a new one." 
      });
    }

    // Track OTP attempts
    admin.otp.attempts = (admin.otp.attempts || 0) + 1;

    // Lock after 3 failed OTP attempts
    if (admin.otp.attempts >= 3) {
      admin.otp = undefined;
      admin.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      await admin.save();
      return res.status(423).json({ 
        success: false,
        message: "Too many invalid OTP attempts. Account locked for 30 minutes.",
        locked: true
      });
    }

    // Verify OTP
    if (admin.otp.code !== otp) {
      await admin.save();
      return res.status(401).json({ 
        success: false,
        message: `Invalid OTP. ${3 - admin.otp.attempts} attempts remaining.` 
      });
    }

    // Clear OTP after successful verification
    admin.otp = undefined;
    admin.loginAttempts = 0;
    await admin.save();

    // Return admin data for login success
    res.status(200).json({
      success: true,
      message: "Login successful",
      admin: {
        _id: admin._id,
        id_number: admin.id_number,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      }
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error during OTP verification." 
    });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { adminId } = req.body;
    
    if (!adminId) {
      return res.status(400).json({ 
        success: false,
        message: "Admin ID is required." 
      });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ 
        success: false,
        message: "Admin not found." 
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      const remainingTime = Math.ceil((admin.lockUntil - Date.now()) / 1000 / 60);
      return res.status(423).json({ 
        success: false,
        message: `Account locked. Try again in ${remainingTime} minutes.`,
        locked: true,
        remainingTime 
      });
    }

    // Generate new OTP
    const otpCode = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    admin.otp = {
      code: otpCode,
      expiresAt: otpExpires,
      attempts: 0
    };

    await admin.save();

    // Send new OTP
    const otpSent = await sendOTP(admin.email, otpCode, admin.name, new Date());
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!otpSent && !isDevelopment) {
      admin.otp = undefined;
      await admin.save();
      
      return res.status(500).json({ 
        success: false,
        message: "Failed to send OTP. Please try again.",
        error: "EMAIL_SEND_FAILED"
      });
    }

    const response = {
      success: true,
      message: otpSent ? "New OTP sent to your email" : "New OTP generated (development mode)",
      email: admin.email
    };

    if (isDevelopment) {
      response.devOTP = otpCode;
    }

    res.status(200).json(response);

  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error during OTP resend." 
    });
  }
};

exports.getSummaryCounts = async (req, res) => {
  try {
    const reservations = await Reservation.countDocuments();
    const users = await User.countDocuments();

    res.status(200).json({ 
      success: true,
      reservations, 
      users 
    });
  } catch (err) {
    console.error("Summary fetch error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch summary counts." 
    });
  }
};

exports.updateAdminProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, name, email } = req.body;

    if (!username || !name || !email) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required." 
      });
    }

    const existingAdmin = await Admin.findOne({ 
      username: username.toLowerCase(), 
      _id: { $ne: id } 
    });
    
    if (existingAdmin) {
      return res.status(409).json({ 
        success: false,
        message: "Username already exists." 
      });
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      {
        username: username.toLowerCase(),
        name,
        email: email.toLowerCase(),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-password -otp');

    if (!updatedAdmin) {
      return res.status(404).json({ 
        success: false,
        message: "Admin not found." 
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      admin: updatedAdmin
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to update profile." 
    });
  }
};

exports.updateAdminPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: "Current password and new password are required." 
      });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ 
        success: false,
        message: "Admin not found." 
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: "Current password is incorrect." 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false,
        message: "New password must be at least 8 characters long." 
      });
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return res.status(400).json({ 
        success: false,
        message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character." 
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    admin.password = hashedPassword;
    admin.updatedAt = new Date();
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (err) {
    console.error("Password update error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to update password." 
    });
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
        sessionTimeout: 30,
        twoFactorAuth: true,
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
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch system settings." 
    });
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
      settings.updatedAt = new Date();
    }

    await settings.save();

    res.status(200).json({
      success: true,
      message: "System settings updated successfully",
      settings
    });
  } catch (err) {
    console.error("Update system settings error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to update system settings." 
    });
  }
};