import Notification from "../models/Notification.js";

class NotificationService {
  createNotification = async (notificationData, io) => {
    try {
      const {
        userId,
        message,
        status,
        reservationId,
        type = "system", // Default to "system" instead of "reservation"
        reportId,
        targetRole = "user",
        adminName,
        issue,
        roomName,
        date,
        startTime,
        endTime,
        newEndTime,
        userName,
        idNumber,
        staffName,
        title // Add title field
      } = notificationData;

      // Normalize status to proper casing
      const normalizedStatus = this.normalizeStatus(status || "Pending");

      // Normalize type to valid enum values
      const normalizedType = this.normalizeType(type);

      // Generate message if not provided
      const finalMessage = message || this.generateDefaultMessage({
        status: normalizedStatus,
        roomName,
        date,
        type: normalizedType,
        userName
      });

      // Generate title if not provided
      const finalTitle = title || this.generateDefaultTitle({
        status: normalizedStatus,
        type: normalizedType,
        userName
      });

      // Create the notification
      const notification = new Notification({
        userId,
        title: finalTitle,
        message: finalMessage,
        status: normalizedStatus,
        reservationId,
        type: normalizedType, // Use normalized type
        reportId,
        targetRole,
        adminName,
        issue,
        roomName,
        date,
        startTime,
        endTime,
        newEndTime,
        userName,
        idNumber,
        staffName,
        isRead: false,
        dismissed: false,
      });

      await notification.save();

      // Populate the notification for emitting
      const populatedNotification = await Notification.findById(notification._id)
        .populate("reservationId")
        .populate("reportId")
        .populate("userId", "name email");

      // Emit the notification with correct event names and rooms
      if (io) {
        const emitData = populatedNotification.toObject ? populatedNotification.toObject() : populatedNotification;
        
        console.log(`🔔 Emitting notification for:`, {
          userId,
          targetRole,
          type: normalizedType,
          message: populatedNotification.message
        });

        if (targetRole === "admin") {
          io.to("admin-room").emit("new-notification", emitData);
          io.to("admin-room").emit("notification", emitData);
          console.log('📢 Sent to admin-room');
        } else if (userId) {
          // Use the same room name as backend socket setup: "user-{userId}"
          const userRoom = `user-${userId}`;
          io.to(userRoom).emit("new-notification", emitData);
          io.to(userRoom).emit("notification", emitData);
          console.log(`📢 Sent to ${userRoom} room`);
        } else {
          io.emit("new-notification", emitData);
          io.emit("notification", emitData);
          console.log('📢 Broadcast to all users');
        }
      }

      return populatedNotification;
    } catch (error) {
      console.error("❌ Notification service error:", error);
      throw error;
    }
  }

  // Create multiple notifications for different users
  createBulkNotifications = async (notificationsData, io) => {
    try {
      // Normalize data for bulk insert
      const normalizedNotifications = notificationsData.map(notification => {
        const normalizedStatus = this.normalizeStatus(notification.status || "Pending");
        const normalizedType = this.normalizeType(notification.type || "system");
        
        return {
          ...notification,
          status: normalizedStatus,
          type: normalizedType,
          title: notification.title || this.generateDefaultTitle({
            status: normalizedStatus,
            type: normalizedType,
            userName: notification.userName
          }),
          message: notification.message || this.generateDefaultMessage({
            status: normalizedStatus,
            roomName: notification.roomName,
            date: notification.date,
            type: normalizedType,
            userName: notification.userName
          }),
          isRead: false,
          dismissed: false,
        };
      });

      const notifications = await Notification.insertMany(normalizedNotifications);
      
      // Emit each notification with correct event names
      if (io) {
        for (const notification of notifications) {
          const populated = await Notification.findById(notification._id)
            .populate("reservationId")
            .populate("reportId")
            .populate("userId", "name email");
          
          const emitData = populated.toObject ? populated.toObject() : populated;
          
          if (notification.targetRole === "admin") {
            io.to("admin-room").emit("new-notification", emitData);
            io.to("admin-room").emit("notification", emitData);
          } else if (notification.targetRole === "staff") {
            io.emit("new-notification", emitData);
            io.emit("staff_notification", emitData);
          } else if (notification.userId) {
            const userRoom = `user-${notification.userId.toString()}`;
            io.to(userRoom).emit("new-notification", emitData);
            io.to(userRoom).emit("notification", emitData);
          } else {
            io.emit("new-notification", emitData);
            io.emit("notification", emitData);
          }
        }
      }

      return notifications;
    } catch (error) {
      console.error("❌ Bulk notification service error:", error);
      throw error;
    }
  }

