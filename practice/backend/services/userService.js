import User from "../models/User.js";
import bcrypt from "bcryptjs";
import logAction from "../utils/logAction.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";
import Notification from "../models/Notification.js";
import notificationService from "./notificationService.js";

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

// Add User (Admin) - FIXED: Let the model's pre-save hook hash the password
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

  // ✅ FIXED: Don't hash here - let the model's pre-save hook handle it
  // Just pass the plain password to the model

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
  });

  await newUser.save();
  await logAction(newUser._id, newUser.id_number, newUser.name, "User Created", "Added via Admin Panel");
  
  // Return user without password
  const userResponse = newUser.toObject();
  delete userResponse.password;
  return userResponse;
};

// Signup - FIXED: Let the model's pre-save hook hash the password
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

  // ✅ FIXED: Don't hash here - let the model's pre-save hook handle it

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
    department,
    course: role === "Student" ? course : "N/A",
    year_level: role === "Student" ? yearLevel : "N/A",
    role,
    profilePicture,
  });

  await newUser.save();
  await logAction(newUser._id, newUser.id_number, newUser.name, "User Signup", "Registered account");

  // Return user without password
  const userResponse = newUser.toObject();
  delete userResponse.password;
  return userResponse;
};

// Login
export const login = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new Error("Invalid credentials.");

  const validPass = await bcrypt.compare(password, user.password);
  if (!validPass) throw new Error("Invalid credentials.");

    if (user.suspended) {
    throw new Error("This account is suspended. Please contact the administrator.");
  }

  await logAction(user._id, user.id_number, user.name, "User Login", "Logged in");

  const { _id, name, id_number, department, course, year_level, floor, role, verified, profilePicture } = user;
  return { _id, name, email: user.email, id_number, department, course, year_level, floor, role, verified, profilePicture };
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
  return userResponse;
};

// Admin Edit User - FIXED: Password handling is correct (let pre-save hook hash it)
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

  // ✅ Password handling is correct - let pre-save hook hash it
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
  return userResponse;
};

// Change Password - FIXED VERSION with debugging
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

  // ✅ FIXED: Set the plain new password and let the model's pre-save hook hash it
  user.password = newPassword;
  await user.save();

  console.log("✅ Password updated successfully in database");

  // Verify the new password works
  const verifyNewPassword = await bcrypt.compare(newPassword, user.password);
  console.log("New password verification after save:", verifyNewPassword);

  await logAction(user._id, user.id_number, user.name, "Password Changed", "User changed password");

  return true;
};

// ✅ Get all non-archived users
export const getAllUsers = async () => User.find({ archived: { $ne: true } }).select("-password").sort({ created_at: -1 });

// ✅ Get archived users with archivedAt timestamp
export const getArchivedUsers = async () => User.find({ archived: true })
  .select("-password")
  .sort({ archivedAt: -1 });

// ✅ Get user by ID
export const getUserById = async (id) => User.findById(id).select("-password");

// ✅ Verify or Unverify user
export const verifyUser = async (id, verified, io) => {
  const user = await User.findByIdAndUpdate(
    id,
    { verified },
    { new: true }
  ).select("-password");

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

// Suspend user (set suspended: true)
export const suspendUser = async (id, io) => {
  const user = await User.findByIdAndUpdate(
    id,
    { suspended: true },
    { new: true }
  ).select("-password");

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
  }

  return user;
};

// Unsuspend user (set suspended: false)
export const unsuspendUser = async (id, io) => {
  const user = await User.findByIdAndUpdate(
    id,
    { suspended: false },
    { new: true }
  ).select("-password");

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

// Toggle suspend state (accepts boolean suspend)
export const toggleSuspend = async (id, suspend, io) => {
  const user = await User.findByIdAndUpdate(
    id,
    { suspended: !!suspend },
    { new: true }
  ).select("-password");

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
  }

  return user;
};

// ✅ Archive user with timestamp
export const archiveUser = async (id) => {
  const user = await User.findByIdAndUpdate(
    id,
    { archived: true, archivedAt: new Date() },
    { new: true }
  ).select("-password");
  
  if (user) await logAction(user._id, user.id_number, user.name, "User Archived", "User account archived");
  return user;
};

// ✅ Restore user
export const restoreUser = async (id) => {
  const user = await User.findByIdAndUpdate(
    id,
    { archived: false, archivedAt: null },
    { new: true }
  ).select("-password");
  
  if (user) await logAction(user._id, user.id_number, user.name, "User Restored", "User account restored from archive");
  return user;
};

// ✅ Delete archived user
export const deleteArchivedUser = async (id) => {
  const user = await User.findByIdAndDelete(id);
  if (user) await logAction(user._id, user.id_number, user.name, "User Deleted", "Archived user permanently deleted");
  return user;
};