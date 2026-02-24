import mongoose from "mongoose";

const archivedUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    id_number: { type: String, required: true },
    password: { type: String },
    department: { type: String },
    course: { type: String },
    year_level: { type: String },
    floor: { type: String },
    role: { type: String, required: true },
    verified: { type: Boolean, default: false },
    profilePicture: { type: String },
    archivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const ArchivedUser = mongoose.models.ArchivedUser || 
  mongoose.model("ArchivedUser", archivedUserSchema);
export default ArchivedUser;