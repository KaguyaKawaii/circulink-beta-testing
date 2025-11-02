const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");

/**
 * Utility functions for display names
 */
const getFloorStaffDisplayName = (floor) => {
  return `${floor} Staff`;
};

const getAdminDisplayName = () => {
  return "Admin";
};

/**
 * User → Floor messaging
 */
exports.sendMessageToFloor = async (userId, floor, content) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const newMessage = await new Message({
    sender: userId,
    receiver: floor,
    content: content,
    senderType: "user",
    floor: floor,
    read: false,
    createdAt: new Date(),
  }).save();

  const senderName = user.name || "User";

  return { 
    ...newMessage.toObject(), 
    senderName,
    displayName: senderName
  };
};

/**
 * User → Admin messaging
 */
exports.sendMessageToAdmin = async (userId, content) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const newMessage = await new Message({
    sender: userId,
    receiver: "admin",
    content: content,
    senderType: "user",
    read: false,
    createdAt: new Date(),
  }).save();

  const senderName = user.name || "User";

  return { 
    ...newMessage.toObject(), 
    senderName,
    displayName: senderName
  };
};

/**
 * Staff → User messaging (appears as floor staff)
 */
exports.sendMessageFromStaff = async (staffId, userId, content) => {
  const staff = await User.findById(staffId);
  if (!staff) throw new Error("Staff not found");

  if (!staff.floor) {
    throw new Error("Staff member must be assigned to a floor");
  }

  const newMessage = await new Message({
    sender: staffId,
    receiver: userId,
    content: content,
    senderType: "staff",
    displayName: getFloorStaffDisplayName(staff.floor),
    floor: staff.floor,
    read: false,
    createdAt: new Date(),
  }).save();

  return { 
    ...newMessage.toObject(), 
    senderName: staff.name,
    displayName: getFloorStaffDisplayName(staff.floor)
  };
};

/**
 * Staff → Admin messaging
 */
exports.sendMessageFromStaffToAdmin = async (staffId, content) => {
  const staff = await User.findById(staffId);
  if (!staff) throw new Error("Staff not found");

  const newMessage = await new Message({
    sender: staffId,
    receiver: "admin",
    content: content,
    senderType: "staff",
    displayName: staff.name,
    floor: staff.floor,
    read: false,
    createdAt: new Date(),
  }).save();

  return { 
    ...newMessage.toObject(), 
    senderName: staff.name,
    displayName: staff.name
  };
};

/**
 * Admin → User messaging
 */
exports.sendMessageFromAdminToUser = async (userId, content) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const newMessage = await new Message({
    sender: "admin",
    receiver: userId,
    content: content,
    senderType: "admin",
    displayName: getAdminDisplayName(),
    read: false,
    createdAt: new Date(),
  }).save();

  return { 
    ...newMessage.toObject(), 
    senderName: "Admin",
    displayName: getAdminDisplayName()
  };
};

/**
 * Admin → Staff messaging
 */
exports.sendMessageFromAdminToStaff = async (staffId, content) => {
  const staff = await User.findById(staffId);
  if (!staff) throw new Error("Staff not found");

  const newMessage = await new Message({
    sender: "admin",
    receiver: staffId,
    content: content,
    senderType: "admin",
    displayName: getAdminDisplayName(),
    read: false,
    createdAt: new Date(),
  }).save();

  return { 
    ...newMessage.toObject(), 
    senderName: "Admin",
    displayName: getAdminDisplayName()
  };
};

/**
 * Admin → Floor messaging
 */
exports.sendMessageFromAdminToFloor = async (floor, content) => {
  const newMessage = await new Message({
    sender: "admin",
    receiver: floor,
    content: content,
    senderType: "admin",
    displayName: getAdminDisplayName(),
    floor: floor,
    read: false,
    createdAt: new Date(),
  }).save();

  return { 
    ...newMessage.toObject(), 
    senderName: "Admin",
    displayName: getAdminDisplayName()
  };
};

/**
 * User → User messaging (fallback)
 */
