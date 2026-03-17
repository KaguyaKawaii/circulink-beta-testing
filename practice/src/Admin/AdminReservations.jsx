import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminNavigation from "./AdminNavigation";
import { 
  Eye, 
  Trash2, 
  RefreshCw, 
  Search, 
  ChevronDown, 
  X, 
  Calendar as CalendarIcon,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  Users,
  Home,
  FileText,
  BarChart3,
  Plus,
  Edit,
  CheckSquare,
  Square,
  AlertTriangle,
  UserX,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import AdminReservationModal from "./Modals/AdminReservationModal";
import AdminCreateReservationModal from "./Modals/AdminCreateReservationModal";
import AdminEditReservationModal from "./Modals/AdminEditReservationModal";

function AdminReservations({ setView, onLogout }) {
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [reservationToArchive, setReservationToArchive] = useState(null);
  const [archiveResult, setArchiveResult] = useState({ show: false, message: "", isSuccess: false });
  const [isArchiving, setIsArchiving] = useState(false);
  
  // Selection State
  const [selectedReservations, setSelectedReservations] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkArchiveConfirm, setShowBulkArchiveConfirm] = useState(false);
  const [isBulkArchiving, setIsBulkArchiving] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Daily Logs State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyStats, setDailyStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    ongoing: 0,
    completed: 0,
    expired: 0,
    cancelled: 0
  });
  const [dailyActivities, setDailyActivities] = useState([]);
  const [roomUsage, setRoomUsage] = useState({});
  const [viewMode, setViewMode] = useState("list");
  
  // Date Filter State
  const [dateFilter, setDateFilter] = useState("all"); // "today" or "all"

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

  useEffect(() => {
    fetchReservations();
  }, []);

  useEffect(() => {
    if (viewMode === "daily") {
      calculateDailyStats();
    }
  }, [reservations, selectedDate, viewMode]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search, dateFilter]);

  const fetchReservations = async () => {
    setIsLoading(true);
    setFetchError(null);
    
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/reservations`);
      
      // Safely process reservations with error handling for missing user data
      const processedReservations = res.data.map(reservation => {
        // Ensure userId exists and has required fields
        if (!reservation.userId) {
          console.warn(`Reservation ${reservation._id} has no userId`);
          return {
            ...reservation,
            userId: {
              name: "Unknown User",
              _id: null,
              email: null
            }
          };
        }
        return reservation;
      });

      const sorted = processedReservations.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt) : 0;
        const bTime = b.createdAt ? new Date(b.createdAt) : 0;
        return bTime - aTime;
      });
      
      setReservations(sorted);
      // Clear selections when fetching new data
      setSelectedReservations([]);
      setSelectAll(false);
      setCurrentPage(1); // Reset to first page on new data
    } catch (err) {
      console.error("Fetch reservations error:", err);
      setFetchError(err.response?.data?.message || err.message || "Failed to fetch reservations");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDailyStats = () => {
    try {
      const selectedDateStart = new Date(selectedDate);
      selectedDateStart.setHours(0, 0, 0, 0);
      const selectedDateEnd = new Date(selectedDate);
      selectedDateEnd.setHours(23, 59, 59, 999);

      const dailyReservations = reservations.filter(reservation => {
        if (!reservation.datetime) return false;
        const reservationDate = new Date(reservation.datetime);
        return reservationDate >= selectedDateStart && reservationDate <= selectedDateEnd;
      });

      const stats = {
        total: dailyReservations.length,
        approved: dailyReservations.filter(r => r.status === "Approved").length,
        pending: dailyReservations.filter(r => r.status === "Pending").length,
        ongoing: dailyReservations.filter(r => r.status === "Ongoing").length,
        completed: dailyReservations.filter(r => r.status === "Completed").length,
        expired: dailyReservations.filter(r => r.status === "Expired").length,
        cancelled: dailyReservations.filter(r => r.status === "Cancelled").length
      };
      setDailyStats(stats);

      const usage = {};
      dailyReservations.forEach(reservation => {
        const roomKey = `${reservation.location || 'Unknown'} - ${reservation.roomName || 'Unknown'}`;
        if (!usage[roomKey]) {
          usage[roomKey] = {
            total: 0,
            byStatus: {}
          };
        }
        usage[roomKey].total++;
        usage[roomKey].byStatus[reservation.status] = (usage[roomKey].byStatus[reservation.status] || 0) + 1;
      });
      setRoomUsage(usage);

      const activities = dailyReservations
        .sort((a, b) => new Date(b.datetime || 0) - new Date(a.datetime || 0))
        .slice(0, 10)
        .map(reservation => ({
          id: reservation._id,
          time: reservation.datetime ? new Date(reservation.datetime).toLocaleTimeString('en-PH', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : '--:--',
          user: reservation.userId?.name || 'Unknown',
          action: getActivityAction(reservation),
          room: reservation.roomName || 'Unknown',
          status: reservation.status
        }));
      setDailyActivities(activities);
    } catch (error) {
      console.error("Error calculating daily stats:", error);
    }
  };

  const getActivityAction = (reservation) => {
    switch (reservation.status) {
      case 'Pending': return 'Reservation requested';
      case 'Approved': return 'Reservation approved';
      case 'Ongoing': return 'Reservation started';
      case 'Completed': return 'Reservation completed';
      case 'Expired': return 'Reservation expired';
      case 'Cancelled': return 'Reservation cancelled';
      default: return 'Reservation created';
    }
  };

  // Selection Handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedReservations([]);
    } else {
      const filteredIds = paginatedReservations.map(res => res._id);
      setSelectedReservations(filteredIds);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectReservation = (reservationId) => {
    setSelectedReservations(prev => {
      if (prev.includes(reservationId)) {
        const newSelected = prev.filter(id => id !== reservationId);
        setSelectAll(false);
        return newSelected;
      } else {
        const newSelected = [...prev, reservationId];
        // Check if all paginated reservations are selected
        if (newSelected.length === paginatedReservations.length) {
          setSelectAll(true);
        }
        return newSelected;
      }
    });
  };

  // Bulk Archive Handler
  const handleBulkArchiveClick = () => {
    if (selectedReservations.length === 0) {
      setArchiveResult({
        show: true,
        message: "Please select at least one reservation to archive.",
        isSuccess: false
      });
      return;
    }
    setShowBulkArchiveConfirm(true);
  };

  const handleBulkArchiveConfirm = async () => {
    if (selectedReservations.length === 0) return;
    
    setIsBulkArchiving(true);
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/reservations/bulk-archive`,
        { reservationIds: selectedReservations }
      );

      if (response.data.success) {
        setArchiveResult({
          show: true,
          message: `Successfully archived ${response.data.count} reservations.`,
          isSuccess: true
        });
        
        // Update local state
        setReservations(prev => 
          prev.filter(res => !selectedReservations.includes(res._id))
        );
        
        // Clear selections
        setSelectedReservations([]);
        setSelectAll(false);
        setCurrentPage(1); // Reset to first page after bulk archive
        
        // Refresh data to ensure consistency
        fetchReservations();
      } else {
        throw new Error(response.data.message || "Failed to archive reservations");
      }
    } catch (err) {
      console.error("Bulk archive error:", err);
      setArchiveResult({
        show: true,
        message: err.response?.data?.message || "Failed to archive reservations. Please try again.",
        isSuccess: false
      });
    } finally {
      setIsBulkArchiving(false);
      setShowBulkArchiveConfirm(false);
    }
  };

  const handleBulkArchiveCancel = () => {
    setShowBulkArchiveConfirm(false);
  };

  // Single Archive Handler
  const handleArchiveClick = (id) => {
    setReservationToArchive(id);
    setShowArchiveConfirm(true);
  };

  const handleArchiveConfirm = () => {
    if (!reservationToArchive) return;
    
    setIsArchiving(true);
    
    axios
      .post(`${import.meta.env.VITE_API_URL}/api/reservations/${reservationToArchive}/archive`)
      .then((response) => {
        if (response.data.success || response.data.message) {
          setArchiveResult({
            show: true,
            message: "Reservation archived successfully.",
            isSuccess: true
          });
          fetchReservations();
        } else {
          setArchiveResult({
            show: true,
            message: "Unexpected response from server.",
            isSuccess: false
          });
        }
      })
      .catch((err) => {
        console.error("Archive error:", err);
        const errorMessage = err.response?.data?.message || err.message || "Failed to archive reservation";
        setArchiveResult({
          show: true,
          message: `Archive failed: ${errorMessage}`,
          isSuccess: false
        });
      })
      .finally(() => {
        setIsArchiving(false);
        setShowArchiveConfirm(false);
        setReservationToArchive(null);
      });
  };

  const handleArchiveCancel = () => {
    setShowArchiveConfirm(false);
    setReservationToArchive(null);
  };

  const handleCloseResultModal = () => {
    setArchiveResult({ show: false, message: "", isSuccess: false });
  };

  const handleView = (reservation) => {
    setSelectedReservation(reservation);
    setShowModal(true);
  };

  const handleEdit = (reservation) => {
    setSelectedReservation(reservation);
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setSelectedReservation(null);
    setShowModal(false);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedReservation(null);
  };

  const handleActionSuccess = () => {
    fetchReservations();
  };

  const handleCreateSuccess = () => {
    fetchReservations();
    setShowCreateModal(false);
  };

  const handleEditSuccess = () => {
    fetchReservations();
    setShowEditModal(false);
    setSelectedReservation(null);
  };

  // Pagination Handlers
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Clear selections when changing page
    setSelectedReservations([]);
    setSelectAll(false);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setSelectedReservations([]);
      setSelectAll(false);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      setSelectedReservations([]);
      setSelectAll(false);
    }
  };

  // Filter reservations based on status, search, and date
  const filteredReservations = reservations.filter((res) => {
    const reserver = res.userId?.name || "Unknown";
    const matchesStatus = filter === "All" || res.status === filter;
    const matchesSearch =
      reserver.toLowerCase().includes(search.toLowerCase()) ||
      (res.roomName || "").toLowerCase().includes(search.toLowerCase()) ||
      (res.location || "").toLowerCase().includes(search.toLowerCase());
    
    // Date filter logic
    let matchesDate = true;
    if (dateFilter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const reservationDate = res.datetime ? new Date(res.datetime) : null;
      matchesDate = reservationDate && reservationDate >= today && reservationDate < tomorrow;
    }
    
    return matchesStatus && matchesSearch && matchesDate;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedReservations = filteredReservations.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);

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

  const RoomUsageCard = ({ room, usage }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
            <Home size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{room}</h3>
            <p className="text-xs text-gray-500">Total: {usage.total} reservations</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {Object.entries(usage.byStatus).map(([status, count]) => (
          <div key={status} className="flex justify-between items-center text-xs">
            <span className="text-gray-600 capitalize">{status}</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              status === 'Approved' ? 'bg-green-100 text-green-800' :
              status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
              status === 'Ongoing' ? 'bg-blue-100 text-blue-800' :
              status === 'Completed' ? 'bg-purple-100 text-purple-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const getUserName = (userId) => {
    if (!userId) return "Deleted User";
    if (typeof userId === 'object') {
      if (userId._deleted) return "Deleted User";
      if (userId.name) return userId.name;
    }
    if (typeof userId === 'string') return "User";
    return "Unknown";
  };

  // Pagination Component
  const Pagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }

    // Show limited page numbers with ellipsis
    const getVisiblePages = () => {
      const delta = 2; // Number of pages to show on each side of current page
      const range = [];
      const rangeWithDots = [];
      let l;

      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
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
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
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
                {Math.min(indexOfLastItem, filteredReservations.length)}
              </span>{' '}
              of <span className="font-medium">{filteredReservations.length}</span> results
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
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
                    page === currentPage
                      ? 'z-10 bg-[#CC0000] text-white focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#CC0000]'
                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                  } ${page === '...' ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
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
      <AdminNavigation setView={setView} currentView="adminReservation" onLogout={onLogout} />
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50 relative z-10">
        {/* Header */}
        <header className="bg-white px-6 py-4 border-b border-gray-200 z-20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#CC0000]">
                Reservation Management
              </h1>
              <p className="text-gray-600">
                View and manage all room reservations
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
                <p className="text-red-700">Error loading reservations: {fetchError}</p>
              </div>
              <button
                onClick={fetchReservations}
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
                  onClick={() => setViewMode("daily")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === "daily" 
                      ? "bg-[#CC0000] text-white" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <BarChart3 size={16} className="inline mr-2" />
                  Daily Logs
                </button>
              </div>

              {/* Date Filter Toggle (only in list view) */}
              {viewMode === "list" && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setDateFilter("all")}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                      dateFilter === "all" 
                        ? "bg-blue-600 text-white" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    All Reservations
                  </button>
                  <button
                    onClick={() => setDateFilter("today")}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                      dateFilter === "today" 
                        ? "bg-blue-600 text-white" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Today's Reservations
                  </button>
                </div>
              )}

              {/* Search */}
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, room, location..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-red-600 outline-0"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Status filter */}
              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="appearance-none pl-4 pr-8 py-2 border outline-0 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-red-600 cursor-pointer"
                >
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Expired">Expired</option>
                  <option value="Completed">Completed</option>
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                >
                  <Plus size={16} />
                  <span>New Reservation</span>
                </button>
                <button
                  onClick={fetchReservations}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <RefreshCw size={16} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Bulk Actions Row - Only show in list view */}
            {viewMode === "list" && (
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
                    {selectedReservations.length} reservation{selectedReservations.length !== 1 ? 's' : ''} selected
                  </span>
                </div>

                {selectedReservations.length > 0 && (
                  <button
                    onClick={handleBulkArchiveClick}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer text-sm"
                  >
                    <Trash2 size={16} />
                    <span>Archive Selected</span>
                  </button>
                )}
              </div>
            )}

            {/* Date Picker for Daily View */}
            {viewMode === "daily" && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon size={18} className="text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Selected Date:</span>
                    </div>
                    <input
                      type="date"
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(new Date(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg border-1 border-gray-300">
                      {selectedDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Showing data for selected date
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DAILY LOGS VIEW */}
          {viewMode === "daily" ? (
            <div className="space-y-6">
              {/* Daily Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Reservations"
                  value={dailyStats.total}
                  icon={<TrendingUp size={24} />}
                  color="border-l-4 border-l-blue-500"
                />
                <StatCard
                  title="Approved"
                  value={dailyStats.approved}
                  icon={<CheckCircle size={24} />}
                  color="border-l-4 border-l-green-500"
                  subtitle="Ready to use"
                />
                <StatCard
                  title="Pending"
                  value={dailyStats.pending}
                  icon={<Clock size={24} />}
                  color="border-l-4 border-l-yellow-500"
                  subtitle="Awaiting approval"
                />
                <StatCard
                  title="No-Shows"
                  value={dailyStats.expired}
                  icon={<XCircle size={24} />}
                  color="border-l-4 border-l-red-500"
                  subtitle="Auto-expired"
                />
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title="Ongoing"
                  value={dailyStats.ongoing}
                  icon={<Users size={24} />}
                  color="border-l-4 border-l-blue-500"
                  subtitle="Currently active"
                />
                <StatCard
                  title="Completed"
                  value={dailyStats.completed}
                  icon={<CheckCircle size={24} />}
                  color="border-l-4 border-l-purple-500"
                  subtitle="Successfully ended"
                />
                <StatCard
                  title="Cancelled"
                  value={dailyStats.cancelled}
                  icon={<XCircle size={24} />}
                  color="border-l-4 border-l-gray-500"
                  subtitle="Manually cancelled"
                />
              </div>

              {/* Room Usage and Activity Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Room Usage */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <Home className="mr-2 text-blue-600" size={20} />
                    Room Usage Summary
                  </h2>
                  {Object.keys(roomUsage).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No reservations for selected date
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(roomUsage).map(([room, usage]) => (
                        <RoomUsageCard key={room} room={room} usage={usage} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Daily Activity Timeline */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock className="mr-2 text-green-600" size={20} />
                    Daily Activity Timeline
                  </h2>
                  {dailyActivities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No activities for selected date
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {dailyActivities.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                          <div className="flex-shrink-0 w-12 text-sm text-gray-500 font-medium">
                            {activity.time}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-gray-900 text-sm">{activity.user}</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                activity.status === "Approved" ? "bg-green-100 text-green-800" :
                                activity.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                                activity.status === "Ongoing" ? "bg-blue-100 text-blue-800" :
                                activity.status === "Completed" ? "bg-purple-100 text-purple-800" :
                                "bg-gray-100 text-gray-800"
                              }`}>
                                {activity.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{activity.action}</p>
                            <p className="text-xs text-gray-500 mt-1">Room: {activity.room}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* LIST VIEW */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Date filter info */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center">
                  <CalendarIcon size={16} className="text-gray-500 mr-2" />
                  <span className="text-sm text-gray-600">
                    {dateFilter === "today" ? "Showing today's reservations only" : "Showing all reservations"}
                  </span>
                </div>
              </div>
              
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
                      <th className="px-6 py-3 text-left font-medium">Reservation Date</th>
                      <th className="px-6 py-3 text-left font-medium">Time</th>
                      <th className="px-6 py-3 text-left font-medium">Room</th>
                      <th className="px-6 py-3 text-left font-medium">Reserved By</th>
                      <th className="px-6 py-3 text-left font-medium">Status</th>
                      <th className="px-6 py-3 text-left font-medium">Created At</th>
                      <th className="px-6 py-3 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 text-center text-gray-500 font-bold">
                          Loading reservations...
                        </td>
                      </tr>
                    ) : paginatedReservations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                          No reservations found
                        </td>
                      </tr>
                    ) : (
                      paginatedReservations.map((r, i) => {
                        const createdAt = r.createdAt ? new Date(r.createdAt) : null;
                        const startDate = r.datetime ? new Date(r.datetime) : null;
                        const endDate = r.endDatetime ? new Date(r.endDatetime) : null;

                        const dateOnly = startDate ? startDate.toLocaleDateString("en-PH", {
                          timeZone: "Asia/Manila",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }) : "—";

                        const startTime = startDate ? startDate.toLocaleTimeString("en-PH", {
                          timeZone: "Asia/Manila",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        }) : "--:--";

                        const endTime = endDate ? endDate.toLocaleTimeString("en-PH", {
                          timeZone: "Asia/Manila",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        }) : "--:--";

                        return (
                          <tr key={r._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleSelectReservation(r._id)}
                                className="text-gray-600 hover:text-gray-800"
                              >
                                {selectedReservations.includes(r._id) ? (
                                  <CheckSquare size={18} className="text-[#CC0000]" />
                                ) : (
                                  <Square size={18} />
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">{indexOfFirstItem + i + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{dateOnly}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {startTime} — {endTime}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium">{r.roomName || "Unknown Room"}</div>
                              <div className="text-gray-500 text-xs">{r.location || "Unknown Location"}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {getUserName(r.userId)}
                                {(!r.userId || r.userId._deleted) && (
                                  <UserX size={14} className="ml-1 text-red-400" title="User account deleted" />
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  r.status === "Approved"
                                    ? "bg-green-100 text-green-800"
                                    : r.status === "Pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : r.status === "Ongoing"
                                    ? "bg-blue-100 text-blue-800"
                                    : r.status === "Rejected"
                                    ? "bg-red-100 text-red-800"
                                    : r.status === "Cancelled"
                                    ? "bg-gray-100 text-gray-800"
                                    : r.status === "Expired"
                                    ? "bg-orange-100 text-orange-800"
                                    : r.status === "Completed"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {r.status}
                                {r.extensionRequested && (
                                  <span className="ml-1 text-xs">(Ext)</span>
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {createdAt ? formatPHDateTime(createdAt) : "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => handleView(r)}
                                  className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                  title="View Details"
                                >
                                  <Eye size={18} />
                                </button>
                                <button
                                  onClick={() => handleEdit(r)}
                                  className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                  title="Edit Reservation"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={() => handleArchiveClick(r._id)}
                                  className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors cursor-pointer"
                                  title="Archive"
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
              {filteredReservations.length > 0 && <Pagination />}
            </div>
          )}
        </div>
      </main>

      {/* Single Reservation Modal */}
      {showModal && selectedReservation && (
        <AdminReservationModal
          reservation={selectedReservation}
          onClose={handleCloseModal}
          onActionSuccess={handleActionSuccess}
          currentUser={{ role: "Admin" }}
        />
      )}

      {/* Create Reservation Modal */}
      {showCreateModal && (
        <AdminCreateReservationModal
          onClose={handleCloseCreateModal}
          onSuccess={handleCreateSuccess}
          currentUser={{ role: "Admin", _id: "admin" }}
        />
      )}

      {/* Edit Reservation Modal */}
      {showEditModal && selectedReservation && (
        <AdminEditReservationModal
          reservation={selectedReservation}
          onClose={handleCloseEditModal}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Single Archive Confirmation Modal */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <Trash2 className="text-red-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Archive Reservation
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to archive this reservation? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleArchiveCancel}
                disabled={isArchiving}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveConfirm}
                disabled={isArchiving}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {isArchiving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Archiving...
                  </>
                ) : (
                  'Archive'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Archive Confirmation Modal */}
      {showBulkArchiveConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Archive Multiple Reservations
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to archive {selectedReservations.length} selected reservation{selectedReservations.length !== 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleBulkArchiveCancel}
                disabled={isBulkArchiving}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkArchiveConfirm}
                disabled={isBulkArchiving}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {isBulkArchiving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Archiving...
                  </>
                ) : (
                  'Archive All'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Result Modal */}
      {archiveResult.show && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
            <div className="flex items-center mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                archiveResult.isSuccess ? "bg-green-100" : "bg-red-100"
              }`}>
                {archiveResult.isSuccess ? (
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
                {archiveResult.isSuccess ? "Success" : "Error"}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">{archiveResult.message}</p>
            <div className="flex justify-end">
              <button
                onClick={handleCloseResultModal}
                className={`px-4 py-2 text-white rounded-lg transition-colors cursor-pointer ${
                  archiveResult.isSuccess 
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

      {/* Loading Overlay for Archive Operation */}
      {(isArchiving || isBulkArchiving) && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {isBulkArchiving ? 'Archiving Reservations' : 'Archiving Reservation'}
              </h3>
              <p className="text-gray-600 text-center">
                {isBulkArchiving 
                  ? `Please wait while we archive ${selectedReservations.length} reservations...`
                  : 'Please wait while we archive the reservation...'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminReservations;