// models/SystemSettings.js
const mongoose = require("mongoose");

const systemSettingsSchema = new mongoose.Schema({
  // Maintenance Mode Settings
  maintenanceMode: { type: Boolean, default: false },
  maintenanceMessage: { type: String, default: "" },
  allowAdminAccess: { type: Boolean, default: true },

  // Backup Management Settings
  autoBackup: { type: Boolean, default: true },
  backupFrequency: { 
    type: String, 
    enum: ["daily", "weekly", "monthly"], 
    default: "daily" 
  },

  // System Announcement Settings
  announcementEnabled: { type: Boolean, default: false },
  announcementText: { type: String, default: "" },
  announcementExpires: { type: Date, default: null },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
systemSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("SystemSettings", systemSettingsSchema);