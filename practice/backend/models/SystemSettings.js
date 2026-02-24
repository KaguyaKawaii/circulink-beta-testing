import mongoose from "mongoose";

const systemSettingsSchema = new mongoose.Schema({
  maintenanceMode: { type: Boolean, default: false },
  maintenanceMessage: { type: String, default: "" },
  allowAdminAccess: { type: Boolean, default: true },
  autoBackup: { type: Boolean, default: true },
  backupFrequency: { 
    type: String, 
    enum: ["daily", "weekly", "monthly"], 
    default: "daily" 
  },
  announcementEnabled: { type: Boolean, default: false },
  announcementText: { type: String, default: "" },
  announcementExpires: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

systemSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const SystemSettings = mongoose.model("SystemSettings", systemSettingsSchema);
export default SystemSettings;