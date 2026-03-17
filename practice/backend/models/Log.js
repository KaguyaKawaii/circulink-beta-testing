import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    id_number: { type: String },
    userName: { type: String },
    action: { type: String, required: true },
    details: { type: String },
    userAgent: { type: String, default: '' }, // ADDED THIS FIELD
  },
  { timestamps: true }
);

const Log = mongoose.model("Log", logSchema);
export default Log;