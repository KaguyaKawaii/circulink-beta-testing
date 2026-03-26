// models/Reservation.js
import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  room_Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  roomName: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    required: true,
  },
  datetime: {
    type: Date,
    required: true,
  },
  endDatetime: {
    type: Date,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  numUsers: {
    type: Number,
    required: true,
  },
  participants: [
    {
      name: String,
      id_number: String,
      course: String,
      year_level: String,
      department: String,
    },
  ],
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected", "Ongoing", "Cancelled", "Expired", "Completed"],
    default: "Pending",
  },
  
  // ========== CLOSURE CANCELLATION FIELDS ==========
  cancellationReason: {
    type: String,
    default: null,
  },
  cancelledBy: {
    type: String,
    default: null,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  
  extensionRequested: {
    type: Boolean,
    default: false,
  },
  extensionStatus: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  extensionType: {
    type: String,
    enum: ["fixed", "continuous", "custom"],
    default: "fixed",
  },
  extensionMinutes: {
    type: Number,
    default: 0,
  },
  extensionHours: {
    type: Number,
    default: 0,
  },
  extendedEndDatetime: {
    type: Date,
  },
  extensionReason: {
    type: String,
  },
  maxExtendedEndDatetime: {
    type: Date,
  },
  actualStartTime: {
    type: Date,
  },
  actualEndTime: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Index for better query performance
reservationSchema.index({ userId: 1, datetime: 1 });
reservationSchema.index({ roomId: 1, datetime: 1 });
reservationSchema.index({ status: 1 });
reservationSchema.index({ cancelledAt: 1 });
reservationSchema.index({ cancellationReason: 1 });

const Reservation = mongoose.model("Reservation", reservationSchema);
export default Reservation;