// src/Admin/AdminClosures.jsx
import { useState, useEffect, useCallback } from "react";
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  X, 
  Trash2, 
  RefreshCw, 
  Plus,
  Pause,
  Building2,
  Eye,
  Edit,
  CheckCircle,
  Play
} from "lucide-react";
import axios from "axios";
import AdminNavigation from "../AdminNavigation";

// Helper functions
const getTodayInManila = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayTime = (timeStr) => {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Available floors
const FLOORS = [
  { id: "ground", name: "Ground Floor", color: "bg-green-100", borderColor: "border-green-200", textColor: "text-green-700" },
  { id: "2nd", name: "2nd Floor", color: "bg-blue-100", borderColor: "border-blue-200", textColor: "text-blue-700" },
  { id: "4th", name: "4th Floor", color: "bg-purple-100", borderColor: "border-purple-200", textColor: "text-purple-700" },
  { id: "5th", name: "5th Floor", color: "bg-orange-100", borderColor: "border-orange-200", textColor: "text-orange-700" }
];

// Toast notification
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "error" ? "bg-red-500" : type === "success" ? "bg-green-500" : "bg-blue-500";
  const icon = type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️";

  return (
    <div className={`fixed top-4 right-4 z-[100] ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in`}>
      <span>{icon}</span>
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 hover:opacity-70">×</button>
    </div>
  );
};

