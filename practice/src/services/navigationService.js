import { 
  PUBLIC_ROUTES, 
  USER_ROUTES, 
  ADMIN_ROUTES, 
  STAFF_ROUTES,
  APP_TYPES,
  getAppTypeFromView 
} from '../config/routes';

class NavigationService {
  static getDefaultRoute(userRole) {
    if (!userRole) return 'home';
    
    const role = userRole.toLowerCase();
    switch (role) {
      case 'staff': return 'staffDashboard';
      case 'admin': return 'adminDashboard';
      default: return 'dashboard';
    }
  }

  static isRouteAllowed(userRole, route) {
    if (!userRole) return PUBLIC_ROUTES.includes(route);
    
    const role = userRole.toLowerCase();
    switch (role) {
      case 'admin': return ADMIN_ROUTES.includes(route) || PUBLIC_ROUTES.includes(route);
      case 'staff': return STAFF_ROUTES.includes(route) || PUBLIC_ROUTES.includes(route);
      default: return USER_ROUTES.includes(route) || PUBLIC_ROUTES.includes(route);
    }
  }

  static shouldShowNavigation(view, userRole) {
    const noNavRoutes = ['home', 'login', 'signup', 'adminLogin', 'resetPassword', 'maintenance'];
    if (noNavRoutes.includes(view)) return false;
    
    // Only show appropriate navigation for user role
    if (userRole) {
      const role = userRole.toLowerCase();
      if (role === 'admin' && !view.startsWith('admin')) return false;
      if (role === 'staff' && !view.startsWith('staff')) return false;
      if (!['admin', 'staff'].includes(role) && (view.startsWith('admin') || view.startsWith('staff'))) return false;
    }
    
    return true;
  }

  static getNavigationType(userRole, currentView) {
    if (!userRole) return null;
    
    const role = userRole.toLowerCase();
    const appType = getAppTypeFromView(currentView);
    
    // Return navigation type based on both role and current view
    if (role === 'admin' && appType === APP_TYPES.ADMIN) return 'admin';
    if (role === 'staff' && appType === APP_TYPES.STAFF) return 'staff';
    if (role !== 'admin' && role !== 'staff' && appType === APP_TYPES.USER) return 'user';
    
    return null;
  }

  static getAppType(currentView) {
    return getAppTypeFromView(currentView);
  }
}

export default NavigationService;