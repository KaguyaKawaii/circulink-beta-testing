const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

function nowPH() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 480 * 60000);
}

const userSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, lowercase: true, unique: true, required: true },
  id_number:   { type: String, required: true, unique: true },
  password:    { type: String, required: true },

  department:  { type: String, default: "N/A" },
  floor:       { type: String, default: "N/A" },
  course:      { type: String, default: "N/A" },
  year_level:  { type: String, default: "N/A" },
  profilePicture: { type: String, default: "" },

  role: {
    type: String,
    enum: ["Student", "Faculty", "Staff", "Staff_Office"],
    default: "Student",
  },

  verified:   { type: Boolean, default: false },
  suspended: { type: Boolean, default: false },

  // Session tracking fields
  isLoggedIn: { type: Boolean, default: false },
  currentSessionId: { type: String, default: null },
  lastLogin: { type: Date, default: null },

  otp:        { type: String },
  otpExpiry:  { type: Date },

  // ✅ FIXED: Remove skipPasswordHash flag to ensure consistent password hashing
  // skipPasswordHash: { type: Boolean, select: false }, // REMOVED - causes issues

  archived:   { type: Boolean, default: false },
  archivedAt: { type: Date, default: null },
}, 
{
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Virtual field for yearLevel (to maintain compatibility)
userSchema
  .virtual("yearLevel")
  .get(function () {
    return this.year_level;
  })
  .set(function (val) {
    this.year_level = val;
  });

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

// ✅ FIXED: Pre-save hook - always hash password when modified (no skip flag)
userSchema.pre("save", async function (next) {
  try {
    // Only hash the password if it has been modified (or is new)
    // This ensures we don't double-hash an already hashed password
    if (this.isModified("password")) {
      // Check if password is already hashed (starts with $2a$ or $2b$)
      const isAlreadyHashed = this.password.startsWith('$2a$') || this.password.startsWith('$2b$');
      
      if (!isAlreadyHashed) {
        // Password is plain text, hash it
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        console.log("✅ Password hashed in pre-save hook");
      } else {
        console.log("⚠️ Password already hashed, skipping re-hash");
      }
    }

    // Auto-verify for Faculty/Staff/Staff_Office upon creation
    if (this.isNew && ["Faculty", "Staff", "Staff_Office"].includes(this.role)) {
      this.verified = true;
    }

    // Set default values based on role
    if (this.isNew) {
      if (this.role === "Faculty" || this.role === "Staff_Office") {
        this.course = "N/A";
        this.year_level = "N/A";
      }
      if (this.role === "Student") {
        // Student fields are already set from the form
      }
    }

    next();
  } catch (error) {
    console.error("Error in pre-save hook:", error);
    next(error);
  }
});

// ✅ Add a method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);