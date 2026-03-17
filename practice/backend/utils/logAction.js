import Log from "../models/Log.js";

const logAction = async (userId, id_number, userName, action, details, userAgent = 'System') => {
  try {
    await Log.create({
      userId,
      id_number,
      userName,
      action,
      details,
      userAgent // Now accepts userAgent parameter
    });
  } catch (error) {
    console.error("Error logging action:", error);
  }
};

export default logAction;