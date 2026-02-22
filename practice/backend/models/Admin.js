import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  id_number: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, default: "admin" },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  otp: { 
    code: String,
    expiresAt: Date
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

adminSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

adminSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

adminSchema.set("toJSON", {
  virtuals: true
});

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;