exports.sendMessageUserToUser = async (senderId, receiverId, content) => {
  const sender = await User.findById(senderId);
  const receiver = await User.findById(receiverId);
  
  if (!sender || !receiver) throw new Error("User not found");

  const newMessage = await new Message({
    sender: senderId,
    receiver: receiverId,
    content: content,
    senderType: "user",
    read: false,
    createdAt: new Date(),
  }).save();

  return { 
    ...newMessage.toObject(), 
    senderName: sender.name,
    displayName: sender.name
  };
};

/**
 * Conversation fetching methods
 */
exports.getFloorConversation = async (userId, floor) => {
  const query = {
    $or: [
      { sender: userId, receiver: floor },
      { receiver: userId, floor: floor }
    ]
  };

  const msgs = await Message.find(query).sort({ createdAt: 1 });

  const processedMessages = await Promise.all(msgs.map(async (msg) => {
    const messageObj = msg.toObject();
    
    if (msg.senderType === "staff" && msg.displayName) {
      messageObj.senderName = msg.displayName;
    } else if (msg.senderType === "user") {
      const user = await User.findById(msg.sender);
      messageObj.senderName = user ? user.name : "User";
    } else if (msg.sender === "admin") {
      messageObj.senderName = "Admin";
    }

    return messageObj;
  }));

  return processedMessages;
};

exports.getUserAdminConversation = async (userId) => {
  const query = {
    $or: [
      { sender: userId, receiver: "admin" },
      { sender: "admin", receiver: userId }
    ]
  };

  const msgs = await Message.find(query).sort({ createdAt: 1 });

  const processedMessages = await Promise.all(msgs.map(async (msg) => {
    const messageObj = msg.toObject();
    
    if (msg.senderType === "user") {
      const user = await User.findById(msg.sender);
      messageObj.senderName = user ? user.name : "User";
    } else if (msg.sender === "admin") {
      messageObj.senderName = "Admin";
    }

    return messageObj;
  }));

  return processedMessages;
};

exports.getStaffUserConversation = async (staffId, userId) => {
  const staff = await User.findById(staffId);
  if (!staff || !staff.floor) throw new Error("Staff not found or no floor assigned");

  const query = {
    $or: [
      { sender: userId, receiver: staff.floor },
      { sender: staffId, receiver: userId },
      { receiver: userId, floor: staff.floor, senderType: "staff" }
    ]
  };

  const msgs = await Message.find(query).sort({ createdAt: 1 });

  const processedMessages = await Promise.all(msgs.map(async (msg) => {
    const messageObj = msg.toObject();
    
    if (msg.senderType === "staff") {
      messageObj.senderName = getFloorStaffDisplayName(staff.floor);
    } else if (msg.senderType === "user") {
      const user = await User.findById(msg.sender);
      messageObj.senderName = user ? user.name : "User";
    }

    return messageObj;
  }));

  return processedMessages;
};

exports.getStaffAdminConversation = async (staffId) => {
  const query = {
    $or: [
      { sender: staffId, receiver: "admin" },
      { sender: "admin", receiver: staffId }
    ]
  };

  const msgs = await Message.find(query).sort({ createdAt: 1 });

  const processedMessages = await Promise.all(msgs.map(async (msg) => {
    const messageObj = msg.toObject();
    
    if (msg.senderType === "staff") {
      const staff = await User.findById(msg.sender);
      messageObj.senderName = staff ? staff.name : "Staff";
    } else if (msg.sender === "admin") {
      messageObj.senderName = "Admin";
    }

    return messageObj;
  }));

  return processedMessages;
};

exports.getAdminConversation = async (entityId) => {
  const query = {
    $or: [
      { sender: "admin", receiver: entityId },
      { sender: entityId, receiver: "admin" }
    ]
  };

  const msgs = await Message.find(query).sort({ createdAt: 1 });

  const processedMessages = await Promise.all(msgs.map(async (msg) => {
    const messageObj = msg.toObject();
    
    if (msg.sender === "admin") {
      messageObj.senderName = "Admin";
    } else {
      const user = await User.findById(msg.sender);
      if (user) {
        messageObj.senderName = user.name;
      } else {
        messageObj.senderName = "Unknown";
      }
    }

    return messageObj;
  }));

  return processedMessages;
};

