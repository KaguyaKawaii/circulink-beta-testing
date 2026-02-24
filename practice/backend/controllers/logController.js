import Log from "../models/Log.js";
import User from "../models/User.js";

// 📌 Get all logs
export const getAllLogs = async (req, res) => {
  try {
    const logs = await Log.find()
      .populate('userId', 'name id_number') // ✅ Add this line to populate user data
      .sort({ createdAt: -1 });
    
    res.json(logs);
  } catch (err) {
    console.error("Error fetching logs:", err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
};