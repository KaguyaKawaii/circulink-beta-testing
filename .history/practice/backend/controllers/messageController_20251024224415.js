const messageService = require("../services/messageService");
const Message = require("../models/Message");

/* ───────────────────────────────
   User Messaging Endpoints
─────────────────────────────── */
// In messageController.js - Update sendMessage function
// In messageController.js - Update sendMessage function
exports.sendMessage = async (req, res) => {
  try {
    const { sender, receiver, content } = req.body;

    if (!sender || !receiver || !content) {
      return res.status(400).json({ message: "Missing sender, receiver, or content" });
    }

    let messageData;

    // Decide routing logic - UPDATED: Admin should NOT see user-staff conversations
    if (sender === "admin") {
      if (receiver.includes("Floor")) {
        messageData = await messageService.sendMessageFromAdminToFloor(receiver, content);
      } else {
        messageData = await messageService.sendMessageFromAdminToUser(receiver, content);
      }
    } else if (receiver === "admin") {
      messageData = await messageService.sendMessageToAdmin(sender, content);
    } else if (receiver.includes("Floor")) {
      messageData = await messageService.sendMessageToFloor(sender, receiver, content);
    } else {
      // USER TO STAFF MESSAGE - Admin should NOT see this
      messageData = await messageService.sendMessageUserToStaff(sender, receiver, content);
    }

    const io = req.app.get("io");

    // Notify both sender and receiver rooms
    io.to(sender).emit("newMessage", messageData);
    io.to(receiver).emit("newMessage", messageData);

    // DO NOT notify admin for user-staff conversations
    const isUserStaffConversation = 
      sender !== "admin" && 
      receiver !== "admin" && 
      !receiver.includes("Floor") && 
      !sender.includes("Floor");

    if (!isUserStaffConversation) {
      // Only notify admin for direct admin conversations
      io.to("admin").emit("newMessage", messageData);
    }

    // Emit unread count updates for receiver
    if (receiver !== "admin" && !receiver.includes("Floor")) {
      const unreadCount = await messageService.getUnreadCount(receiver);
      io.to(receiver).emit("unreadCountUpdate", { userId: receiver, count: unreadCount });
    }

    res.status(201).json(messageData);
  } catch (err) {
    console.error("Failed to send message:", err);
    res.status(500).json({ message: "Failed to send message." });
  }
};

// User sends message to floor - FIXED for staff notifications
exports.sendMessageToFloor = async (req, res) => {
  try {
    const { userId, floor, content } = req.body;
    
    const messageData = await messageService.sendMessageToFloor(userId, floor, content);

    const io = req.app.get("io");
    
    // Notify floor staff and user
    io.to(floor).emit("newMessage", messageData);
    io.to(userId).emit("newMessage", messageData);

    // Get all staff members assigned to this floor and update their unread counts
    const Staff = require("../models/User"); // Assuming User model is used for staff
    const floorStaff = await Staff.find({ 
      role: "staff", 
      floor: floor 
    }, "_id");

    // Update unread counts for all staff on this floor
    for (const staff of floorStaff) {
      const unreadCount = await messageService.getStaffTotalUnreadCount(staff._id.toString());
      io.to(staff._id.toString()).emit("unreadCountUpdate", { 
        userId: staff._id.toString(), 
        count: unreadCount 
      });
    }

    res.status(201).json({ message: "Message sent to floor", data: messageData });
  } catch (err) {
    console.error("Failed to send floor message:", err);
    res.status(500).json({ message: "Failed to send message to floor." });
  }
};

// User sends message to admin
exports.sendMessageToAdmin = async (req, res) => {
  try {
    const { userId, content } = req.body;
    
    const messageData = await messageService.sendMessageToAdmin(userId, content);

    const io = req.app.get("io");
    
    // Notify admin and user
    io.to("admin").emit("newMessage", messageData);
    io.to(userId).emit("newMessage", messageData);

    res.status(201).json({ message: "Message sent to admin", data: messageData });
  } catch (err) {
    console.error("Failed to send admin message:", err);
    res.status(500).json({ message: "Failed to send message to admin." });
  }
};

/* ───────────────────────────────
   Staff Messaging Endpoints
─────────────────────────────── */

