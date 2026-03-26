// models/Closure.js
import mongoose from "mongoose";

const closureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Closure title is required"],
    trim: true,
    maxlength: [200, "Title cannot exceed 200 characters"]
  },
  reason: {
    type: String,
    required: [true, "Closure reason is required"],
    trim: true,
    maxlength: [500, "Reason cannot exceed 500 characters"]
  },
  date: {
    type: String,
    required: [true, "Date is required"],
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: "Date must be in YYYY-MM-DD format"
    }
  },
  startTime: {
    type: String,
    required: [true, "Start time is required"],
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: "Start time must be in HH:MM format"
    }
  },
  endTime: {
    type: String,
    required: [true, "End time is required"],
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: "End time must be in HH:MM format"
    }
  },
  
  // NEW: Floor-based closure fields
  affectedFloors: {
    type: [String],
    default: [],
    enum: ["Ground Floor", "2nd Floor", "4th Floor", "5th Floor"],
    validate: {
      validator: function(v) {
        if (this.affectedAllFloors) return true;
        return v && v.length > 0;
      },
      message: "At least one floor must be selected when not affecting all floors"
    }
  },
  affectedAllFloors: {
    type: Boolean,
    default: false
  },
  
  // DEPRECATED: Keep for backward compatibility, but will be migrated
  affectedRooms: {
    type: [String],
    default: []
  },
  affectedAllRooms: {
    type: Boolean,
    default: false
  },
  
  location: {
    type: String,
    enum: ["Ground Floor", "2nd Floor", "4th Floor", "5th Floor", "All Floors", "Custom"],
    default: "All Floors"
  },
  
  status: {
    type: String,
    enum: ["Active", "Expired", "Cancelled", "Scheduled", "Deactivated"],
    default: "Scheduled"
  },
  
  affectedReservations: [{
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation"
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    roomName: String,
    date: String,
    startTime: String,
    endTime: String,
    cancelledAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true
  },
  createdByAdminName: {
    type: String,
    required: true
  },
  
  // Activation fields
  activatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin"
  },
  activatedByName: {
    type: String
  },
  activatedAt: {
    type: Date
  },
  
  // Deactivation fields
  deactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin"
  },
  deactivatedByName: {
    type: String
  },
  deactivatedAt: {
    type: Date
  },
  deactivatedReason: {
    type: String
  },
  
  // Expiration fields
  endedBy: {
    type: String,
    default: "System"
  },
  endedAt: {
    type: Date
  },
  endedReason: {
    type: String
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function() {
      const closureDate = new Date(this.date);
      closureDate.setHours(23, 59, 59, 999);
      return closureDate;
    }
  }
}, {
  timestamps: true
});

// Indexes
closureSchema.index({ date: 1, status: 1 });
closureSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
closureSchema.index({ status: 1, date: 1 });
closureSchema.index({ affectedFloors: 1 });
closureSchema.index({ affectedAllFloors: 1 });

// Pre-save middleware
closureSchema.pre('save', function(next) {
  if (this.isModified('date')) {
    const closureDate = new Date(this.date);
    closureDate.setHours(23, 59, 59, 999);
    this.expiresAt = closureDate;
  }
  
  // Auto-set status based on date if not manually set
  if (!this.isModified('status')) {
    const now = new Date();
    const closureDate = new Date(this.date);
    const [startHours, startMinutes] = this.startTime.split(":").map(Number);
    closureDate.setHours(startHours, startMinutes, 0, 0);
    
    if (now >= closureDate && this.status !== "Deactivated") {
      this.status = "Active";
    } else if (now < closureDate && this.status !== "Deactivated") {
      this.status = "Scheduled";
    }
  }
  
  // Migrate old room-based data to floor-based if needed
  if (!this.affectedAllFloors && this.affectedRooms && this.affectedRooms.length > 0 && 
      (!this.affectedFloors || this.affectedFloors.length === 0)) {
    // This migration would require fetching rooms, but we can't do that here
    // This will be handled in the controller
    console.log("⚠️ Legacy closure with affectedRooms detected. Will migrate on activation.");
  }
  
  this.updatedAt = new Date();
  next();
});

// Method to check if a room is affected by this closure
closureSchema.methods.isRoomAffected = function(roomName, roomFloor) {
  if (this.affectedAllFloors) return true;
  if (!this.affectedFloors || this.affectedFloors.length === 0) return false;
  return this.affectedFloors.includes(roomFloor);
};

// Method to check if a time falls within closure period
closureSchema.methods.isTimeOverlapping = function(checkTime) {
  const startTime = this.startTime;
  const endTime = this.endTime;
  return checkTime >= startTime && checkTime < endTime;
};

// Method to check if a reservation conflicts with this closure
closureSchema.methods.conflictsWithReservation = function(reservation) {
  if (reservation.date !== this.date) return false;
  
  const roomAffected = this.isRoomAffected(reservation.roomName, reservation.location);
  if (!roomAffected) return false;
  
  const resStartTime = reservation.time || new Date(reservation.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const resEndTime = new Date(reservation.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  
  const closureStart = this.startTime;
  const closureEnd = this.endTime;
  
  const overlap = (resStartTime >= closureStart && resStartTime < closureEnd) ||
                  (resEndTime > closureStart && resEndTime <= closureEnd) ||
                  (closureStart >= resStartTime && closureStart < resEndTime);
  
  return overlap;
};

// Virtual property to get affected display text
closureSchema.virtual('affectedDisplay').get(function() {
  if (this.affectedAllFloors) return "All Floors";
  if (this.affectedFloors && this.affectedFloors.length > 0) {
    return this.affectedFloors.join(", ");
  }
  return "None";
});

// Virtual property to check if closure is currently active
closureSchema.virtual('isCurrentlyActive').get(function() {
  if (this.status !== "Active") return false;
  
  const now = new Date();
  const [startHours, startMinutes] = this.startTime.split(":").map(Number);
  const [endHours, endMinutes] = this.endTime.split(":").map(Number);
  
  const startDateTime = new Date(this.date);
  startDateTime.setHours(startHours, startMinutes, 0, 0);
  
  const endDateTime = new Date(this.date);
  endDateTime.setHours(endHours, endMinutes, 0, 0);
  
  return now >= startDateTime && now < endDateTime;
});

// Virtual property to check if closure is scheduled for future
closureSchema.virtual('isScheduled').get(function() {
  if (this.status !== "Scheduled") return false;
  
  const now = new Date();
  const [startHours, startMinutes] = this.startTime.split(":").map(Number);
  const startDateTime = new Date(this.date);
  startDateTime.setHours(startHours, startMinutes, 0, 0);
  
  return now < startDateTime;
});

const Closure = mongoose.model("Closure", closureSchema);

export default Closure;