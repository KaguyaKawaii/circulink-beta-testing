// userController.js
import mongoose from "mongoose";
import * as userService from "../services/userService.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import Log from "../models/Log.js"; // Add this import
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';

// ✅ FIXED: Ensure Cloudinary is properly configured
try {
  if (process.env.CLOUDINARY_CLOUD_NAME && !cloudinary.config().cloud_name) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    console.log("✅ Cloudinary configured in userController");
  }
} catch (error) {
  console.error("❌ Cloudinary configuration error:", error);
}

// Helper function to create activity logs
const createActivityLog = async (userId, idNumber, userName, action, details = "") => {
  try {
    const log = new Log({
      userId,
      id_number: idNumber,
      userName,
      action,
      details
    });
    await log.save();
    console.log(`✅ Activity log created: ${action} - ${userName}`);
  } catch (error) {
    console.error("❌ Failed to create activity log:", error);
  }
};

// Helper function to generate session token
const generateSessionToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// 📌 Fetch users by role (used in AdminReports for staff assignment)
export const getUsersByRole = async (req, res) => {
  try {
    const query = {};
    if (req.query.role) {
      query.role = req.query.role;
    }
    const users = await User.find(query).select("-password -sessionToken");
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        "view users by role",
        `Viewed ${req.query.role || 'all'} users`
      );
    }
    
    res.json({ success: true, users });
  } catch (err) {
    console.error("Get Users By Role Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

// 📌 Add User (Admin)
export const addUser = async (req, res) => {
  try {
    const newUser = await userService.addUser(req.body, req.file);
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        "add user",
        `Added new user: ${newUser.name} (${newUser.role})`
      );
    }
    
    res.status(201).json({ success: true, message: "User added successfully.", user: newUser });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Failed to add user." });
  }
};

// 📌 Signup - FIXED: Ensure users are created as unverified
export const signup = async (req, res) => {
  try {
    // CRITICAL FIX: Remove verified from request body if it exists
    // This ensures users cannot set themselves as verified
    if (req.body.verified) {
      delete req.body.verified;
    }
    
    const newUser = await userService.signup(req.body, req.file);
    
    // Log activity
    await createActivityLog(
      newUser._id,
      newUser.id_number,
      newUser.name,
      "sign up",
      "New account created (pending verification)"
    );
    
    res.status(201).json({ 
      success: true, 
      message: "User registered successfully. Please wait for account verification.", 
      user: newUser 
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Failed to signup." });
  }
};

// 📌 Login
export const login = async (req, res) => {
  try {
    console.log("=== LOGIN ATTEMPT ===");
    console.log("Request body:", req.body);
    
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      console.log("❌ Missing credentials:", { email: !!email, password: !!password });
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log("User found:", user ? "Yes" : "No");
    
    if (!user) {
      console.log("❌ User not found with email:", email);
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials." 
      });
    }

    // Log user details
    console.log("User details:", {
      id: user._id,
      name: user.name,
      email: user.email,
      id_number: user.id_number,
      role: user.role,
      archived: user.archived,
      suspended: user.suspended,
      verified: user.verified,
      hasPassword: !!user.password
    });

    // Check if user is verified
    if (!user.verified) {
      console.log("❌ User is not verified");
      return res.status(403).json({ 
        success: false, 
        message: "Account is not verified. Please wait for admin verification." 
      });
    }

    // Check if user is archived
    if (user.archived) {
      console.log("❌ User is archived");
      return res.status(403).json({ 
        success: false, 
        message: "Account is archived. Please contact administrator." 
      });
    }

    // Check if user is suspended
    if (user.suspended) {
      console.log("❌ User is suspended");
      return res.status(403).json({ 
        success: false, 
        message: "Account is suspended. Please contact administrator." 
      });
    }

    // Verify password
    console.log("Verifying password...");
    const isPasswordValid = await user.comparePassword(password);
    console.log("Password valid:", isPasswordValid);
    
    if (!isPasswordValid) {
      // Log failed login attempt
      await createActivityLog(
        user._id,
        user.id_number,
        user.name,
        "login failed",
        "Incorrect password"
      );
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials." 
      });
    }

    // Store the previous session token before generating new one
    const previousSessionToken = user.sessionToken;

    // Generate new session token
    const sessionToken = generateSessionToken();
    
    // Update user with new session token
    user.sessionToken = sessionToken;
    user.lastLogin = new Date();
    user.isLoggedIn = true;
    await user.save();
    
    console.log("✅ Login successful for:", user.name);
    console.log("Session token generated:", sessionToken.substring(0, 10) + "...");

    // Log successful login
    await createActivityLog(
      user._id,
      user.id_number,
      user.name,
      "login",
      "Logged in successfully"
    );

    // Remove sensitive data
    const userData = user.toObject();
    delete userData.password;
    delete userData.sessionToken;

    // If there's an existing session, notify it to logout
    const io = req.io || null;
    if (io && previousSessionToken) {
      try {
        io.to(previousSessionToken).emit('force-logout', {
          message: 'You have been logged out because another device logged in.',
          timestamp: new Date().toISOString()
        });
        console.log(`✅ Force logout notification sent for previous session`);
        
        await createActivityLog(
          user._id,
          user.id_number,
          user.name,
          "session replaced",
          "Logged out from other device due to new login"
        );
      } catch (socketError) {
        console.error("Socket notification error:", socketError);
      }
    }

    res.json({ 
      success: true, 
      message: "Login successful.", 
      user: userData,
      sessionToken: sessionToken
    });
    
  } catch (err) {
    console.error("❌ Login Error:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      success: false, 
      message: "Server error during login. Please try again." 
    });
  }
};

