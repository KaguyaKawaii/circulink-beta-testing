// userService.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import logAction from "../utils/logAction.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";
import Notification from "../models/Notification.js";
import notificationService from "./notificationService.js"; // Import the notification service
import crypto from 'crypto';

// Helper function to generate session token
const generateSessionToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Cloudinary upload helper
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = Readable.from(fileBuffer);
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.pipe(uploadStream);
  });
};

const FLOORS = ["Ground Floor", "2nd Floor", "3rd Floor", "4th Floor", "5th Floor"];

const getLeastPopulatedFloor = async () => {
  const counts = await Promise.all(
    FLOORS.map(async (floor) => ({
      floor,
      count: await User.countDocuments({ role: "Staff", floor })
    }))
  );
  counts.sort((a, b) => a.count - b.count);
  return counts[0].floor;
};

// Add User (Admin)
export const addUser = async (data, file) => {
  const { name, email, id_number, password, role, department, course, yearLevel, floor, verified } = data;

  if (!name || !email || !id_number || !password || !role) throw new Error("Missing required fields.");
  
  // Password validation
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  const existing = await User.findOne({ 
    $or: [
      { email: email.toLowerCase() },
      { id_number: id_number }
    ]
  });
  if (existing) {
    if (existing.email === email.toLowerCase()) throw new Error("Email already used.");
    if (existing.id_number === id_number) throw new Error("ID number already used.");
  }

  let profilePicture = null;
  if (file) {
    const upload = await uploadToCloudinary(file.buffer, "users/profile_pictures");
    profilePicture = upload.secure_url;
  }

  const newUser = new User({
    name,
    email: email.toLowerCase(),
    id_number,
    password, // Plain password - will be hashed by pre-save hook
    department: role === "Staff" ? department || "N/A" : department || "N/A",
    course: role === "Student" ? course || "N/A" : "N/A",
    year_level: role === "Student" ? yearLevel || "N/A" : "N/A",
    floor: role === "Staff" ? floor || "N/A" : "N/A",
    role,
    verified: verified === "true" || verified === true || false,
    profilePicture,
    sessionToken: null, // Initialize with no session
    isLoggedIn: false
  });

  await newUser.save();
  await logAction(newUser._id, newUser.id_number, newUser.name, "User Created", `Added new ${role} via Admin Panel`);
  
  // Return user without password
  const userResponse = newUser.toObject();
  delete userResponse.password;
  delete userResponse.sessionToken;
  return userResponse;
};

// userService.js - Fixed signup function
export const signup = async (data, file) => {
  const { name, email, id_number, password, role, department, course, yearLevel } = data;

  console.log("=== SIGNUP SERVICE ===");
  console.log("Input data:", { name, email, id_number, role, department, course, yearLevel });

  if (!name || !email || !id_number || !password || !role) throw new Error("Missing required fields.");
  if (!email.endsWith("@usa.edu.ph")) throw new Error("Email must end with @usa.edu.ph");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  const existing = await User.findOne({ 
    $or: [
      { email: email.toLowerCase() },
      { id_number: id_number }
    ]
  });
  if (existing) {
    if (existing.email === email.toLowerCase()) throw new Error("Email already used.");
    if (existing.id_number === id_number) throw new Error("ID number already used.");
  }

  let profilePicture = null;
  if (file) {
    const upload = await uploadToCloudinary(file.buffer, "users/profile_pictures");
    profilePicture = upload.secure_url;
  }

  // 🔴 CRITICAL: Force verified to false for all new signups
  const newUser = new User({
    name,
    email: email.toLowerCase(),
    id_number,
    password, // Plain password - will be hashed by pre-save hook
    department: department || "N/A",
    course: role === "Student" ? course || "N/A" : "N/A",
    year_level: role === "Student" ? yearLevel || "N/A" : "N/A",
    role,
    profilePicture,
    verified: false, // CRITICAL: Always false for new signups
    sessionToken: null,
    isLoggedIn: false
  });

  console.log("Creating user with verified = false");
  await newUser.save();
  
  console.log("✅ User created with verified =", newUser.verified);
  
  // Log the signup activity
  await logAction(
    newUser._id, 
    newUser.id_number, 
    newUser.name, 
    "Sign Up", 
    `New account created as ${role} - Pending verification`
  );

  // Create notifications for admins
  try {
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      const notification = new Notification({
        userId: admin._id,
        title: "New User Registration",
        message: `${newUser.name} (${newUser.id_number}) has registered as a ${newUser.role} and is pending verification.`,
        type: "system",
        status: "New",
        isRead: false
      });
      await notification.save();
    }
    console.log("✅ Admin notifications created for new user signup");
  } catch (notifError) {
    console.error("Failed to create admin notifications:", notifError);
  }

  // Return user without password
  const userResponse = newUser.toObject();
  delete userResponse.password;
  delete userResponse.sessionToken;
  return userResponse;
};

