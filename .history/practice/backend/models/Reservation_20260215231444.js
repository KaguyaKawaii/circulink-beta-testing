// models/Reservation.js - Updated schema
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
  // Extension request fields
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
    enum: ["fixed", "continuous"],
    default: "continuous",
  },
  extensionMinutes: {
    type: Number,
  },
  extensionHours: {
    type: Number,
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
  // Actual usage times
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

// Create and export the model with DEFAULT EXPORT
const Reservation = mongoose.model("Reservation", reservationSchema);
export default Reservation;