const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
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

// Virtual for checking if account is locked
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Update the updatedAt field before saving
adminSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure virtual fields are serialized
adminSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model("Admin", adminSchema);