// Staff replies to user (appears as floor staff) - FIXED: Auto-mark as read when staff replies
exports.staffReplyToUser = async (req, res) => {
  try {
    const { staffId, userId, content } = req.body;
    
    const messageData = await messageService.sendMessageFromStaff(staffId, userId, content);

    const io = req.app.get("io");
    
    // Emit to user and staff
    io.to(userId).emit("newMessage", messageData);
    io.to(staffId).emit("newMessage", messageData);

    // AUTO-MARK ALL MESSAGES FROM THIS USER AS READ FOR THIS STAFF
    await messageService.markMessagesAsReadFromUser(staffId, userId);

    // Update unread count for user
    const userUnreadCount = await messageService.getUnreadCount(userId);
    io.to(userId).emit("unreadCountUpdate", { userId, count: userUnreadCount });

    // Update unread count for staff (this should now show 0 for this conversation)
    const staffUnreadCount = await messageService.getStaffTotalUnreadCount(staffId);
    io.to(staffId).emit("unreadCountUpdate", { userId: staffId, count: staffUnreadCount });

    // Also emit specific conversation update for immediate UI refresh
    const conversationUnreadCount = await messageService.getUnreadCountByUser(staffId, userId);
    io.to(staffId).emit("conversationUnreadUpdate", { 
      staffId, 
      userId, 
      count: conversationUnreadCount 
    });

    res.status(201).json({ message: "Message sent", data: messageData });
  } catch (err) {
    console.error("Failed to send staff reply:", err);
    res.status(500).json({ message: "Failed to send message." });
  }
};

// Staff sends message to admin
exports.staffMessageToAdmin = async (req, res) => {
  try {
    const { staffId, content } = req.body;
    
    const messageData = await messageService.sendMessageFromStaffToAdmin(staffId, content);

    const io = req.app.get("io");
    
    // Emit to admin and staff
    io.to("admin").emit("newMessage", messageData);
    io.to(staffId).emit("newMessage", messageData);

    // AUTO-MARK ADMIN MESSAGES AS READ FOR THIS STAFF
    await messageService.markMessagesAsRead(staffId, "admin");

    // Update unread count for staff
    const unreadCount = await messageService.getStaffTotalUnreadCount(staffId);
    io.to(staffId).emit("unreadCountUpdate", { userId: staffId, count: unreadCount });

    res.status(201).json({ message: "Message sent to admin", data: messageData });
  } catch (err) {
    console.error("Failed to send staff message to admin:", err);
    res.status(500).json({ message: "Failed to send message to admin." });
  }
};

/* ───────────────────────────────
   Admin Messaging Endpoints
─────────────────────────────── */

// Admin sends message to user
exports.adminMessageToUser = async (req, res) => {
  try {
    const { userId, content } = req.body;
    
    const messageData = await messageService.sendMessageFromAdminToUser(userId, content);

    const io = req.app.get("io");
    
    // Emit to user and admin
    io.to(userId).emit("newMessage", messageData);
    io.to("admin").emit("newMessage", messageData);

    // Update unread count for user
    const unreadCount = await messageService.getUnreadCount(userId);
    io.to(userId).emit("unreadCountUpdate", { userId, count: unreadCount });

    res.status(201).json({ message: "Message sent to user", data: messageData });
  } catch (err) {
    console.error("Failed to send admin message to user:", err);
    res.status(500).json({ message: "Failed to send message to user." });
  }
};

// Admin sends message to staff
exports.adminMessageToStaff = async (req, res) => {
  try {
    const { staffId, content } = req.body;
    
    const messageData = await messageService.sendMessageFromAdminToStaff(staffId, content);

    const io = req.app.get("io");
    
    // Emit to staff and admin
    io.to(staffId).emit("newMessage", messageData);
    io.to("admin").emit("newMessage", messageData);

    // Update unread count for staff
    const unreadCount = await messageService.getStaffTotalUnreadCount(staffId);
    io.to(staffId).emit("unreadCountUpdate", { userId: staffId, count: unreadCount });

    res.status(201).json({ message: "Message sent to staff", data: messageData });
  } catch (err) {
    console.error("Failed to send admin message to staff:", err);
    res.status(500).json({ message: "Failed to send message to staff." });
  }
};

