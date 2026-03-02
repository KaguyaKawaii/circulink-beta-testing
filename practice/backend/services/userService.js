import User from "../models/User.js";
import bcrypt from "bcryptjs";
import logAction from "../utils/logAction.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";
import Notification from "../models/Notification.js";
import notificationService from "./notificationService.js";
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
  await logAction(newUser._id, newUser.id_number, newUser.name, "User Created", "Added via Admin Panel");
  
  // Return user without password
  const userResponse = newUser.toObject();
  delete userResponse.password;
  delete userResponse.sessionToken;
  return userResponse;
};

// FIXED: Signup - Students should NOT be verified by default
export const signup = async (data, file) => {
  const { name, email, id_number, password, role, department, course, yearLevel } = data;

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

  // IMPORTANT FIX: Explicitly set verified to false for all new signups
  // This overrides any automatic verification in the model
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
    verified: false, // Explicitly set to false for all new signups
    sessionToken: null, // Initialize with no session
    isLoggedIn: false
  });

  await newUser.save();
  await logAction(newUser._id, newUser.id_number, newUser.name, "User Signup", "Registered account");

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
  await logAction(user._id, user.id_number, user.name, "User Login", "Logged in");

  // If there was a previous session, notify it to logout via WebSocket
  if (io && previousSessionToken) {
    try {
      io.to(previousSessionToken).emit('force-logout', {
        message: 'You have been logged out because another device logged in.',
        timestamp: new Date().toISOString()
      });
      console.log(`✅ Force logout notification sent for previous session of user: ${user._id}`);
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
    
    await logAction(user._id, user.id_number, user.name, "User Logout", "Logged out");
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
  await logAction(user._id, user.id_number, user.name, "Profile Updated", "User updated profile info");
  
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
  await logAction(user._id, user.id_number, user.name, "Admin Edited User", "User info updated by admin");
  
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

  await logAction(user._id, user.id_number, user.name, "Password Changed", "User changed password");

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

// ✅ Verify or Unverify user
export const verifyUser = async (id, verified, io) => {
  const user = await User.findByIdAndUpdate(
    id,
    { verified },
    { new: true }
  ).select("-password -sessionToken");

  if (user) {
    // Log the action
    await logAction(
      user._id,
      user.id_number,
      user.name,
      verified ? "User Verified" : "User Unverified",
      verified ? "User account marked as verified" : "User account marked as unverified"
    );

    // ✅ Create a notification for the user only
    await createNotification(
      {
        userId: user._id,
        message: verified
          ? "Your account is now verified."
          : "Your account is not verified. Please contact support if you believe this is an error.",
        type: "system",
        status: "New",
      },
      io
    );
  }

  return user;
};

// Suspend user (set suspended: true) - CLEAR SESSION
export const suspendUser = async (id, io) => {
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
    await logAction(user._id, user.id_number, user.name, "User Suspended", "User account suspended");
    await createNotification(
      {
        userId: user._id,
        message: "Your account has been suspended. Contact support for more information.",
        type: "system",
        status: "New",
      },
      io
    );
    
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
export const unsuspendUser = async (id, io) => {
  const user = await User.findByIdAndUpdate(
    id,
    { suspended: false },
    { new: true }
  ).select("-password -sessionToken");

  if (user) {
    await logAction(user._id, user.id_number, user.name, "User Unsuspended", "User account unsuspended");
    await createNotification(
      {
        userId: user._id,
        message: "Your account has been restored. You may now log in.",
        type: "system",
        status: "New",
      },
      io
    );
  }

  return user;
};

// Toggle suspend state (accepts boolean suspend) - CLEAR SESSION IF SUSPENDING
export const toggleSuspend = async (id, suspend, io) => {
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
      user._id,
      user.id_number,
      user.name,
      suspend ? "User Suspended" : "User Unsuspended",
      suspend ? "User account suspended via admin toggle" : "User account unsuspended via admin toggle"
    );

    await createNotification(
      {
        userId: user._id,
        message: suspend
          ? "Your account has been suspended. Contact support for more information."
          : "Your account has been restored. You may now log in.",
        type: "system",
        status: "New",
      },
      io
    );
    
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
export const archiveUser = async (id) => {
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
  
  if (user) await logAction(user._id, user.id_number, user.name, "User Archived", "User account archived");
  return user;
};

// ✅ Restore user
export const restoreUser = async (id) => {
  const user = await User.findByIdAndUpdate(
    id,
    { archived: false, archivedAt: null },
    { new: true }
  ).select("-password -sessionToken");
  
  if (user) await logAction(user._id, user.id_number, user.name, "User Restored", "User account restored from archive");
  return user;
};

// ✅ Delete archived user
export const deleteArchivedUser = async (id) => {
  const user = await User.findByIdAndDelete(id);
  if (user) await logAction(user._id, user.id_number, user.name, "User Deleted", "Archived user permanently deleted");
  return user;
};

// Helper function to create notification (same as before)
const createNotification = async (data, io) => {
  try {
    const notification = new Notification({
      userId: data.userId,
      type: data.type || "system",
      title: data.title || "System Notification",
      message: data.message,
      status: data.status || "New",
      isRead: false
    });
    await notification.save();

    if (io) {
      io.to(data.userId.toString()).emit('newNotification', notification);
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};