// 📌 Logout
export const logout = async (req, res) => {
  try {
    const { userId } = req.params;
    const { sessionToken } = req.body;

    const user = await User.findById(userId);
    if (user && user.sessionToken === sessionToken) {
      // Log before clearing session
      await createActivityLog(
        user._id,
        user.id_number,
        user.name,
        "logout",
        "Logged out successfully"
      );
      
      user.sessionToken = null;
      user.isLoggedIn = false;
      await user.save();
      
      console.log(`✅ User ${userId} logged out successfully`);
    }

    res.json({ success: true, message: "Logged out successfully." });
  } catch (err) {
    console.error("Logout Error:", err);
    res.status(500).json({ success: false, message: "Failed to logout." });
  }
};

// 📌 Validate Session
export const validateSession = async (req, res) => {
  try {
    const { userId, sessionToken } = req.body;

    if (!userId || !sessionToken) {
      return res.json({ 
        valid: false, 
        message: "User ID and session token are required" 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ 
        valid: false, 
        message: "User not found" 
      });
    }

    // Check if user is archived or suspended
    if (user.archived) {
      return res.json({ 
        valid: false, 
        message: "Account has been archived" 
      });
    }

    if (user.suspended) {
      return res.json({ 
        valid: false, 
        message: "Account has been suspended" 
      });
    }

    // Check if user is verified
    if (!user.verified) {
      return res.json({ 
        valid: false, 
        message: "Account is not verified" 
      });
    }

    // Check if session token matches
    if (user.sessionToken !== sessionToken) {
      return res.json({ 
        valid: false, 
        message: "Session expired. You have been logged in from another device."
      });
    }

    res.json({ 
      valid: true, 
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
        verified: user.verified,
        email: user.email,
        id_number: user.id_number,
        profilePicture: user.profilePicture
      }
    });
  } catch (err) {
    console.error("Session Validation Error:", err);
    res.status(500).json({ 
      valid: false, 
      message: "Failed to validate session" 
    });
  }
};

// 📌 Update Profile (Self)
export const updateProfile = async (req, res) => {
  try {
    const updatedUser = await userService.updateProfile(req.params.id, req.body);
    
    // Log activity
    const user = await User.findById(req.params.id);
    if (user) {
      await createActivityLog(
        user._id,
        user.id_number,
        user.name,
        "update profile",
        "Updated profile information"
      );
    }
    
    res.json({ success: true, message: "Profile updated successfully.", user: updatedUser });
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to update profile." });
  }
};

// 📌 Upload Profile Picture
export const uploadPicture = async (req, res) => {
  try {
    console.log("=== UPLOAD DEBUG ===");
    console.log("User ID:", req.params.id);
    console.log("File received:", !!req.file);
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    console.log("File details:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      hasBuffer: !!req.file.buffer
    });

    if (!cloudinary) {
      throw new Error("Cloudinary not configured properly");
    }

    const config = cloudinary.config();
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      console.error("Cloudinary config missing:", {
        cloud_name: !!config.cloud_name,
        api_key: !!config.api_key,
        api_secret: !!config.api_secret
      });
      throw new Error("Cloudinary configuration is incomplete. Please check your environment variables.");
    }

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    console.log("Uploading to Cloudinary...");
    console.log("Cloudinary config check:", {
      cloud_name: config.cloud_name ? "✓" : "✗",
      api_key: config.api_key ? "✓" : "✗",
      api_secret: config.api_secret ? "✓" : "✗"
    });

    let cloudinaryResult;
    try {
      cloudinaryResult = await cloudinary.uploader.upload(dataURI, {
        folder: 'profile-pictures',
        public_id: `user-${req.params.id}-${Date.now()}`,
        overwrite: true,
        transformation: [
          { width: 512, height: 512, crop: 'fill', gravity: 'face' },
          { quality: 'auto:good' }
        ]
      });
    } catch (cloudinaryError) {
      console.error("Cloudinary upload error:", cloudinaryError);
      throw new Error(`Cloudinary upload failed: ${cloudinaryError.message}`);
    }

    console.log("Cloudinary upload successful:", cloudinaryResult.secure_url);

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { profilePicture: cloudinaryResult.secure_url },
      { new: true }
    ).select('-password -sessionToken');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Log activity
    await createActivityLog(
      updatedUser._id,
      updatedUser.id_number,
      updatedUser.name,
      "upload picture",
      "Updated profile picture"
    );

    res.json({ 
      success: true, 
      message: "Profile picture updated successfully.", 
      user: updatedUser,
      imageUrl: cloudinaryResult.secure_url
    });

  } catch (err) {
    console.error("=== UPLOAD ERROR ===");
    console.error("Upload Picture Error:", err);
    
    let errorMessage = "Failed to upload picture.";
    if (err.message.includes("Cloudinary")) {
      errorMessage = err.message;
    } else if (err.message.includes("configuration")) {
      errorMessage = "Image upload service is not properly configured. Please contact administrator.";
    }
    
    res.status(400).json({ 
      success: false, 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 📌 Remove Profile Picture
export const removePicture = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.profilePicture && user.profilePicture.includes('cloudinary')) {
      try {
        const urlParts = user.profilePicture.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0];
        
        const fullPublicId = `profile-pictures/${publicId}`;
        await cloudinary.uploader.destroy(fullPublicId);
        console.log("Deleted from Cloudinary:", fullPublicId);
      } catch (cloudinaryError) {
        console.error("Error deleting from Cloudinary:", cloudinaryError);
      }
    }

    user.profilePicture = null;
    await user.save();

    // Log activity
    await createActivityLog(
      user._id,
      user.id_number,
      user.name,
      "remove picture",
      "Removed profile picture"
    );

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.sessionToken;

    res.json({ 
      success: true, 
      message: "Profile picture removed successfully.", 
      user: userResponse
    });
  } catch (err) {
    console.error("Remove Picture Error:", err);
    res.status(400).json({ 
      success: false, 
      message: err.message || "Failed to remove picture." 
    });
  }
};

