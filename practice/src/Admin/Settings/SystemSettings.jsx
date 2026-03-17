import { useState, useEffect } from "react";
import { Save, Wrench, Database, Megaphone, Download, Trash2, RefreshCw, Archive, List, X, Clock, Shield, Users, Calendar, AlertCircle, CheckCircle, RotateCcw, Settings, ChevronDown, ChevronUp, HardDrive, Bell } from "lucide-react";
import api from "../../utils/api";
import socket from "../../utils/socket";
import AdminNavigation from "../AdminNavigation";

function SystemSettings({ setView, admin, onLogout }) {
  const [formData, setFormData] = useState({
    // Maintenance Mode Settings
    maintenanceMode: false,
    maintenanceMessage: "",
    allowAdminAccess: true,

    // System Announcement Settings
    announcementEnabled: false,
    announcementTitle: "",
    announcementText: "",
    announcementExpires: ""
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [announcements, setAnnouncements] = useState([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [showAnnouncementsList, setShowAnnouncementsList] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    maintenance: true,
    announcements: true
  });

  const [maintenanceInfo, setMaintenanceInfo] = useState({
    enabled: false,
    message: "",
    allowAdminAccess: true
  });

  useEffect(() => {
    fetchSystemSettings();
    
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
    // Change this line - remove '/management' from the endpoint
    const response = await api.get('/announcements');
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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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
        <header className="bg-white px-6 py-4 border-b border-gray-200 sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-[#CC0000]">System Settings</h1>
          <p className="text-gray-600">Configure system-wide settings and preferences</p>
        </header>

        <div className="p-8">
          {/* Messages Display */}
          {message.text && (
            <div className={`max-w-4xl mx-auto mb-6 p-4 rounded-lg flex items-start gap-3 ${
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

          {/* Maintenance Warning */}
          {showMaintenanceWarning && (
            <div className="max-w-4xl mx-auto mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3 text-yellow-700">
              <Shield size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Maintenance mode is active</p>
                <p className="text-sm mt-1">Administrators can still access the system. Regular users will see: "{maintenanceInfo.message || 'System under maintenance'}"</p>
              </div>
            </div>
          )}

          {/* Main Content - Single Column */}
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Maintenance Mode Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div 
                className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection('maintenance')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-50 rounded-lg">
                      <Wrench size={22} className="text-[#CC0000]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">Maintenance Mode</h2>
                      <p className="text-sm text-gray-500">Control system access during updates</p>
                    </div>
                  </div>
                  {expandedSections.maintenance ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </div>
              </div>

              {expandedSections.maintenance && (
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
              )}
            </div>

            {/* Announcements Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div 
                className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection('announcements')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-50 rounded-lg">
                      <Bell size={22} className="text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">Announcements</h2>
                      <p className="text-sm text-gray-500">Create and manage system notifications</p>
                    </div>
                  </div>
                  {expandedSections.announcements ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </div>
              </div>

              {expandedSections.announcements && (
                <div className="p-6">
                  {/* Announcement Toggle */}
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
                    <>
                      {/* Create Announcement Form */}
                      <div className="mb-5 p-5 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <Megaphone size={16} className="text-orange-600" />
                          Create New Announcement
                        </h3>
                        <div className="space-y-4">
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

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Expiration (Optional)</label>
                            <input
                              type="datetime-local"
                              name="announcementExpires"
                              value={formData.announcementExpires || ""}
                              onChange={handleChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-transparent transition-colors outline-0 text-sm bg-white"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleCreateAnnouncement}
                            disabled={isLoading || !formData.announcementTitle || !formData.announcementText}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-[#CC0000] to-red-600 text-white rounded-lg hover:from-red-700 hover:to-red-700 focus:ring-2 focus:ring-[#CC0000] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer outline-0 text-sm font-medium shadow-sm"
                          >
                            <Megaphone size={16} />
                            {isLoading ? 'Creating...' : 'Create Announcement'}
                          </button>
                        </div>
                      </div>

                      {/* View Announcements List */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-md font-medium text-gray-900 flex items-center gap-2">
                            <List size={16} className="text-gray-500" />
                            Recent Announcements
                          </h3>
                          <button
                            type="button"
                            onClick={toggleAnnouncementsList}
                            className="text-sm text-[#CC0000] hover:text-red-700 font-medium flex items-center gap-1"
                          >
                            {showAnnouncementsList ? 'Hide' : 'View All'} ({announcements.length})
                          </button>
                        </div>

                        {showAnnouncementsList && (
                          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                            {isLoadingAnnouncements ? (
                              <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CC0000] mx-auto"></div>
                                <p className="text-sm text-gray-500 mt-3">Loading announcements...</p>
                              </div>
                            ) : (
                              announcements.map((announcement) => (
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
                              ))
                            )}
                            {announcements.length === 0 && !isLoadingAnnouncements && (
                              <div className="text-center py-10 bg-white rounded-lg border border-dashed border-gray-300">
                                <Megaphone size={32} className="mx-auto text-gray-400 mb-3" />
                                <p className="text-gray-600 font-medium">No announcements found</p>
                                <p className="text-gray-400 text-sm mt-1">Create your first announcement using the form above</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {!formData.announcementEnabled && (
                    <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <Bell size={32} className="mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-600 font-medium">Announcements are disabled</p>
                      <p className="text-gray-400 text-sm mt-1">Enable announcements to create and manage notifications</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Save Settings - Sticky Footer */}
            <div className="sticky bottom-4 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
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