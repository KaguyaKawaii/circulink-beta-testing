// middleware/socketAuth.js
import User from "../models/User.js";

export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      // Allow connection but with limited access
      socket.user = null;
      return next();
    }

    // Find user by session token
    const user = await User.findOne({ sessionToken: token });
    
    if (!user) {
      // Invalid token, but still allow connection (just without auth)
      socket.user = null;
      return next();
    }

    // Check if user is archived or suspended
    if (user.archived || user.suspended) {
      socket.user = null;
      return next();
    }

    // Attach user to socket
    socket.user = {
      _id: user._id,
      name: user.name,
      role: user.role,
      sessionToken: token
    };

    next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    next(new Error("Authentication error"));
  }
};