  // Helper method to normalize status casing
  normalizeStatus = (status) => {
    if (!status || typeof status !== 'string') return 'Pending';
    
    const statusMap = {
      'pending': 'Pending',
      'approved': 'Approved', 
      'rejected': 'Rejected',
      'cancelled': 'Cancelled',
      'ongoing': 'Ongoing',
      'expired': 'Expired',
      'completed': 'Completed',
      'system': 'System',
      'new': 'New',
      'verified': 'Verified',
      'unverified': 'Unverified',
      'read': 'Read',
      'unread': 'Unread'
    };
    
    const lowerStatus = status.toLowerCase();
    return statusMap[lowerStatus] || status; // Return original if no mapping
  }

  // ✅ NEW: Helper method to normalize type to valid enum values
  normalizeType = (type) => {
    if (!type || typeof type !== 'string') return 'system';
    
    // Map all possible type values to valid enum values
    // Based on your error, valid enum values likely include: 
    // 'system', 'message', 'alert', 'reminder', 'verification', 'reservation', 'report', 'announcement', etc.
    
    const typeMap = {
      // User account related
      'user_welcome': 'system',
      'welcome': 'system',
      'account_created': 'system',
      'account_verified': 'verification',
      'account_unverified': 'verification',
      'account_suspended': 'alert',
      'account_unsuspended': 'alert',
      'password_changed': 'system',
      
      // Reservation related
      'reservation': 'reservation',
      'booking': 'reservation',
      'extension': 'extension',
      
      // Report related
      'report': 'report',
      
      // System related
      'system': 'system',
      'announcement': 'announcement',
      'maintenance': 'maintenance',
      'reminder': 'reminder',
      
      // Message related
      'message': 'message',
      'chat': 'message',
      
      // Default fallback
      'default': 'system'
    };
    
    const lowerType = type.toLowerCase();
    return typeMap[lowerType] || 'system'; // Default to 'system' if no mapping
  }

  // ✅ NEW: Helper method to generate default title
  generateDefaultTitle = (data) => {
    const { status, type, userName } = data;

    // Account related notifications
    if (type === 'verification') {
      if (status === 'Verified') return 'Account Verified';
      if (status === 'Unverified') return 'Account Unverified';
      return 'Verification Update';
    }
    
    if (type === 'alert') {
      if (status === 'Suspended') return 'Account Suspended';
      if (status === 'Unsuspended') return 'Account Restored';
      return 'Account Alert';
    }
    
    if (type === 'system') {
      if (status === 'Welcome' || !status) return `Welcome ${userName || 'to the System'}!`;
      return 'System Notification';
    }
    
    // Reservation related
    if (type === 'reservation') {
      switch (status) {
        case 'Approved': return 'Reservation Approved';
        case 'Rejected': return 'Reservation Rejected';
        case 'Pending': return 'Reservation Pending';
        case 'Cancelled': return 'Reservation Cancelled';
        case 'Ongoing': return 'Reservation Ongoing';
        case 'Expired': return 'Reservation Expired';
        case 'Completed': return 'Reservation Completed';
        default: return 'Reservation Update';
      }
    }
    
    if (type === 'extension') {
      return 'Extension Request';
    }
    
    if (type === 'message') {
      return 'New Message';
    }
    
    if (type === 'announcement') {
      return 'New Announcement';
    }
    
    if (type === 'maintenance') {
      return 'Maintenance Notice';
    }
    
    if (type === 'report') {
      return 'Report Notification';
    }
    
    if (type === 'reminder') {
      return 'Reminder';
    }

    return 'Notification';
  }