// 📌 Change Password
export const changePassword = async (req, res) => {
  try {
    console.log("=== PASSWORD CHANGE CONTROLLER ===");
    console.log("User ID:", req.params.id);
    console.log("Request body:", req.body);
    
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Old and new passwords are required." });
    }
    
    console.log("Old password length:", oldPassword.length);
    console.log("New password length:", newPassword.length);
    
    await userService.changePassword(req.params.id, oldPassword, newPassword);
    
    // Log activity
    const user = await User.findById(req.params.id);
    if (user) {
      await createActivityLog(
        user._id,
        user.id_number,
        user.name,
        "change password",
        "Password changed successfully"
      );
    }
    
    console.log("✅ Password change successful in service");
    
    res.json({ success: true, message: "Password changed successfully." });
    
  } catch (err) {
    console.error("❌ Password change error:", err);
    console.error("Error stack:", err.stack);
    
    res.status(400).json({ success: false, message: err.message || "Failed to change password." });
  }
};

// 📌 Admin Edit User
export const adminEditUser = async (req, res) => {
  try {
    const updatedUser = await userService.adminEditUser(req.params.id, req.body, req.file);
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        "edit user",
        `Edited user: ${updatedUser.name} (${updatedUser.role})`
      );
    }
    
    res.json({ success: true, message: "User updated successfully.", user: updatedUser });
  } catch (err) {
    console.error("Admin Edit User Error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to edit user." });
  }
};

// 📌 Archive User
export const archiveUser = async (req, res) => {
  try {
    const archivedUser = await userService.archiveUser(req.params.id);
    if (!archivedUser) return res.status(404).json({ success: false, message: "User not found." });
    
    archivedUser.sessionToken = null;
    archivedUser.isLoggedIn = false;
    await archivedUser.save();
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        "archive user",
        `Archived user: ${archivedUser.name}`
      );
    }
    
    const io = req.io || null;
    if (io) {
      io.to(req.params.id).emit('force-logout', {
        message: 'Your account has been archived.',
        reason: 'archived'
      });
    }
    
    const userResponse = archivedUser.toObject();
    delete userResponse.password;
    delete userResponse.sessionToken;
    
    res.json({ success: true, message: "User archived.", user: userResponse });
  } catch (err) {
    console.error("Archive User Error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to archive user." });
  }
};

// 📌 Restore User
export const restoreUser = async (req, res) => {
  try {
    const restoredUser = await userService.restoreUser(req.params.id);
    if (!restoredUser) return res.status(404).json({ success: false, message: "User not found." });
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        "restore user",
        `Restored user: ${restoredUser.name}`
      );
    }
    
    const userResponse = restoredUser.toObject();
    delete userResponse.password;
    delete userResponse.sessionToken;
    
    res.json({ success: true, message: "User restored.", user: userResponse });
  } catch (err) {
    console.error("Restore User Error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to restore user." });
  }
};

// 📌 Get Archived Users
export const getArchivedUsers = async (req, res) => {
  try {
    const archivedUsers = await userService.getArchivedUsers();
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        "view archived",
        `Viewed ${archivedUsers.length} archived users`
      );
    }
    
    const users = archivedUsers.map(user => {
      const u = user.toObject();
      delete u.password;
      delete u.sessionToken;
      return u;
    });
    res.json({ success: true, users });
  } catch (err) {
    console.error("Get Archived Users Error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch archived users." });
  }
};