// ✅ UPDATED: Login with session token for single device
export const login = async ({ email, password }, io = null) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new Error("Invalid credentials.");

  const validPass = await bcrypt.compare(password, user.password);
  if (!validPass) throw new Error("Invalid credentials.");

  // Check if user is verified
  if (!user.verified) {
    throw new Error("Account is not verified. Please wait for admin approval.");
  }

  if (user.suspended) {
    throw new Error("This account is suspended. Please contact the administrator.");
  }

  if (user.archived) {
    throw new Error("This account is archived. Please contact the administrator.");
  }

  // Store previous session token before generating new one
  const previousSessionToken = user.sessionToken;

  // Generate new session token
  const sessionToken = generateSessionToken();
  
  // Update user with new session token
  user.sessionToken = sessionToken;
  user.lastLogin = new Date();
  user.isLoggedIn = true;
  await user.save();

  // Log the action
  await logAction(user._id, user.id_number, user.name, "Login", "Logged in successfully");

  // If there was a previous session, notify it to logout via WebSocket
  if (io && previousSessionToken) {
    try {
      io.to(previousSessionToken).emit('force-logout', {
        message: 'You have been logged out because another device logged in.',
        timestamp: new Date().toISOString()
      });
      console.log(`✅ Force logout notification sent for previous session of user: ${user._id}`);
      
      await logAction(
        user._id, 
        user.id_number, 
        user.name, 
        "Session Replaced", 
        "Logged out from other device due to new login"
      );
    } catch (socketError) {
      console.error("Socket notification error:", socketError);
    }
  }

  const { _id, name, id_number, department, course, year_level, floor, role, verified, profilePicture } = user;
  return { 
    _id, 
    name, 
    email: user.email, 
    id_number, 
    department, 
    course, 
    year_level, 
    floor, 
    role, 
    verified, 
    profilePicture,
    sessionToken // Include session token in response
  };
};

// ✅ NEW: Logout - clear session token
export const logout = async (userId, sessionToken) => {
  const user = await User.findById(userId);
  if (user && user.sessionToken === sessionToken) {
    user.sessionToken = null;
    user.isLoggedIn = false;
    await user.save();
    
    await logAction(user._id, user.id_number, user.name, "Logout", "Logged out successfully");
    return true;
  }
  return false;
};

// ✅ NEW: Validate session
export const validateSession = async (userId, sessionToken) => {
  const user = await User.findById(userId);
  if (!user) return { valid: false, message: "User not found" };
  
  if (user.archived) return { valid: false, message: "Account has been archived" };
  if (user.suspended) return { valid: false, message: "Account has been suspended" };
  if (!user.verified) return { valid: false, message: "Account is not verified" };
  
  if (user.sessionToken !== sessionToken) {
    return { valid: false, message: "Session expired. You have been logged in from another device." };
  }
  
  return { valid: true, user };
};

// Update Profile
export const updateProfile = async (id, data, file) => {
  const user = await User.findById(id);
  if (!user) throw new Error("User not found.");

  const allowedFields = ["name", "course", "department", "year_level", "floor"];
  allowedFields.forEach(field => {
    if (data[field] !== undefined && data[field] !== null && data[field] !== "") {
      user[field] = data[field];
    }
  });

  if (file) {
    const upload = await uploadToCloudinary(file.buffer, "users/profile_pictures");
    user.profilePicture = upload.secure_url;
  }

  await user.save();
  await logAction(user._id, user.id_number, user.name, "Profile Update", "Updated profile information");
  
  // Return user without password
  const userResponse = user.toObject();
  delete userResponse.password;
  delete userResponse.sessionToken;
  return userResponse;
};

