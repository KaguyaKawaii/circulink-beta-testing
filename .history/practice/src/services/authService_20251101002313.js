import api from "./utils/api";

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
      fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id })
      }).catch(err => console.error("Logout session update failed:", err));
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

  // ✅ UPDATED: User login with session management
  static async loginUser(credentials) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (!response.ok) {
        // ✅ Handle "already logged in" error specifically
        if (response.status === 409 || data.message?.includes('already logged in')) {
          throw new Error(data.message || "User is already logged in another browser. Please log out from other device first.");
        }
        
        if (response.status === 401 || response.status === 403) {
          throw new Error(data.message || "Invalid credentials or account suspended.");
        }
        
        throw new Error(data.message || "Login failed.");
      }

      // Store user data
      this.setUser(data.user);
      
      // Store session ID if available
      if (data.user.currentSessionId) {
        this.setSessionId(data.user.currentSessionId);
      }

      return data.user;
    } catch (error) {
      throw error;
    }
  }

  // ✅ UPDATED: Admin login with session management
  static async loginAdmin(credentials) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (!response.ok) {
        // ✅ Handle "already logged in" error specifically
        if (response.status === 409 || data.message?.includes('already logged in')) {
          throw new Error(data.message || "Admin is already logged in another browser. Please log out from other device first.");
        }
        
        throw new Error(data.message || "Admin login failed.");
      }

      // Store admin data
      this.setUser(data.user);
      
      // Store session ID if available
      if (data.user.currentSessionId) {
        this.setSessionId(data.user.currentSessionId);
      }

      return data.user;
    } catch (error) {
      throw error;
    }
  }

  // ✅ NEW: Validate current session
  static async validateSession() {
    try {
      const user = this.getUser();
      const sessionId = this.getSessionId();
      
      if (!user?._id || !sessionId) return false;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/validate-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          sessionId: sessionId
        })
      });

      const data = await response.json();
      
      return data.isValid === true;
    } catch (error) {
      console.error("Session validation error:", error);
      return false;
    }
  }

  // ✅ NEW: Check login status before attempting login
  static async checkLoginStatus(email) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/check-login-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(data.message || "User is already logged in elsewhere.");
        }
        throw new Error(data.message || "Failed to check login status.");
      }

      return data;
    } catch (error) {
      throw error;
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