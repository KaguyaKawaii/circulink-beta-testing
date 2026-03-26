// models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    title: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "Pending", "Approved", "Rejected", "Cancelled", "Ongoing", 
        "Expired", "Completed", "System", "New", "Verified", 
        "Unverified", "added", "removed", "participant_added",
        "Closure", "Floor Closed"  // Added closure statuses
      ],
      default: "Pending",
    },
    type: {
      type: String,
      enum: [
        "reservation", "report", "system", "announcement",
        "reminder", "extension", "maintenance", "participant",
        "closure", "alert"  // Added closure and alert types
      ],
      default: "reservation",
    },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      default: null,
    },
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
      default: null,
    },
    closureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Closure",
      default: null,
    },
    targetRole: {
      type: String,
      enum: ["user", "staff", "admin", "all"],
      default: "user",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    dismissed: {
      type: Boolean,
      default: false,
    },
    adminName: { type: String, trim: true },
    issue: { type: String, trim: true },
    roomName: { type: String, trim: true },
    affectedFloors: { type: [String], default: [] }, // For floor closures
    date: { type: String, trim: true },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    newEndTime: { type: String, trim: true },
    userName: { type: String, trim: true },
    idNumber: { type: String, trim: true },
    staffName: { type: String, trim: true },
    closureTitle: { type: String, trim: true }, // For closure notifications
  },
  { timestamps: true }
);

// Index for better query performance
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ targetRole: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ reservationId: 1 });
notificationSchema.index({ closureId: 1 });
notificationSchema.index({ type: 1 });

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = async function (userId, role = "user") {
  try {
    const query = {
      $or: [
        { userId: userId },
        { targetRole: role },
        { targetRole: "all" }
      ],
      isRead: false,
      dismissed: false
    };

    if (role === "admin") {
      query.$or = [
        { userId: null },
        { targetRole: "admin" },
        { targetRole: "all" }
      ];
    }

    return await this.countDocuments(query);
  } catch (error) {
    console.error("Get unread count error:", error);
    throw error;
  }
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function () {
  try {
    this.isRead = true;
    await this.save();
    return this;
  } catch (error) {
    console.error("Mark as read error:", error);
    throw error;
  }
};

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = async function (userId, role = "user") {
  try {
    const query = {
      $or: [
        { userId: userId },
        { targetRole: role },
        { targetRole: "all" }
      ],
      isRead: false
    };

    if (role === "admin") {
      query.$or = [
        { userId: null },
        { targetRole: "admin" },
        { targetRole: "all" }
      ];
    }

    const result = await this.updateMany(query, { $set: { isRead: true } });
    return result.modifiedCount;
  } catch (error) {
    console.error("Mark all as read error:", error);
    throw error;
  }
};

// Helper function to normalize status casing
const normalizeStatus = (status) => {
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
    'added': 'added',
    'removed': 'removed',
    'participant_added': 'participant_added',
    'closure': 'Closure',
    'floor closed': 'Floor Closed'
  };
  
  return statusMap[status.toLowerCase()] || 'Pending';
};

// Pre-save middleware
notificationSchema.pre("save", function (next) {
  this.status = normalizeStatus(this.status);
  
  if (!this.message) {
    this.message = this.generateMessage();
  }
  
  if (!this.title) {
    this.title = this.generateTitle();
  }
  
  next();
});

// Method to generate dynamic title
notificationSchema.methods.generateTitle = function () {
  if (this.type === "closure") {
    if (this.affectedFloors && this.affectedFloors.length > 0) {
      return `Floor Closure: ${this.affectedFloors.join(", ")}`;
    }
    return `Facility Closure: ${this.closureTitle || "Notice"}`;
  }
  
  if (this.type === "alert") {
    return "Important Alert";
  }
  
  if (this.type === "participant") {
    switch (this.status) {
      case "added":
      case "participant_added":
        return "Added as Participant";
      case "removed":
        return "Removed from Reservation";
      default:
        return "Participant Update";
    }
  }

  switch (this.status) {
    case "Approved": return "Reservation Approved";
    case "Rejected": return "Reservation Rejected";
    case "Pending": return "Reservation Pending";
    case "Cancelled": return "Reservation Cancelled";
    case "Ongoing": return "Reservation Ongoing";
    case "Expired": return "Reservation Expired";
    case "Completed": return "Reservation Completed";
    case "Verified": return "Account Verified";
    case "Unverified": return "Verification Required";
    default: return "Reservation Update";
  }
};

// Method to generate dynamic message
notificationSchema.methods.generateMessage = function () {
  if (this.type === "closure") {
    const floors = this.affectedFloors && this.affectedFloors.length > 0 
      ? this.affectedFloors.join(", ") 
      : "All Floors";
    return `Facility closure: ${this.closureTitle || "Closure"} from ${this.startTime} to ${this.endTime} on ${this.date}. Affected: ${floors}. ${this.message || ""}`;
  }
  
  if (this.type === "alert") {
    return `⚠️ ${this.message || "Important alert regarding your reservation."}`;
  }
  
  if (this.type === "participant") {
    switch (this.status) {
      case "added":
      case "participant_added":
        return `You have been added as a participant to a reservation for ${this.roomName} on ${this.date} at ${this.startTime}.`;
      case "removed":
        return `You have been removed from the reservation for ${this.roomName} on ${this.date}.`;
      default:
        return `Update regarding your participation in reservation for ${this.roomName}.`;
    }
  }

  switch (this.status) {
    case "Approved":
      return `Your reservation for ${this.roomName} on ${this.date} has been approved.`;
    case "Rejected":
      return `Your reservation for ${this.roomName} on ${this.date} has been rejected.`;
    case "Pending":
      return `Your reservation for ${this.roomName} on ${this.date} is pending approval.`;
    case "Cancelled":
      return `Your reservation for ${this.roomName} on ${this.date} has been cancelled.`;
    case "Ongoing":
      return `Your reservation for ${this.roomName} is now ongoing.`;
    case "Expired":
      return `Your reservation for ${this.roomName} on ${this.date} has expired.`;
    case "New":
      return `New reservation request for ${this.roomName} on ${this.date}.`;
    case "Verified":
      return `Your account has been verified.`;
    case "Unverified":
      return `Your account verification is pending.`;
    default:
      return `Update regarding your reservation for ${this.roomName}.`;
  }
};

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;