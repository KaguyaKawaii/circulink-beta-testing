class AuthService {
  static getUser() {
    const saved = localStorage.getItem("user");
    const savedType = localStorage.getItem("userType");
    if (saved) {
      const userData = JSON.parse(saved);
      userData.userType = savedType; // Add userType to track admin vs user collection
      return userData;
    }
    return null;
  }

  static setUser(userData, userType = 'user') {
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("userType", userType); // 'admin' or 'user'
  }

  static async loginUser(credentials) {
    try {
      const response = await api.post("/users/login", credentials);
      if (response.data.success) {
        return response.data.user;
      } else {
        throw new Error(response.data.message || "Login failed");
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || "An error occurred during login");
    }
  }

  static clearUser() {
    localStorage.removeItem("user");
    localStorage.removeItem("userType");
  }

  static isAuthenticated() {
    return !!this.getUser();
  }

  static getUserRole() {
    const user = this.getUser();
    return user?.role?.toLowerCase();
  }

  static getUserType() {
    return localStorage.getItem("userType") || 'user';
  }

  static isAdmin() {
    return this.getUserType() === 'admin';
  }

  static isStaff() {
    const role = this.getUserRole();
    return role === 'staff' || role === 'staff_office';
  }

  static isStaffOffice() {
    return this.getUserRole() === 'staff_office';
  }

  static isRegularUser() {
    const role = this.getUserRole();
    const type = this.getUserType();
    return type === 'user' && role && !['admin', 'staff', 'staff_office'].includes(role);
  }

  // All users from 'users' collection use handleUserLogin
  static handleUserLogin(userData) {
    this.setUser(userData, 'user');
    return userData;
  }

  // Only admins from 'admins' collection use handleAdminLogin
  static handleAdminLogin(adminData) {
    this.setUser(adminData, 'admin');
    return adminData;
  }

  static handleSignup(newUserData) {
    this.setUser(newUserData, 'user');
    return newUserData;
  }

  // NEW: Check if user can access admin domain
  static canAccessAdminDomain() {
    const user = this.getUser();
    const userType = this.getUserType();
    return userType === 'admin' && user?.role?.toLowerCase() === 'admin';
  }

  // NEW: Check if user should be redirected based on domain
  static shouldRedirectToAdminDomain() {
    const user = this.getUser();
    const userType = this.getUserType();
    return userType === 'admin' && user?.role?.toLowerCase() === 'admin';
  }

  // NEW: Check if user should be redirected to main domain
  static shouldRedirectToMainDomain() {
    const user = this.getUser();
    const userType = this.getUserType();
    return userType !== 'admin' || user?.role?.toLowerCase() !== 'admin';
  }
}

export default AuthService;