// 📌 Delete Archived User
export const deleteArchivedUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    
    // Delete profile picture from Cloudinary if exists
    if (user.profilePicture && user.profilePicture.includes('cloudinary')) {
      try {
        const urlParts = user.profilePicture.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0];
        const fullPublicId = `profile-pictures/${publicId}`;
        await cloudinary.uploader.destroy(fullPublicId);
      } catch (cloudinaryError) {
        console.error("Error deleting from Cloudinary:", cloudinaryError);
      }
    }
    
    const deletedUser = await userService.deleteArchivedUser(req.params.id);
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        "delete user",
        `Permanently deleted user: ${user.name}`
      );
    }
    
    res.json({ success: true, message: "Archived user deleted permanently." });
  } catch (err) {
    console.error("Delete Archived User Error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to delete archived user." });
  }
};

// 📌 Get All Users (non-archived)
export const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        "view all users",
        `Viewed ${users.length} active users`
      );
    }
    
    const filteredUsers = users.map(user => {
      const u = user.toObject();
      delete u.password;
      delete u.sessionToken;
      return u;
    });
    res.json({ success: true, users: filteredUsers });
  } catch (err) {
    console.error("Get All Users Error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch users." });
  }
};

// ✅ Toggle suspend
export const toggleSuspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { suspend } = req.body;
    
    console.log("=== TOGGLE SUSPENSION ===");
    console.log("User ID:", id);
    console.log("Suspend value:", suspend);
    
    if (suspend === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: "Suspend status is required" 
      });
    }
    
    const suspendStatus = suspend === true || suspend === "true";
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    console.log("User found:", user.name, "Current suspended:", user.suspended);
    
    user.suspended = suspendStatus;
    
    if (suspendStatus) {
      user.sessionToken = null;
      user.isLoggedIn = false;
    }
    
    await user.save();
    
    console.log("User suspension updated to:", user.suspended);
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        suspendStatus ? "suspend user" : "unsuspend user",
        `${suspendStatus ? 'Suspended' : 'Unsuspended'} user: ${user.name}`
      );
    }
    
    const io = req.io || null;
    if (io) {
      try {
        const notification = new Notification({
          userId: user._id,
          title: `Account ${suspendStatus ? 'Suspended' : 'Unsuspended'}`,
          message: `Your account has been ${suspendStatus ? 'suspended' : 'unsuspended'}. ${suspendStatus ? 'Please contact support for assistance.' : 'You can now access your account normally.'}`,
          type: "system",
          status: suspendStatus ? "Suspended" : "Active",
          isRead: false,
          targetRole: "user",
          userName: user.name,
          idNumber: user.id_number
        });
        await notification.save();
        
        io.to(user._id.toString()).emit('notification', {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          status: notification.status,
          isRead: notification.isRead,
          createdAt: notification.createdAt
        });
        
        if (suspendStatus) {
          io.to(user._id.toString()).emit('force-logout', {
            message: 'Your account has been suspended.',
            reason: 'suspended'
          });
        }
        
        io.to('admin').emit('userSuspensionUpdated', {
          userId: user._id,
          suspended: suspendStatus,
          userName: user.name
        });
        
        console.log("✅ Notifications sent");
      } catch (notifyError) {
        console.error("Notification error:", notifyError);
      }
    }
    
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.sessionToken;
    
    res.json({
      success: true,
      message: `User ${suspendStatus ? "suspended" : "unsuspended"} successfully`,
      user: userResponse
    });
    
  } catch (error) {
    console.error("❌ Toggle Suspend Error:", error);
    console.error("Error stack:", error.stack);
    
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to toggle suspension",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Suspend User (simplified version)
export const suspendUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    user.suspended = true;
    user.sessionToken = null;
    user.isLoggedIn = false;
    await user.save();
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        "suspend user",
        `Suspended user: ${user.name}`
      );
    }
    
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.sessionToken;
    
    res.json({ 
      success: true, 
      message: "User suspended successfully", 
      user: userResponse 
    });
  } catch (error) {
    console.error("Suspend User Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error suspending user", 
      error: error.message 
    });
  }
};

// ✅ Unsuspend User (simplified version)
export const unsuspendUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    user.suspended = false;
    await user.save();
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        "unsuspend user",
        `Unsuspended user: ${user.name}`
      );
    }
    
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.sessionToken;
    
    res.json({ 
      success: true, 
      message: "User unsuspended successfully", 
      user: userResponse 
    });
  } catch (error) {
    console.error("Unsuspend User Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error unsuspending user", 
      error: error.message 
    });
  }
};

