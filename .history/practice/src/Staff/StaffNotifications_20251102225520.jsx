import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import StaffNavigation from "./StaffNavigation";
import { Bell, AlertCircle, Calendar, RefreshCw, Eye, X, Clock, CheckCircle, PlayCircle, Users, MapPin, FileText, User, Building, Play, Wrench, AlertTriangle, Search, BellOff } from "lucide-react";
import ReservationModal from "./Modals/ReservationModal";

function StaffNotifications({ setView, staff, onLogout }) {
  const [reservations, setReservations] = useState([]);
  const [reportNotifications, setReportNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Enhanced floor normalization with better matching
  const normalizeFloor = (str) => {
    if (!str) return "";
    const lower = str.toLowerCase().trim();
    
    // Handle common floor naming variations
    if (lower.includes("ground") || lower === "g" || lower === "gf") return "ground floor";
    if (lower.includes("first") || lower.includes("1st") || lower === "1" || lower === "first") return "1st floor";
    if (lower.includes("second") || lower.includes("2nd") || lower === "2" || lower === "second") return "2nd floor";
    if (lower.includes("third") || lower.includes("3rd") || lower === "3" || lower === "third") return "3rd floor";
    if (lower.includes("fourth") || lower.includes("4th") || lower === "4" || lower === "fourth") return "4th floor";
    if (lower.includes("fifth") || lower.includes("5th") || lower === "5" || lower === "fifth") return "5th floor";
    return lower;
  };

  // Color system for consistent UI
  const colors = {
    primary: '#CC0000',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827'
    }
  };

  // Enhanced status configuration
  const statusConfig = {
    Pending: { 
      bg: 'bg-amber-100', 
      text: 'text-amber-800', 
      border: 'border-amber-200',
      icon: <Clock size={14} />
    },
    Approved: { 
      bg: 'bg-green-100', 
      text: 'text-green-800', 
      border: 'border-green-200',
      icon: <CheckCircle size={14} />
    },
    Rejected: { 
      bg: 'bg-red-100', 
      text: 'text-red-800', 
      border: 'border-red-200',
      icon: <X size={14} />
    },
    Cancelled: { 
      bg: 'bg-red-100', 
      text: 'text-red-800', 
      border: 'border-red-200',
      icon: <X size={14} />
    },
    Expired: { 
      bg: 'bg-gray-100', 
      text: 'text-gray-800', 
      border: 'border-gray-200',
      icon: <Clock size={14} />
    },
    "In Progress": { 
      bg: 'bg-blue-100', 
      text: 'text-blue-800', 
      border: 'border-blue-200',
      icon: <Play size={14} />
    },
    Ongoing: { 
      bg: 'bg-blue-100', 
      text: 'text-blue-800', 
      border: 'border-blue-200',
      icon: <Play size={14} />
    },
    Resolved: { 
      bg: 'bg-emerald-100', 
      text: 'text-emerald-800', 
      border: 'border-emerald-200',
      icon: <CheckCircle size={14} />
    }
  };

  // Status Pill Component
  const StatusPill = ({ status }) => {
    const config = statusConfig[status] || statusConfig.Pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
        {config.icon}
        {status}
      </span>
    );
  };

  // Notification Skeleton Component
  const NotificationSkeleton = () => (
    <div className="border border-gray-200 rounded-xl p-4 bg-white animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="h-8 bg-gray-200 rounded w-full"></div>
    </div>
  );

  // Empty State Component
  const EmptyState = () => {
    if (searchQuery) {
      return (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches found</h3>
          <p className="text-gray-500">Try adjusting your search terms or filters</p>
        </div>
      );
    }
    
    if (unreadOnly) {
      return (
        <div className="text-center py-12">
          <BellOff className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No unread notifications</h3>
          <p className="text-gray-500">You're all caught up!</p>
        </div>
      );
    }

    if (statusFilter !== "all") {
      return (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
          <p className="text-gray-500">No {statusFilter.toLowerCase()} notifications found</p>
        </div>
      );
    }

    return (
      <div className="text-center py-12">
        <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications yet</h3>
        <p className="text-gray-500">New reservations and reports will appear here</p>
      </div>
    );
  };

  // Fetch unread count separately
  const fetchUnreadCount = async () => {
    if (!staff?._id) return;
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications/unread-count/${staff._id}`);
      setUnreadCount(response.data.count || 0);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
      const localUnreadCount = filteredNotifications.filter(n => !n.isRead).length;
      setUnreadCount(localUnreadCount);
    }
  };

  const fetchData = async () => {
    if (!staff?._id) return;
    setRefreshing(true);
    try {
      // Get staff notifications from the API
      const resNotifications = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications/staff/${staff._id}`);
      const staffNotifications = resNotifications.data || [];

      console.log("Raw notifications:", staffNotifications); // Debug log

      // Process notifications to extract reservations and reports
      const reservationData = [];
      const reportData = [];

      staffNotifications.forEach(notification => {
        if (notification.reservationId && typeof notification.reservationId === 'object') {
          reservationData.push({
            ...notification.reservationId,
            notificationId: notification._id,
            isRead: notification.isRead || false,
            type: "reservation"
          });
        }
        if (notification.reportId && typeof notification.reportId === 'object') {
          reportData.push({
            ...notification.reportId,
            notificationId: notification._id,
            isRead: notification.isRead || false,
            type: "report"
          });
        }
      });

      console.log("Reservations found:", reservationData); // Debug log
      console.log("Reports found:", reportData); // Debug log

      // Filter reservations by staff floor - FIXED: Don't filter out reservations
      const staffFloor = normalizeFloor(staff.floor);
      console.log("Staff floor:", staff.floor, "Normalized:", staffFloor); // Debug log
      
      const filteredReservations = reservationData.filter(reservation => {
        const reservationFloor = normalizeFloor(reservation.location);
        console.log("Reservation location:", reservation.location, "Normalized:", reservationFloor); // Debug log
        return reservationFloor === staffFloor;
      });

      console.log("Filtered reservations:", filteredReservations); // Debug log

      setReservations(filteredReservations);
      setReportNotifications(reportData);

      // Fetch unread count after loading data
      await fetchUnreadCount();

    } catch (err) {
      console.error("Failed to fetch staff notifications:", err);
      // Fallback: fetch reservations and reports separately if notifications fail
      try {
        const resReservations = await axios.get(`${import.meta.env.VITE_API_URL}/api/reservations`);
        console.log("Fallback reservations:", resReservations.data); // Debug log
        
        const staffFloor = normalizeFloor(staff.floor);
        const filtered = resReservations.data.filter((reservation) => {
          const reservationFloor = normalizeFloor(reservation.location);
          return reservationFloor === staffFloor;
        });
        
        const reservationsWithReadStatus = filtered.map(res => ({
          ...res,
          isRead: false,
          type: "reservation"
        }));
        
        setReservations(reservationsWithReadStatus);

        const resReports = await axios.get(`${import.meta.env.VITE_API_URL}/api/reports/staff/${staff._id}`);
        console.log("Fallback reports:", resReports.data); // Debug log
        
        const reportsWithReadStatus = (resReports.data || []).map(rep => ({
          ...rep,
          isRead: false,
          type: "report"
        }));
        setReportNotifications(reportsWithReadStatus);

        // Calculate unread count from fallback data
        const fallbackUnreadCount = [...reservationsWithReadStatus, ...reportsWithReadStatus]
          .filter(n => !n.isRead).length;
        setUnreadCount(fallbackUnreadCount);

      } catch (fallbackErr) {
        console.error("Fallback fetch also failed:", fallbackErr);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [staff?._id, staff?.floor]);

  // Combine and filter notifications with search
  useEffect(() => {
    const reservationNotifications = reservations.map(res => ({
      ...res,
      type: "reservation",
      message: `${res.roomName} Reservation - ${res.status}`,
      createdAt: res.createdAt,
      status: res.status,
      isRead: res.isRead || false,
      notificationId: res.notificationId,
      searchText: `${res.roomName} ${res.eventName} ${res.location} ${res.status}`.toLowerCase()
    }));

    const reportNotificationsFormatted = reportNotifications.map(rep => ({
      ...rep,
      type: "report",
      message: `${rep.category} Report - ${rep.status}`,
      createdAt: rep.createdAt,
      status: rep.status,
      isRead: rep.isRead || false,
      notificationId: rep.notificationId,
      searchText: `${rep.category} ${rep.details} ${rep.status} ${rep.floor} ${rep.room}`.toLowerCase()
    }));

    const allNotifications = [...reservationNotifications, ...reportNotificationsFormatted]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log("All notifications:", allNotifications); // Debug log

    let results = [...allNotifications];
    
    // Apply search filter
    if (searchQuery) {
      results = results.filter(notif => 
        notif.searchText.includes(searchQuery.toLowerCase())
      );
    }
    
    if (statusFilter !== "all") {
      results = results.filter(notif => notif.status === statusFilter);
    }
    
    if (unreadOnly) {
      results = results.filter(notif => !notif.isRead);
    }
    
    setFilteredNotifications(results);
  }, [reservations, reportNotifications, statusFilter, unreadOnly, searchQuery]);

  // Mark notification as read
  const markAsRead = async (notificationId, itemId, itemType) => {
    try {
      setFilteredNotifications(prev => prev.map(notif => 
        (notif._id === itemId || notif.notificationId === notificationId) ? { ...notif, isRead: true } : notif
      ));
      
      setReservations(prev => prev.map(res => 
        (res._id === itemId || res.notificationId === notificationId) ? { ...res, isRead: true } : res
      ));
      
      setReportNotifications(prev => prev.map(rep => 
        (rep._id === itemId || rep.notificationId === notificationId) ? { ...rep, isRead: true } : rep
      ));

      if (notificationId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/notifications/${notificationId}/read`);
      } else {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/notifications/mark-all-read/${staff._id}`);
      }

      await fetchUnreadCount();

    } catch (err) {
      console.error("Failed to mark as read:", err);
      const currentUnread = unreadCount - 1;
      setUnreadCount(currentUnread >= 0 ? currentUnread : 0);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      setFilteredNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
      setReservations(prev => prev.map(res => ({ ...res, isRead: true })));
      setReportNotifications(prev => prev.map(rep => ({ ...rep, isRead: true })));

      await axios.put(`${import.meta.env.VITE_API_URL}/api/notifications/mark-all-read/${staff._id}`);
      setUnreadCount(0);

    } catch (err) {
      console.error("Failed to mark all as read:", err);
      setUnreadCount(0);
    }
  };

  // Refresh data function
  const refreshData = async () => {
    await fetchData();
    await fetchUnreadCount();
  };

  const formatDateTime = (dt) =>
    new Date(dt).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const formatRelativeTime = (date) => {
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return formatDateTime(date);
  };

  const handleApproveReservation = async (reservationId) => {
    setIsProcessing(true);
    setProcessingAction('approve');
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/reservations/${reservationId}/status`, {
        status: "Approved"
      });
      setReservations(prev => prev.map(res => 
        res._id === reservationId ? { ...res, status: "Approved" } : res
      ));
      setSelectedReservation(prev => prev ? { ...prev, status: "Approved" } : null);
      refreshData();
    } catch (err) {
      console.error("Failed to approve reservation:", err);
      alert("Failed to approve reservation. Please try again.");
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleRejectReservation = async (reservationId) => {
    setIsProcessing(true);
    setProcessingAction('reject');
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/reservations/${reservationId}/status`, {
        status: "Rejected"
      });
      setReservations(prev => prev.map(res => 
        res._id === reservationId ? { ...res, status: "Rejected" } : res
      ));
      setSelectedReservation(prev => prev ? { ...prev, status: "Rejected" } : null);
      refreshData();
    } catch (err) {
      console.error("Failed to reject reservation:", err);
      alert("Failed to reject reservation. Please try again.");
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setUnreadOnly(false);
    setSearchQuery("");
  };

  const currentUnreadCount = filteredNotifications.filter(n => !n.isRead).length;

  // Enhanced Notification Card Component - REMOVED LEFT BORDER
  const NotificationCard = ({ notification }) => (
    <div
      className={`
        relative p-4 rounded-xl transition-all duration-200 group
        ${notification.isRead ? 'bg-white border border-gray-200' : 'bg-blue-50 border border-blue-200'}
        hover:shadow-md cursor-pointer min-h-[120px] flex flex-col justify-center
      `}
      onClick={() => {
        if (!notification.isRead) {
          markAsRead(notification.notificationId, notification._id, notification.type);
        }
        if (notification.type === "reservation") {
          setSelectedReservation(notification);
        } else if (notification.type === "report") {
          setSelectedReport(notification);
        }
      }}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
      )}
      
      <div className="flex gap-3">
        {/* Icon with type-based coloring */}
        <div className={`
          p-2 rounded-lg flex-shrink-0 self-start mt-1
          ${notification.type === 'reservation' ? 'bg-blue-100' : 'bg-red-100'}
        `}>
          {notification.type === 'reservation' ? 
            <Calendar className="w-5 h-5 text-blue-600" /> : 
            <AlertTriangle className="w-5 h-5 text-red-600" />
          }
        </div>
        
        {/* Content area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 text-base leading-tight">
              {notification.type === 'reservation' ? 
                `${notification.roomName} Reservation` : 
                `${notification.category} Report`
              }
            </h3>
            <span className="text-sm text-gray-500 flex-shrink-0 ml-2">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </div>
          
          <p className="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed">
            {notification.type === 'reservation' ? 
              notification.eventName : 
              notification.details?.substring(0, 120) + (notification.details?.length > 120 ? '...' : '')
            }
          </p>
          
          <div className="flex items-center justify-between">
            <StatusPill status={notification.status} />
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 transition-colors">
              View Details
              <Eye size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Helper functions for the new report modal
  const formatPHDateTime = (iso) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getModalStatusConfig = (status) => {
    const configs = {
      Pending: { 
        color: "bg-amber-100 text-amber-800 border-amber-200", 
        icon: <Clock size={16} />,
      },
      "In Progress": { 
        color: "bg-blue-100 text-blue-800 border-blue-200", 
        icon: <Play size={16} />,
      },
      Resolved: { 
        color: "bg-emerald-100 text-emerald-800 border-emerald-200", 
        icon: <CheckCircle size={16} />,
      },
      Archived: { 
        color: "bg-gray-100 text-gray-800 border-gray-300", 
        icon: <X size={16} />,
      }
    };
    return configs[status] || configs.Pending;
  };

  const InfoCard = ({ title, value, icon, subtitle }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
          {icon}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <>
<StaffNavigation setView={setView} currentView="staffNotification" staff={staff} onLogout={onLogout} />     
   <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50 flex flex-col">
          <header className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-[#CC0000]">
                  Staff Notifications
                </h1>
                <p className="text-gray-600">
                  Reservations and Reports assigned to you
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

          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <NotificationSkeleton key={i} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <StaffNavigation setView={setView} currentView="staffNotification" staff={staff} unseenCount={unreadCount} />
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#CC0000]">
                Staff Notifications
              </h1>
              <p className="text-gray-600">
                Reservations and Reports assigned to you
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

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto w-full">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
             

              {/* Header with stats and filters */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${currentUnreadCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                    <span className="text-sm text-gray-600">
                      {currentUnreadCount} unread {currentUnreadCount === 1 ? 'notification' : 'notifications'}
                    </span>
                  </div>
                </div>
                
              
                
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setUnreadOnly(!unreadOnly)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all cursor-pointer min-h-[44px] flex-1 lg:flex-none justify-center min-w-[140px] ${
                      unreadOnly 
                        ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {unreadOnly ? <BellOff size={16} /> : <Bell size={16} />}
                    {unreadOnly ? 'Unread Only' : 'All Notifications'}
                  </button>
                  
                  <button 
                    onClick={() => setShowFilterModal(true)}
                    className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all text-sm cursor-pointer min-h-[44px] flex-1 lg:flex-none justify-center min-w-[100px]"
                  >
                    <Wrench size={16} />
                    Filter
                  </button>
                  
                  {(statusFilter !== "all" || unreadOnly || searchQuery) && (
                    <button 
                      onClick={clearFilters}
                      className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all text-sm cursor-pointer min-h-[44px] flex-1 lg:flex-none justify-center min-w-[120px]"
                    >
                      <X size={16} />
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Active filters display */}
              {(statusFilter !== "all" || unreadOnly || searchQuery) && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {searchQuery && (
                    <div className="bg-gray-100 px-3 py-1.5 rounded-full text-sm flex items-center gap-1 border border-gray-300">
                      <span className="text-gray-700">Search: "{searchQuery}"</span>
                      <button 
                        onClick={() => setSearchQuery("")}
                        className="text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {statusFilter !== "all" && (
                    <div className="bg-gray-100 px-3 py-1.5 rounded-full text-sm flex items-center gap-1 border border-gray-300">
                      <span className="text-gray-700">Status: {statusFilter}</span>
                      <button 
                        onClick={() => setStatusFilter("all")}
                        className="text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {unreadOnly && (
                    <div className="bg-gray-100 px-3 py-1.5 rounded-full text-sm flex items-center gap-1 border border-gray-300">
                      <span className="text-gray-700">Unread Only</span>
                      <button 
                        onClick={() => setUnreadOnly(false)}
                        className="text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Mark all as read button */}
              {currentUnreadCount > 0 && !unreadOnly && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-blue-700 font-medium">
                      {currentUnreadCount} unread {currentUnreadCount === 1 ? 'notification' : 'notifications'}
                    </span>
                  </div>
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-blue-200 hover:bg-blue-50 transition-all cursor-pointer w-full sm:w-auto justify-center"
                  >
                    <CheckCircle size={16} />
                    Mark all as read
                  </button>
                </div>
              )}

              {/* Notifications list */}
              {filteredNotifications.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-4">
                  {filteredNotifications.map((notification) => (
                    <NotificationCard 
                      key={notification._id || notification.notificationId} 
                      notification={notification} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Modal */}
        {showFilterModal && (
          <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Filter Notifications</h3>
                <button 
                  onClick={() => setShowFilterModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer min-h-[44px]"
                  >
                    <option value="all">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="unreadOnly"
                    checked={unreadOnly}
                    onChange={(e) => setUnreadOnly(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer min-h-[44px]"
                  />
                  <label htmlFor="unreadOnly" className="text-sm text-gray-700 cursor-pointer">
                    Show unread notifications only
                  </label>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={clearFilters}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer min-h-[44px]"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer min-h-[44px]"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reservation Modal */}
        {selectedReservation && (
          <ReservationModal
            reservation={selectedReservation}
            onClose={() => setSelectedReservation(null)}
            onApprove={handleApproveReservation}
            onReject={handleRejectReservation}
            isProcessing={isProcessing}
            processingAction={processingAction}
          />
        )}

        {/* Report Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200">
              {/* Header */}
              <div className="bg-white p-6 border-b border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center border border-red-300">
                      <AlertTriangle size={24} className="text-red-600" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-1">Report Details</h1>
                      <div className="flex items-center gap-3 text-gray-600">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Building size={16} />
                          {selectedReport.floor} • {selectedReport.room}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar size={16} />
                          {selectedReport.createdAt ? formatPHDateTime(selectedReport.createdAt) : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 text-sm font-medium ${getModalStatusConfig(selectedReport.status).color}`}>
                      {getModalStatusConfig(selectedReport.status).icon}
                      {selectedReport.status}
                    </div>
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-50">
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InfoCard
                      title="Category"
                      value={selectedReport.category || "N/A"}
                      icon={<FileText size={20} />}
                      subtitle="Issue type"
                    />
                    <InfoCard
                      title="Reported By"
                      value={selectedReport.reportedBy || "N/A"}
                      icon={<User size={20} />}
                      subtitle="Reporter"
                    />
                    <InfoCard
                      title="Status"
                      value={selectedReport.status || "N/A"}
                      icon={<AlertCircle size={20} />}
                      subtitle="Current status"
                    />
                  </div>

                  {/* Location & Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Location Card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <MapPin size={20} className="text-gray-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Location Details</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2">
                          <span className="text-gray-600">Floor</span>
                          <span className="font-semibold text-gray-900">{selectedReport.floor || "N/A"}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-gray-600">Room</span>
                          <span className="font-semibold text-gray-900">{selectedReport.room || "N/A"}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-gray-600">Date Reported</span>
                          <span className="font-semibold text-gray-900">{formatPHDateTime(selectedReport.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Issue Details Card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <AlertTriangle size={20} className="text-gray-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Issue Details</h3>
                      </div>
                      <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-200">
                        {selectedReport.details || "No description provided"}
                      </p>
                    </div>
                  </div>

                  {/* Action Taken (if resolved) */}
                  {selectedReport.status === "Resolved" && selectedReport.actionTaken && (
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle size={20} className="text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Action Taken</h3>
                      </div>
                      <p className="text-gray-700 leading-relaxed bg-green-50 p-4 rounded-lg border border-green-200">
                        {selectedReport.actionTaken}
                      </p>
                      {selectedReport.resolvedAt && (
                        <div className="mt-3 text-sm text-gray-500">
                          Resolved on: {formatPHDateTime(selectedReport.resolvedAt)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 bg-gray-50 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Report ID:</span>{" "}
                    <span className="font-mono text-gray-800">{selectedReport?._id?.slice(-8)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium text-sm min-h-[44px]"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default StaffNotifications;