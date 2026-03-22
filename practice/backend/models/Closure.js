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
  affectedRooms: {
    type: [String],
    required: [true, "Affected rooms are required"],
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: "At least one room must be selected"
    }
  },
  affectedAllRooms: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
    enum: ["Ground Floor", "2nd Floor", "3rd Floor", "4th Floor", "5th Floor", "All Floors"],
    default: "All Floors"
  },
  status: {
    type: String,
    enum: ["Active", "Expired", "Cancelled"],
    default: "Active"
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
    // Auto-expire closures after their date has passed
    default: function() {
      const closureDate = new Date(this.date);
      closureDate.setHours(23, 59, 59, 999);
      return closureDate;
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
closureSchema.index({ date: 1, status: 1 });
closureSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to update expiresAt
closureSchema.pre('save', function(next) {
  if (this.isModified('date')) {
    const closureDate = new Date(this.date);
    closureDate.setHours(23, 59, 59, 999);
    this.expiresAt = closureDate;
  }
  this.updatedAt = new Date();
  next();
});

// Method to check if a time falls within closure period
closureSchema.methods.isTimeOverlapping = function(checkTime) {
  const startTime = this.startTime;
  const endTime = this.endTime;
  
  return checkTime >= startTime && checkTime < endTime;
};

// Method to check if a reservation conflicts with this closure
closureSchema.methods.conflictsWithReservation = function(reservation) {
  // Check if date matches
  if (reservation.date !== this.date) return false;
  
  // Check if affected rooms include the reservation's room
  const roomAffected = this.affectedAllRooms || 
    this.affectedRooms.includes(reservation.roomName);
  
  if (!roomAffected) return false;
  
  // Check time overlap
  const resStartTime = reservation.time || new Date(reservation.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const resEndTime = new Date(reservation.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  
  // Check if reservation time overlaps with closure time
  const closureStart = this.startTime;
  const closureEnd = this.endTime;
  
  // Overlap exists if:
  // - Reservation starts during closure
  // - Reservation ends during closure
  // - Closure starts during reservation
  // - Reservation completely contains closure
  const overlap = (resStartTime >= closureStart && resStartTime < closureEnd) ||
                  (resEndTime > closureStart && resEndTime <= closureEnd) ||
                  (closureStart >= resStartTime && closureStart < resEndTime);
  
  return overlap;
};

const Closure = mongoose.model("Closure", closureSchema);

export default Closure;