import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  id_number: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true }, // Keep both for flexibility
  password: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, default: "admin" },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  otp: { 
    code: String,
    expiresAt: Date,
    attempts: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for better query performance
adminSchema.index({ username: 1 });
adminSchema.index({ email: 1 });
adminSchema.index({ id_number: 1 });

adminSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

adminSchema.virtual("otpAttempts").get(function () {
  return this.otp?.attempts || 0;
});

adminSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

adminSchema.set("toJSON", {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.otp;
    return ret;
  }
});

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;