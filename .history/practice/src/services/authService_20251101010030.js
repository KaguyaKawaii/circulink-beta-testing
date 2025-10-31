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
}

export default AuthService;