/**
 * Recipient list methods
 */
exports.getFloorUsers = async (floor) => {
  const userMessages = await Message.find({ 
    receiver: floor,
    senderType: "user"
  }).distinct("sender");

  const validUserIds = userMessages.filter(id => mongoose.Types.ObjectId.isValid(id));
  
  const users = await User.find({ _id: { $in: validUserIds } }, "_id name email");
  
  const usersWithMessages = await Promise.all(users.map(async (user) => {
    const latestMessage = await Message.findOne({
      $or: [
        { sender: user._id, receiver: floor },
        { receiver: user._id, floor: floor }
      ]
    }).sort({ createdAt: -1 });

    // FIXED: Count unread messages from this user to staff's floor
    const unreadCount = await Message.countDocuments({
      $or: [
        { sender: user._id, receiver: floor, read: false },
        { receiver: user._id, floor: floor, read: false }
      ]
    });

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      latestMessage: latestMessage?.content,
      latestMessageAt: latestMessage?.createdAt,
      unreadCount: unreadCount
    };
  }));

  return usersWithMessages.sort((a, b) => 
    new Date(b.latestMessageAt || 0) - new Date(a.latestMessageAt || 0)
  );
};

exports.getAdminRecipients = async () => {
  const recipients = [];

  // Add floors
  const floors = ["Ground Floor", "Second Floor", "Third Floor", "Fourth Floor", "Fifth Floor"];
  
  for (const floor of floors) {
    const latestMessage = await Message.findOne({
      $or: [
        { sender: "admin", receiver: floor },
        { receiver: "admin", floor: floor }
      ]
    }).sort({ createdAt: -1 });

    recipients.push({
      _id: floor,
      name: floor,
      type: "floor",
      latestMessageAt: latestMessage?.createdAt || new Date(0),
      latestMessage: latestMessage?.content || "No messages yet"
    });
  }

  // Add users who messaged admin
  const userMessages = await Message.find({
    receiver: "admin",
    senderType: "user"
  }).distinct("sender");

  const validUserIds = userMessages.filter(id => mongoose.Types.ObjectId.isValid(id));
  const users = await User.find({ _id: { $in: validUserIds } }, "_id name email role");

  for (const user of users) {
    const latestMessage = await Message.findOne({
      $or: [
        { sender: user._id, receiver: "admin" },
        { sender: "admin", receiver: user._id }
      ]
    }).sort({ createdAt: -1 });

    recipients.push({
      _id: user._id.toString(),
      name: user.name,
      type: user.role === "staff" ? "staff" : "user",
      latestMessageAt: latestMessage?.createdAt || new Date(0),
      latestMessage: latestMessage?.content || "No messages yet"
    });
  }

  // Add staff who messaged admin
  const staffMessages = await Message.find({
    receiver: "admin",
    senderType: "staff"
  }).distinct("sender");

  const validStaffIds = staffMessages.filter(id => mongoose.Types.ObjectId.isValid(id));
  const staff = await User.find({ _id: { $in: validStaffIds } }, "_id name email");

  for (const staffMember of staff) {
    const latestMessage = await Message.findOne({
      $or: [
        { sender: staffMember._id, receiver: "admin" },
        { sender: "admin", receiver: staffMember._id }
      ]
    }).sort({ createdAt: -1 });

    if (!recipients.find(r => r._id === staffMember._id.toString())) {
      recipients.push({
        _id: staffMember._id.toString(),
        name: staffMember.name,
        type: "staff",
        latestMessageAt: latestMessage?.createdAt || new Date(0),
        latestMessage: latestMessage?.content || "No messages yet"
      });
    }
  }

  return recipients.sort((a, b) => 
    new Date(b.latestMessageAt || 0) - new Date(a.latestMessageAt || 0)
  );
};

