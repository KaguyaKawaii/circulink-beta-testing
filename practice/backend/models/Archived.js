import mongoose from "mongoose";

const archivedReservationSchema = new mongoose.Schema(
  {
    originalId: { type: mongoose.Schema.Types.ObjectId },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    room_Id: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    roomName: String,
    location: String,
    datetime: Date,
    endDatetime: Date,
    status: String,
    participants: Array,
    purpose: String,
    numUsers: Number,
    archivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const ArchivedReservation = mongoose.models.ArchivedReservation || 
  mongoose.model("ArchivedReservation", archivedReservationSchema);
export default ArchivedReservation;