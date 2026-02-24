import mongoose from "mongoose";
import Reservation from "./Reservation.js";

// Clone Reservation schema definition
const archivedReservationSchema = new mongoose.Schema(
  {
    ...Reservation.schema.obj,
    archivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const ArchivedReservation = mongoose.models.ArchivedReservation || 
  mongoose.model("ArchivedReservation", archivedReservationSchema);
export default ArchivedReservation;