// Admin Edit User
export const adminEditUser = async (id, data, file) => {
  const user = await User.findById(id);
  if (!user) throw new Error("User not found.");

  // ✅ Normalize field naming from frontend
  if (data.yearLevel && !data.year_level) {
    data.year_level = data.yearLevel;
  }

  if (data.email && data.email !== user.email) {
    const emailExists = await User.findOne({ email: data.email.toLowerCase(), _id: { $ne: id } });
    if (emailExists) throw new Error("Email already used by another user.");
  }

  if (data.id_number && data.id_number !== user.id_number) {
    const idExists = await User.findOne({ id_number: data.id_number, _id: { $ne: id } });
    if (idExists) throw new Error("ID number already used by another user.");
  }

  const editableFields = ["name", "email", "id_number", "department", "course", "year_level", "floor", "role"];
  editableFields.forEach(field => {
    if (data[field] !== undefined && data[field] !== null && data[field] !== "") {
      user[field] = data[field];
    }
  });

  if (typeof data.verified !== "undefined") {
    user.verified = data.verified === "true" || data.verified === true;
  }

  // Password handling
  if (data.password && data.password.trim() !== "") {
    if (data.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    user.password = data.password; // Plain password - pre-save hook will hash it
  }

  if (file) {
    const upload = await uploadToCloudinary(file.buffer, "users/profile_pictures");
    user.profilePicture = upload.secure_url;
  }

  await user.save();
  
  // Get admin info for logging
  const admin = await User.findById(data.adminId);
  if (admin) {
    await logAction(
      admin._id, 
      admin.id_number, 
      admin.name, 
      "Admin Edit", 
      `Edited user: ${user.name} (${user.role})`
    );
  }
  
  // Return user without password
  const userResponse = user.toObject();
  delete userResponse.password;
  delete userResponse.sessionToken;
  return userResponse;
};

// Change Password
export const changePassword = async (id, oldPassword, newPassword) => {
  console.log("=== PASSWORD CHANGE DEBUG ===");
  console.log("User ID:", id);
  console.log("Old password length:", oldPassword.length);
  console.log("New password length:", newPassword.length);

  const user = await User.findById(id);
  if (!user) throw new Error("User not found.");

  console.log("User found:", user.email);

  // Verify old password
  const validOld = await bcrypt.compare(oldPassword, user.password);
  console.log("Old password valid:", validOld);
  
  if (!validOld) throw new Error("Old password is incorrect.");

  // Password validation
  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  // Set the plain new password and let the model's pre-save hook hash it
  user.password = newPassword;
  
  // Optional: Invalidate all sessions after password change for security
  user.sessionToken = null;
  user.isLoggedIn = false;
  
  await user.save();

  console.log("✅ Password updated successfully in database");

  // Verify the new password works
  const verifyNewPassword = await bcrypt.compare(newPassword, user.password);
  console.log("New password verification after save:", verifyNewPassword);

  await logAction(user._id, user.id_number, user.name, "Password Change", "Changed password successfully");

  return true;
};

// ✅ Get all non-archived users
export const getAllUsers = async () => User.find({ archived: { $ne: true } }).select("-password -sessionToken").sort({ created_at: -1 });

// ✅ Get archived users with archivedAt timestamp
export const getArchivedUsers = async () => User.find({ archived: true })
  .select("-password -sessionToken")
  .sort({ archivedAt: -1 });

// ✅ Get user by ID
export const getUserById = async (id) => User.findById(id).select("-password -sessionToken");

// ✅ FIXED: Verify or Unverify user with proper notification handling
export const verifyUser = async (id, verified, adminId, io) => {
  const user = await User.findByIdAndUpdate(
    id,
    { verified },
    { new: true }
  ).select("-password -sessionToken");

  if (user) {
    // Log the action using the provided adminId
    await logAction(
      adminId || user._id,
      user.id_number,
      user.name,
      verified ? "Verify User" : "Unverify User",
      verified ? "Account verified by admin" : "Account unverified by admin"
    );

    // ✅ Create a notification for the user using notificationService
    try {
      await notificationService.createNotification(
        {
          userId: user._id,
          title: verified ? "Account Verified" : "Account Unverified",
          message: verified
            ? "Your account has been verified. You can now log in."
            : "Your account verification has been removed. Please contact support if you believe this is an error.",
          type: "system",
          status: "New",
          targetRole: "user"
        },
        io // Pass the io instance for real-time notification
      );
      
      console.log(`✅ Notification created for user ${user._id}`);
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
    }
  }

  return user;
};

// Suspend user (set suspended: true) - CLEAR SESSION
export const suspendUser = async (id, adminId, io) => {
  const user = await User.findByIdAndUpdate(
    id,
    { 
      suspended: true,
      sessionToken: null, // Clear session token
      isLoggedIn: false
    },
    { new: true }
  ).select("-password -sessionToken");

  if (user) {
    await logAction(
      adminId || user._id,
      user.id_number,
      user.name,
      "Suspend User",
      "Account suspended by admin"
    );
    
    // Create notification using notificationService
    try {
      await notificationService.createNotification(
        {
          userId: user._id,
          title: "Account Suspended",
          message: "Your account has been suspended. Contact support for more information.",
          type: "system",
          status: "New",
          targetRole: "user"
        },
        io
      );
    } catch (notifError) {
      console.error("Failed to create suspension notification:", notifError);
    }
    
    // Force logout via socket
    if (io) {
      io.to(user._id.toString()).emit('force-logout', {
        message: 'Your account has been suspended.',
        reason: 'suspended'
      });
    }
  }

  return user;
};

// Unsuspend user (set suspended: false)
export const unsuspendUser = async (id, adminId, io) => {
  const user = await User.findByIdAndUpdate(
    id,
    { suspended: false },
    { new: true }
  ).select("-password -sessionToken");

  if (user) {
    await logAction(
      adminId || user._id,
      user.id_number,
      user.name,
      "Unsuspend User",
      "Account unsuspended by admin"
    );
    
    // Create notification using notificationService
    try {
      await notificationService.createNotification(
        {
          userId: user._id,
          title: "Account Restored",
          message: "Your account has been restored. You may now log in.",
          type: "system",
          status: "New",
          targetRole: "user"
        },
        io
      );
    } catch (notifError) {
      console.error("Failed to create unsuspension notification:", notifError);
    }
  }

  return user;
};

// Toggle suspend state (accepts boolean suspend) - CLEAR SESSION IF SUSPENDING
export const toggleSuspend = async (id, suspend, adminId, io) => {
  const updateData = { suspended: !!suspend };
  
  // Clear session token if suspending
  if (suspend) {
    updateData.sessionToken = null;
    updateData.isLoggedIn = false;
  }
  
  const user = await User.findByIdAndUpdate(
    id,
    updateData,
    { new: true }
  ).select("-password -sessionToken");

  if (user) {
    await logAction(
      adminId || user._id,
      user.id_number,
      user.name,
      suspend ? "Suspend User" : "Unsuspend User",
      suspend ? "Account suspended via admin toggle" : "Account unsuspended via admin toggle"
    );

    // Create notification using notificationService
    try {
      await notificationService.createNotification(
        {
          userId: user._id,
          title: suspend ? "Account Suspended" : "Account Restored",
          message: suspend
            ? "Your account has been suspended. Contact support for more information."
            : "Your account has been restored. You may now log in.",
          type: "system",
          status: "New",
          targetRole: "user"
        },
        io
      );
    } catch (notifError) {
      console.error("Failed to create toggle suspension notification:", notifError);
    }
    
    // Force logout if suspended
    if (suspend && io) {
      io.to(user._id.toString()).emit('force-logout', {
        message: 'Your account has been suspended.',
        reason: 'suspended'
      });
    }
  }

  return user;
};

// ✅ Archive user with timestamp - CLEAR SESSION
export const archiveUser = async (id, adminId) => {
  const user = await User.findByIdAndUpdate(
    id,
    { 
      archived: true, 
      archivedAt: new Date(),
      sessionToken: null, // Clear session token
      isLoggedIn: false
    },
    { new: true }
  ).select("-password -sessionToken");
  
  if (user) {
    await logAction(
      adminId || user._id,
      user.id_number,
      user.name,
      "Archive User",
      "Account archived by admin"
    );
  }
  return user;
};

// ✅ Restore user
export const restoreUser = async (id, adminId) => {
  const user = await User.findByIdAndUpdate(
    id,
    { archived: false, archivedAt: null },
    { new: true }
  ).select("-password -sessionToken");
  
  if (user) {
    await logAction(
      adminId || user._id,
      user.id_number,
      user.name,
      "Restore User",
      "Account restored from archive by admin"
    );
  }
  return user;
};

// ✅ Delete archived user
export const deleteArchivedUser = async (id, adminId) => {
  const user = await User.findByIdAndDelete(id);
  if (user) {
    await logAction(
      adminId || user._id,
      user.id_number,
      user.name,
      "Delete User",
      "Archived user permanently deleted by admin"
    );
  }
  return user;
};