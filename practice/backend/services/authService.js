// services/authService.js

class AuthService {
  // Get user from session storage
  static getUser() {
    try {
      const session = JSON.parse(localStorage.getItem("userSession") || "{}");
      return session.user || null;
    } catch (error) {
      console.error("Error getting user from session:", error);
      return null;
    }
  }

  // Get session token
  static getSessionToken() {
    try {
      const session = JSON.parse(localStorage.getItem("userSession") || "{}");
      return session.sessionToken || null;
    } catch (error) {
      console.error("Error getting session token:", error);
      return null;
    }
  }

  // Set user in session storage
  static setUser(userData) {
    try {
      const session = JSON.parse(localStorage.getItem("userSession") || "{}");
      session.user = userData;
      localStorage.setItem("userSession", JSON.stringify(session));
    } catch (error) {
      console.error("Error setting user in session:", error);
    }
  }

  // Handle user login - stores user and session token
  static handleUserLogin(userData) {
    try {
      const sessionData = {
        user: userData,
        sessionToken: userData.sessionToken,
        timestamp: Date.now(),
        expiresIn: 24 * 60 * 60 * 1000 // 24 hours
      };
      localStorage.setItem("userSession", JSON.stringify(sessionData));
      return userData;
    } catch (error) {
      console.error("Error handling user login:", error);
      return null;
    }
  }

  // Handle admin login (OTP verification)
  static handleAdminLogin(adminData) {
    try {
      const sessionData = {
        user: adminData,
        sessionToken: adminData.sessionToken,
        timestamp: Date.now(),
        expiresIn: 24 * 60 * 60 * 1000 // 24 hours
      };
      localStorage.setItem("userSession", JSON.stringify(sessionData));
      return adminData;
    } catch (error) {
      console.error("Error handling admin login:", error);
      return null;
    }
  }

  // Clear user from session storage
  static clearUser() {
    try {
      localStorage.removeItem("userSession");
    } catch (error) {
      console.error("Error clearing user session:", error);
    }
  }

  // Check if session is expired
  static isSessionExpired() {
    try {
      const session = JSON.parse(localStorage.getItem("userSession") || "{}");
      if (!session.timestamp) return true;
      
      const now = Date.now();
      const expiryTime = session.timestamp + (session.expiresIn || 24 * 60 * 60 * 1000);
      return now > expiryTime;
    } catch (error) {
      console.error("Error checking session expiry:", error);
      return true;
    }
  }

  // Refresh session timestamp
  static refreshSession() {
    try {
      const session = JSON.parse(localStorage.getItem("userSession") || "{}");
      if (session.user && session.sessionToken) {
        session.timestamp = Date.now();
        localStorage.setItem("userSession", JSON.stringify(session));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error refreshing session:", error);
      return false;
    }
  }

  // Get user role
  static getUserRole() {
    const user = this.getUser();
    return user?.role?.toLowerCase() || null;
  }

  // Check if user is authenticated
  static isAuthenticated() {
    const user = this.getUser();
    const token = this.getSessionToken();
    return !!(user && token && !this.isSessionExpired());
  }

  // Update user data in session
  static updateUser(updatedUserData) {
    try {
      const session = JSON.parse(localStorage.getItem("userSession") || "{}");
      if (session.user) {
        session.user = { ...session.user, ...updatedUserData };
        localStorage.setItem("userSession", JSON.stringify(session));
        return session.user;
      }
      return null;
    } catch (error) {
      console.error("Error updating user in session:", error);
      return null;
    }
  }
}

export default AuthService;