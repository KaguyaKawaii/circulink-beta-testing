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

// In services/maintenanceService.js
static canAccessDuringMaintenance(userRole, currentView) {
  if (!userRole) {
    // No user logged in - only allow login and maintenance views
    return currentView === 'adminLogin' || currentView === 'maintenance' || currentView === 'home';
  }
  
  const role = userRole.toLowerCase();
  
  // ✅ Allow admin and staff to access everything during maintenance
  if (role === 'admin' || role === 'staff' || role === 'staff_office') {
    return true;
  }
  
  // Regular users can only see maintenance screen during maintenance
  return currentView === 'maintenance';
}

  static shouldRedirectToMaintenance(userRole, currentView) {
    if (!this.maintenanceSettings.maintenanceMode) return false;
    return !this.canAccessDuringMaintenance(userRole, currentView);
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