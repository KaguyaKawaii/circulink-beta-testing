const messageService = require("../services/messageService");
const Message = require("../models/Message");

/* ───────────────────────────────
   User Messaging Endpoints
─────────────────────────────── */
exports.sendMessage = async (req, res) => {
  try {
    const { sender, receiver, content } = req.body;

    if (!sender || !receiver || !content) {
      return res.status(400).json({ message: "Missing sender, receiver, or content" });
    }

    let messageData;

    if (sender === "admin") {
      if (receiver.includes("Floor")) {
        messageData = await messageService.sendMessageFromAdminToFloor(receiver, content);
      } else {
        messageData = await messageService.sendMessageFromAdminToUser(receiver, content);
        await messageService.markMessagesAsReadFromUser("admin", receiver);
      }
    } else if (receiver === "admin") {
      messageData = await messageService.sendMessageToAdmin(sender, content);
    } else if (receiver.includes("Floor")) {
      messageData = await messageService.sendMessageToFloor(sender, receiver, content);
    } else {
      messageData = await messageService.sendMessageUserToStaff(sender, receiver, content);
    }

    const io = req.app.get("io");

    io.to(sender).emit("newMessage", messageData);
    io.to(receiver).emit("newMessage", messageData);

    const isUserStaffConversation = 
      sender !== "admin" && 
      receiver !== "admin" && 
      !receiver.includes("Floor") && 
      !sender.includes("Floor");

    if (!isUserStaffConversation) {
      io.to("admin").emit("newMessage", messageData);
    }

    if (sender === "admin") {
      try {
        const adminRecipients = await messageService.getAdminRecipientsWithUnread();
        io.to("admin").emit("adminUnreadUpdate", { 
          recipients: adminRecipients,
          totalUnread: adminRecipients.reduce((sum, r) => sum + r.unreadCount, 0)
        });
      } catch (error) {
        console.error("Failed to emit admin unread update:", error);
      }
    }

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

exports.sendMessageToFloor = async (req, res) => {
  try {
    const { userId, floor, content } = req.body;
    
    const messageData = await messageService.sendMessageToFloor(userId, floor, content);

    const io = req.app.get("io");
    
    io.to(floor).emit("newMessage", messageData);
    io.to(userId).emit("newMessage", messageData);

    const Staff = require("../models/User");
    const floorStaff = await Staff.find({ 
      role: "staff", 
      floor: floor 
    }, "_id");

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

exports.sendMessageToAdmin = async (req, res) => {
  try {
    const { userId, content } = req.body;
    
    const messageData = await messageService.sendMessageToAdmin(userId, content);

    const io = req.app.get("io");
    
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

exports.staffReplyToUser = async (req, res) => {
  try {
    const { staffId, userId, content, floor } = req.body;
    
    // 1. Send the message
    const messageData = await messageService.sendMessageFromStaff(staffId, userId, content);

    const io = req.app.get("io");
    
    // Emit to both participants
    io.to(userId).emit("newMessage", messageData);
    io.to(staffId).emit("newMessage", messageData);

    // 2. CRITICAL FIX: Mark ALL messages in this conversation as read for BOTH parties
    // Mark messages sent from user to staff as read (from staff's perspective)
    await messageService.markMessagesAsReadFromUser(staffId, userId);
    
    // ALSO mark messages sent from staff to user as read (from user's perspective)
    // This ensures when user opens the conversation later, they don't see unread badge
    await Message.updateMany(
      {
        sender: staffId,
        receiver: userId,
        read: false
      },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );

    // 3. Fetch updated counts for BOTH parties
    // User's unread count (should decrease when staff replies)
    const userUnreadCount = await messageService.getUnreadCount(userId);
    io.to(userId).emit("unreadCountUpdate", { userId, count: userUnreadCount });

    // Staff's total unread count
    const staffTotalUnreadCount = await messageService.getStaffTotalUnreadCount(staffId);
    
    // 4. Emit events to clear unread UI on BOTH sides
    // For staff
    io.to(staffId).emit("unreadCountUpdate", { 
      userId: staffId, 
      count: staffTotalUnreadCount 
    });
    
    // Emit conversation read event for staff side
    io.to(staffId).emit("conversationRead", {
      staffId,
      userId,
      count: 0
    });

    // ALSO emit for user side (if user is online)
    io.to(userId).emit("conversationRead", {
      userId: userId,
      staffId: staffId,
      count: 0
    });

    res.status(201).json({ 
      message: "Message sent", 
      data: messageData
    });
  } catch (err) {
    console.error("Failed to send staff reply:", err);
    res.status(500).json({ message: "Failed to send message." });
  }
};

exports.staffMessageToAdmin = async (req, res) => {
  try {
    const { staffId, content } = req.body;
    
    const messageData = await messageService.sendMessageFromStaffToAdmin(staffId, content);

    const io = req.app.get("io");
    
    io.to("admin").emit("newMessage", messageData);
    io.to(staffId).emit("newMessage", messageData);

    await messageService.markMessagesAsRead(staffId, "admin");

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

exports.adminMessageToUser = async (req, res) => {
  try {
    const { userId, content } = req.body;
    
    const messageData = await messageService.sendMessageFromAdminToUser(userId, content);

    const io = req.app.get("io");
    
    io.to(userId).emit("newMessage", messageData);
    io.to("admin").emit("newMessage", messageData);

    const unreadCount = await messageService.getUnreadCount(userId);
    io.to(userId).emit("unreadCountUpdate", { userId, count: unreadCount });

    res.status(201).json({ message: "Message sent to user", data: messageData });
  } catch (err) {
    console.error("Failed to send admin message to user:", err);
    res.status(500).json({ message: "Failed to send message to user." });
  }
};

exports.adminMessageToStaff = async (req, res) => {
  try {
    const { staffId, content } = req.body;
    
    const messageData = await messageService.sendMessageFromAdminToStaff(staffId, content);

    const io = req.app.get("io");
    
    io.to(staffId).emit("newMessage", messageData);
    io.to("admin").emit("newMessage", messageData);

    const unreadCount = await messageService.getStaffTotalUnreadCount(staffId);
    io.to(staffId).emit("unreadCountUpdate", { userId: staffId, count: unreadCount });

    res.status(201).json({ message: "Message sent to staff", data: messageData });
  } catch (err) {
    console.error("Failed to send admin message to staff:", err);
    res.status(500).json({ message: "Failed to send message to staff." });
  }
};

exports.adminMessageToFloor = async (req, res) => {
  try {
    const { floor, content } = req.body;
    
    const messageData = await messageService.sendMessageFromAdminToFloor(floor, content);

    const io = req.app.get("io");
    
    io.to(floor).emit("newMessage", messageData);
    io.to("admin").emit("newMessage", messageData);

    const Staff = require("../models/User");
    const floorStaff = await Staff.find({ 
      role: "staff", 
      floor: floor 
    }, "_id");

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

exports.getAdminRecipients = async (req, res) => {
  try {
    const User = require("../models/User");
    
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

    const recipients = await Promise.all(
      conversations.map(async (conv) => {
        try {
          if (!conv._id || typeof conv._id !== 'string' || conv._id.includes('Floor')) {
            return null;
          }

          const user = await User.findOne({ _id: conv._id })
            .select('name email role department');
          
          if (!user) {
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

    const filteredRecipients = recipients.filter(r => r !== null)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(filteredRecipients);
  } catch (error) {
    console.error('Error fetching admin recipients:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recipients',
      details: error.message 
    });
  }
};

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
   Unread Messages Endpoints
─────────────────────────────── */

exports.markMessagesAsRead = async (req, res) => {
  try {
    const { userId, conversationId, messageIds, staffId, targetUserId } = req.body;
    
    if (!userId && !staffId) {
      return res.status(400).json({ message: "User ID or Staff ID is required" });
    }
    
    let result;
    const actualUserId = userId || staffId;
    
    if (staffId && targetUserId) {
      // Staff marking conversation with user as read
      result = await messageService.markMessagesAsReadFromUser(staffId, targetUserId);
      
      // ALSO mark messages from staff to user as read (from user's perspective)
      await Message.updateMany(
        {
          sender: staffId,
          receiver: targetUserId,
          read: false
        },
        {
          $set: {
            read: true,
            readAt: new Date()
          }
        }
      );
    } 
    else if (conversationId || messageIds) {
      result = await messageService.markMessagesAsRead(actualUserId, conversationId, messageIds);
    }
    else {
      result = await messageService.markMessagesAsRead(actualUserId, null, null);
    }
    
    const io = req.app.get("io");
    
    if (staffId) {
      const totalUnreadCount = await messageService.getStaffTotalUnreadCount(staffId);
      const conversationUnreadCount = targetUserId ? 
        await messageService.getUnreadCountByUser(staffId, targetUserId) : 0;
      
      io.to(staffId).emit("unreadCountUpdate", { 
        userId: staffId, 
        count: totalUnreadCount 
      });
      
      if (targetUserId) {
        io.to(staffId).emit("conversationUnreadUpdate", { 
          staffId, 
          userId: targetUserId, 
          count: conversationUnreadCount 
        });
        
        io.to(staffId).emit("conversationRead", {
          staffId,
          userId: targetUserId,
          count: 0
        });
        
        // ALSO update the user's unread count if they're online
        const userUnreadCount = await messageService.getUnreadCount(targetUserId);
        io.to(targetUserId).emit("unreadCountUpdate", { 
          userId: targetUserId, 
          count: userUnreadCount 
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

exports.markMessagesAsReadOnReply = async (req, res) => {
  try {
    const { userId, receiver, conversationType } = req.body;

    let query = {};
    if (conversationType === "floor") {
      query = {
        receiver: userId,
        $or: [
          { sender: receiver },
          { floor: receiver, senderType: "staff" }
        ],
        read: false
      };
    } else if (conversationType === "admin") {
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

exports.markConversationAsRead = async (req, res) => {
  try {
    const { userId, receiver, conversationType } = req.body;

    let query = {};
    if (conversationType === "floor") {
      query = {
        receiver: userId,
        sender: receiver,
        read: false
      };
    } else if (conversationType === "admin") {
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