// Admin sends message to floor
exports.adminMessageToFloor = async (req, res) => {
  try {
    const { floor, content } = req.body;
    
    const messageData = await messageService.sendMessageFromAdminToFloor(floor, content);

    const io = req.app.get("io");
    
    // Emit to floor and admin
    io.to(floor).emit("newMessage", messageData);
    io.to("admin").emit("newMessage", messageData);

    // Get all staff members assigned to this floor and update their unread counts
    const Staff = require("../models/User");
    const floorStaff = await Staff.find({ 
      role: "staff", 
      floor: floor 
    }, "_id");

    // Update unread counts for all staff on this floor
    for (const staff of floorStaff) {
      const unreadCount = await messageService.getStaffTotalUnreadCount(staff._id.toString());
      io.to(staff._id.toString()).emit("unreadCountUpdate", { 
        userId: staff._id.toString(), 
        count: unreadCount 
      });
    }

    res.status(201).json({ message: "Message sent to floor", data: messageData });
  } catch (err) {
    console.error("Failed to send admin message to floor:", err);
    res.status(500).json({ message: "Failed to send message to floor." });
  }
};

/* ───────────────────────────────
   Conversation Fetching Endpoints
─────────────────────────────── */

// Get floor conversation (user perspective)
exports.getFloorConversation = async (req, res) => {
  try {
    const { userId, floor } = req.params;
    
    const messages = await messageService.getFloorConversation(userId, floor);
    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch floor conversation:", err);
    res.status(500).json({ message: "Failed to fetch conversation." });
  }
};

// Get user-admin conversation
exports.getUserAdminConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const messages = await messageService.getUserAdminConversation(userId);
    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch user-admin conversation:", err);
    res.status(500).json({ message: "Failed to fetch conversation." });
  }
};

// Get staff's conversation with a user
exports.getStaffUserConversation = async (req, res) => {
  try {
    const { staffId, userId } = req.params;
    
    const messages = await messageService.getStaffUserConversation(staffId, userId);
    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch staff-user conversation:", err);
    res.status(500).json({ message: "Failed to fetch conversation." });
  }
};

// Get staff-admin conversation
exports.getStaffAdminConversation = async (req, res) => {
  try {
    const { staffId } = req.params;
    
    const messages = await messageService.getStaffAdminConversation(staffId);
    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch staff-admin conversation:", err);
    res.status(500).json({ message: "Failed to fetch conversation." });
  }
};

