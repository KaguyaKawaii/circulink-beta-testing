import api from "../utils/api";
import socket from "../utils/socket";

class MaintenanceService {
  constructor() {
    this.maintenanceSettings = {
      maintenanceMode: false,
      maintenanceMessage: "",
      allowAdminAccess: true
    };
  }

  static maintenanceSettings = {
    maintenanceMode: false,
    maintenanceMessage: "",
    allowAdminAccess: true
  };

  static async checkMaintenanceMode() {
    try {
      const response = await api.get('/admin/system/settings');
      if (response.data.success) {
        this.maintenanceSettings = {
          maintenanceMode: response.data.settings?.maintenanceMode || false,
          maintenanceMessage: response.data.settings?.maintenanceMessage || "",
          allowAdminAccess: response.data.settings?.allowAdminAccess !== undefined 
            ? response.data.settings.allowAdminAccess 
            : true
        };
      }
      return this.maintenanceSettings;
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
      return this.maintenanceSettings;
    }
  }

  static canAccessDuringMaintenance(userRole, currentView, isAdminDomain = false) {
    if (!userRole) {
      // No user logged in - allow admin login on admin domain, maintenance and home on main domain
      if (isAdminDomain) {
        return currentView === 'adminLogin' || currentView === 'maintenance';
      }
      return currentView === 'adminLogin' || currentView === 'maintenance' || currentView === 'home';
    }
    
    const role = userRole.toLowerCase();
    
    // ✅ ALWAYS allow admin to access everything during maintenance
    if (role === 'admin') {
      return true;
    }
    
    // Allow staff during maintenance
    if (role === 'staff' || role === 'staff_office') {
      return true;
    }
    
    // Regular users can only see maintenance screen during maintenance
    return currentView === 'maintenance';
  }

  static shouldRedirectToMaintenance(userRole, currentView, isAdminDomain = false) {
    if (!this.maintenanceSettings.maintenanceMode) return false;
    return !this.canAccessDuringMaintenance(userRole, currentView, isAdminDomain);
  }

  static setupMaintenanceListener(callback) {
    const handler = (data) => {
      this.maintenanceSettings = {
        maintenanceMode: data.maintenanceMode,
        maintenanceMessage: data.maintenanceMessage || "",
        allowAdminAccess: data.allowAdminAccess
      };
      callback(this.maintenanceSettings);
    };
    
    socket.on('maintenance-mode-updated', handler);
    return () => socket.off('maintenance-mode-updated', handler);
  }

  static getMaintenanceSettings() {
    return this.maintenanceSettings;
  }
}

export default MaintenanceService;