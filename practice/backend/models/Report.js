import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  reportedBy: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  category: {
    type: String,
    enum: ["Maintenance", "Security", "Equipment", "Other"],
    required: true,
  },
  details: { type: String, required: true },
  floor: { type: String, default: "N/A" },
  room: { type: String, default: "N/A" },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Resolved", "Archived"],
    default: "Pending",
  },
  actionTaken: { type: String, default: "" },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

reportSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Report = mongoose.model("Report", reportSchema);
export default Report;