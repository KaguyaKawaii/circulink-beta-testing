const User = require("../models/User");
const userService = require("../services/userService");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Check if user is verified
    if (!user.verified) {
      return res.status(401).json({ message: "Please verify your email first." });
    }

    // Check if user is suspended
    if (user.suspended) {
      return res.status(401).json({ message: "Account is suspended. Please contact administrator." });
    }

    // ✅ NEW: Check if user is already logged in elsewhere
    if (user.isLoggedIn) {
      return res.status(409).json({ 
        message: "User is already logged in another browser. Please log out from other device first.",
        isLoggedIn: true 
      });
    }

    // Check password using your existing userService
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    // ✅ NEW: Update session info - mark user as logged in
    user.isLoggedIn = true;
    user.currentSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    user.lastLogin = new Date();
    await user.save();

    // Return user data (without password)
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      id_number: user.id_number,
      role: user.role,
      department: user.department,
      course: user.course,
      year_level: user.year_level,
      profilePicture: user.profilePicture,
      verified: user.verified,
      // ✅ NEW: Include session info
      isLoggedIn: user.isLoggedIn,
      currentSessionId: user.currentSessionId,
      lastLogin: user.lastLogin
    };

    res.json({
      message: "Login successful",
      token,
      user: userResponse
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Find admin (adjust roles based on your admin roles)
    const admin = await User.findOne({ 
      email: email.toLowerCase(),
      role: { $in: ["Admin", "Staff", "Staff_Office", "Faculty"] } // Adjust based on your admin roles
    });
    
    if (!admin) {
      return res.status(401).json({ message: "Invalid admin credentials." });
    }

    // ✅ NEW: Check if admin is already logged in elsewhere
    if (admin.isLoggedIn) {
      return res.status(409).json({ 
        message: "Admin is already logged in another browser. Please log out from other device first.",
        isLoggedIn: true 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: admin._id, 
        email: admin.email,
        role: admin.role 
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    // ✅ NEW: Update session info
    admin.isLoggedIn = true;
    admin.currentSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    admin.lastLogin = new Date();
    await admin.save();

    // Return admin data
    const adminResponse = {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      department: admin.department,
      isLoggedIn: admin.isLoggedIn,
      currentSessionId: admin.currentSessionId,
      lastLogin: admin.lastLogin
    };

    res.json({
      message: "Admin login successful",
      token,
      user: adminResponse
    });

  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Server error during admin login." });
  }
};

exports.logout = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isLoggedIn: false,
        currentSessionId: null
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Logout successful", success: true });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Server error during logout." });
  }
};

// ✅ NEW: Force logout (for when admin needs to log out a user)
exports.forceLogout = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isLoggedIn: false,
        currentSessionId: null
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User force logged out successfully", success: true });
  } catch (err) {
    console.error("Force logout error:", err);
    res.status(500).json({ message: "Server error during force logout." });
  }
};