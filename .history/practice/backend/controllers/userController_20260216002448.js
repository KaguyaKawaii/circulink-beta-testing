const mongoose = require("mongoose");
const userService = require("../services/userService");
const User = require("../models/User");

// ✅ FIXED: Single Cloudinary import without duplicate declaration
const cloudinary = require('cloudinary').v2;

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

// 📌 Fetch users by role (used in AdminReports for staff assignment)
exports.getUsersByRole = async (req, res) => {
  try {
    const query = {};
    if (req.query.role) {
      query.role = req.query.role;
    }
    const users = await User.find(query).select("-password");
    res.json({ success: true, users });
  } catch (err) {
    console.error("Get Users By Role Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

// 📌 Add User (Admin)
exports.addUser = async (req, res) => {
  try {
    const newUser = await userService.addUser(req.body, req.file);
    res.status(201).json({ success: true, message: "User added successfully.", user: newUser });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Failed to add user." });
  }
};

// 📌 Signup
exports.signup = async (req, res) => {
  try {
    const newUser = await userService.signup(req.body, req.file);
    res.status(201).json({ success: true, message: "User registered successfully.", user: newUser });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Failed to signup." });
  }
};

// 📌 Login
exports.login = async (req, res) => {
  try {
    const userData = await userService.login(req.body);
    res.json({ success: true, message: "Login successful.", user: userData });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message || "Invalid credentials." });
  }
};

// 📌 Update Profile (Self) - FIXED ENDPOINT
exports.updateProfile = async (req, res) => {
  try {
    const updatedUser = await userService.updateProfile(req.params.id, req.body);
    res.json({ success: true, message: "Profile updated successfully.", user: updatedUser });
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to update profile." });
  }
};

// 📌 Upload Profile Picture - CLOUDINARY VERSION (FIXED)
exports.uploadPicture = async (req, res) => {
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

    // ✅ FIXED: Check if Cloudinary is available
    if (!cloudinary) {
      throw new Error("Cloudinary not configured properly");
    }

    // ✅ FIXED: Check Cloudinary configuration
    const config = cloudinary.config();
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      console.error("Cloudinary config missing:", {
        cloud_name: !!config.cloud_name,
        api_key: !!config.api_key,
        api_secret: !!config.api_secret
      });
      throw new Error("Cloudinary configuration is incomplete. Please check your environment variables.");
    }

    // Convert buffer to base64 for Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    console.log("Uploading to Cloudinary...");
    console.log("Cloudinary config check:", {
      cloud_name: config.cloud_name ? "✓" : "✗",
      api_key: config.api_key ? "✓" : "✗",
      api_secret: config.api_secret ? "✓" : "✗"
    });

    // ✅ FIXED: Upload to Cloudinary with better error handling
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

    // Update user profile with Cloudinary URL
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { profilePicture: cloudinaryResult.secure_url },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({ 
      success: true, 
      message: "Profile picture updated successfully.", 
      user: updatedUser,
      imageUrl: cloudinaryResult.secure_url
    });

  } catch (err) {
    console.error("=== UPLOAD ERROR ===");
    console.error("Upload Picture Error:", err);
    
    // ✅ FIXED: Better error messages
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

// 📌 Remove Profile Picture - CLOUDINARY VERSION
exports.removePicture = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // If user has a Cloudinary profile picture, delete it from Cloudinary
    if (user.profilePicture && user.profilePicture.includes('cloudinary')) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = user.profilePicture.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0];
        
        // Get the full public_id with folder
        const fullPublicId = `profile-pictures/${publicId}`;
        await cloudinary.uploader.destroy(fullPublicId);
        console.log("Deleted from Cloudinary:", fullPublicId);
      } catch (cloudinaryError) {
        console.error("Error deleting from Cloudinary:", cloudinaryError);
        // Continue anyway - we still want to remove the reference
      }
    }

    // Remove profile picture reference from user
    user.profilePicture = null;
    await user.save();

    res.json({ 
      success: true, 
      message: "Profile picture removed successfully.", 
      user 
    });
  } catch (err) {
    console.error("Remove Picture Error:", err);
    res.status(400).json({ 
      success: false, 
      message: err.message || "Failed to remove picture." 
    });
  }
};

// 📌 Change Password - ENHANCED DEBUGGING
exports.changePassword = async (req, res) => {
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
    
    console.log("✅ Password change successful in service");
    
    res.json({ success: true, message: "Password changed successfully." });
    
  } catch (err) {
    console.error("❌ Password change error:", err);
    console.error("Error stack:", err.stack);
    
    res.status(400).json({ success: false, message: err.message || "Failed to change password." });
  }
};

// 📌 Admin Edit User
exports.adminEditUser = async (req, res) => {
  try {
    const updatedUser = await userService.adminEditUser(req.params.id, req.body, req.file);
    res.json({ success: true, message: "User updated successfully.", user: updatedUser });
  } catch (err) {
    console.error("Admin Edit User Error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to edit user." });
  }
};

// 📌 Archive User
exports.archiveUser = async (req, res) => {
  try {
    const archivedUser = await userService.archiveUser(req.params.id);
    if (!archivedUser) return res.status(404).json({ success: false, message: "User not found." });
    res.json({ success: true, message: "User archived.", user: archivedUser });
  } catch (err) {
    console.error("Archive User Error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to archive user." });
  }
};

// 📌 Restore User
exports.restoreUser = async (req, res) => {
  try {
    const restoredUser = await userService.restoreUser(req.params.id);
    if (!restoredUser) return res.status(404).json({ success: false, message: "User not found." });
    res.json({ success: true, message: "User restored.", user: restoredUser });
  } catch (err) {
    console.error("Restore User Error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to restore user." });
  }
};

