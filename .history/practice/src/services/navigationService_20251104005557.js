import { 
  PUBLIC_ROUTES, 
  USER_ROUTES, 
  ADMIN_ROUTES, 
  STAFF_ROUTES,
  APP_TYPES,
  getAppTypeFromView 
} from '../config/routes';

class NavigationService {
  static getDefaultRoute(userRole, isAdminDomain = false) {
    if (!userRole) {
      return isAdminDomain ? 'adminLogin' : 'home';
    }
    
    const role = userRole.toLowerCase();
    switch (role) {
      case 'admin': return isAdminDomain ? 'adminDashboard' : 'adminDashboard';
      case 'staff': return 'staffDashboard';
      default: return 'dashboard';
    }
  }

  static isRouteAllowed(userRole, route, isAdminDomain = false) {
    // On admin domain, only allow admin routes and admin login
    if (isAdminDomain) {
      const adminAllowedRoutes = ['adminLogin', 'maintenance', ...ADMIN_ROUTES];
      if (!userRole) {
        return route === 'adminLogin' || route === 'maintenance';
      }
      return userRole.toLowerCase() === 'admin' && adminAllowedRoutes.includes(route);
    }
    
    // Main domain logic
    if (!userRole) return PUBLIC_ROUTES.includes(route);
    
    const role = userRole.toLowerCase();
    switch (role) {
      case 'admin': return ADMIN_ROUTES.includes(route) || PUBLIC_ROUTES.includes(route);
      case 'staff': return STAFF_ROUTES.includes(route) || PUBLIC_ROUTES.includes(route);
      default: return USER_ROUTES.includes(route) || PUBLIC_ROUTES.includes(route);
    }
  }

  static shouldShowNavigation(view, userRole, isAdminDomain = false) {
    const noNavRoutes = ['home', 'login', 'signup', 'adminLogin', 'resetPassword', 'maintenance'];
    if (noNavRoutes.includes(view)) return false;
    
    // Domain-based navigation logic
    if (isAdminDomain) {
      return userRole?.toLowerCase() === 'admin' && view.startsWith('admin');
    }
    
    // Only show appropriate navigation for user role on main domain
    if (userRole) {
      const role = userRole.toLowerCase();
      if (role === 'admin' && !view.startsWith('admin')) return false;
      if (role === 'staff' && !view.startsWith('staff')) return false;
      if (!['admin', 'staff'].includes(role) && (view.startsWith('admin') || view.startsWith('staff'))) return false;
    }
    
    return true;
  }

  static getNavigationType(userRole, currentView, isAdminDomain = false) {
    if (!userRole) return null;
    
    const role = userRole.toLowerCase();
    const appType = getAppTypeFromView(currentView);
    
    // Domain-based navigation type
    if (isAdminDomain) {
      return role === 'admin' && appType === APP_TYPES.ADMIN ? 'admin' : null;
    }
    
    // Return navigation type based on both role and current view
    if (role === 'admin' && appType === APP_TYPES.ADMIN) return 'admin';
    if (role === 'staff' && appType === APP_TYPES.STAFF) return 'staff';
    if (role !== 'admin' && role !== 'staff' && appType === APP_TYPES.USER) return 'user';
    
    return null;
  }

  static getAppType(currentView) {
    return getAppTypeFromView(currentView);
  }

  // NEW: Check if route is admin-only
  static isAdminRoute(route) {
    const adminRoutes = ['adminLogin', 'adminDashboard', 'adminReservation', 'adminRoom', 'adminUsers', 'adminMessage', 'adminReports', 'adminNotifications', 'adminNews', 'adminLogs', 'archivedUsers', 'archivedReservations', 'archivedReports', 'archivedNews', 'profileSettings', 'passwordSecurity', 'systemSettings'];
    return adminRoutes.includes(route);
  }

  // NEW: Check if user should be redirected based on domain and route
  static shouldRedirectToAdminDomain(userRole, currentRoute) {
    return userRole?.toLowerCase() === 'admin' && this.isAdminRoute(currentRoute);
  }

  static shouldRedirectToMainDomain(userRole, currentRoute) {
    return userRole?.toLowerCase() !== 'admin' && this.isAdminRoute(currentRoute);
  }
}

export default NavigationService;