  // Helper method to generate default message
  generateDefaultMessage = (data) => {
    const { status, roomName, date, type, userName } = data;

    // Account related notifications
    if (type === 'verification') {
      if (status === 'Verified') return `Your account has been verified successfully.`;
      if (status === 'Unverified') return `Your account has been unverified. Please contact support if you believe this is an error.`;
      return `Your verification status has been updated.`;
    }
    
    if (type === 'alert') {
      if (status === 'Suspended') return `Your account has been suspended. Please contact the administrator for more information.`;
      if (status === 'Unsuspended') return `Your account has been restored. You may now log in.`;
      return `There's an update regarding your account.`;
    }
    
    if (type === 'system') {
      if (status === 'Welcome' || !status) return `Welcome ${userName || 'to the system'}! Your account has been created successfully.`;
      return `System notification: ${status || 'Update available'}`;
    }

    // Reservation related
    if (type === "reservation") {
      switch (status) {
        case "Approved":
          return `Your reservation for ${roomName || 'the room'} on ${date || 'the selected date'} has been approved.`;
        case "Rejected":
          return `Your reservation for ${roomName || 'the room'} on ${date || 'the selected date'} has been rejected.`;
        case "Pending":
          return `Your reservation for ${roomName || 'the room'} on ${date || 'the selected date'} is pending approval.`;
        case "Cancelled":
          return `Your reservation for ${roomName || 'the room'} on ${date || 'the selected date'} has been cancelled.`;
        case "Ongoing":
          return `Your reservation for ${roomName || 'the room'} is now ongoing.`;
        case "Expired":
          return `Your reservation for ${roomName || 'the room'} on ${date || 'the selected date'} has expired.`;
        case "New":
          return `New reservation request for ${roomName || 'the room'} on ${date || 'the selected date'}.`;
        default:
          return `Update regarding your reservation for ${roomName || 'the room'}.`;
      }
    } else if (type === "report") {
      return `New report notification.`;
    } else if (type === "system") {
      return `System notification.`;
    } else if (type === "announcement") {
      return `New announcement.`;
    } else if (type === "reminder") {
      return `Reminder notification.`;
    } else if (type === "extension") {
      return `Extension request notification.`;
    } else if (type === "maintenance") {
      return `Maintenance notification.`;
    } else if (type === "message") {
      return `You have a new message.`;
    }

    return "New notification";
  }

  // ✅ NEW: Convenience method for welcome notifications
  createWelcomeNotification = async (userId, userName, io) => {
    return this.createNotification({
      userId,
      userName,
      title: `Welcome ${userName}!`,
      message: `Welcome ${userName}! Your account has been created successfully.`,
      type: "system",
      status: "New",
      targetRole: "user"
    }, io);
  }

  // ✅ NEW: Convenience method for verification notifications
  createVerificationNotification = async (userId, userName, isVerified, io) => {
    return this.createNotification({
      userId,
      userName,
      title: isVerified ? "Account Verified" : "Account Unverified",
      message: isVerified 
        ? `Your account has been verified successfully.` 
        : `Your account has been unverified. Please contact support if you believe this is an error.`,
      type: "verification",
      status: isVerified ? "Verified" : "Unverified",
      targetRole: "user"
    }, io);
  }

  // ✅ NEW: Convenience method for suspension notifications
  createSuspensionNotification = async (userId, userName, isSuspended, io) => {
    return this.createNotification({
      userId,
      userName,
      title: isSuspended ? "Account Suspended" : "Account Restored",
      message: isSuspended 
        ? `Your account has been suspended. Please contact the administrator for more information.` 
        : `Your account has been restored. You may now log in.`,
      type: "alert",
      status: isSuspended ? "Suspended" : "Unsuspended",
      targetRole: "user"
    }, io);
  }
}

// Create and export a single instance
const notificationService = new NotificationService();
export default notificationService;