const AdminClosures = ({ setView, onLogout, admin }) => {
  const [closures, setClosures] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingClosure, setEditingClosure] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState(null);
  const [conflictPreview, setConflictPreview] = useState(null);
  const [viewingClosure, setViewingClosure] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [showStopConfirm, setShowStopConfirm] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showActivateConfirm, setShowActivateConfirm] = useState(null);
  
  // Loading states
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  
  // Form data with floors
  const [formData, setFormData] = useState({
    title: "",
    reason: "",
    date: "",
    startTime: "",
    endTime: "",
    affectedAllFloors: false,
    affectedFloors: [],
  });

  const API_URL = import.meta.env.VITE_API_URL || "";

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  // Auto-update closure statuses
  useEffect(() => {
    const updateClosureStatuses = async () => {
      try {
        await axios.post(`${API_URL}/api/closures/update-status`);
        await fetchClosures();
      } catch (error) {
        console.error("Error updating closure statuses:", error);
      }
    };

    updateClosureStatuses();
    const interval = setInterval(updateClosureStatuses, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchClosures = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/closures`);
      if (response.data && response.data.success !== false) {
        const allClosures = response.data.closures || [];
        setClosures(allClosures);
      }
    } catch (error) {
      console.error("Error fetching closures:", error);
      showToast("Failed to fetch closures", "error");
    } finally {
      setIsLoading(false);
    }
  }, [API_URL, showToast]);

  useEffect(() => {
    fetchClosures();
  }, [fetchClosures]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleFloorSelection = (floorName) => {
    setFormData(prev => ({
      ...prev,
      affectedFloors: prev.affectedFloors.includes(floorName)
        ? prev.affectedFloors.filter(f => f !== floorName)
        : [...prev.affectedFloors, floorName]
    }));
  };

  const handlePreviewConflicts = async () => {
    try {
      if (!formData.date || !formData.startTime || !formData.endTime) {
        showToast("Please fill in date and time first", "error");
        return;
      }

      const response = await axios.post(`${API_URL}/api/closures/preview`, {
        ...formData,
        affectedFloors: formData.affectedAllFloors ? [] : formData.affectedFloors,
        affectedAllFloors: formData.affectedAllFloors
      });
      setConflictPreview(response.data);
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to preview conflicts", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isCreating) return;
    
    if (!formData.startTime || !formData.endTime) {
      showToast("Please fill in start and end time", "error");
      return;
    }
    
    const startMinutes = parseInt(formData.startTime.split(':')[0]) * 60 + parseInt(formData.startTime.split(':')[1]);
    const endMinutes = parseInt(formData.endTime.split(':')[0]) * 60 + parseInt(formData.endTime.split(':')[1]);
    
    if (endMinutes <= startMinutes) {
      showToast("End time must be after start time", "error");
      return;
    }

    if (!formData.affectedAllFloors && formData.affectedFloors.length === 0) {
      showToast("Please select at least one floor or select 'All Floors'", "error");
      return;
    }

    setIsCreating(true);

    try {
      if (editingClosure) {
        await axios.put(`${API_URL}/api/closures/${editingClosure._id}`, formData);
        showToast("Closure updated successfully", "success");
      } else {
        const response = await axios.post(`${API_URL}/api/closures`, formData);
        const cancelledCount = response.data.affectedReservations?.length || 0;
        showToast(`Closure created. ${cancelledCount} reservations cancelled.`, "success");
      }
      
      setShowModal(false);
      setEditingClosure(null);
      resetForm();
      await fetchClosures();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to save closure", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      reason: "",
      date: "",
      startTime: "",
      endTime: "",
      affectedAllFloors: false,
      affectedFloors: [],
    });
  };

  const handleEditClick = (closure) => {
    setEditingClosure(closure);
    setFormData({
      title: closure.title,
      reason: closure.reason || "",
      date: closure.date,
      startTime: closure.startTime,
      endTime: closure.endTime,
      affectedAllFloors: closure.affectedAllFloors || false,
      affectedFloors: closure.affectedFloors || [],
    });
    setShowModal(true);
  };

  const handleViewClick = (closure) => {
    setViewingClosure(closure);
  };

  const handleActivateClick = (closure) => {
    setShowActivateConfirm(closure);
  };

  const handleActivateConfirm = async () => {
    if (!showActivateConfirm) return;
    
    setIsActivating(true);
    try {
      const response = await axios.post(`${API_URL}/api/closures/${showActivateConfirm._id}/activate`, {
        activateNow: true
      });
      
      showToast(response.data.message, "success");
      await fetchClosures();
      
    } catch (error) {
      console.error("Activation error:", error);
      showToast(error.response?.data?.message || "Failed to activate closure", "error");
    } finally {
      setIsActivating(false);
      setShowActivateConfirm(null);
    }
  };

  const handleStopClick = (closure) => {
    setShowStopConfirm(closure);
  };

  const handleStopConfirm = async () => {
    if (!showStopConfirm) return;
    
    setIsDeactivating(true);
    try {
      const response = await axios.post(`${API_URL}/api/closures/${showStopConfirm._id}/deactivate`, {
        restoreReservations: true,
        reason: "Manually stopped by admin"
      });
      
      showToast(response.data.message, "success");
      await fetchClosures();
      
    } catch (error) {
      console.error("Deactivation error:", error);
      showToast(error.response?.data?.message || "Failed to stop closure", "error");
    } finally {
      setIsDeactivating(false);
      setShowStopConfirm(null);
    }
  };

  const handleDeleteClick = (closure) => {
    setShowDeleteConfirm(closure);
  };

  const handleDeleteConfirm = async () => {
    if (!showDeleteConfirm) return;
    
    setIsDeleting(true);
    try {
      await axios.delete(`${API_URL}/api/closures/${showDeleteConfirm._id}`, {
        data: { restoreReservations: false }
      });
      
      showToast("Closure deleted successfully", "success");
      await fetchClosures();
      
    } catch (error) {
      console.error("Delete error:", error);
      showToast(error.response?.data?.message || "Failed to delete closure", "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(null);
    }
  };

  const getStatusBadge = (closure) => {
    if (closure.status === "Active") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
          Active
        </span>
      );
    }
    if (closure.status === "Scheduled") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5"></span>
          Scheduled
        </span>
      );
    }
    if (closure.status === "Deactivated") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Stopped
        </span>
      );
    }
    if (closure.status === "Expired") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          Expired
        </span>
      );
    }
    return null;
  };

  const formatAffectedFloors = (closure) => {
    if (closure.affectedAllFloors) return "All Floors";
    if (!closure.affectedFloors || closure.affectedFloors.length === 0) return "None";
    return closure.affectedFloors.join(", ");
  };

  // Filter closures - hide expired by default
  let filteredClosures = closures.filter(c => c.status !== "Expired");
  
  if (filterStatus !== "All") {
    filteredClosures = filteredClosures.filter(c => c.status === filterStatus);
  }
  
  if (searchTerm.trim()) {
    filteredClosures = filteredClosures.filter(c => 
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.reason && c.reason.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }
  
  // Separate by status for better organization
  const activeClosures = filteredClosures.filter(c => c.status === "Active");
  const scheduledClosures = filteredClosures.filter(c => c.status === "Scheduled");
  const deactivatedClosures = filteredClosures.filter(c => c.status === "Deactivated");

  const ClosureCard = ({ closure }) => {
    const isActive = closure.status === "Active";
    const isScheduled = closure.status === "Scheduled";
    const isDeactivated = closure.status === "Deactivated";
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden group">
        <div className="p-5">
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{closure.title}</h3>
              {closure.reason && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{closure.reason}</p>
              )}
            </div>
            {getStatusBadge(closure)}
          </div>
          
          {/* Details */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar size={14} className="mr-2 text-gray-400 flex-shrink-0" />
              <span>{formatDate(closure.date)}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Clock size={14} className="mr-2 text-gray-400 flex-shrink-0" />
              <span>{formatDisplayTime(closure.startTime)} — {formatDisplayTime(closure.endTime)}</span>
            </div>
            <div className="flex items-start text-sm text-gray-600">
              <Building2 size={14} className="mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
              <span className="flex flex-wrap gap-1">
                {closure.affectedAllFloors ? (
                  <span className="text-blue-600 font-medium">All Floors</span>
                ) : (
                  closure.affectedFloors?.map((floor, idx) => {
                    const floorInfo = FLOORS.find(f => f.name === floor);
                    return (
                      <span key={idx} className={`inline-block px-2 py-0.5 rounded text-xs ${floorInfo?.color || 'bg-gray-100'} text-gray-700`}>
                        {floor}
                      </span>
                    );
                  })
                )}
              </span>
            </div>
            {closure.affectedReservations?.length > 0 && (
              <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded inline-flex items-center gap-1">
                <AlertTriangle size={10} />
                {closure.affectedReservations.length} reservation(s) cancelled
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => handleViewClick(closure)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              title="View Details"
            >
              <Eye size={16} />
              <span className="text-sm font-medium hidden sm:inline">View</span>
            </button>
            
            {/* Activate button - only for Scheduled closures */}
            {isScheduled && (
              <button
                onClick={() => handleActivateClick(closure)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
                title="Activate Now"
              >
                <Play size={16} />
                <span className="text-sm font-medium hidden sm:inline">Activate</span>
              </button>
            )}
            
            {/* Edit button - only for Scheduled or Deactivated closures */}
            {(isScheduled || isDeactivated) && (
              <button
                onClick={() => handleEditClick(closure)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors cursor-pointer"
                title="Edit"
              >
                <Edit size={16} />
                <span className="text-sm font-medium hidden sm:inline">Edit</span>
              </button>
            )}
            
            {/* Stop button - only for Active closures */}
            {isActive && (
              <button
                onClick={() => handleStopClick(closure)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                title="Stop"
              >
                <Pause size={16} />
                <span className="text-sm font-medium hidden sm:inline">Stop</span>
              </button>
            )}
            
            {/* Delete button - only for Deactivated or Scheduled closures */}
            {(isDeactivated || isScheduled) && (
              <button
                onClick={() => handleDeleteClick(closure)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                title="Delete"
              >
                <Trash2 size={16} />
                <span className="text-sm font-medium hidden sm:inline">Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminClosures" onLogout={onLogout} />
      
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
      
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        <header className="bg-white px-6 py-4 border-b border-gray-200 sticky top-0 z-20">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#CC0000]">
                Facility Closures
              </h1>
              <p className="text-gray-600 text-sm">
                Manage closures for events and maintenance (by floor)
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search closures..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none text-sm w-48 md:w-64"
                />
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none text-sm"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Deactivated">Stopped</option>
              </select>
              
              <button
                onClick={fetchClosures}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                title="Refresh"
              >
                <RefreshCw size={20} />
              </button>
              <button
                onClick={() => {
                  setEditingClosure(null);
                  resetForm();
                  setShowModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
              >
                <Plus size={18} />
                <span>Create Closure</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-500">Loading closures...</span>
            </div>
          ) : filteredClosures.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No closures found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || filterStatus !== "All" 
                  ? "No closures match your search criteria." 
                  : "No active or scheduled closures at the moment."}
              </p>
              {!searchTerm && filterStatus === "All" && (
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Create a closure
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Closures Section */}
              {activeClosures.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    Active Closures ({activeClosures.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeClosures.map(closure => (
                      <ClosureCard key={closure._id} closure={closure} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Scheduled Closures Section */}
              {scheduledClosures.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Scheduled Closures ({scheduledClosures.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {scheduledClosures.map(closure => (
                      <ClosureCard key={closure._id} closure={closure} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Stopped Closures Section */}
              {deactivatedClosures.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                    Stopped Closures ({deactivatedClosures.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {deactivatedClosures.map(closure => (
                      <ClosureCard key={closure._id} closure={closure} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingClosure ? "Edit Closure" : "Create Facility Closure"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                  placeholder="e.g., University Foundation Day"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                  placeholder="Optional: Explain why the facility is closed..."
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  min={getTodayInManila()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Affected Floors */}
              <div>
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="affectedAllFloors"
                    checked={formData.affectedAllFloors}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-gray-700 font-medium">Affect all floors</span>
                </label>

                {!formData.affectedAllFloors && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Floors to Close <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {FLOORS.map((floor) => (
                        <label
                          key={floor.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            formData.affectedFloors.includes(floor.name)
                              ? `${floor.color} border-red-500 ring-2 ring-red-200`
                              : "bg-white border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.affectedFloors.includes(floor.name)}
                            onChange={() => handleFloorSelection(floor.name)}
                            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                          <div>
                            <span className="text-gray-700 font-medium">{floor.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Selected floors will be completely closed. All rooms on these floors will be unavailable.
                    </p>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handlePreviewConflicts}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Preview Conflicts
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {editingClosure ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    editingClosure ? "Update Closure" : "Create Closure"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingClosure && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Closure Details</h3>
              <button
                onClick={() => setViewingClosure(null)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{viewingClosure.title}</h4>
                {viewingClosure.reason && (
                  <p className="text-gray-600 mt-1">{viewingClosure.reason}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">{getStatusBadge(viewingClosure)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="mt-1 text-gray-900">{formatDate(viewingClosure.date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Time</label>
                  <p className="mt-1 text-gray-900">
                    {formatDisplayTime(viewingClosure.startTime)} — {formatDisplayTime(viewingClosure.endTime)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Affected Floors</label>
                  <p className="mt-1 text-gray-900">{formatAffectedFloors(viewingClosure)}</p>
                </div>
                {viewingClosure.activatedByName && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Activated By</label>
                    <p className="mt-1 text-gray-900">{viewingClosure.activatedByName}</p>
                    {viewingClosure.activatedAt && (
                      <p className="text-xs text-gray-500">
                        {new Date(viewingClosure.activatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
                {viewingClosure.deactivatedByName && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Stopped By</label>
                    <p className="mt-1 text-gray-900">{viewingClosure.deactivatedByName}</p>
                    {viewingClosure.deactivatedAt && (
                      <p className="text-xs text-gray-500">
                        {new Date(viewingClosure.deactivatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {viewingClosure.affectedReservations?.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <AlertTriangle size={14} className="text-red-500" />
                    Cancelled Reservations ({viewingClosure.affectedReservations.length})
                  </label>
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
                    {viewingClosure.affectedReservations.map((res, idx) => (
                      <div key={idx} className="bg-red-50 p-2 rounded-lg text-sm">
                        <p className="font-medium">{res.roomName}</p>
                        <p className="text-gray-600 text-xs">
                          {res.date} {res.startTime} - {res.endTime}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={() => setViewingClosure(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activate Confirmation Modal */}
      {showActivateConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <Play className="text-green-600" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Activate Closure?</h3>
                  <p className="text-gray-600 mt-1">
                    You're about to activate "<span className="font-medium">{showActivateConfirm.title}</span>"
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex gap-2">
                  <AlertTriangle size={18} className="text-yellow-600 flex-shrink-0" />
                  <p className="text-yellow-800 text-sm">
                    Activating this closure will:
                  </p>
                </div>
                <ul className="text-yellow-700 text-sm mt-2 ml-6 list-disc">
                  <li>Immediately close the selected floors</li>
                  <li>Cancel any conflicting reservations</li>
                  <li>Send email notifications to affected users</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-6">
                <p className="text-sm text-gray-600">
                  <strong>Affected Floors:</strong> {formatAffectedFloors(showActivateConfirm)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Duration:</strong> {formatDisplayTime(showActivateConfirm.startTime)} — {formatDisplayTime(showActivateConfirm.endTime)}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowActivateConfirm(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleActivateConfirm}
                  disabled={isActivating}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isActivating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Activating...
                    </>
                  ) : (
                    "Yes, Activate Now"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stop Confirmation Modal */}
      {showStopConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <Pause className="text-red-600" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Stop Closure?</h3>
                  <p className="text-gray-600 mt-1">
                    You're about to stop "<span className="font-medium">{showStopConfirm.title}</span>"
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex gap-2">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-blue-800 text-sm">
                    Stopping this closure will:
                  </p>
                </div>
                <ul className="text-blue-700 text-sm mt-2 ml-6 list-disc">
                  <li>Change the closure status to <strong>"Stopped"</strong></li>
                  <li>Restore any cancelled reservations (if still available and no conflicts exist)</li>
                  <li>Send email notifications to restored users</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-6">
                <p className="text-sm text-gray-600">
                  <strong>Affected Floors:</strong> {formatAffectedFloors(showStopConfirm)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Duration:</strong> {formatDisplayTime(showStopConfirm.startTime)} — {formatDisplayTime(showStopConfirm.endTime)}
                </p>
                {showStopConfirm.affectedReservations?.length > 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    <strong>Cancelled Reservations:</strong> {showStopConfirm.affectedReservations.length} reservations will be restored if possible
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowStopConfirm(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStopConfirm}
                  disabled={isDeactivating}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeactivating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Stopping...
                    </>
                  ) : (
                    "Yes, Stop Closure"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <Trash2 className="text-red-600" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Closure?</h3>
                  <p className="text-gray-600 mt-1">
                    You're about to delete "<span className="font-medium">{showDeleteConfirm.title}</span>"
                  </p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex gap-2">
                  <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
                  <p className="text-red-800 text-sm font-medium">
                    This action is permanent and cannot be undone!
                  </p>
                </div>
                <ul className="text-red-700 text-sm mt-2 ml-6 list-disc">
                  <li>The closure record will be permanently deleted</li>
                  <li>Any cancelled reservations will NOT be restored</li>
                  <li>This action cannot be reversed</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-6">
                <p className="text-sm text-gray-600">
                  <strong>Affected Floors:</strong> {formatAffectedFloors(showDeleteConfirm)}
                </p>
                {showDeleteConfirm.affectedReservations?.length > 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    <strong>Warning:</strong> {showDeleteConfirm.affectedReservations.length} reservations were cancelled and will remain cancelled.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    "Yes, Delete Permanently"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Preview Modal */}
      {conflictPreview && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Conflict Preview</h3>
              <button
                onClick={() => setConflictPreview(null)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className={`rounded-lg p-4 mb-4 ${conflictPreview.affectedCount > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="flex items-center gap-2">
                  {conflictPreview.affectedCount > 0 ? (
                    <AlertTriangle className="text-yellow-600" size={20} />
                  ) : (
                    <CheckCircle className="text-green-600" size={20} />
                  )}
                  <p className={conflictPreview.affectedCount > 0 ? "text-yellow-800" : "text-green-800"}>
                    {conflictPreview.affectedCount === 0 
                      ? "No conflicts found. No reservations will be affected."
                      : `⚠️ This closure will affect ${conflictPreview.affectedCount} reservation(s):`
                    }
                  </p>
                </div>
              </div>
              {conflictPreview.affectedCount > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {conflictPreview.reservations?.map((res, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-900">{res.roomName}</p>
                      <p className="text-sm text-gray-600">
                        {res.userName} - {res.date} {formatDisplayTime(res.startTime)}-{formatDisplayTime(res.endTime)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Status: {res.status}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setConflictPreview(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminClosures;