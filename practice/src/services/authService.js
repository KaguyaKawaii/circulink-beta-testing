class AuthService {
  static getUser() {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  }

  static setUser(userData) {
    localStorage.setItem("user", JSON.stringify(userData));
  }

  static clearUser() {
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

  // Login handlers
  static handleUserLogin(userData) {
    this.setUser(userData);
    return userData;
  }

  static handleAdminLogin(adminData) {
    this.setUser(adminData);
    return adminData;
  }

  static handleSignup(newUserData) {
    this.setUser(newUserData);
    return newUserData;
  }
}

export default AuthService;