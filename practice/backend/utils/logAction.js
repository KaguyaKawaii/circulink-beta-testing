import Log from "../models/Log.js";

async function logAction(userId, id_number, userName, action, details = "") {
  try {
    await Log.create({
      userId,
      id_number,   // ✅ matches Log schema + frontend
      userName,
      action,
      details,
    });
  } catch (err) {
    console.error("Error logging action:", err);
  }
}

export default logAction;