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

  static canAccessDuringMaintenance(userRole, currentView) {
    const isAdmin = userRole === 'admin';
    const isStaff = userRole === 'staff';
    const isPublicAuthPage = ['login', 'signup', 'resetPassword', 'adminLogin'].includes(currentView);
    const isMaintenancePage = currentView === 'maintenance';
    
    return (isAdmin && this.maintenanceSettings.allowAdminAccess) || 
           isStaff ||
           isPublicAuthPage || 
           isMaintenancePage;
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