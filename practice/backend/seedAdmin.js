import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Admin from "./models/Admin.js";

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: "admin" });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = new Admin({
      id_number: "ADMIN001",
      username: "admin",
      password: hashedPassword,
      name: "Root Administrator",
      email: "smadero@usa.edu.ph",
      role: "admin"
    });

    await admin.save();

    console.log("✅ Admin created successfully");
    process.exit();

  } catch (error) {
    console.error("❌ Error creating admin:");
    console.error(error.message);
    process.exit(1);
  }
};

createAdmin();