// ✅ Toggle Verify User with WebSocket Notifications
export const toggleVerifyUser = async (req, res) => {
  try {
    const { verify } = req.body;
    const verifyStatus = verify === true || verify === "true";
    const io = req.io || null;
    
    console.log("=== TOGGLE VERIFY DEBUG ===");
    console.log("User ID:", req.params.id);
    console.log("Verify status:", verifyStatus);
    console.log("WebSocket available:", !!io);
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("User found:", user.name, user._id.toString());
    
    user.verified = verifyStatus;
    await user.save();

    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        verifyStatus ? "verify user" : "unverify user",
        `${verifyStatus ? 'Verified' : 'Unverified'} user: ${user.name}`
      );
    }

    if (io) {
      try {
        const notification = new Notification({
          userId: user._id,
          title: `Account ${verifyStatus ? 'Verified' : 'Unverified'}`,
          message: `Your account has been ${verifyStatus ? 'verified' : 'unverified'}.`,
          type: "system",
          status: verifyStatus ? "Verified" : "Unverified",
          isRead: false,
          targetRole: "user",
          userName: user.name,
          idNumber: user.id_number
        });
        await notification.save();

        console.log("✅ Notification created in database:", notification._id);

        const userRoom = user._id.toString();
        console.log("Emitting to user room:", userRoom);
        
        io.to(userRoom).emit('notification', {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          status: notification.status,
          isRead: notification.isRead,
          createdAt: notification.createdAt
        });

        console.log("✅ Notification emitted to user");

        io.to('admin').emit('userVerificationUpdated', {
          userId: user._id,
          verified: verifyStatus,
          userName: user.name
        });

        console.log("✅ Admin update emitted");

      } catch (notifyError) {
        console.error("❌ Notification error:", notifyError);
      }
    } else {
      console.log("❌ WebSocket (io) not available - notifications skipped");
    }

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.sessionToken;

    res.json({
      success: true,
      message: `User ${verifyStatus ? "verified" : "unverified"} successfully`,
      user: userResponse,
    });
  } catch (error) {
    console.error("Toggle Verify Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to toggle verification" 
    });
  }
};

// 📌 Verify User (simple version for PATCH /verify/:id)
export const verifyUser = async (req, res) => {
  try {
    const { verified } = req.body;
    if (verified === undefined) {
      return res.status(400).json({ success: false, message: "Verified status is required." });
    }
    
    console.log("=== VERIFY USER ===");
    console.log("User ID:", req.params.id);
    console.log("Verified status:", verified);
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    
    user.verified = verified;
    await user.save();
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        verified ? "verify user" : "unverify user",
        `${verified ? 'Verified' : 'Unverified'} user: ${user.name}`
      );
    }
    
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.sessionToken;
    
    res.json({
      success: true,
      message: `User ${verified ? "verified" : "unverified"}.`,
      user: userResponse
    });
  } catch (err) {
    console.error("Verify User Error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to update verification status." });
  }
};

// 📌 Get User By ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const isEmail = id.includes('@');
    
    let user;
    
    if (isEmail) {
      user = await User.findOne({ email: id.toLowerCase() }).select("-password -sessionToken");
    } else if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id).select("-password -sessionToken");
    } else {
      user = await User.findOne({ id_number: id }).select("-password -sessionToken");
    }
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    // Log activity
    const currentUser = req.user;
    if (currentUser) {
      await createActivityLog(
        currentUser._id,
        currentUser.id_number,
        currentUser.name,
        "view user",
        `Viewed user: ${user.name}`
      );
    }
    
    res.json({ success: true, user });
  } catch (err) {
    console.error("Error fetching user by ID:", err);
    res.status(500).json({ success: false, message: "Failed to fetch user" });
  }
};

// 📌 Search Users
export const searchUsers = async (req, res) => {
  try {
    const { q, verified } = req.query;
    
    console.log("🔍 User search request:", { q, verified });

    if (!q || q.trim() === "") {
      return res.status(200).json([]);
    }

    const searchRegex = new RegExp(q, 'i');
    
    const query = {
      $or: [
        { name: searchRegex },
        { id_number: searchRegex },
        { email: searchRegex },
        { department: searchRegex }
      ]
    };

    if (verified === 'true') {
      query.verified = true;
    }

    query.archived = { $ne: true };

    const users = await User.find(query)
      .select('name id_number email course year_level department role verified profilePicture')
      .limit(20);

    console.log(`✅ Found ${users.length} users matching "${q}"`);
    
    // Log activity
    const currentUser = req.user;
    if (currentUser && users.length > 0) {
      await createActivityLog(
        currentUser._id,
        currentUser.id_number,
        currentUser.name,
        "search users",
        `Searched for "${q}" - found ${users.length} results`
      );
    }
    
    res.status(200).json(users);
  } catch (err) {
    console.error("❌ User search error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to search users",
      error: err.message 
    });
  }
};

// 📌 Get Unread Counts
export const getUnreadCounts = async (req, res) => {
  try {
    res.json({ success: true, counts: { notifications: 0, messages: 0 } });
  } catch (err) {
    console.error("Get Unread Counts Error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch unread counts." });
  }
};

