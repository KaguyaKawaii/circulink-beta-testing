import api from "../utils/api";

class AuthService {
  static getUser() {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  }

  static setUser(userData) {
    localStorage.setItem("user", JSON.stringify(userData));
  }

  static getToken() {
    return localStorage.getItem("token");
  }

  static setToken(token) {
    localStorage.setItem("token", token);
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
      api.post("/auth/logout", { userId: user._id })
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

  // ✅ UPDATED: User login with session management
  static async loginUser(credentials) {
    try {
      const response = await api.post("/users/login", credentials);
      const data = response.data;

      // Store user data
      this.setUser(data.user);
      
      // Store session ID if available
      if (data.user.currentSessionId) {
        this.setSessionId(data.user.currentSessionId);
      }

      return data.user;
    } catch (error) {
      // ✅ Handle "already logged in" error specifically
      if (error.response?.status === 409 || error.response?.data?.message?.includes('already logged in')) {
        throw new Error(error.response.data.message || "User is already logged in another browser. Please log out from other device first.");
      }
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error(error.response.data.message || "Invalid credentials or account suspended.");
      }
      
      throw new Error(error.response?.data?.message || "Login failed.");
    }
  }

  // ✅ UPDATED: Admin login with session management
  static async loginAdmin(credentials) {
    try {
      const response = await api.post("/auth/admin-login", credentials);
      const data = response.data;

      // Store admin data
      this.setUser(data.user);
      
      // Store session ID if available
      if (data.user.currentSessionId) {
        this.setSessionId(data.user.currentSessionId);
      }

      return data.user;
    } catch (error) {
      // ✅ Handle "already logged in" error specifically
      if (error.response?.status === 409 || error.response?.data?.message?.includes('already logged in')) {
        throw new Error(error.response.data.message || "Admin is already logged in another browser. Please log out from other device first.");
      }
      
      throw new Error(error.response?.data?.message || "Admin login failed.");
    }
  }

  // ✅ NEW: Validate current session
  static async validateSession() {
    try {
      const user = this.getUser();
      const sessionId = this.getSessionId();
      
      if (!user?._id || !sessionId) return false;

      const response = await api.post("/auth/validate-session", {
        userId: user._id,
        sessionId: sessionId
      });

      return response.data.isValid === true;
    } catch (error) {
      console.error("Session validation error:", error);
      return false;
    }
  }

  // ✅ NEW: Check login status before attempting login
  static async checkLoginStatus(email) {
    try {
      const response = await api.post("/auth/check-login-status", { email });
      return response.data;
    } catch (error) {
      if (error.response?.status === 409) {
        throw new Error(error.response.data.message || "User is already logged in elsewhere.");
      }
      throw new Error(error.response?.data?.message || "Failed to check login status.");
    }
  }

  // Login handlers (for backward compatibility)
  static async handleUserLogin(userData) {
    this.setUser(userData);
    if (userData.currentSessionId) {
      this.setSessionId(userData.currentSessionId);
    }
    return userData;
  }

  static async handleAdminLogin(adminData) {
    this.setUser(adminData);
    if (adminData.currentSessionId) {
      this.setSessionId(adminData.currentSessionId);
    }
    return adminData;
  }

  static async handleSignup(newUserData) {
    this.setUser(newUserData);
    if (newUserData.currentSessionId) {
      this.setSessionId(newUserData.currentSessionId);
    }
    return newUserData;
  }
}

export default AuthService;