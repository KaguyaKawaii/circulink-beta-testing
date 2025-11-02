import { useState, useEffect } from "react";
import { Save, Wrench, Database, Megaphone, Download, Trash2, RefreshCw, Archive, List, X } from "lucide-react";
import api from "../../utils/api";
import socket from "../../utils/socket";
import AdminNavigation from "../AdminNavigation"; // Add this line


function SystemSettings({ setView, admin, onLogout }) { // Add setView here
  const [formData, setFormData] = useState({
    // Maintenance Mode Settings
    maintenanceMode: false,
    maintenanceMessage: "",
    allowAdminAccess: true,

    // Backup Management Settings
    autoBackup: true,
    backupFrequency: "daily",

    // System Announcement Settings - SIMPLIFIED
    announcementEnabled: false,
    announcementTitle: "",
    announcementText: "",
    announcementExpires: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [backupMessage, setBackupMessage] = useState({ type: '', text: '' });
  
  // NEW STATE FOR BACKUP MANAGEMENT
  const [backups, setBackups] = useState([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  // NEW STATE FOR ANNOUNCEMENT MANAGEMENT
  const [announcements, setAnnouncements] = useState([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [showAnnouncementsList, setShowAnnouncementsList] = useState(false);

  // Add maintenance mode state for real-time updates
  const [maintenanceInfo, setMaintenanceInfo] = useState({
    enabled: false,
    message: "",
    allowAdminAccess: true
  });

  useEffect(() => {
    fetchSystemSettings();
    fetchBackups(); // Fetch backups when component mounts
    
    // Listen for maintenance mode updates
    socket.on('maintenance-mode-updated', (data) => {
      setMaintenanceInfo({
        enabled: data.maintenanceMode,
        message: data.maintenanceMessage,
        allowAdminAccess: data.allowAdminAccess
      });
    });

    return () => {
      socket.off('maintenance-mode-updated');
    };
  }, []);

  const fetchSystemSettings = async () => {
    try {
      const response = await api.get('/admin/system/settings');
      if (response.data.success) {
        const settings = response.data.settings || {};
        setFormData({
          maintenanceMode: settings.maintenanceMode || false,
          maintenanceMessage: settings.maintenanceMessage || "",
          allowAdminAccess: settings.allowAdminAccess !== undefined ? settings.allowAdminAccess : true,
          autoBackup: settings.autoBackup !== undefined ? settings.autoBackup : true,
          backupFrequency: settings.backupFrequency || "daily",
          announcementEnabled: settings.announcementEnabled || false,
          announcementTitle: settings.announcementTitle || "",
          announcementText: settings.announcementText || "",
          announcementExpires: settings.announcementExpires || ""
        });
        
        // Also update maintenance info state
        setMaintenanceInfo({
          enabled: settings.maintenanceMode || false,
          message: settings.maintenanceMessage || "",
          allowAdminAccess: settings.allowAdminAccess !== undefined ? settings.allowAdminAccess : true
        });
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to load system settings' 
      });
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // NEW: Fetch announcements list
  const fetchAnnouncements = async () => {
    setIsLoadingAnnouncements(true);
    try {
      const response = await api.get('/announcements/management');
      if (response.data.success) {
        setAnnouncements(response.data.announcements || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to load announcements' 
      });
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  // NEW: Delete announcement
  const handleDeleteAnnouncement = async (announcementId) => {
    if (window.confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
      try {
        const response = await api.delete(`/announcements/${announcementId}`);
        if (response.data.success) {
          setMessage({ type: 'success', text: 'Announcement deleted successfully' });
          fetchAnnouncements(); // Refresh list
        }
      } catch (error) {
        console.error('Delete failed:', error);
        setMessage({ type: 'error', text: 'Failed to delete announcement' });
      }
    }
  };

  // NEW: Toggle announcements list view
  const toggleAnnouncementsList = () => {
    if (!showAnnouncementsList) {
      fetchAnnouncements();
    }
    setShowAnnouncementsList(!showAnnouncementsList);
  };

  // NEW: Fetch backups list - FIXED ENDPOINT
  const fetchBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const response = await api.get('/admin/system/backups');
      if (response.data.success) {
        setBackups(response.data.backups || []);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      setBackupMessage({ 
        type: 'error', 
        text: 'Failed to load backups list' 
      });
    } finally {
      setIsLoadingBackups(false);
    }
  };

  // NEW: Download backup file - FIXED ENDPOINT
  const handleDownloadBackup = async (filename) => {
    try {
      setBackupMessage({ type: 'info', text: `Preparing download...` });
      
      const response = await api.get(`/admin/system/backup/download/${filename}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setBackupMessage({ type: 'success', text: `Downloading ${filename}` });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setBackupMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      console.error('Download failed:', error);
      setBackupMessage({ type: 'error', text: 'Failed to download backup' });
    }
  };

  // NEW: Delete backup - FIXED ENDPOINT
  const handleDeleteBackup = async (backupName) => {
    if (window.confirm(`Are you sure you want to delete ${backupName}? This action cannot be undone.`)) {
      try {
        const response = await api.delete(`/admin/system/backup/${backupName}`);
        if (response.data.success) {
          setBackupMessage({ type: 'success', text: 'Backup deleted successfully' });
          fetchBackups(); // Refresh list
        }
      } catch (error) {
        console.error('Delete failed:', error);
        setBackupMessage({ type: 'error', text: 'Failed to delete backup' });
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  // NEW: Handle announcement creation separately
  const handleCreateAnnouncement = async () => {
    if (!formData.announcementTitle || !formData.announcementText) {
      setMessage({ type: 'error', text: 'Please fill in announcement title and message' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const announcementData = {
        title: formData.announcementTitle,
        message: formData.announcementText,
        type: "info", // Always set to info
        priority: "medium", // Always set to medium
        endDate: formData.announcementExpires || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days if not provided
        targetAudience: "all" // Always set to all users (excluding admins)
      };

      // This will now work without authentication
      const response = await api.post('/announcements', announcementData);
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Announcement created successfully! All users (except admins) will see it when they login.' });
        
        // Clear announcement form but keep the toggle enabled
        setFormData(prev => ({
          ...prev,
          announcementTitle: "",
          announcementText: "",
          announcementExpires: ""
        }));

        // Refresh announcements list if it's open
        if (showAnnouncementsList) {
          fetchAnnouncements();
        }
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to create announcement' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Only submit system settings, not announcements
      const systemSettingsData = {
        maintenanceMode: formData.maintenanceMode,
        maintenanceMessage: formData.maintenanceMessage,
        allowAdminAccess: formData.allowAdminAccess,
        autoBackup: formData.autoBackup,
        backupFrequency: formData.backupFrequency,
        announcementEnabled: formData.announcementEnabled
      };

      const response = await api.put('/admin/system/settings', systemSettingsData);
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'System settings updated successfully!' });
        
        // Update local state with the response data to ensure consistency
        const settings = response.data.settings || {};
        setFormData(prev => ({
          ...prev,
          maintenanceMode: settings.maintenanceMode || false,
          maintenanceMessage: settings.maintenanceMessage || "",
          allowAdminAccess: settings.allowAdminAccess !== undefined ? settings.allowAdminAccess : true,
          autoBackup: settings.autoBackup !== undefined ? settings.autoBackup : true,
          backupFrequency: settings.backupFrequency || "daily",
          announcementEnabled: settings.announcementEnabled || false
        }));

        // Update maintenance info state
        setMaintenanceInfo({
          enabled: settings.maintenanceMode || false,
          message: settings.maintenanceMessage || "",
          allowAdminAccess: settings.allowAdminAccess !== undefined ? settings.allowAdminAccess : true
        });
        
        // Emit socket event to notify all clients about maintenance mode change
        socket.emit('maintenance-mode-updated', {
          maintenanceMode: settings.maintenanceMode,
          maintenanceMessage: settings.maintenanceMessage,
          allowAdminAccess: settings.allowAdminAccess
        });

        // Show specific message about admin access
        if (settings.maintenanceMode && settings.allowAdminAccess) {
          setMessage({ 
            type: 'success', 
            text: 'System settings updated successfully! Maintenance mode is active but administrators can still access the system.' 
          });
        }
      }
    } catch (error) {
      console.error('Error updating system settings:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update system settings' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupNow = async () => {
    setBackupMessage({ type: '', text: '' });
    setIsCreatingBackup(true);
    
    try {
      const response = await api.post('/admin/system/backup');
      if (response.data.success) {
        setBackupMessage({ 
          type: 'success', 
          text: 'ZIP backup created successfully! Refreshing list...' 
        });
        
        // Wait a bit then refresh backups list
        setTimeout(() => {
          fetchBackups();
          setIsCreatingBackup(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error initiating backup:', error);
      setBackupMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to create backup' 
      });
      setIsCreatingBackup(false);
    }
  };

  // Function to check if current user should be blocked by maintenance
  const shouldBlockUser = () => {
    if (!maintenanceInfo.enabled) return false;
    
    // If user is admin and admin access is allowed, don't block
    if (admin && maintenanceInfo.allowAdminAccess) {
      return false;
    }
    
    return true; // Block non-admin users or when admin access is not allowed
  };

  if (isLoadingSettings) {
    return (
      <div className="ml-[250px] p-6 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-center">
            <div className="w-64 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden mb-4">
              <div className="h-full bg-[#CC0000] animate-[loading_1.2s_ease-in-out_infinite]"></div>
            </div>
            <p className="text-gray-800 font-bold">Loading System Settings...</p>

            <style>
              {`
                @keyframes loading {
                  0% { transform: translateX(-100%); }
                  50% { transform: translateX(0%); }
                  100% { transform: translateX(100%); }
                }
              `}
            </style>
          </div>
        </div>
      </div>
    );
  }

  // Show maintenance warning if enabled but admin can access
  const showMaintenanceWarning = maintenanceInfo.enabled && admin && maintenanceInfo.allowAdminAccess;

  return (
    <>
            <AdminNavigation setView={setView} currentView="systemSettings" onLogout={onLogout} />

    <div className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
      <header className="bg-white px-6 py-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-[#CC0000]">System Settings</h1>
        <p className="text-gray-600">Configure system-wide settings and preferences</p>
      </header>

      <div className="p-6">
        {/* Messages Display */}
        {message.text && (
          <div className={`max-w-6xl mx-auto mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-6">
          {/* System Status Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Maintenance Mode Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-50 rounded-lg">
                  <Wrench size={20} className="text-[#CC0000]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Maintenance Mode</h2>
                  <p className="text-sm text-gray-500">Control system access</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Enable Maintenance</label>
                    <p className="text-xs text-gray-500">Restrict system access</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="maintenanceMode"
                      checked={formData.maintenanceMode}
                      onChange={handleChange}
                      className="sr-only peer outline-0"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#CC0000]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Admin Access</label>
                    <p className="text-xs text-gray-500">Allow admin during maintenance</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="allowAdminAccess"
                      checked={formData.allowAdminAccess}
                      onChange={handleChange}
                      className="sr-only peer outline-0"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#CC0000]"></div>
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Maintenance Message</label>
                  <textarea
                    name="maintenanceMessage"
                    value={formData.maintenanceMessage || ""}
                    onChange={handleChange}
                    placeholder="System is currently under maintenance. We'll be back soon..."
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-transparent transition-colors outline-0 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Backup Settings Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Database size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Backup Settings</h2>
                  <p className="text-sm text-gray-500">Automated data protection</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Auto Backup</label>
                    <p className="text-xs text-gray-500">Enable automatic backups</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="autoBackup"
                      checked={formData.autoBackup}
                      onChange={handleChange}
                      className="sr-only peer outline-0"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#CC0000]"></div>
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Backup Frequency</label>
                  <select
                    name="backupFrequency"
                    value={formData.backupFrequency || "daily"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-transparent transition-colors outline-0 text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleBackupNow}
                    disabled={isCreatingBackup}
                    className="flex items-center gap-2 px-4 py-2 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-[#CC0000] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer outline-0 w-full justify-center text-sm"
                  >
                    {isCreatingBackup ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Creating Backup...
                      </>
                    ) : (
                      <>
                        <Archive size={16} />
                        Create Manual Backup
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Announcements Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Megaphone size={20} className="text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">System Announcements</h2>
                  <p className="text-sm text-gray-500">Notify users with important messages</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleAnnouncementsList}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer outline-0"
              >
                {showAnnouncementsList ? (
                  <>
                    <X size={14} />
                    Hide List
                  </>
                ) : (
                  <>
                    <List size={14} />
                    View All
                  </>
                )}
              </button>
            </div>

            {/* Announcements List */}
            {showAnnouncementsList && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-md font-medium text-gray-900 mb-3">Active Announcements</h3>
                {isLoadingAnnouncements ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#CC0000] mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading announcements...</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {announcements.map((announcement) => (
                      <div key={announcement._id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-gray-900">
                              {announcement.title}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              announcement.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {announcement.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Created: {new Date(announcement.createdAt).toLocaleDateString()}
                            {announcement.endDate && ` • Expires: ${new Date(announcement.endDate).toLocaleDateString()}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAnnouncement(announcement._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer outline-0"
                          title="Delete Announcement"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {announcements.length === 0 && (
                      <div className="text-center py-4">
                        <Megaphone size={24} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500 text-sm">No announcements found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Announcement Form */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Enable Announcement</label>
                  <p className="text-xs text-gray-500">Show popup to users</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="announcementEnabled"
                    checked={formData.announcementEnabled}
                    onChange={handleChange}
                    className="sr-only peer outline-0"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#CC0000]"></div>
                </label>
              </div>

              {formData.announcementEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Title *</label>
                    <input
                      type="text"
                      name="announcementTitle"
                      value={formData.announcementTitle || ""}
                      onChange={handleChange}
                      placeholder="Important Update"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-transparent transition-colors outline-0 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Expiration</label>
                    <input
                      type="datetime-local"
                      name="announcementExpires"
                      value={formData.announcementExpires || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-transparent transition-colors outline-0 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Message *</label>
                    <textarea
                      name="announcementText"
                      value={formData.announcementText || ""}
                      onChange={handleChange}
                      placeholder="Enter your announcement message..."
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-transparent transition-colors outline-0 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleCreateAnnouncement}
                      disabled={isLoading || !formData.announcementTitle || !formData.announcementText}
                      className="flex items-center gap-2 px-4 py-2 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-[#CC0000] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer outline-0 text-sm"
                    >
                      <Megaphone size={16} />
                      {isLoading ? 'Creating...' : 'Create Announcement'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Backup Files Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <Archive size={20} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Backup Files</h2>
                <p className="text-sm text-gray-500">Manage your system backups</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">{backups.length} backup files available</p>
              </div>
              <button
                type="button"
                onClick={fetchBackups}
                disabled={isLoadingBackups}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer outline-0"
              >
                <RefreshCw size={14} className={isLoadingBackups ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {isLoadingBackups ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CC0000] mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading backups...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {backups.map((backup) => (
                  <div key={backup.id || backup.name} className="border border-gray-200 rounded-lg p-4  bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Archive size={16} className="text-[#CC0000]" />
                        <span className="font-medium text-sm text-gray-900 truncate">
                          {backup.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500  px-3 py-1 rounded">
                        {backup.size}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Created: {new Date(backup.date).toLocaleDateString()}</span>
                      </div>
                      {backup.totalCollections > 0 && (
                        <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded inline-block">
                          {backup.totalCollections} collections
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadBackup(backup.filename)}
                        className="flex-1 flex items-center gap-1 px-3 py-2 text-[#CC0000] hover:bg-red-50 rounded-lg transition-colors cursor-pointer outline-0 text-sm justify-center"
                      >
                        <Download size={14} />
                        Download
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteBackup(backup.filename)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer outline-0"
                        title="Delete Backup"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {backups.length === 0 && (
                  <div className="col-span-full text-center py-8">
                    <Archive size={32} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 text-sm">No backup files found</p>
                    <p className="text-gray-400 text-xs mt-1">Create your first backup using the button above</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Save Settings */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Save Settings</h3>
                <p className="text-sm text-gray-500">Apply all system configuration changes</p>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-[#CC0000] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer outline-0"
              >
                <Save size={18} />
                {isLoading ? 'Saving...' : 'Save All Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default SystemSettings;