// Get admin conversation
exports.getAdminConversation = async (req, res) => {
  try {
    const { entityId } = req.params;
    
    const messages = await Message.find({
      $or: [
        { sender: entityId, receiver: 'admin' },
        { sender: 'admin', receiver: entityId }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'name')
    .populate('receiver', 'name');

    res.json(messages);
  } catch (error) {
    console.error('Error fetching admin conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
};


/* ───────────────────────────────
   List/Recipient Endpoints
─────────────────────────────── */

// Get users for a floor (staff perspective)
exports.getFloorUsers = async (req, res) => {
  try {
    const { floor } = req.params;
    
    const users = await messageService.getFloorUsers(floor);
    res.json(users);
  } catch (err) {
    console.error("Failed to fetch floor users:", err);
    res.status(500).json({ message: "Failed to fetch floor users." });
  }
};

// In messageController.js - Update getAdminRecipients
exports.getAdminRecipients = async (req, res) => {
  try {
    const User = require("../models/User");
    
    // ONLY find direct admin conversations
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: 'admin' },
            { receiver: 'admin' }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ['$sender', 'admin'] },
              then: '$receiver',
              else: '$sender'
            }
          },
          latestMessage: { $last: '$content' },
          latestMessageTimestamp: { $last: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ['$sender', 'admin'] },
                  { $eq: ['$read', false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    console.log('Found admin conversations:', conversations.length);

    // Get user details for each conversation
    const recipients = await Promise.all(
      conversations.map(async (conv) => {
        try {
          // Skip if not a valid user ID or if it's a floor
          if (!conv._id || typeof conv._id !== 'string' || conv._id.includes('Floor')) {
            return null;
          }

          const user = await User.findOne({ _id: conv._id })
            .select('name email role department');
          
          if (!user) {
            console.log('User not found for ID:', conv._id);
            return null;
          }

          return {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            type: user.role === 'staff' ? 'staff' : 'user',
            department: user.department,
            latestMessage: conv.latestMessage || 'No messages yet',
            latestMessageTimestamp: conv.latestMessageTimestamp,
            unreadCount: conv.unreadCount || 0,
            timestamp: conv.latestMessageTimestamp || new Date().toISOString()
          };
        } catch (error) {
          console.error('Error processing recipient:', conv._id, error);
          return null;
        }
      })
    );

    // Filter out null values and sort by latest message
    const filteredRecipients = recipients.filter(r => r !== null)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log('Final admin recipients:', filteredRecipients.length);

    res.json(filteredRecipients);
  } catch (error) {
    console.error('Error fetching admin recipients:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recipients',
      details: error.message 
    });
  }
};

// Get recipients for staff
exports.getStaffRecipients = async (req, res) => {
  try {
    const { staffId } = req.params;
    
    const recipients = await messageService.getStaffRecipients(staffId);
    res.json(recipients);
  } catch (err) {
    console.error("Failed to fetch staff recipients:", err);
    res.status(500).json({ message: "Failed to fetch recipients." });
  }
};

/* ───────────────────────────────
   Unread Messages Endpoints - FIXED
─────────────────────────────── */

// Mark messages as read - UPDATED for staff-user marking
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { userId, conversationId, messageIds, staffId, targetUserId } = req.body;
    
    if (!userId && !staffId) {
      return res.status(400).json({ message: "User ID or Staff ID is required" });
    }
    
    let result;
    const actualUserId = userId || staffId;
    
    // If marking messages from specific user for staff
    if (staffId && targetUserId) {
      result = await messageService.markMessagesAsReadFromUser(staffId, targetUserId);
    } 
    // Original logic for conversation-based marking
    else if (conversationId || messageIds) {
      result = await messageService.markMessagesAsRead(actualUserId, conversationId, messageIds);
    }
    // Fallback: mark all unread for user
    else {
      result = await messageService.markMessagesAsRead(actualUserId, null, null);
    }
    
    const io = req.app.get("io");
    
    // Update unread counts
    if (staffId) {
      const unreadCount = await messageService.getStaffTotalUnreadCount(staffId);
      io.to(staffId).emit("unreadCountUpdate", { userId: staffId, count: unreadCount });
      
      // Also emit specific conversation update if targetUserId is provided
      if (targetUserId) {
        const conversationUnreadCount = await messageService.getUnreadCountByUser(staffId, targetUserId);
        io.to(staffId).emit("conversationUnreadUpdate", { 
          staffId, 
          userId: targetUserId, 
          count: conversationUnreadCount 
        });
      }
    } else {
      const unreadCount = await messageService.getUnreadCount(actualUserId);
      io.to(actualUserId).emit("unreadCountUpdate", { userId: actualUserId, count: unreadCount });
    }
    
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error("Failed to mark messages as read:", err);
    res.status(500).json({ message: "Failed to mark messages as read." });
  }
};

// Get unread message count for user
exports.getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { conversationId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    
    let count;
    if (conversationId) {
      count = await messageService.getUnreadCountByConversation(userId, conversationId);
    } else {
      count = await messageService.getUnreadCount(userId);
    }
    
    res.json({ count: count || 0 });
  } catch (err) {
    console.error("Failed to get unread count:", err);
    res.status(500).json({ message: "Failed to get unread count." });
  }
};

// Get unread count by conversation
exports.getUnreadCountByConversation = async (req, res) => {
  try {
    const { userId, conversationId } = req.params;
    
    if (!userId || !conversationId) {
      return res.status(400).json({ message: "User ID and Conversation ID are required" });
    }
    
    const count = await messageService.getUnreadCountByConversation(userId, conversationId);
    res.json({ count: count || 0 });
  } catch (err) {
    console.error("Failed to get unread count by conversation:", err);
    res.status(500).json({ message: "Failed to get unread count." });
  }
};

// NEW: Get unread count for specific user (for staff)
exports.getUnreadCountByUser = async (req, res) => {
  try {
    const { staffId, userId } = req.params;
    
    if (!staffId || !userId) {
      return res.status(400).json({ message: "Staff ID and User ID are required" });
    }
    
    const count = await messageService.getUnreadCountByUser(staffId, userId);
    res.json({ count: count || 0 });
  } catch (err) {
    console.error("Failed to get unread count by user:", err);
    res.status(500).json({ message: "Failed to get unread count by user." });
  }
};

// Get total unread count for staff (floor users + admin)
exports.getStaffTotalUnreadCount = async (req, res) => {
  try {
    const { staffId } = req.params;
    
    if (!staffId) {
      return res.status(400).json({ message: "Staff ID is required" });
    }
    
    const count = await messageService.getStaffTotalUnreadCount(staffId);
    res.json({ count: count || 0 });
  } catch (err) {
    console.error("Failed to get staff total unread count:", err);
    res.status(500).json({ message: "Failed to get staff unread count." });
  }
};

