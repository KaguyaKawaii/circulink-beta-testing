import { useState, useEffect } from "react";
import { Save, Wrench, Database, Megaphone, Download, Trash2, RefreshCw, Archive, List, X, Clock, Shield, Users, Calendar, AlertCircle, CheckCircle, RotateCcw, Settings } from "lucide-react";
import api from "../../utils/api";
import socket from "../../utils/socket";
import AdminNavigation from "../AdminNavigation";

function SystemSettings({ setView, admin, onLogout }) {
  const [formData, setFormData] = useState({
    // Maintenance Mode Settings
    maintenanceMode: false,
    maintenanceMessage: "",
    allowAdminAccess: true,

    // Backup Management Settings
    autoBackup: true,
    backupFrequency: "daily",
    autoBackupRetention: 30, // Days to keep auto backups

    // System Announcement Settings
    announcementEnabled: false,
    announcementTitle: "",
    announcementText: "",
    announcementExpires: ""
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [backupMessage, setBackupMessage] = useState({ type: '', text: '' });
  
  const [backups, setBackups] = useState([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreOptions, setRestoreOptions] = useState({
    show: false,
    filename: null,
    clearExisting: true,
    dropExisting: false,
    excludeCollections: []
  });

  const [announcements, setAnnouncements] = useState([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [showAnnouncementsList, setShowAnnouncementsList] = useState(false);

  const [maintenanceInfo, setMaintenanceInfo] = useState({
    enabled: false,
    message: "",
    allowAdminAccess: true
  });

  useEffect(() => {
    fetchSystemSettings();
    fetchBackups();
    
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
          autoBackupRetention: settings.autoBackupRetention || 30,
          announcementEnabled: settings.announcementEnabled || false,
          announcementTitle: settings.announcementTitle || "",
          announcementText: settings.announcementText || "",
          announcementExpires: settings.announcementExpires || ""
        });
        
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

  const handleDeleteAnnouncement = async (announcementId) => {
    if (window.confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
      try {
        const response = await api.delete(`/announcements/${announcementId}`);
        if (response.data.success) {
          setMessage({ type: 'success', text: 'Announcement deleted successfully' });
          fetchAnnouncements();
        }
      } catch (error) {
        console.error('Delete failed:', error);
        setMessage({ type: 'error', text: 'Failed to delete announcement' });
      }
    }
  };

  const toggleAnnouncementsList = () => {
    if (!showAnnouncementsList) {
      fetchAnnouncements();
    }
    setShowAnnouncementsList(!showAnnouncementsList);
  };

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

  const handleDownloadBackup = async (filename) => {
    try {
      setBackupMessage({ type: 'info', text: `Preparing download...` });
      
      const response = await api.get(`/admin/system/backup/download/${filename}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setBackupMessage({ type: 'success', text: `Downloading ${filename}` });
      
      setTimeout(() => {
        setBackupMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      console.error('Download failed:', error);
      setBackupMessage({ type: 'error', text: 'Failed to download backup' });
    }
  };

  const handleDeleteBackup = async (backupName) => {
    if (window.confirm(`Are you sure you want to delete ${backupName}? This action cannot be undone.`)) {
      try {
        const response = await api.delete(`/admin/system/backup/${backupName}`);
        if (response.data.success) {
          setBackupMessage({ type: 'success', text: 'Backup deleted successfully' });
          fetchBackups();
        }
      } catch (error) {
        console.error('Delete failed:', error);
        setBackupMessage({ type: 'error', text: 'Failed to delete backup' });
      }
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreOptions.filename) return;
    
    if (!window.confirm('⚠️ WARNING: Restoring will overwrite existing data. Are you sure you want to continue?')) {
      return;
    }

    setIsRestoring(true);
    setBackupMessage({ type: 'info', text: 'Restoring backup... This may take a few minutes.' });

    try {
      const response = await api.post(`/admin/system/backup/restore/${restoreOptions.filename}`, {
        options: {
          clearExisting: restoreOptions.clearExisting,
          dropExisting: restoreOptions.dropExisting,
          excludeCollections: restoreOptions.excludeCollections
        }
      });

      if (response.data.success) {
        setBackupMessage({ 
          type: 'success', 
          text: `✅ Restore completed! Restored ${response.data.result.restoreResults.restoredCollections.length} collections with ${response.data.result.restoreResults.totalRecordsRestored} total records.` 
        });
        
        setRestoreOptions({ show: false, filename: null, clearExisting: true, dropExisting: false, excludeCollections: [] });
        
        // Refresh data
        fetchBackups();
      }
    } catch (error) {
      console.error('Restore failed:', error);
      setBackupMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to restore backup' 
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

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
        type: "info",
        priority: "medium",
        endDate: formData.announcementExpires || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        targetAudience: "all"
      };

      const response = await api.post('/announcements', announcementData);
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Announcement created successfully! All users (except admins) will see it when they login.' });
        
        setFormData(prev => ({
          ...prev,
          announcementTitle: "",
          announcementText: "",
          announcementExpires: ""
        }));

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
      const systemSettingsData = {
        maintenanceMode: formData.maintenanceMode,
        maintenanceMessage: formData.maintenanceMessage,
        allowAdminAccess: formData.allowAdminAccess,
        autoBackup: formData.autoBackup,
        backupFrequency: formData.backupFrequency,
        autoBackupRetention: formData.autoBackupRetention,
        announcementEnabled: formData.announcementEnabled
      };

      const response = await api.put('/admin/system/settings', systemSettingsData);
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'System settings updated successfully!' });
        
        const settings = response.data.settings || {};
        setFormData(prev => ({
          ...prev,
          maintenanceMode: settings.maintenanceMode || false,
          maintenanceMessage: settings.maintenanceMessage || "",
          allowAdminAccess: settings.allowAdminAccess !== undefined ? settings.allowAdminAccess : true,
          autoBackup: settings.autoBackup !== undefined ? settings.autoBackup : true,
          backupFrequency: settings.backupFrequency || "daily",
          autoBackupRetention: settings.autoBackupRetention || 30,
          announcementEnabled: settings.announcementEnabled || false
        }));

        setMaintenanceInfo({
          enabled: settings.maintenanceMode || false,
          message: settings.maintenanceMessage || "",
          allowAdminAccess: settings.allowAdminAccess !== undefined ? settings.allowAdminAccess : true
        });
        
        socket.emit('maintenance-mode-updated', {
          maintenanceMode: settings.maintenanceMode,
          maintenanceMessage: settings.maintenanceMessage,
          allowAdminAccess: settings.allowAdminAccess
        });
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
      const response = await api.post('/admin/system/backup', { type: 'manual' });
      if (response.data.success) {
        setBackupMessage({ 
          type: 'success', 
          text: 'ZIP backup created successfully! Refreshing list...' 
        });
        
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

  const shouldBlockUser = () => {
    if (!maintenanceInfo.enabled) return false;
    
    if (admin && maintenanceInfo.allowAdminAccess) {
      return false;
    }
    
    return true;
  };

  if (isLoadingSettings) {
    return (
      <div className="ml-[250px] p-6 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-64 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden mb-4">
            <div className="h-full bg-[#CC0000] animate-[loading_1.2s_ease-in-out_infinite]"></div>
          </div>
          <p className="text-gray-800 font-medium">Loading System Settings...</p>

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
    );
  }

  const showMaintenanceWarning = maintenanceInfo.enabled && admin && maintenanceInfo.allowAdminAccess;

  return (
    <>
      <AdminNavigation setView={setView} currentView="systemSettings" onLogout={onLogout} />

      <div className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-[#CC0000]">System Settings</h1>
          <p className="text-gray-600">Configure system-wide settings and preferences</p>
        </header>

        <div className="p-8">
          {/* Messages Display */}
          {message.text && (
            <div className={`max-w-7xl mx-auto mb-6 p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {backupMessage.text && (
            <div className={`max-w-7xl mx-auto mb-6 p-4 rounded-lg flex items-start gap-3 ${
              backupMessage.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-700'
                : backupMessage.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              {backupMessage.type === 'success' ? (
                <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
              ) : backupMessage.type === 'error' ? (
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              ) : (
                <RefreshCw size={20} className="flex-shrink-0 mt-0.5 animate-spin" />
              )}
              <span>{backupMessage.text}</span>
            </div>
          )}

          {/* Restore Options Modal */}
          {restoreOptions.show && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Restore Options</h3>
                  <button
                    onClick={() => setRestoreOptions({ show: false, filename: null, clearExisting: true, dropExisting: false, excludeCollections: [] })}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Shield size={18} className="text-gray-500 mt-0.5" />
                      <div>
                        <label className="text-sm font-medium text-gray-700">Clear Existing Data</label>
                        <p className="text-xs text-gray-500">Delete existing records before restore</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restoreOptions.clearExisting}
                        onChange={(e) => setRestoreOptions({ ...restoreOptions, clearExisting: e.target.checked })}
                        className="sr-only peer outline-0"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#CC0000]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Database size={18} className="text-gray-500 mt-0.5" />
                      <div>
                        <label className="text-sm font-medium text-gray-700">Drop & Recreate Collections</label>
                        <p className="text-xs text-gray-500">Drop collections before inserting data</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restoreOptions.dropExisting}
                        onChange={(e) => setRestoreOptions({ ...restoreOptions, dropExisting: e.target.checked })}
                        className="sr-only peer outline-0"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#CC0000]"></div>
                    </label>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      onClick={() => setRestoreOptions({ show: false, filename: null, clearExisting: true, dropExisting: false, excludeCollections: [] })}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRestoreBackup}
                      disabled={isRestoring}
                      className="flex-1 px-4 py-2 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isRestoring ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Restoring...
                        </>
                      ) : (
                        <>
                          <RotateCcw size={16} />
                          Restore
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Maintenance Warning */}
          {showMaintenanceWarning && (
            <div className="max-w-7xl mx-auto mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3 text-yellow-700">
              <Shield size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Maintenance mode is active</p>
                <p className="text-sm mt-1">Administrators can still access the system. Regular users will see: "{maintenanceInfo.message || 'System under maintenance'}"</p>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto space-y-8">
            {/* System Status Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Maintenance Mode Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-50 rounded-lg">
                      <Wrench size={22} className="text-[#CC0000]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">Maintenance Mode</h2>
                      <p className="text-sm text-gray-500">Control system access during updates</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Shield size={18} className="text-gray-500 mt-0.5" />
                      <div>
                        <label className="text-sm font-medium text-gray-700">Enable Maintenance</label>
                        <p className="text-xs text-gray-500 mt-0.5">Restrict regular user access</p>
                      </div>
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

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Users size={18} className="text-gray-500 mt-0.5" />
                      <div>
                        <label className="text-sm font-medium text-gray-700">Admin Access</label>
                        <p className="text-xs text-gray-500 mt-0.5">Allow admins during maintenance</p>
                      </div>
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

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <span>Maintenance Message</span>
                      {formData.maintenanceMode && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Visible to users</span>
                      )}
                    </label>
                    <textarea
                      name="maintenanceMessage"
                      value={formData.maintenanceMessage || ""}
                      onChange={handleChange}
                      placeholder="System is currently under maintenance. We'll be back soon..."
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-transparent transition-colors outline-0 text-sm resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Backup Settings Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-lg">
                      <Database size={22} className="text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">Backup Settings</h2>
                      <p className="text-sm text-gray-500">Automated data protection</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Clock size={18} className="text-gray-500 mt-0.5" />
                      <div>
                        <label className="text-sm font-medium text-gray-700">Auto Backup</label>
                        <p className="text-xs text-gray-500 mt-0.5">Enable automatic backups</p>
                      </div>
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

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Calendar size={16} className="text-gray-500" />
                      <span>Backup Frequency</span>
                    </label>
                    <select
                      name="backupFrequency"
                      value={formData.backupFrequency || "daily"}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-transparent transition-colors outline-0 text-sm bg-white"
                    >
                      <option value="hourly">Hourly - Every hour</option>
                      <option value="daily">Daily - Every 24 hours</option>
                      <option value="weekly">Weekly - Every Sunday</option>
                      <option value="monthly">Monthly - First day of month</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Archive size={16} className="text-gray-500" />
                      <span>Auto Backup Retention (days)</span>
                    </label>
                    <input
                      type="number"
                      name="autoBackupRetention"
                      value={formData.autoBackupRetention}
                      onChange={handleChange}
                      min="1"
                      max="365"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-transparent transition-colors outline-0 text-sm bg-white"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleBackupNow}
                      disabled={isCreatingBackup}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#CC0000] to-red-600 text-white rounded-lg hover:from-red-700 hover:to-red-700 focus:ring-2 focus:ring-[#CC0000] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer outline-0 text-sm font-medium shadow-sm"
                    >
                      {isCreatingBackup ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Creating Backup...
                        </>
                      ) : (
                        <>
                          <Archive size={16} />
                          Create Manual Backup Now
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Announcements Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-50 rounded-lg">
                      <Megaphone size={22} className="text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">System Announcements</h2>
                      <p className="text-sm text-gray-500">Create and manage user notifications</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleAnnouncementsList}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer outline-0 text-sm font-medium"
                  >
                    {showAnnouncementsList ? (
                      <>
                        <X size={16} />
                        Hide List
                      </>
                    ) : (
                      <>
                        <List size={16} />
                        View All ({announcements.length})
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Announcements List */}
              {showAnnouncementsList && (
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Megaphone size={16} className="text-orange-600" />
                    Active Announcements
                  </h3>
                  {isLoadingAnnouncements ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CC0000] mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-3">Loading announcements...</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                      {announcements.map((announcement) => (
                        <div key={announcement._id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-medium text-gray-900">
                                {announcement.title}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                announcement.isActive 
                                  ? 'bg-green-100 text-green-700 border border-green-200' 
                                  : 'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}>
                                {announcement.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-1">{announcement.message}</p>
                            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-2">
                              <Calendar size={12} />
                              Created: {new Date(announcement.createdAt).toLocaleDateString()}
                              {announcement.endDate && (
                                <>
                                  <span>•</span>
                                  <Clock size={12} />
                                  Expires: {new Date(announcement.endDate).toLocaleDateString()}
                                </>
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(announcement._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer outline-0 ml-4"
                            title="Delete Announcement"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {announcements.length === 0 && (
                        <div className="text-center py-10 bg-white rounded-lg border border-dashed border-gray-300">
                          <Megaphone size={32} className="mx-auto text-gray-400 mb-3" />
                          <p className="text-gray-600 font-medium">No announcements found</p>
                          <p className="text-gray-400 text-sm mt-1">Create your first announcement using the form below</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Announcement Form */}
              <div className="p-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-5">
                  <div className="flex items-start gap-3">
                    <Megaphone size={18} className="text-gray-500 mt-0.5" />
                    <div>
                      <label className="text-sm font-medium text-gray-700">Enable Announcements</label>
                      <p className="text-xs text-gray-500 mt-0.5">Show popup to users on login</p>
                    </div>
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
                  <div className="space-y-5 p-5 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Title <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name="announcementTitle"
                          value={formData.announcementTitle || ""}
                          onChange={handleChange}
                          placeholder="e.g., Important System Update"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-transparent transition-colors outline-0 text-sm bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Expiration</label>
                        <input
                          type="datetime-local"
                          name="announcementExpires"
                          value={formData.announcementExpires || ""}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-transparent transition-colors outline-0 text-sm bg-white"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-medium text-gray-700">Message <span className="text-red-500">*</span></label>
                        <textarea
                          name="announcementText"
                          value={formData.announcementText || ""}
                          onChange={handleChange}
                          placeholder="Enter your announcement message here..."
                          rows="3"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-transparent transition-colors outline-0 text-sm resize-none bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleCreateAnnouncement}
                        disabled={isLoading || !formData.announcementTitle || !formData.announcementText}
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#CC0000] to-red-600 text-white rounded-lg hover:from-red-700 hover:to-red-700 focus:ring-2 focus:ring-[#CC0000] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer outline-0 text-sm font-medium shadow-sm"
                      >
                        <Megaphone size={16} />
                        {isLoading ? 'Creating Announcement...' : 'Create Announcement'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Backup Files Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-green-50 rounded-lg">
                      <Archive size={22} className="text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">Backup Files</h2>
                      <p className="text-sm text-gray-500">Manage your system backups</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={fetchBackups}
                    disabled={isLoadingBackups}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer outline-0 text-sm font-medium"
                  >
                    <RefreshCw size={14} className={isLoadingBackups ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">{backups.length}</span> backup files available
                  </p>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    Auto-backup: {formData.autoBackup ? formData.backupFrequency : 'Disabled'}
                  </span>
                </div>

                {isLoadingBackups ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#CC0000] mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-3">Loading backups...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {backups.map((backup) => (
                      <div key={backup.id || backup.name} className="border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow">
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <Archive size={18} className="text-[#CC0000] flex-shrink-0" />
                              <span className="font-medium text-sm text-gray-900 truncate" title={backup.name}>
                                {backup.name}
                              </span>
                            </div>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full flex-shrink-0 ml-2">
                              {backup.size}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              backup.backupType === 'Automatic' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {backup.backupType}
                            </span>
                            {backup.totalCollections > 0 && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {backup.totalCollections} collections
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar size={12} />
                            <span>Created: {new Date(backup.date).toLocaleDateString()}</span>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => handleDownloadBackup(backup.filename)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer outline-0 text-xs font-medium"
                            >
                              <Download size={14} />
                              Download
                            </button>

                            <button
                              type="button"
                              onClick={() => setRestoreOptions({ 
                                show: true, 
                                filename: backup.filename,
                                clearExisting: true,
                                dropExisting: false,
                                excludeCollections: []
                              })}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer outline-0 text-xs font-medium"
                            >
                              <RotateCcw size={14} />
                              Restore
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteBackup(backup.filename)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer outline-0 border border-gray-200"
                              title="Delete Backup"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {backups.length === 0 && (
                      <div className="col-span-full text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Archive size={40} className="mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-700 font-medium">No backup files found</p>
                        <p className="text-gray-400 text-sm mt-1">Create your first backup using the button above</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Save Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gray-100 rounded-lg">
                      <Save size={22} className="text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Save Settings</h3>
                      <p className="text-sm text-gray-500">Apply all system configuration changes</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#CC0000] to-red-600 text-white rounded-lg hover:from-red-700 hover:to-red-700 focus:ring-2 focus:ring-[#CC0000] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer outline-0 text-sm font-medium shadow-sm"
                  >
                    <Save size={18} />
                    {isLoading ? 'Saving Changes...' : 'Save All Settings'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SystemSettings;