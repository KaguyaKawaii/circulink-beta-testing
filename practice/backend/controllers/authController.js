// controllers/authController.js
import User from "../models/User.js";
import Log from "../models/Log.js"; // ✅ ADDED Log import
import sendEmail from "../utils/sendEmail.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const tempUsers = new Map();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

export const signup = async (req, res) => {
  try {
    console.log('📝 Signup request received:', req.body);
    
    const { name, email, id_number, password, role, department, course, year_level } = req.body;

    // Validation
    if (!name || !email || !id_number || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields." 
      });
    }

    // Email validation
    if (!email.toLowerCase().endsWith("@usa.edu.ph")) {
      return res.status(400).json({ 
        success: false, 
        message: "Email must end with @usa.edu.ph" 
      });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 8 characters long." 
      });
    }

    // Check if user already exists in database
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { id_number }
      ]
    });
    
    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(409).json({ 
          success: false, 
          message: "Email already used." 
        });
      }
      if (existingUser.id_number === id_number) {
        return res.status(409).json({ 
          success: false, 
          message: "ID number already used." 
        });
      }
    }

    // Role-specific validation
    if (role === "Student" && (!course || !year_level)) {
      return res.status(400).json({ 
        success: false, 
        message: "Course and year level required for students." 
      });
    }

    // Generate OTP
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store in tempUsers Map (5 minutes expiry)
    tempUsers.set(email.toLowerCase(), {
      name,
      email: email.toLowerCase(),
      id_number,
      password, // Plain password - will be hashed when saved to DB
      role,
      department: department || 'N/A',
      course: course || "N/A",
      year_level: role === "Student" ? year_level : "N/A",
      otp,
      otpExpiry,
      createdAt: Date.now(),
    });

    // Send OTP email
    const otpEmailTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; border-bottom: 2px solid #CC0000; padding-bottom: 20px;">
        <h2 style="color: #000000; margin-bottom: 5px;">USA-FLD LRC</h2>
        <p style="color: #666666;">One-Time Password Verification</p>
      </div>
      
      <div style="padding: 20px 0;">
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your OTP for registration is:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="font-size: 36px; font-weight: bold; color: #cc0000; letter-spacing: 5px; margin: 15px 0;">
            ${otp}
          </div>
          <p style="color: #666666; font-size: 14px;">Expires in 5 minutes</p>
        </div>
        
        <p style="color: #666666; font-size: 14px;">
          Enter this code on the verification page to complete your registration.
        </p>
      </div>
      
      <div style="border-top: 1px solid #eeeeee; padding-top: 20px; text-align: center; color: #999999; font-size: 12px;">
        <p>University of San Agustin - FLD Learning Resource Center</p>
      </div>
    </div>
    `;

    try {
      await sendEmail({
        to: "stephenpatingomadero@gmail.com",
        subject: "Your OTP for USA-FLD LRC Registration",
        html: otpEmailTemplate,
      });
      console.log('✅ OTP email sent to:', email);
    } catch (emailError) {
      console.error('❌ Failed to send OTP email:', emailError);
      // Don't fail signup if email fails, but inform the user
      return res.status(500).json({ 
        success: false, 
        message: "Failed to send OTP email. Please try again." 
      });
    }

    res.status(200).json({ 
      success: true,
      message: "OTP sent to your email." 
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error during signup." 
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ 
        success: false,
        message: "Email and OTP are required." 
      });
    }

    const tempUser = tempUsers.get(email.toLowerCase());

    if (!tempUser) {
      return res.status(400).json({ 
        success: false,
        message: "No signup session found. Please register again." 
      });
    }

    // Check OTP
    if (tempUser.otp !== otp) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid OTP." 
      });
    }

    // Check expiry
    const now = Date.now();
    if (now - tempUser.createdAt > 5 * 60 * 1000) {
      tempUsers.delete(email.toLowerCase());
      return res.status(400).json({ 
        success: false,
        message: "OTP expired. Please register again." 
      });
    }

    // Create new user in database
    const newUser = new User({
      name: tempUser.name,
      email: tempUser.email,
      id_number: tempUser.id_number,
      password: tempUser.password, // Will be hashed by pre-save hook
      role: tempUser.role,
      department: tempUser.department,
      course: tempUser.course,
      year_level: tempUser.year_level,
      verified: true, // User is verified after OTP
      lastLogin: new Date()
    });

    await newUser.save();
    console.log('✅ User saved to database:', newUser.email);
    
    // ✅ ADDED: Log user registration with userAgent
    await Log.create({
      userId: newUser._id,
      id_number: newUser.id_number,
      userName: newUser.name,
      action: "user_registered",
      details: "New user registered and verified",
      userAgent: req.headers['user-agent'] || '' // ADDED
    });
    
    // Clean up temp storage
    tempUsers.delete(email.toLowerCase());

    // Generate token
    const token = generateToken(newUser._id);

    // Send welcome email (optional - don't fail if this fails)
    try {
      const welcomeEmailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #CC0000; padding-bottom: 20px;">
          <h2 style="color: #000000; margin-bottom: 5px;">Welcome to USA-FLD LRC</h2>
          <p style="color: #666666;">Registration Successful</p>
        </div>
        
        <div style="padding: 20px 0;">
          <p>Dear <strong>${tempUser.name}</strong>,</p>
          <p>Your account has been successfully created and verified.</p>
          
          <div style="background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 5px 0;"><strong>Name:</strong> ${tempUser.name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${tempUser.email}</p>
            <p style="margin: 5px 0;"><strong>Role:</strong> ${tempUser.role}</p>
            <p style="margin: 5px 0;"><strong>Department:</strong> ${tempUser.department}</p>
            ${tempUser.role === 'Student' ? `
            <p style="margin: 5px 0;"><strong>Course:</strong> ${tempUser.course}</p>
            <p style="margin: 5px 0;"><strong>Year Level:</strong> ${tempUser.year_level}</p>
            ` : ''}
          </div>
          
        </div>
        
        <div style="border-top: 1px solid #eeeeee; padding-top: 20px; text-align: center; color: #999999; font-size: 12px;">
          <p>University of San Agustin - FLD Learning Resource Center</p>
        </div>
      </div>
      `;

      await sendEmail({
        to: email,
        subject: "Welcome to USA-FLD Learning Resource Center!",
        html: welcomeEmailTemplate,
      });
    } catch (emailError) {
      console.error('❌ Failed to send welcome email:', emailError);
      // Don't fail verification if welcome email fails
    }

    // Return user data without password
    const userResponse = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      id_number: newUser.id_number,
      role: newUser.role,
      department: newUser.department,
      course: newUser.course,
      year_level: newUser.year_level,
      verified: newUser.verified
    };

    res.status(201).json({ 
      success: true,
      message: "User registered successfully.",
      user: userResponse,
      token
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ 
      success: false,
      message: "OTP verification failed." 
    });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: "Email is required." 
      });
    }

    const tempUser = tempUsers.get(email.toLowerCase());

    if (!tempUser) {
      return res.status(400).json({ 
        success: false,
        message: "No signup session found. Please register again." 
      });
    }

    const newOtp = generateOtp();
    tempUser.otp = newOtp;
    tempUser.createdAt = Date.now();

    const resendOtpTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; border-bottom: 2px solid #CC0000; padding-bottom: 20px;">
        <h2 style="color: #000000; margin-bottom: 5px;">USA-FLD LRC</h2>
        <p style="color: #666666;">New OTP Request</p>
      </div>
      
      <div style="padding: 20px 0;">
        <p>Hello <strong>${tempUser.name}</strong>,</p>
        <p>Your new OTP is:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="font-size: 36px; font-weight: bold; color: #cc0000; letter-spacing: 5px; margin: 15px 0;">
            ${newOtp}
          </div>
          <p style="color: #666666; font-size: 14px;">Expires in 5 minutes</p>
        </div>
        
        <p style="color: #666666; font-size: 14px;">
          Use this new code to complete your registration.
        </p>
      </div>
      
      <div style="border-top: 1px solid #eeeeee; padding-top: 20px; text-align: center; color: #999999; font-size: 12px;">
        <p>University of San Agustin - FLD Learning Resource Center</p>
      </div>
    </div>
    `;

    await sendEmail({
      to: email,
      subject: "Your New OTP for USA-FLD LRC Registration",
      html: resendOtpTemplate,
    });

    res.status(200).json({ 
      success: true,
      message: "OTP resent successfully." 
    });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to resend OTP." 
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Email and password are required." 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials." 
      });
    }

    // Check if account is suspended
    if (user.suspended) {
      return res.status(403).json({ 
        success: false,
        message: "Your account has been suspended. Please contact administrator." 
      });
    }

    // Check if account is verified
    if (!user.verified) {
      return res.status(403).json({ 
        success: false,
        message: "Please verify your email first." 
      });
    }

    // Check password using the model method
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // ✅ ADDED: Log failed login attempt with userAgent
      await Log.create({
        id_number: email,
        action: "login_failed",
        details: `Failed login attempt for email: ${email}`,
        userAgent: req.headers['user-agent'] || '' // ADDED
      });
      
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials." 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // ✅ ADDED: Log successful login with userAgent
    await Log.create({
      userId: user._id,
      id_number: user.id_number,
      userName: user.name,
      action: "login",
      details: "User logged in successfully",
      userAgent: req.headers['user-agent'] || '' // ADDED
    });

    // Generate token
    const token = generateToken(user._id);

    // Return user without password
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      id_number: user.id_number,
      role: user.role,
      department: user.department,
      course: user.course,
      year_level: user.year_level,
      verified: user.verified,
      profilePicture: user.profilePicture
    };

    res.json({
      success: true,
      message: "Login successful.",
      user: userResponse,
      token
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error during login." 
    });
  }
};

export const logout = async (req, res) => {
  try {
    // ✅ ADDED: Log logout if user is authenticated with userAgent
    if (req.user) {
      await Log.create({
        userId: req.user._id,
        id_number: req.user.id_number,
        userName: req.user.name,
        action: "logout",
        details: "User logged out",
        userAgent: req.headers['user-agent'] || '' // ADDED
      });
    }
    
    res.json({ 
      success: true,
      message: "Logged out successfully." 
    });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error during logout." 
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    // This would need authentication middleware
    // For now, return a placeholder
    res.status(501).json({ 
      success: false,
      message: "Not implemented yet." 
    });
  } catch (err) {
    console.error("Get current user error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error." 
    });
  }
};

export const checkSession = async (req, res) => {
  try {
    // This would need authentication middleware
    res.status(501).json({ 
      success: false,
      message: "Not implemented yet." 
    });
  } catch (err) {
    console.error("Check session error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error." 
    });
  }
};