// 📌 Check if participant exists and is verified
export const checkParticipant = async (req, res) => {
  try {
    const { id_number } = req.query;
    if (!id_number) {
      return res.status(400).json({ message: "id_number is required" });
    }

    console.log("Checking participant with ID:", id_number);

    const user = await User.findOne({ id_number });
    if (!user) {
      console.log("User not found with ID:", id_number);
      return res.status(200).json({ 
        exists: false, 
        verified: false 
      });
    }

    console.log("User found:", user.name, "Verified:", user.verified);

    res.status(200).json({
      exists: true,
      verified: user.verified || false,
      id_number: user.id_number,
      name: user.name,
      course: user.course || "N/A",
      year_level: user.year_level || "N/A",
      department: user.department || "N/A",
      role: user.role || "Student",
    });
  } catch (err) {
    console.error("Check participant error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 📌 Get User Unread Counts (for Navigation_User)
export const getUserUnreadCounts = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const Message = (await import("../models/Message.js")).default;
    const messagesCount = await Message.countDocuments({
      receiver: userId,
      read: false
    });

    let notificationsCount = 0;
    try {
      const Notification = (await import("../models/Notification.js")).default;
      notificationsCount = await Notification.countDocuments({
        userId: userId,
        isRead: false
      });
    } catch (error) {
      console.log("Notifications not implemented yet, using 0");
    }

    res.json({
      success: true,
      messages: messagesCount,
      notifications: notificationsCount
    });
  } catch (error) {
    console.error("Failed to fetch unread counts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread counts"
    });
  }
};

// Get all users for admin messaging
export const getAllUsersForMessaging = async (req, res) => {
  try {
    const users = await User.find({ 
      archived: { $ne: true },
      role: { $ne: 'admin' }
    })
    .select('name email role department id_number floor')
    .sort({ name: 1 });

    res.json({ 
      success: true, 
      users 
    });
  } catch (error) {
    console.error('Error fetching users for messaging:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch users' 
    });
  }
};

// 📌 Test Cloudinary Configuration
export const testCloudinary = async (req, res) => {
  try {
    if (!cloudinary) {
      return res.status(500).json({ 
        success: false, 
        message: "Cloudinary not initialized" 
      });
    }

    const config = cloudinary.config();
    const configStatus = {
      cloud_name: !!config.cloud_name,
      api_key: !!config.api_key,
      api_secret: !!config.api_secret,
      env_cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
      env_api_key: !!process.env.CLOUDINARY_API_KEY,
      env_api_secret: !!process.env.CLOUDINARY_API_SECRET,
    };

    console.log("Cloudinary Config Status:", configStatus);

    res.json({
      success: true,
      message: "Cloudinary configuration check",
      config: configStatus,
      environment: {
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? "✓ Set" : "✗ Missing",
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? "✓ Set" : "✗ Missing", 
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? "✓ Set" : "✗ Missing"
      }
    });
  } catch (error) {
    console.error("Cloudinary test error:", error);
    res.status(500).json({
      success: false,
      message: "Cloudinary test failed",
      error: error.message
    });
  }
};

// ✅ NEW: Revoke all verification for specific roles (students only)
export const revokeAllVerification = async (req, res) => {
  try {
    const { roles } = req.body;
    const rolesToRevoke = roles || ["Student"];
    
    console.log("=== REVOKE ALL VERIFICATION ===");
    console.log("Roles to revoke:", rolesToRevoke);
    
    const usersToUpdate = await User.find({
      role: { $in: rolesToRevoke },
      verified: true,
      archived: { $ne: true }
    });
    
    console.log(`Found ${usersToUpdate.length} users to revoke verification`);
    
    if (usersToUpdate.length === 0) {
      return res.json({ 
        success: true, 
        message: "No verified users found in the specified roles.",
        count: 0
      });
    }
    
    const updateResult = await User.updateMany(
      { 
        role: { $in: rolesToRevoke },
        verified: true,
        archived: { $ne: true }
      },
      { verified: false }
    );
    
    console.log(`Updated ${updateResult.modifiedCount} users`);
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        "bulk unverify",
        `Revoked verification for ${updateResult.modifiedCount} users (roles: ${rolesToRevoke.join(', ')})`
      );
    }
    
    const notifications = [];
    const io = req.io || null;
    
    for (const user of usersToUpdate) {
      try {
        const notification = new Notification({
          userId: user._id,
          title: "Verification Revoked",
          message: "Your account verification has been revoked as part of a system-wide update.",
          type: "system",
          status: "Unverified",
          isRead: false,
          targetRole: "user",
          userName: user.name,
          idNumber: user.id_number
        });
        await notification.save();
        notifications.push(notification);
        
        if (io) {
          io.to(user._id.toString()).emit('notification', {
            _id: notification._id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            status: notification.status,
            isRead: notification.isRead,
            createdAt: notification.createdAt
          });
        }
      } catch (notifError) {
        console.error(`Failed to create notification for user ${user._id}:`, notifError);
      }
    }
    
    if (io) {
      io.to('admin').emit('bulk-verification-updated', {
        roles: rolesToRevoke,
        verified: false,
        count: updateResult.modifiedCount
      });
    }
    
    res.json({
      success: true,
      message: `Successfully revoked verification for ${updateResult.modifiedCount} users.`,
      count: updateResult.modifiedCount,
      notificationsCreated: notifications.length
    });
    
  } catch (error) {
    console.error("Revoke All Verification Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to revoke verifications" 
    });
  }
};

