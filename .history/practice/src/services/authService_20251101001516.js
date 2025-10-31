import api from "./utils/api";

class AuthService {
  static getUser() {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  }

  static setUser(userData) {
    localStorage.setItem("user", JSON.stringify(userData));
  }

  static getSessionId() {
    return localStorage.getItem("sessionId");
  }

  static setSessionId(sessionId) {
    localStorage.setItem("sessionId", sessionId);
  }

  static clearUser() {
    const user = this.getUser();
    
    // Call logout endpoint to clear server session
    if (user?._id) {
      api.post("/auth/update-session-logout", { userId: user._id })
        .catch(err => console.error("Logout session update failed:", err));
    }
    
    localStorage.clear();
  }

  static isAuthenticated() {
    return !!this.getUser();
  }

  static getUserRole() {
    const user = this.getUser();
    return user?.role?.toLowerCase();
  }

  static isAdmin() {
    return this.getUserRole() === 'admin';
  }

  static isStaff() {
    return this.getUserRole() === 'staff';
  }

  static isRegularUser() {
    const role = this.getUserRole();
    return role && !['admin', 'staff'].includes(role);
  }

  // NEW: Check if user can login (not already logged in elsewhere)
  static async checkLoginStatus(email) {
    try {
      const response = await api.post("/auth/check-login-status", { email });
      return response.data;
    } catch (error) {
      if (error.response?.status === 409) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  }

  // NEW: Update session on login
  static async updateSessionLogin(userId) {
    const sessionId = this.generateSessionId();
    await api.post("/auth/update-session-login", { 
      userId, 
      sessionId 
    });
    this.setSessionId(sessionId);
    return sessionId;
  }

  // NEW: Validate current session
  static async validateSession() {
    try {
      const user = this.getUser();
      const sessionId = this.getSessionId();
      
      if (!user?._id || !sessionId) return false;

      const response = await api.post("/auth/validate-session", {
        userId: user._id,
        sessionId: sessionId
      });
      
      return response.data.isValid;
    } catch (error) {
      console.error("Session validation error:", error);
      return false;
    }
  }

  // NEW: Generate unique session ID
  static generateSessionId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // UPDATED Login handlers with session management
  static async handleUserLogin(userData) {
    // Check if user is already logged in elsewhere
    await this.checkLoginStatus(userData.email);
    
    // Update session
    await this.updateSessionLogin(userData._id);
    
    this.setUser(userData);
    return userData;
  }

  static async handleAdminLogin(adminData) {
    // Check if admin is already logged in elsewhere
    await this.checkLoginStatus(adminData.email);
    
    // Update session
    await this.updateSessionLogin(adminData._id);
    
    this.setUser(adminData);
    return adminData;
  }

  static async handleSignup(newUserData) {
    // For new signups, no need to check existing sessions
    await this.updateSessionLogin(newUserData._id);
    
    this.setUser(newUserData);
    return newUserData;
  }
}

export default AuthService;