exports.getStaffRecipients = async (staffId) => {
  const staff = await User.findById(staffId);
  if (!staff) throw new Error("Staff not found");

  const recipients = [];

  // Add admin
  const adminMessages = await Message.findOne({
    $or: [
      { sender: staffId, receiver: "admin" },
      { sender: "admin", receiver: staffId }
    ]
  }).sort({ createdAt: -1 });

  recipients.push({
    _id: "admin",
    name: "Admin",
    type: "admin",
    latestMessageAt: adminMessages?.createdAt || new Date(0),
    latestMessage: adminMessages?.content || "No messages yet"
  });

  // Add floor users
  if (staff.floor) {
    const floorUsers = await this.getFloorUsers(staff.floor);
    floorUsers.forEach(user => {
      recipients.push({
        _id: user._id.toString(),
        name: user.name,
        type: "user",
        floor: staff.floor,
        latestMessageAt: user.latestMessageAt || new Date(0),
        latestMessage: user.latestMessage || "No messages yet",
        unreadCount: user.unreadCount
      });
    });
  }

  return recipients.sort((a, b) => 
    new Date(b.latestMessageAt || 0) - new Date(a.latestMessageAt || 0)
  );
};

/**
 * Unread Messages Methods - ADDED MISSING FUNCTIONS
 */

// Mark messages as read
exports.markMessagesAsRead = async (userId, conversationId, messageIds = null) => {
  let query = {
    receiver: userId,
    read: false
  };

  // If specific message IDs are provided, mark only those
  if (messageIds && messageIds.length > 0) {
    query._id = { $in: messageIds };
  } 
  // If conversation ID is provided, mark all unread messages in that conversation
  else if (conversationId) {
    // For admin conversations
    if (conversationId === "admin") {
      query.$or = [
        { sender: "admin", receiver: userId },
        { receiver: userId, sender: "admin" }
      ];
    }
    // For floor conversations (when staff views user conversation)
    else if (typeof conversationId === "string" && conversationId.includes("Floor")) {
      // For staff, mark messages where they are the receiver and the sender is a user from that floor
      query.$or = [
        { receiver: userId, floor: conversationId, senderType: "user" },
        { receiver: userId, sender: conversationId }
      ];
    }
    // For user conversations (when staff views specific user)
    else {
      query.$or = [
        { receiver: userId, sender: conversationId },
        { receiver: userId, floor: conversationId }
      ];
    }
  }

  const result = await Message.updateMany(
    query,
    { $set: { read: true, readAt: new Date() } }
  );

  return result;
};

// NEW: Mark messages as read from specific user for staff
exports.markMessagesAsReadFromUser = async (staffId, userId) => {
  const staff = await User.findById(staffId);
  if (!staff || !staff.floor) throw new Error("Staff not found or no floor assigned");

  // Mark all unread messages from this user to staff's floor as read
  const result = await Message.updateMany(
    {
      $or: [
        { sender: userId, receiver: staff.floor, read: false },
        { receiver: staffId, sender: userId, read: false }
      ]
    },
    { $set: { read: true, readAt: new Date() } }
  );

  return result;
};

exports.getUnreadCount = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return 0;

  // If user is staff, count both direct messages and floor messages
  if (user.role === "Staff") {
    return await this.getStaffTotalUnreadCount(userId);
  }

  // For regular users and admin, count direct messages only
  const count = await Message.countDocuments({
    receiver: userId,
    read: false
  });

  return count;
};