// ✅ NEW: Bulk verify/unverify selected users
export const bulkVerifyUsers = async (req, res) => {
  try {
    const { userIds, verified } = req.body;
    const verifyStatus = verified === true || verified === "true";
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "User IDs array is required" 
      });
    }
    
    console.log("=== BULK VERIFY ===");
    console.log("User IDs:", userIds);
    console.log("Verify status:", verifyStatus);
    console.log("Count:", userIds.length);
    
    const updateResult = await User.updateMany(
      { 
        _id: { $in: userIds },
        archived: { $ne: true }
      },
      { verified: verifyStatus }
    );
    
    console.log(`Updated ${updateResult.modifiedCount} users`);
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        verifyStatus ? "bulk verify" : "bulk unverify",
        `${verifyStatus ? 'Verified' : 'Unverified'} ${updateResult.modifiedCount} users`
      );
    }
    
    const updatedUsers = await User.find({ _id: { $in: userIds } });
    
    const notifications = [];
    const io = req.io || null;
    
    for (const user of updatedUsers) {
      try {
        const notification = new Notification({
          userId: user._id,
          title: `Account ${verifyStatus ? 'Verified' : 'Unverified'}`,
          message: `Your account has been ${verifyStatus ? 'verified' : 'unverified'} by an administrator.`,
          type: "system",
          status: verifyStatus ? "Verified" : "Unverified",
          isRead: false,
          targetRole: "user",
          userName: user.name,
          idNumber: user.id_number
        });
        await notification.save();
        notifications.push(notification);
        
        if (io) {
          io.to(user._id.toString()).emit('notification', {
            _id: notification._id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            status: notification.status,
            isRead: notification.isRead,
            createdAt: notification.createdAt
          });
        }
      } catch (notifError) {
        console.error(`Failed to create notification for user ${user._id}:`, notifError);
      }
    }
    
    if (io) {
      io.to('admin').emit('bulk-verification-updated', {
        userIds: userIds,
        verified: verifyStatus,
        count: updateResult.modifiedCount
      });
    }
    
    res.json({
      success: true,
      message: `Successfully ${verifyStatus ? 'verified' : 'unverified'} ${updateResult.modifiedCount} users.`,
      count: updateResult.modifiedCount,
      notificationsCreated: notifications.length
    });
    
  } catch (error) {
    console.error("Bulk Verify Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to bulk verify users" 
    });
  }
};

// ✅ NEW: Get verification statistics
export const getVerificationStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      { $match: { archived: { $ne: true } } },
      {
        $group: {
          _id: { role: "$role", verified: "$verified" },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.role",
          verified: {
            $push: {
              status: "$_id.verified",
              count: "$count"
            }
          },
          total: { $sum: "$count" }
        }
      }
    ]);
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error("Get Verification Stats Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to get verification statistics" 
    });
  }
};

// 📌 Bulk Archive Users
export const bulkArchiveUsers = async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "User IDs array is required" 
      });
    }
    
    console.log("=== BULK ARCHIVE ===");
    console.log("User IDs to archive:", userIds);
    console.log("Count:", userIds.length);
    
    const updateResult = await User.updateMany(
      { 
        _id: { $in: userIds },
        archived: { $ne: true }
      },
      { 
        archived: true,
        sessionToken: null,
        isLoggedIn: false
      }
    );
    
    console.log(`Archived ${updateResult.modifiedCount} users`);
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        "bulk archive",
        `Archived ${updateResult.modifiedCount} users`
      );
    }
    
    const usersToNotify = await User.find({ _id: { $in: userIds } });
    const notifications = [];
    const io = req.io || null;
    
    for (const user of usersToNotify) {
      try {
        const notification = new Notification({
          userId: user._id,
          title: "Account Archived",
          message: "Your account has been archived by an administrator. Please contact support for assistance.",
          type: "system",
          status: "Archived",
          isRead: false,
          targetRole: "user",
          userName: user.name,
          idNumber: user.id_number
        });
        await notification.save();
        notifications.push(notification);
        
        if (io) {
          io.to(user._id.toString()).emit('notification', {
            _id: notification._id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            status: notification.status,
            isRead: notification.isRead,
            createdAt: notification.createdAt
          });
          
          io.to(user._id.toString()).emit('account-archived', {
            message: "Your account has been archived"
          });

          io.to(user._id.toString()).emit('force-logout', {
            message: 'Your account has been archived.',
            reason: 'archived'
          });
        }
      } catch (notifError) {
        console.error(`Failed to create notification for user ${user._id}:`, notifError);
      }
    }
    
    if (io) {
      io.to('admin').emit('bulk-archive-completed', {
        userIds: userIds,
        count: updateResult.modifiedCount
      });
    }
    
    res.json({
      success: true,
      message: `Successfully archived ${updateResult.modifiedCount} users.`,
      count: updateResult.modifiedCount,
      notificationsCreated: notifications.length
    });
    
  } catch (error) {
    console.error("Bulk Archive Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to bulk archive users" 
    });
  }
};