// 📌 Get Archived Users
exports.getArchivedUsers = async (req, res) => {
  try {
    const archivedUsers = await userService.getArchivedUsers();
    res.json({ success: true, users: archivedUsers });
  } catch (err) {
    console.error("Get Archived Users Error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch archived users." });
  }
};

// 📌 Delete Archived User
exports.deleteArchivedUser = async (req, res) => {
  try {
    const deletedUser = await userService.deleteArchivedUser(req.params.id);
    if (!deletedUser) return res.status(404).json({ success: false, message: "User not found." });
    res.json({ success: true, message: "Archived user deleted permanently." });
  } catch (err) {
    console.error("Delete Archived User Error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to delete archived user." });
  }
};

// 📌 Get All Users (non-archived)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ success: true, users });
  } catch (err) {
    console.error("Get All Users Error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch users." });
  }
};

// ✅ Toggle suspend
exports.toggleSuspendUser = async (req, res) => {
  try {
    const suspend = req.body.suspend === true || req.body.suspend === "true";
    const io = req.io || null;

    const user = await userService.toggleSuspend(req.params.id, suspend, io);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: `User ${user.suspended ? "suspended" : "unsuspended"} successfully`,
      user,
    });
  } catch (error) {
    console.error("Toggle Suspend Error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to toggle suspension" });
  }
};

// ✅ Suspend User
exports.suspendUser = async (req, res) => {
  try {
    const user = await userService.suspendUser(req.params.id, req.io);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, message: "User suspended successfully", user });
  } catch (error) {
    console.error("Suspend User Error:", error);
    res.status(500).json({ success: false, message: "Error suspending user", error: error.message });
  }
};

// ✅ Unsuspend User
exports.unsuspendUser = async (req, res) => {
  try {
    const user = await userService.unsuspendUser(req.params.id, req.io);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, message: "User unsuspended successfully", user });
  } catch (error) {
    console.error("Unsuspend User Error:", error);
    res.status(500).json({ success: false, message: "Error unsuspending user", error: error.message });
  }
};

// ✅ Toggle Verify User with WebSocket Notifications - FIXED VERSION
exports.toggleVerifyUser = async (req, res) => {
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

    // ✅ WebSocket notification to the user
    if (io) {
      try {
        // Dynamically import Notification model to avoid circular dependency
        const Notification = require("../models/Notification");
        
        // Create notification in database
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

        // Emit real-time notification to the specific user
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

        // Also emit to admin room for real-time updates
        io.to('admin').emit('userVerificationUpdated', {
          userId: user._id,
          verified: verifyStatus,
          userName: user.name
        });

        console.log("✅ Admin update emitted");

      } catch (notifyError) {
        console.error("❌ Notification error:", notifyError);
        // Don't fail the whole request if notification fails
      }
    } else {
      console.log("❌ WebSocket (io) not available - notifications skipped");
    }

    res.json({
      success: true,
      message: `User ${verifyStatus ? "verified" : "unverified"} successfully`,
      user,
    });
  } catch (error) {
    console.error("Toggle Verify Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to toggle verification" 
    });
  }
};

// 📌 Verify User (simple version without notifications)
exports.verifyUser = async (req, res) => {
  try {
    const { verified } = req.body;
    if (verified === undefined) {
      return res.status(400).json({ success: false, message: "Verified status is required." });
    }
    const updatedUser = await userService.verifyUser(req.params.id, verified);
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    res.json({
      success: true,
      message: `User ${verified ? "verified" : "unverified"}.`,
      user: updatedUser
    });
  } catch (err) {
    console.error("Verify User Error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to update verification status." });
  }
};

// 📌 Get User By ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID format" });
    }
    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error("Error fetching user by ID:", err);
    res.status(500).json({ success: false, message: "Failed to fetch user" });
  }
};

// 📌 Search Users
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: "Search query required" });
    }
    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } },
        { id_number: { $regex: q, $options: 'i' } }
      ],
      archived: { $ne: true }
    }).select('name email department role id_number');
    res.json({ success: true, users });
  } catch (err) {
    console.error("Search users error:", err);
    res.status(500).json({ success: false, message: "Search failed" });
  }
};

// 📌 Get Unread Counts
exports.getUnreadCounts = async (req, res) => {
  try {
    res.json({ success: true, counts: { notifications: 0, messages: 0 } });
  } catch (err) {
    console.error("Get Unread Counts Error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch unread counts." });
  }
};

// 📌 Check if participant exists and is verified
exports.checkParticipant = async (req, res) => {
  try {
    const { id_number } = req.query;
    if (!id_number) {
      return res.status(400).json({ message: "id_number is required" });
    }

    const user = await User.findOne({ id_number });
    if (!user) {
      return res.json({ exists: false, verified: false });
    }

    res.json({
      exists: true,
      verified: user.verified,
      id_number: user.id_number,
      name: user.name,
      course: user.course || "N/A",
      year_level: user.yearLevel || "N/A",
      department: user.department || "N/A",
      role: user.role || "Student",
    });
  } catch (err) {
    console.error("Check participant error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 📌 Get User Unread Counts (for Navigation_User) - FIXED VERSION
exports.getUserUnreadCounts = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Get unread messages count
    const Message = require("../models/Message");
    const messagesCount = await Message.countDocuments({
      receiver: userId,
      read: false
    });

    // Get unread notifications count
    let notificationsCount = 0;
    try {
      const Notification = require("../models/Notification");
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
exports.getAllUsersForMessaging = async (req, res) => {
  try {
    const users = await User.find({ 
      archived: { $ne: true },
      role: { $ne: 'admin' } // Exclude admins
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
exports.testCloudinary = async (req, res) => {
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