// Get unread count by conversation - FIXED for staff
exports.getUnreadCountByConversation = async (userId, conversationId) => {
  const user = await User.findById(userId);
  if (!user) return 0;

  let query = {
    read: false
  };

  // For staff members
  if (user.role === "Staff") {
    // For admin conversations with staff
    if (conversationId === "admin") {
      query.$or = [
        { sender: "admin", receiver: userId },
        { receiver: userId, sender: "admin" }
      ];
    }
    // For floor user conversations with staff
    else if (mongoose.Types.ObjectId.isValid(conversationId)) {
      query.$or = [
        { receiver: userId, sender: conversationId, senderType: "user" },
        { receiver: userId, floor: user.floor, sender: conversationId }
      ];
    }
    // This shouldn't normally happen for staff
    else {
      return 0;
    }
  }
  // For regular users
  else {
    query.receiver = userId;

    // For admin conversations
    if (conversationId === "admin") {
      query.$or = [
        { sender: "admin", receiver: userId },
        { receiver: userId, sender: "admin" }
      ];
    }
    // For floor conversations
    else if (typeof conversationId === "string" && conversationId.includes("Floor")) {
      query.$or = [
        { receiver: userId, floor: conversationId },
        { receiver: userId, sender: conversationId }
      ];
    }
    // For user conversations
    else {
      query.$or = [
        { receiver: userId, sender: conversationId },
        { receiver: userId, floor: conversationId }
      ];
    }
  }

  const count = await Message.countDocuments(query);
  return count;
};

// NEW: Get unread count for specific user (for staff badges)
exports.getUnreadCountByUser = async (staffId, userId) => {
  const staff = await User.findById(staffId);
  if (!staff || !staff.floor) return 0;

  const count = await Message.countDocuments({
    $or: [
      { sender: userId, receiver: staff.floor, read: false },
      { receiver: staffId, sender: userId, read: false }
    ]
  });

  return count;
};

// Get unread count for staff from floor users - FIXED
exports.getStaffUnreadCountFromFloor = async (staffId, floor) => {
  const count = await Message.countDocuments({
    $or: [
      // Direct messages to staff from floor users
      { receiver: staffId, floor: floor, senderType: "user", read: false },
      // Floor messages that staff should see (sent to their floor)
      { receiver: floor, floor: floor, senderType: "user", read: false }
    ]
  });
  
  return count;
};

// Get total unread count for staff (floor users + admin) - FIXED
exports.getStaffTotalUnreadCount = async (staffId) => {
  const staff = await User.findById(staffId);
  if (!staff || !staff.floor) return 0;

  // Count unread messages from floor users to this staff (both direct and floor messages)
  const floorUnreadCount = await Message.countDocuments({
    $or: [
      // Direct messages to staff
      { receiver: staffId, floor: staff.floor, senderType: "user", read: false },
      // Floor messages addressed to staff's floor
      { receiver: staff.floor, floor: staff.floor, senderType: "user", read: false }
    ]
  });

  // Count unread messages from admin to this staff
  const adminUnreadCount = await Message.countDocuments({
    sender: "admin",
    receiver: staffId,
    read: false
  });

  return floorUnreadCount + adminUnreadCount;
};

// NEW: Get detailed unread breakdown for staff
exports.getStaffUnreadBreakdown = async (staffId) => {
  const staff = await User.findById(staffId);
  if (!staff || !staff.floor) {
    return {
      total: 0,
      fromFloor: 0,
      fromAdmin: 0,
      byUser: {}
    };
  }

  // Get floor unread count
  const floorUnreadCount = await Message.countDocuments({
    $or: [
      { receiver: staffId, floor: staff.floor, senderType: "user", read: false },
      { receiver: staff.floor, floor: staff.floor, senderType: "user", read: false }
    ]
  });

  // Get admin unread count
  const adminUnreadCount = await Message.countDocuments({
    sender: "admin",
    receiver: staffId,
    read: false
  });

  // Get unread count by user
  const userUnreadMessages = await Message.aggregate([
    {
      $match: {
        $or: [
          { receiver: staffId, floor: staff.floor, senderType: "user", read: false },
          { receiver: staff.floor, floor: staff.floor, senderType: "user", read: false }
        ]
      }
    },
    {
      $group: {
        _id: "$sender",
        count: { $sum: 1 }
      }
    }
  ]);

  const byUser = {};
  userUnreadMessages.forEach(item => {
    byUser[item._id] = item.count;
  });

  return {
    total: floorUnreadCount + adminUnreadCount,
    fromFloor: floorUnreadCount,
    fromAdmin: adminUnreadCount,
    byUser: byUser
  };
};