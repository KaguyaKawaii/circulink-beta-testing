// services/notificationService.js
import Notification from "../models/Notification.js";

class NotificationService {
  createNotification = async (notificationData, io) => {
    try {
      const {
        userId,
        title,
        message,
        status,
        reservationId,
        type = "system",
        reportId,
        closureId,
        targetRole = "user",
        adminName,
        issue,
        roomName,
        affectedFloors,
        date,
        startTime,
        endTime,
        newEndTime,
        userName,
        idNumber,
        staffName,
        closureTitle
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
        userName,
        closureTitle,
        affectedFloors
      });

      // Generate title if not provided
      const finalTitle = title || this.generateDefaultTitle({
        status: normalizedStatus,
        type: normalizedType,
        userName,
        closureTitle,
        affectedFloors
      });

      // Create the notification
      const notification = new Notification({
        userId,
        title: finalTitle,
        message: finalMessage,
        status: normalizedStatus,
        reservationId,
        type: normalizedType,
        reportId,
        closureId,
        targetRole,
        adminName,
        issue,
        roomName,
        affectedFloors,
        date,
        startTime,
        endTime,
        newEndTime,
        userName,
        idNumber,
        staffName,
        closureTitle,
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
            userName: notification.userName,
            closureTitle: notification.closureTitle,
            affectedFloors: notification.affectedFloors
          }),
          message: notification.message || this.generateDefaultMessage({
            status: normalizedStatus,
            roomName: notification.roomName,
            date: notification.date,
            type: normalizedType,
            userName: notification.userName,
            closureTitle: notification.closureTitle,
            affectedFloors: notification.affectedFloors
          }),
          isRead: false,
          dismissed: false,
        };
      });

      const notifications = await Notification.insertMany(normalizedNotifications);
      
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

  // ========== NEW: CLOSURE NOTIFICATION METHODS ==========
  
  createClosureActivationNotification = async (userId, userName, reservation, closure, io) => {
    return this.createNotification({
      userId,
      userName,
      title: "Reservation Cancelled Due to Facility Closure",
      message: `Your reservation for ${reservation.roomName} on ${reservation.date} has been cancelled due to facility closure: "${closure.title}". ${closure.reason}`,
      type: "alert",
      status: "Cancelled",
      targetRole: "user",
      roomName: reservation.roomName,
      date: reservation.date,
      startTime: reservation.time || reservation.startTime,
      endTime: reservation.endTime,
      closureId: closure._id,
      closureTitle: closure.title
    }, io);
  };

  createFloorClosureNotification = async (userId, userName, floor, closure, io) => {
    return this.createNotification({
      userId,
      userName,
      title: `Floor Closure Notice: ${floor}`,
      message: `The ${floor} will be closed on ${closure.date} from ${closure.startTime} to ${closure.endTime} for: ${closure.title}. ${closure.reason}`,
      type: "closure",
      status: "Closure",
      targetRole: "user",
      date: closure.date,
      startTime: closure.startTime,
      endTime: closure.endTime,
      affectedFloors: [floor],
      closureId: closure._id,
      closureTitle: closure.title
    }, io);
  };

  createGlobalClosureNotification = async (userId, userName, closure, io) => {
    return this.createNotification({
      userId,
      userName,
      title: `Facility Closure Notice`,
      message: `The facility will be closed on ${closure.date} from ${closure.startTime} to ${closure.endTime} for: ${closure.title}. ${closure.reason}. All floors are affected.`,
      type: "closure",
      status: "Closure",
      targetRole: "user",
      date: closure.date,
      startTime: closure.startTime,
      endTime: closure.endTime,
      affectedFloors: ["All Floors"],
      closureId: closure._id,
      closureTitle: closure.title
    }, io);
  };

  createClosureNotificationForAdmins = async (closure, io) => {
    const affectedFloorsText = closure.affectedAllFloors 
      ? "All Floors" 
      : closure.affectedFloors?.join(", ") || "None";
    
    return this.createNotification({
      targetRole: "admin",
      title: `New Closure Created: ${closure.title}`,
      message: `A new facility closure has been created: "${closure.title}". Affected floors: ${affectedFloorsText}. Date: ${closure.date}, Time: ${closure.startTime} - ${closure.endTime}. Reason: ${closure.reason}`,
      type: "closure",
      status: "New",
      date: closure.date,
      startTime: closure.startTime,
      endTime: closure.endTime,
      affectedFloors: closure.affectedFloors || [],
      closureId: closure._id,
      closureTitle: closure.title
    }, io);
  };

  // ========== EXISTING METHODS ==========

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
      'unread': 'Unread',
      'closure': 'Closure'
    };
    
    const lowerStatus = status.toLowerCase();
    return statusMap[lowerStatus] || status;
  }

  normalizeType = (type) => {
    if (!type || typeof type !== 'string') return 'system';
    
    const typeMap = {
      'user_welcome': 'system',
      'welcome': 'system',
      'account_created': 'system',
      'account_verified': 'verification',
      'account_unverified': 'verification',
      'account_suspended': 'alert',
      'account_unsuspended': 'alert',
      'password_changed': 'system',
      'reservation': 'reservation',
      'booking': 'reservation',
      'extension': 'extension',
      'report': 'report',
      'system': 'system',
      'announcement': 'announcement',
      'maintenance': 'maintenance',
      'reminder': 'reminder',
      'message': 'message',
      'chat': 'message',
      'closure': 'closure',
      'alert': 'alert',
      'participant': 'participant',
      'default': 'system'
    };
    
    const lowerType = type.toLowerCase();
    return typeMap[lowerType] || 'system';
  }

  generateDefaultTitle = (data) => {
    const { status, type, userName, closureTitle, affectedFloors } = data;

    // Closure notifications
    if (type === 'closure') {
      if (affectedFloors && affectedFloors.length > 0 && affectedFloors[0] !== "All Floors") {
        return `Floor Closure: ${affectedFloors.join(", ")}`;
      }
      return `Facility Closure: ${closureTitle || "Notice"}`;
    }
    
    if (type === 'alert') {
      if (status === 'Cancelled') return 'Reservation Cancelled';
      if (status === 'Suspended') return 'Account Suspended';
      if (status === 'Unsuspended') return 'Account Restored';
      return 'Important Alert';
    }

    // Account related notifications
    if (type === 'verification') {
      if (status === 'Verified') return 'Account Verified';
      if (status === 'Unverified') return 'Account Unverified';
      return 'Verification Update';
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
    
    if (type === 'participant') {
      if (status === 'added' || status === 'participant_added') return 'Added as Participant';
      if (status === 'removed') return 'Removed from Reservation';
      return 'Participant Update';
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

  generateDefaultMessage = (data) => {
    const { status, roomName, date, type, userName, closureTitle, affectedFloors } = data;

    // Closure notifications
    if (type === 'closure') {
      const floorsText = affectedFloors && affectedFloors.length > 0 
        ? affectedFloors.join(", ") 
        : "All Floors";
      return `${closureTitle || "Facility closure"} affecting ${floorsText} on ${date || "the selected date"}.`;
    }
    
    if (type === 'alert') {
      if (status === 'Cancelled') {
        return `Your reservation for ${roomName || 'the room'} on ${date || 'the selected date'} has been cancelled due to a facility closure.`;
      }
      if (status === 'Suspended') {
        return `Your account has been suspended. Please contact the administrator for more information.`;
      }
      if (status === 'Unsuspended') {
        return `Your account has been restored. You may now log in.`;
      }
      return `Important alert: ${status || 'Update available'}`;
    }

    // Account related notifications
    if (type === 'verification') {
      if (status === 'Verified') return `Your account has been verified successfully.`;
      if (status === 'Unverified') return `Your account has been unverified. Please contact support if you believe this is an error.`;
      return `Your verification status has been updated.`;
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
    } else if (type === "announcement") {
      return `New announcement.`;
    } else if (type === "reminder") {
      return `Reminder notification.`;
    } else if (type === "extension") {
      return `Extension request notification.`;
    } else if (type === "maintenance") {
      return `Maintenance notification.`;
    } else if (type === "participant") {
      if (status === "added" || status === "participant_added") {
        return `You have been added as a participant to a reservation for ${roomName} on ${date}.`;
      }
      if (status === "removed") {
        return `You have been removed from the reservation for ${roomName} on ${date}.`;
      }
      return `Update regarding your participation in reservation for ${roomName}.`;
    } else if (type === "message") {
      return `You have a new message.`;
    }

    return "New notification";
  }

  // Convenience methods
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