// Get unread count for staff from specific floor
exports.getStaffFloorUnreadCount = async (req, res) => {
  try {
    const { staffId, floor } = req.params;
    
    if (!staffId || !floor) {
      return res.status(400).json({ message: "Staff ID and Floor are required" });
    }
    
    const count = await messageService.getStaffUnreadCountFromFloor(staffId, floor);
    res.json({ count: count || 0 });
  } catch (err) {
    console.error("Failed to get staff floor unread count:", err);
    res.status(500).json({ message: "Failed to get staff floor unread count." });
  }
};

// NEW: Get unread breakdown for staff (per user counts)
exports.getStaffUnreadBreakdown = async (req, res) => {
  try {
    const { staffId } = req.params;
    
    if (!staffId) {
      return res.status(400).json({ message: "Staff ID is required" });
    }
    
    const breakdown = await messageService.getStaffUnreadBreakdown(staffId);
    res.json(breakdown);
  } catch (err) {
    console.error("Failed to get staff unread breakdown:", err);
    res.status(500).json({ message: "Failed to get staff unread breakdown." });
  }
};

// 📌 Mark messages as read when user replies - FIXED VERSION
// 📌 Mark messages as read when user replies - FIXED VERSION
exports.markMessagesAsReadOnReply = async (req, res) => {
  try {
    const { userId, receiver, conversationType } = req.body;

    let query = {};
    if (conversationType === "floor") {
      // FIXED: Mark messages where user is receiver and sender is the floor staff
      query = {
        receiver: userId,
        $or: [
          { sender: receiver }, // Messages from the floor to user
          { floor: receiver, senderType: "staff" } // Messages from floor staff to user
        ],
        read: false
      };
    } else if (conversationType === "admin") {
      // FIXED: Mark messages where user is receiver and sender is admin
      query = {
        receiver: userId,
        sender: "admin",
        read: false
      };
    }

    const result = await Message.updateMany(
      query,
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );

    // Emit socket event to refresh unread counts
    const io = req.app.get('io');
    io.to(userId).emit('refresh-unread-counts', { userId });

    res.json({
      success: true,
      message: "Messages marked as read",
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Error marking messages as read on reply:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark messages as read"
    });
  }
};


// 📌 Mark entire conversation as read
exports.markConversationAsRead = async (req, res) => {
  try {
    const { userId, receiver, conversationType } = req.body;

    let query = {};
    if (conversationType === "floor") {
      // Mark all unread messages from this floor to this user
      query = {
        receiver: userId,
        sender: receiver,
        read: false
      };
    } else if (conversationType === "admin") {
      // Mark all unread messages from admin to this user
      query = {
        receiver: userId,
        sender: "admin", 
        read: false
      };
    }

    const result = await Message.updateMany(
      query,
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );

    // Emit socket event to refresh unread counts
    req.app.get('io').emit('refresh-unread-counts', { userId });

    res.json({
      success: true,
      message: "Conversation marked as read",
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark conversation as read"
    });
  }
};

// 📌 Get unread messages for a user (NEW FUNCTION)
exports.getUnreadMessages = async (req, res) => {
  try {
    const { userId } = req.params;

    const unreadMessages = await Message.find({
      receiver: userId,
      read: false
    }).select('_id sender receiver content createdAt');

    res.json({
      success: true,
      unreadMessages,
      count: unreadMessages.length
    });
  } catch (error) {
    console.error("Error fetching unread messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread messages"
    });
  }
};

// NEW: Get unread count for specific floor
exports.getUnreadCountForFloor = async (req, res) => {
  try {
    const { userId, floor } = req.params;
    
    if (!userId || !floor) {
      return res.status(400).json({ message: "User ID and Floor are required" });
    }
    
    const count = await messageService.getUnreadCountForFloor(userId, floor);
    res.json({ count: count || 0 });
  } catch (err) {
    console.error("Failed to get unread count for floor:", err);
    res.status(500).json({ message: "Failed to get unread count for floor." });
  }
};

// NEW: Get unread count for admin conversation
exports.getUnreadCountForAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    
    const count = await messageService.getUnreadCountForAdmin(userId);
    res.json({ count: count || 0 });
  } catch (err) {
    console.error("Failed to get unread count for admin:", err);
    res.status(500).json({ message: "Failed to get unread count for admin." });
  }
};