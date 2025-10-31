const User = require("../models/User");

const sessionController = {
  // Check if user can login (not already logged in elsewhere)
  checkLoginStatus: async (req, res) => {
    try {
      const { email } = req.body;
      
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.isLoggedIn) {
        return res.status(409).json({ 
          message: "User is already logged in another browser. Please log out from other device first.",
          isLoggedIn: true 
        });
      }

      res.json({ canLogin: true, isLoggedIn: false });
    } catch (error) {
      res.status(500).json({ message: "Server error checking login status" });
    }
  },

  // Update session status (login)
  updateSessionLogin: async (req, res) => {
    try {
      const { userId, sessionId } = req.body;
      
      const user = await User.findByIdAndUpdate(
        userId,
        { 
          isLoggedIn: true,
          currentSessionId: sessionId,
          lastLogin: new Date()
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ success: true, user });
    } catch (error) {
      res.status(500).json({ message: "Server error updating session" });
    }
  },

  // Update session status (logout)
  updateSessionLogout: async (req, res) => {
    try {
      const { userId } = req.body;
      
      const user = await User.findByIdAndUpdate(
        userId,
        { 
          isLoggedIn: false,
          currentSessionId: null
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Server error updating session" });
    }
  },

  // Validate current session
  validateSession: async (req, res) => {
    try {
      const { userId, sessionId } = req.body;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.json({ isValid: false });
      }

      // Session is valid only if sessionId matches and user is still marked as logged in
      const isValid = user.isLoggedIn && user.currentSessionId === sessionId;
      
      res.json({ isValid });
    } catch (error) {
      res.status(500).json({ message: "Server error validating session" });
    }
  }
};

module.exports = sessionController;