import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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
  isLoggedIn: { type: Boolean, default: false },
  currentSessionId: { type: String, default: null },
  lastLogin: { type: Date, default: null },
  otp:        { type: String },
  otpExpiry:  { type: Date },
  archived:   { type: Boolean, default: false },
  archivedAt: { type: Date, default: null },
}, 
{
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Virtual field for yearLevel
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

// Pre-save hook
userSchema.pre("save", async function (next) {
  try {
    if (this.isModified("password")) {
      const isAlreadyHashed = this.password.startsWith('$2a$') || this.password.startsWith('$2b$');
      
      if (!isAlreadyHashed) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        console.log("✅ Password hashed in pre-save hook");
      } else {
        console.log("⚠️ Password already hashed, skipping re-hash");
      }
    }

    // IMPORTANT FIX: Only auto-verify if this is a new document AND the role is Faculty/Staff/Staff_Office
    // AND verified is not explicitly set to false
    if (this.isNew && ["Faculty", "Staff", "Staff_Office"].includes(this.role)) {
      // Only auto-verify if verified hasn't been set explicitly
      if (this.verified === undefined) {
        this.verified = true;
        console.log(`✅ Auto-verified ${this.role} user: ${this.email}`);
      }
    }

    if (this.isNew) {
      if (this.role === "Faculty" || this.role === "Staff_Office") {
        this.course = "N/A";
        this.year_level = "N/A";
      }
    }

    next();
  } catch (error) {
    console.error("Error in pre-save hook:", error);
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;