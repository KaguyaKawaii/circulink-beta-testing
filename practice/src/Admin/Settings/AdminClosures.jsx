// src/Admin/AdminClosures.jsx
import { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  X, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Search, 
  ChevronDown,
  Plus,
  Eye,
  Home,
  FileText,
  BarChart3,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Square,
  CheckSquare,
  Filter,
  Play,
  Pause
} from "lucide-react";
import axios from "axios";
import AdminNavigation from "../AdminNavigation";

// Simple toast function
const showToast = (message, type = "success") => {
  if (type === "error") {
    alert(`❌ Error: ${message}`);
  } else if (type === "success") {
    alert(`✅ ${message}`);
  } else {
    alert(message);
  }
};

const AdminClosures = ({ setView, onLogout, admin }) => {
  const [closures, setClosures] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingClosure, setEditingClosure] = useState(null);
  const [isCreating, setIsCreating] = useState(false); // NEW: Loading state for create/update
  const [formData, setFormData] = useState({
    title: "",
    reason: "",
    date: "",
    startTime: "",
    endTime: "",
    affectedAllRooms: false,
    affectedRooms: [],
    location: "All Floors"
  });
  const [availableRooms, setAvailableRooms] = useState([]);
  const [conflictPreview, setConflictPreview] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [filter, setFilter] = useState({ status: "All", search: "" });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0 });
  const [itemsPerPage] = useState(20);
  
  // Selection State for bulk operations
  const [selectedClosures, setSelectedClosures] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState({ show: false, message: "", isSuccess: false });
  
  // Restore Confirmation Modal State
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(null);
  const [restoreAction, setRestoreAction] = useState(null); // 'single' or 'bulk'
  const [pendingDeleteClosure, setPendingDeleteClosure] = useState(null);
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState([]);
  
  // Activation/Deactivation States
  const [showActivateConfirm, setShowActivateConfirm] = useState(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  
  // View Mode
  const [viewMode, setViewMode] = useState("list");

  const API_URL = import.meta.env.VITE_API_URL || "";

  // Auto-update closure statuses every minute
  useEffect(() => {
    const updateClosureStatuses = async () => {
      try {
        await axios.post(`${API_URL}/api/closures/update-status`);
        fetchClosures();
      } catch (error) {
        console.error("Error updating closure statuses:", error);
      }
    };

    // Update immediately on mount
    updateClosureStatuses();

    // Set up interval to update every minute
    const interval = setInterval(updateClosureStatuses, 60000);

    return () => clearInterval(interval);
  }, []);

  const formatPHDateTime = (date) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return "—";
    }
  };

  const formatPHDate = (date) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "—";
    }
  };

  // Fetch closures on mount
  useEffect(() => {
    fetchClosures();
    fetchRooms();
  }, [filter, pagination.currentPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [filter]);

  const fetchClosures = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      // Build params for filtering
      const params = new URLSearchParams({
        page: pagination.currentPage,
        limit: itemsPerPage,
        ...(filter.status !== "All" && { status: filter.status }),
        ...(filter.search && { search: filter.search })
      });
      
      const response = await axios.get(`${API_URL}/api/closures?${params}`);
      
      if (response.data && response.data.success !== false) {
        const closuresData = response.data.closures || [];
        const paginationData = response.data.pagination || {};
        
        setClosures(closuresData);
        setPagination({
          currentPage: paginationData.page || pagination.currentPage,
          totalPages: paginationData.totalPages || 1,
          totalCount: paginationData.totalCount || 0
        });
        
        // Clear selections when fetching new data
        setSelectedClosures([]);
        setSelectAll(false);
      } else {
        console.error("Invalid response structure:", response.data);
        setClosures([]);
        setPagination(prev => ({
          ...prev,
          totalCount: 0,
          totalPages: 1
        }));
      }
    } catch (error) {
      console.error("Error fetching closures:", error);
      setFetchError(error.response?.data?.message || "Failed to fetch closures");
      setClosures([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/rooms`);
      setAvailableRooms(response.data);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleRoomSelection = (roomName) => {
    setFormData(prev => ({
      ...prev,
      affectedRooms: prev.affectedRooms.includes(roomName)
        ? prev.affectedRooms.filter(r => r !== roomName)
        : [...prev.affectedRooms, roomName]
    }));
  };

  const handlePreviewConflicts = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/closures/preview`, {
        ...formData,
        affectedRooms: formData.affectedAllRooms ? [] : formData.affectedRooms
      });
      setConflictPreview(response.data);
    } catch (error) {
      console.error("Error previewing conflicts:", error);
      showToast("Failed to preview conflicts", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isCreating) return;
    
    // Validate
    if (formData.startTime >= formData.endTime) {
      showToast("End time must be after start time", "error");
      return;
    }

    if (!formData.affectedAllRooms && formData.affectedRooms.length === 0) {
      showToast("Please select at least one room or select 'All Rooms'", "error");
      return;
    }

    setIsCreating(true); // Set loading state

    try {
      let response;
      if (editingClosure) {
        response = await axios.put(`${API_URL}/api/closures/${editingClosure._id}`, formData);
        showToast("Closure updated successfully", "success");
      } else {
        response = await axios.post(`${API_URL}/api/closures`, formData);
        showToast(`Closure created. ${response.data.affectedReservations?.length || 0} reservations were cancelled.`, "success");
      }
      
      setShowModal(false);
      setEditingClosure(null);
      setFormData({
        title: "",
        reason: "",
        date: "",
        startTime: "",
        endTime: "",
        affectedAllRooms: false,
        affectedRooms: [],
        location: "All Floors"
      });
      fetchClosures();
    } catch (error) {
      console.error("Error saving closure:", error);
      showToast(error.response?.data?.message || "Failed to save closure", "error");
    } finally {
      setIsCreating(false); // Clear loading state
    }
  };

  // Activation Handler
  const handleActivateClick = (closure) => {
    setShowActivateConfirm(closure);
  };

  const handleActivateConfirm = async (activateNow) => {
    if (!showActivateConfirm) return;
    
    setIsActivating(true);
    try {
      const response = await axios.post(`${API_URL}/api/closures/${showActivateConfirm._id}/activate`, {
        activateNow: activateNow
      });
      
      setDeleteResult({
        show: true,
        message: response.data.message,
        isSuccess: true
      });
      
      fetchClosures();
    } catch (error) {
      console.error("Error activating closure:", error);
      setDeleteResult({
        show: true,
        message: error.response?.data?.message || "Failed to activate closure",
        isSuccess: false
      });
    } finally {
      setIsActivating(false);
      setShowActivateConfirm(null);
    }
  };

  // Deactivation Handler
  const handleDeactivateClick = (closure) => {
    setShowDeactivateConfirm(closure);
  };

  const handleDeactivateConfirm = async (restoreReservations) => {
    if (!showDeactivateConfirm) return;
    
    setIsDeactivating(true);
    try {
      const response = await axios.post(`${API_URL}/api/closures/${showDeactivateConfirm._id}/deactivate`, {
        restoreReservations: restoreReservations,
        reason: "Manually deactivated by admin"
      });
      
      setDeleteResult({
        show: true,
        message: response.data.message,
        isSuccess: true
      });
      
      fetchClosures();
    } catch (error) {
      console.error("Error deactivating closure:", error);
      setDeleteResult({
        show: true,
        message: error.response?.data?.message || "Failed to deactivate closure",
        isSuccess: false
      });
    } finally {
      setIsDeactivating(false);
      setShowDeactivateConfirm(null);
    }
  };

  // Selection Handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedClosures([]);
    } else {
      const filteredIds = paginatedClosures.map(closure => closure._id);
      setSelectedClosures(filteredIds);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectClosure = (closureId) => {
    setSelectedClosures(prev => {
      if (prev.includes(closureId)) {
        const newSelected = prev.filter(id => id !== closureId);
        setSelectAll(false);
        return newSelected;
      } else {
        const newSelected = [...prev, closureId];
        if (newSelected.length === paginatedClosures.length) {
          setSelectAll(true);
        }
        return newSelected;
      }
    });
  };

  // Single Delete Handler with Restore Confirmation Modal
  const handleDeleteClick = (closure) => {
    setPendingDeleteClosure(closure);
    setRestoreAction('single');
    setShowRestoreConfirm({
      title: closure.title,
      affectedCount: closure.affectedReservations?.length || 0,
      affectedReservations: closure.affectedReservations || [],
      date: closure.date,
      show: true
    });
  };

  const handleRestoreConfirm = async (shouldRestore) => {
    if (restoreAction === 'single' && pendingDeleteClosure) {
      setIsDeleting(true);
      try {
        await axios.delete(`${API_URL}/api/closures/${pendingDeleteClosure._id}`, {
          data: { restoreReservations: shouldRestore }
        });
        
        setDeleteResult({
          show: true,
          message: shouldRestore 
            ? `Closure deleted successfully. ${pendingDeleteClosure.affectedReservations?.length || 0} reservation(s) have been restored.`
            : "Closure deleted successfully.",
          isSuccess: true
        });
        
        fetchClosures();
      } catch (error) {
        console.error("Error deleting closure:", error);
        setDeleteResult({
          show: true,
          message: error.response?.data?.message || "Failed to delete closure",
          isSuccess: false
        });
      } finally {
        setIsDeleting(false);
        setShowRestoreConfirm(null);
        setPendingDeleteClosure(null);
        setRestoreAction(null);
      }
    } else if (restoreAction === 'bulk' && pendingBulkDeleteIds.length > 0) {
      setIsBulkDeleting(true);
      try {
        const response = await axios.post(`${API_URL}/api/closures/bulk-delete`, {
          closureIds: pendingBulkDeleteIds,
          restoreReservations: shouldRestore
        });

        if (response.data.success) {
          setDeleteResult({
            show: true,
            message: shouldRestore
              ? `Successfully deleted ${response.data.count} closures. Affected reservations have been restored.`
              : `Successfully deleted ${response.data.count} closures.`,
            isSuccess: true
          });
          
          setSelectedClosures([]);
          setSelectAll(false);
          fetchClosures();
        } else {
          throw new Error(response.data.message || "Failed to delete closures");
        }
      } catch (error) {
        console.error("Bulk delete error:", error);
        setDeleteResult({
          show: true,
          message: error.response?.data?.message || "Failed to delete closures. Please try again.",
          isSuccess: false
        });
      } finally {
        setIsBulkDeleting(false);
        setShowRestoreConfirm(null);
        setPendingBulkDeleteIds([]);
        setShowBulkDeleteConfirm(false);
        setRestoreAction(null);
      }
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(null);
    setShowRestoreConfirm(null);
    setPendingDeleteClosure(null);
    setPendingBulkDeleteIds([]);
    setRestoreAction(null);
  };

  // Bulk Delete Handler
  const handleBulkDeleteClick = () => {
    if (selectedClosures.length === 0) {
      setDeleteResult({
        show: true,
        message: "Please select at least one closure to delete.",
        isSuccess: false
      });
      return;
    }
    
    // Calculate total affected reservations
    const totalAffected = selectedClosures.reduce((total, id) => {
      const closure = closures.find(c => c._id === id);
      return total + (closure?.affectedReservations?.length || 0);
    }, 0);
    
    setPendingBulkDeleteIds([...selectedClosures]);
    setRestoreAction('bulk');
    setShowRestoreConfirm({
      title: `${selectedClosures.length} selected closures`,
      affectedCount: totalAffected,
      affectedReservations: [],
      date: null,
      show: true
    });
  };

  const handleCloseResultModal = () => {
    setDeleteResult({ show: false, message: "", isSuccess: false });
  };

  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (closure) => {
    if (closure.status === "Expired") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Expired
        </span>
      );
    }
    if (closure.status === "Active") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
      );
    }
    if (closure.status === "Scheduled") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Scheduled
        </span>
      );
    }
    if (closure.status === "Deactivated") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Deactivated
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        {closure.status}
      </span>
    );
  };

  // Filter closures based on status and search
  const filteredClosures = closures.filter((closure) => {
    const matchesStatus = filter.status === "All" || closure.status === filter.status;
    const matchesSearch = 
      closure.title?.toLowerCase().includes(filter.search.toLowerCase()) ||
      closure.reason?.toLowerCase().includes(filter.search.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // Pagination logic
  const indexOfLastItem = pagination.currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedClosures = filteredClosures.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredClosures.length / itemsPerPage);

  // Pagination Handlers
  const handlePageChange = (pageNumber) => {
    setPagination(prev => ({ ...prev, currentPage: pageNumber }));
    setSelectedClosures([]);
    setSelectAll(false);
  };

  const handlePreviousPage = () => {
    if (pagination.currentPage > 1) {
      setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }));
      setSelectedClosures([]);
      setSelectAll(false);
    }
  };

  const handleNextPage = () => {
    if (pagination.currentPage < totalPages) {
      setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
      setSelectedClosures([]);
      setSelectAll(false);
    }
  };

  // Stat Card Component
  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 rounded-xl bg-gray-100 text-gray-600">
          {icon}
        </div>
      </div>
    </div>
  );

  // Pagination Component
  const Pagination = () => {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];
      let l;

      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= pagination.currentPage - delta && i <= pagination.currentPage + delta)) {
          range.push(i);
        }
      }

      range.forEach((i) => {
        if (l) {
          if (i - l === 2) {
            rangeWithDots.push(l + 1);
          } else if (i - l !== 1) {
            rangeWithDots.push('...');
          }
        }
        rangeWithDots.push(i);
        l = i;
      });

      return rangeWithDots;
    };

    const visiblePages = getVisiblePages();

    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={handlePreviousPage}
            disabled={pagination.currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={handleNextPage}
            disabled={pagination.currentPage === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(indexOfLastItem, filteredClosures.length)}
              </span>{' '}
              of <span className="font-medium">{filteredClosures.length}</span> results
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={handlePreviousPage}
                disabled={pagination.currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              {visiblePages.map((page, index) => (
                <button
                  key={index}
                  onClick={() => page !== '...' && handlePageChange(page)}
                  disabled={page === '...'}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    page === pagination.currentPage
                      ? 'z-10 bg-[#CC0000] text-white focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#CC0000]'
                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                  } ${page === '...' ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={handleNextPage}
                disabled={pagination.currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminClosures" onLogout={onLogout} />
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50 relative z-10">
        {/* Header */}
        <header className="bg-white px-6 py-4 border-b border-gray-200 z-20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#CC0000]">
                Facility Closures
              </h1>
              <p className="text-gray-600">
                Manage closures for university events and facility maintenance
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-6">
          {/* Error Display */}
          {fetchError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="text-red-500 mr-2" size={20} />
                <p className="text-red-700">Error loading closures: {fetchError}</p>
              </div>
              <button
                onClick={fetchClosures}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Try Again
              </button>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === "list" 
                      ? "bg-[#CC0000] text-white" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <FileText size={16} className="inline mr-2" />
                  List View
                </button>
                <button
                  onClick={() => setViewMode("stats")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === "stats" 
                      ? "bg-[#CC0000] text-white" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <BarChart3 size={16} className="inline mr-2" />
                  Statistics
                </button>
              </div>

              {/* Search */}
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  value={filter.search}
                  onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search by title, reason..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-red-600 outline-0"
                />
                {filter.search && (
                  <button
                    onClick={() => setFilter(prev => ({ ...prev, search: "" }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Status filter - UPDATED with all statuses */}
              <div className="relative">
                <select
                  value={filter.status}
                  onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                  className="appearance-none pl-4 pr-8 py-2 border outline-0 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-red-600 cursor-pointer"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Deactivated">Deactivated</option>
                  <option value="Expired">Expired</option>
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingClosure(null);
                    setFormData({
                      title: "",
                      reason: "",
                      date: "",
                      startTime: "",
                      endTime: "",
                      affectedAllRooms: false,
                      affectedRooms: [],
                      location: "All Floors"
                    });
                    setShowModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Create Closure</span>
                </button>
                <button
                  onClick={fetchClosures}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <RefreshCw size={16} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Bulk Actions Row */}
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer text-sm"
                >
                  {selectAll ? <Square size={16} /> : <CheckSquare size={16} />}
                  <span>{selectAll ? "Deselect All" : "Select All"}</span>
                </button>
                <span className="text-sm text-gray-600">
                  {selectedClosures.length} closure{selectedClosures.length !== 1 ? 's' : ''} selected
                </span>
              </div>

              {selectedClosures.length > 0 && (
                <button
                  onClick={handleBulkDeleteClick}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer text-sm"
                >
                  <Trash2 size={16} />
                  <span>Delete Selected</span>
                </button>
              )}
            </div>
          </div>

          {/* STATISTICS VIEW */}
          {viewMode === "stats" ? (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Closures"
                  value={filteredClosures.length}
                  icon={<Calendar size={24} />}
                  color="border-l-4 border-l-blue-500"
                />
                <StatCard
                  title="Active Closures"
                  value={filteredClosures.filter(c => c.status === "Active").length}
                  icon={<CheckCircle size={24} />}
                  color="border-l-4 border-l-green-500"
                  subtitle="Currently in effect"
                />
                <StatCard
                  title="Scheduled Closures"
                  value={filteredClosures.filter(c => c.status === "Scheduled").length}
                  icon={<CalendarRange size={24} />}
                  color="border-l-4 border-l-blue-500"
                  subtitle="Upcoming closures"
                />
                <StatCard
                  title="Deactivated Closures"
                  value={filteredClosures.filter(c => c.status === "Deactivated").length}
                  icon={<XCircle size={24} />}
                  color="border-l-4 border-l-yellow-500"
                  subtitle="Manually stopped"
                />
                <StatCard
                  title="Expired Closures"
                  value={filteredClosures.filter(c => c.status === "Expired").length}
                  icon={<Clock size={24} />}
                  color="border-l-4 border-l-gray-500"
                  subtitle="Past closures"
                />
                <StatCard
                  title="Total Affected Reservations"
                  value={filteredClosures.reduce((sum, c) => sum + (c.affectedReservations?.length || 0), 0)}
                  icon={<Users size={24} />}
                  color="border-l-4 border-l-red-500"
                  subtitle="Reservations cancelled"
                />
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <Home className="mr-2 text-blue-600" size={20} />
                    Closures by Type
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">All Rooms Closures</span>
                      <span className="font-semibold text-lg text-blue-600">
                        {filteredClosures.filter(c => c.affectedAllRooms).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Specific Rooms Closures</span>
                      <span className="font-semibold text-lg text-green-600">
                        {filteredClosures.filter(c => !c.affectedAllRooms).length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <TrendingUp className="mr-2 text-green-600" size={20} />
                    Impact Summary
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Total Affected Reservations</span>
                      <span className="font-semibold text-lg text-red-600">
                        {filteredClosures.reduce((sum, c) => sum + (c.affectedReservations?.length || 0), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Average Affected per Closure</span>
                      <span className="font-semibold text-lg text-purple-600">
                        {filteredClosures.length > 0 
                          ? Math.round(filteredClosures.reduce((sum, c) => sum + (c.affectedReservations?.length || 0), 0) / filteredClosures.length)
                          : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* LIST VIEW */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium w-10">
                        <button
                          onClick={handleSelectAll}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          {selectAll ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left font-medium">#</th>
                      <th className="px-6 py-3 text-left font-medium">Title</th>
                      <th className="px-6 py-3 text-left font-medium">Date</th>
                      <th className="px-6 py-3 text-left font-medium">Time</th>
                      <th className="px-6 py-3 text-left font-medium">Affected Rooms</th>
                      <th className="px-6 py-3 text-left font-medium">Status</th>
                      <th className="px-6 py-3 text-left font-medium">Affected Reservations</th>
                      <th className="px-6 py-3 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 text-center text-gray-500 font-bold">
                          Loading closures...
                        </td>
                      </tr>
                    ) : paginatedClosures.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                          No closures found
                        </td>
                      </tr>
                    ) : (
                      paginatedClosures.map((closure, i) => {
                        return (
                          <tr key={closure._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleSelectClosure(closure._id)}
                                className="text-gray-600 hover:text-gray-800"
                              >
                                {selectedClosures.includes(closure._id) ? (
                                  <CheckSquare size={18} className="text-[#CC0000]" />
                                ) : (
                                  <Square size={18} />
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">{indexOfFirstItem + i + 1}</td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900">{closure.title}</div>
                              <div className="text-gray-500 text-xs line-clamp-1">{closure.reason}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {formatDate(closure.date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {formatTime(closure.startTime)} — {formatTime(closure.endTime)}
                            </td>
                            <td className="px-6 py-4">
                              {closure.affectedAllRooms ? (
                                <span className="text-blue-600 font-medium">All Rooms</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  <span className="text-gray-700">
                                    {closure.affectedRooms?.length || 0} room(s)
                                  </span>
                                  <button
                                    onClick={() => {
                                      const roomList = closure.affectedRooms?.join(", ") || "None";
                                      alert(`Affected Rooms:\n${roomList}`);
                                    }}
                                    className="text-xs text-blue-500 hover:text-blue-700"
                                  >
                                    View
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(closure)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                (closure.affectedReservations?.length || 0) > 0
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}>
                                {closure.affectedReservations?.length || 0} cancelled
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex justify-end space-x-2">
                                {/* Activate Button - Only show for Scheduled or Deactivated */}
                                {(closure.status === "Scheduled" || closure.status === "Deactivated") && (
                                  <button
                                    onClick={() => handleActivateClick(closure)}
                                    className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors cursor-pointer"
                                    title="Activate Closure"
                                  >
                                    <Play size={18} />
                                  </button>
                                )}
                                
                                {/* Deactivate Button - Only show for Active */}
                                {closure.status === "Active" && (
                                  <button
                                    onClick={() => handleDeactivateClick(closure)}
                                    className="p-1.5 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded transition-colors cursor-pointer"
                                    title="Deactivate Closure"
                                  >
                                    <Pause size={18} />
                                  </button>
                                )}
                                
                                {/* Edit Button - Show for non-expired */}
                                {closure.status !== "Expired" && (
                                  <button
                                    onClick={() => {
                                      setEditingClosure(closure);
                                      setFormData({
                                        title: closure.title,
                                        reason: closure.reason,
                                        date: closure.date,
                                        startTime: closure.startTime,
                                        endTime: closure.endTime,
                                        affectedAllRooms: closure.affectedAllRooms,
                                        affectedRooms: closure.affectedRooms || [],
                                        location: closure.location || "All Floors"
                                      });
                                      setShowModal(true);
                                    }}
                                    className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                    title="Edit Closure"
                                  >
                                    <Edit size={18} />
                                  </button>
                                )}
                                
                                {/* Delete Button */}
                                <button
                                  onClick={() => handleDeleteClick(closure)}
                                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {filteredClosures.length > 0 && <Pagination />}
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal with Loading State */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingClosure ? "Edit Closure" : "Create Facility Closure"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                disabled={isCreating}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  disabled={isCreating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="e.g., University Foundation Day"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  required
                  disabled={isCreating}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Explain why the facility is closed..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    disabled={isCreating}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                    disabled={isCreating}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                    disabled={isCreating}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    name="affectedAllRooms"
                    checked={formData.affectedAllRooms}
                    onChange={handleInputChange}
                    disabled={isCreating}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 disabled:opacity-50"
                  />
                  <span className="text-gray-700">Affect all rooms</span>
                </label>

                {!formData.affectedAllRooms && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Affected Rooms</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-3 border border-gray-200 rounded-lg bg-gray-50">
                      {availableRooms.map((room) => (
                        <label key={room._id} className="flex items-center gap-2 text-gray-700 text-sm">
                          <input
                            type="checkbox"
                            checked={formData.affectedRooms.includes(room.room)}
                            onChange={() => handleRoomSelection(room.room)}
                            disabled={isCreating}
                            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 disabled:opacity-50"
                          />
                          <span>{room.room} ({room.floor})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handlePreviewConflicts}
                  disabled={isCreating}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Preview Conflicts
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-2 ${
                    isCreating ? "opacity-50 cursor-not-allowed" : ""
                  }`}
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

      {/* Activate Confirmation Modal */}
      {showActivateConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="p-6">
              <div className="flex items-start mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <Play className="text-green-600" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Activate Closure</h3>
                  <p className="text-gray-600 mt-1">
                    You're about to activate "<span className="font-medium">{showActivateConfirm.title}</span>"
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 text-sm">
                  ⚠️ Activating this closure will cancel any conflicting reservations during this time period.
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleActivateConfirm(true)}
                  disabled={isActivating}
                  className="w-full text-left p-4 rounded-lg border-2 border-green-200 hover:border-green-400 bg-green-50 hover:bg-green-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <CheckCircle size={20} className="text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Activate Now</p>
                      <p className="text-sm text-gray-600">
                        Activate immediately and cancel conflicting reservations
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleActivateConfirm(false)}
                  disabled={isActivating}
                  className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-gray-400 bg-white hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <Calendar size={20} className="text-gray-500" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Schedule for Later</p>
                      <p className="text-sm text-gray-600">
                        Activate at the scheduled date and time
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowActivateConfirm(null)}
                  disabled={isActivating}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="p-6">
              <div className="flex items-start mb-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <Pause className="text-yellow-600" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Deactivate Closure</h3>
                  <p className="text-gray-600 mt-1">
                    You're about to deactivate "<span className="font-medium">{showDeactivateConfirm.title}</span>"
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Affected Reservations:</span>
                  <span className="text-lg font-bold text-red-600">
                    {showDeactivateConfirm.affectedReservations?.length || 0}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  <p>These reservations were cancelled when this closure was activated.</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleDeactivateConfirm(true)}
                  disabled={isDeactivating}
                  className="w-full text-left p-4 rounded-lg border-2 border-green-200 hover:border-green-400 bg-green-50 hover:bg-green-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <CheckCircle size={20} className="text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Deactivate & Restore</p>
                      <p className="text-sm text-gray-600">
                        Deactivate closure and restore cancelled reservations (if available)
                      </p>
                      {(showDeactivateConfirm.affectedReservations?.length || 0) > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ {showDeactivateConfirm.affectedReservations?.length || 0} reservation(s) will be restored
                        </p>
                      )}
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleDeactivateConfirm(false)}
                  disabled={isDeactivating}
                  className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-gray-400 bg-white hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <XCircle size={20} className="text-gray-500" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Deactivate Only</p>
                      <p className="text-sm text-gray-600">
                        Deactivate closure without restoring reservations
                      </p>
                      {(showDeactivateConfirm.affectedReservations?.length || 0) > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          ⚠️ {showDeactivateConfirm.affectedReservations?.length || 0} reservation(s) will remain cancelled
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowDeactivateConfirm(null)}
                  disabled={isDeactivating}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Improved Restore Confirmation Modal */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="p-6">
              <div className="flex items-start mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <Trash2 className="text-red-600" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Closure</h3>
                  <p className="text-gray-600 mt-1">
                    {restoreAction === 'single' ? (
                      <>You're about to delete "<span className="font-medium">{showRestoreConfirm.title}</span>"</>
                    ) : (
                      <>You're about to delete {showRestoreConfirm.title}</>
                    )}
                  </p>
                </div>
              </div>

              {/* Impact Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Affected Reservations:</span>
                  <span className="text-lg font-bold text-red-600">{showRestoreConfirm.affectedCount}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {showRestoreConfirm.affectedCount > 0 ? (
                    <p>These reservations were automatically cancelled when this closure was created.</p>
                  ) : (
                    <p>No reservations were affected by this closure.</p>
                  )}
                </div>
                {showRestoreConfirm.date && (
                  <div className="text-xs text-gray-500 mt-2">
                    <p>Closure Date: {formatDate(showRestoreConfirm.date)}</p>
                  </div>
                )}
              </div>

              {/* Option Cards */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleRestoreConfirm(true)}
                  disabled={isDeleting || isBulkDeleting}
                  className="w-full text-left p-4 rounded-lg border-2 border-green-200 hover:border-green-400 bg-green-50 hover:bg-green-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <CheckCircle size={20} className="text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Restore & Delete</p>
                      <p className="text-sm text-gray-600">
                        Restore cancelled reservations and remove this closure
                      </p>
                      {showRestoreConfirm.affectedCount > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ {showRestoreConfirm.affectedCount} reservation{showRestoreConfirm.affectedCount !== 1 ? 's' : ''} will be restored
                        </p>
                      )}
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleRestoreConfirm(false)}
                  disabled={isDeleting || isBulkDeleting}
                  className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-gray-400 bg-white hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <Trash2 size={20} className="text-gray-500" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Delete Only</p>
                      <p className="text-sm text-gray-600">
                        Delete closure without restoring cancelled reservations
                      </p>
                      {showRestoreConfirm.affectedCount > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          ⚠️ {showRestoreConfirm.affectedCount} reservation{showRestoreConfirm.affectedCount !== 1 ? 's' : ''} will remain cancelled
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              {/* Cancel Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleDeleteCancel}
                  disabled={isDeleting || isBulkDeleting}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Result Modal */}
      {deleteResult.show && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                deleteResult.isSuccess ? "bg-green-100" : "bg-red-100"
              }`}>
                {deleteResult.isSuccess ? (
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {deleteResult.isSuccess ? "Success" : "Error"}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">{deleteResult.message}</p>
            <div className="flex justify-end">
              <button
                onClick={handleCloseResultModal}
                className={`px-4 py-2 text-white rounded-lg transition-colors cursor-pointer ${
                  deleteResult.isSuccess 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay for All Operations */}
      {(isDeleting || isBulkDeleting || isActivating || isDeactivating || isCreating) && !showRestoreConfirm && !showActivateConfirm && !showDeactivateConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {isBulkDeleting ? 'Deleting Closures' : 
                 isActivating ? 'Activating Closure' : 
                 isDeactivating ? 'Deactivating Closure' : 
                 isCreating ? (editingClosure ? 'Updating Closure' : 'Creating Closure') : 
                 'Deleting Closure'}
              </h3>
              <p className="text-gray-600 text-center">
                {isBulkDeleting 
                  ? `Please wait while we delete ${selectedClosures.length} closures...`
                  : isActivating
                  ? 'Please wait while we activate the closure...'
                  : isDeactivating
                  ? 'Please wait while we deactivate the closure...'
                  : isCreating
                  ? (editingClosure ? 'Please wait while we update the closure...' : 'Please wait while we create the closure...')
                  : 'Please wait while we delete the closure...'}
              </p>
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
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800">
                  ⚠️ This closure will affect {conflictPreview.affectedCount} reservation(s):
                </p>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {conflictPreview.reservations?.map((res, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="font-semibold text-gray-900">{res.roomName}</p>
                    <p className="text-sm text-gray-600">
                      {res.userName} - {res.date} {res.startTime}-{res.endTime}
                    </p>
                    <p className="text-xs text-gray-500">Status: {res.status}</p>
                  </div>
                ))}
              </div>
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