// ✅ NEW: Bulk restore archived users
export const bulkRestoreArchivedUsers = async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "User IDs array is required" 
      });
    }
    
    console.log("=== BULK RESTORE ARCHIVED USERS ===");
    console.log("User IDs to restore:", userIds);
    console.log("Count:", userIds.length);
    
    const updateResult = await User.updateMany(
      { 
        _id: { $in: userIds },
        archived: true
      },
      { 
        archived: false
      }
    );
    
    console.log(`Restored ${updateResult.modifiedCount} users`);
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        "bulk restore",
        `Restored ${updateResult.modifiedCount} archived users`
      );
    }
    
    const usersToNotify = await User.find({ _id: { $in: userIds } });
    const notifications = [];
    const io = req.io || null;
    
    for (const user of usersToNotify) {
      try {
        const notification = new Notification({
          userId: user._id,
          title: "Account Restored",
          message: "Your account has been restored by an administrator. You can now log in again.",
          type: "system",
          status: "Active",
          isRead: false,
          targetRole: "user",
          userName: user.name,
          idNumber: user.id_number
        });
        await notification.save();
        notifications.push(notification);
        
        if (io) {
          io.to(user._id.toString()).emit('notification', {
            _id: notification._id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            status: notification.status,
            isRead: notification.isRead,
            createdAt: notification.createdAt
          });
        }
      } catch (notifError) {
        console.error(`Failed to create notification for user ${user._id}:`, notifError);
      }
    }
    
    if (io) {
      io.to('admin').emit('bulk-restore-completed', {
        userIds: userIds,
        count: updateResult.modifiedCount
      });
    }
    
    res.json({
      success: true,
      message: `Successfully restored ${updateResult.modifiedCount} users.`,
      count: updateResult.modifiedCount,
      notificationsCreated: notifications.length
    });
    
  } catch (error) {
    console.error("Bulk Restore Archived Users Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to bulk restore users" 
    });
  }
};

// ✅ NEW: Bulk delete archived users permanently
export const bulkDeleteArchivedUsers = async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "User IDs array is required" 
      });
    }
    
    console.log("=== BULK DELETE ARCHIVED USERS ===");
    console.log("User IDs to delete permanently:", userIds);
    console.log("Count:", userIds.length);
    
    const usersToDelete = await User.find({ 
      _id: { $in: userIds },
      archived: true
    });
    
    for (const user of usersToDelete) {
      if (user.profilePicture && user.profilePicture.includes('cloudinary')) {
        try {
          const urlParts = user.profilePicture.split('/');
          const publicIdWithExtension = urlParts[urlParts.length - 1];
          const publicId = publicIdWithExtension.split('.')[0];
          
          const fullPublicId = `profile-pictures/${publicId}`;
          await cloudinary.uploader.destroy(fullPublicId);
          console.log("Deleted from Cloudinary:", fullPublicId);
        } catch (cloudinaryError) {
          console.error(`Error deleting from Cloudinary for user ${user._id}:`, cloudinaryError);
        }
      }
    }
    
    const deleteResult = await User.deleteMany({ 
      _id: { $in: userIds },
      archived: true
    });
    
    console.log(`Permanently deleted ${deleteResult.deletedCount} users`);
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        "bulk delete",
        `Permanently deleted ${deleteResult.deletedCount} archived users`
      );
    }
    
    const io = req.io || null;
    if (io) {
      io.to('admin').emit('bulk-delete-completed', {
        userIds: userIds,
        count: deleteResult.deletedCount
      });
    }
    
    res.json({
      success: true,
      message: `Successfully deleted ${deleteResult.deletedCount} archived users permanently.`,
      count: deleteResult.deletedCount
    });
    
  } catch (error) {
    console.error("Bulk Delete Archived Users Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to bulk delete archived users" 
    });
  }
};

// ✅ NEW: Force logout all sessions for a user
export const forceLogoutUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    user.sessionToken = null;
    user.isLoggedIn = false;
    await user.save();
    
    // Log activity
    const adminUser = req.user;
    if (adminUser) {
      await createActivityLog(
        adminUser._id,
        adminUser.id_number,
        adminUser.name,
        "force logout",
        `Forced logout for user: ${user.name}`
      );
    }
    
    const io = req.io || null;
    if (io) {
      io.to(userId).emit('force-logout', {
        message: 'You have been logged out by an administrator.',
        reason: 'admin_force_logout'
      });
      
      console.log(`✅ Force logout notification sent to user: ${userId}`);
    }
    
    res.json({ 
      success: true, 
      message: "User logged out successfully" 
    });
  } catch (error) {
    console.error("Force Logout Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to force logout user" 
    });
  }
};