import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import StaffNavigation from "./StaffNavigation";
import { Bell, AlertCircle, Calendar, RefreshCw, Eye, X, Clock, CheckCircle, PlayCircle, Users, MapPin, FileText, User, Building, Play, Wrench, AlertTriangle } from "lucide-react";
import ReservationModal from "./Modals/ReservationModal";

function StaffNotifications({ setView, staff }) {
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

  // Normalize floor names
  const normalizeFloor = (str) => {
    if (!str) return "";
    const lower = str.toLowerCase().trim();
    if (lower.includes("ground")) return "ground floor";
    if (lower.includes("first") || lower.includes("1st")) return "1st floor";
    if (lower.includes("second") || lower.includes("2nd")) return "2nd floor";
    if (lower.includes("third") || lower.includes("3rd")) return "3rd floor";
    if (lower.includes("fourth") || lower.includes("4th")) return "4th floor";
    if (lower.includes("fifth") || lower.includes("5th")) return "5th floor";
    return lower;
  };

  // Fetch unread count separately
  const fetchUnreadCount = async () => {
    if (!staff?._id) return;
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications/unread-count/${staff._id}`);
      setUnreadCount(response.data.count || 0);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
      // Fallback: calculate from local state
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

      // Filter reservations by staff floor
      const staffFloor = normalizeFloor(staff.floor);
      const filteredReservations = reservationData.filter(
        reservation => normalizeFloor(reservation.location) === staffFloor
      );

      setReservations(filteredReservations);
      setReportNotifications(reportData);

      // Fetch unread count after loading data
      await fetchUnreadCount();

    } catch (err) {
      console.error("Failed to fetch staff notifications:", err);
      // Fallback: fetch reservations and reports separately if notifications fail
      try {
        const resReservations = await axios.get(`${import.meta.env.VITE_API_URL}/api/reservations`);
        const staffFloor = normalizeFloor(staff.floor);
        const filtered = resReservations.data.filter(
          (reservation) => normalizeFloor(reservation.location) === staffFloor
        );
        
        const reservationsWithReadStatus = filtered.map(res => ({
          ...res,
          isRead: false,
          type: "reservation"
        }));
        
        setReservations(reservationsWithReadStatus);

        const resReports = await axios.get(`${import.meta.env.VITE_API_URL}/api/reports/staff/${staff._id}`);
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

  // Combine reservations and reports into notifications
  useEffect(() => {
    const reservationNotifications = reservations.map(res => ({
      ...res,
      type: "reservation",
      message: `${res.roomName} Reservation - ${res.status}`,
      createdAt: res.createdAt,
      status: res.status,
      isRead: res.isRead || false,
      notificationId: res.notificationId
    }));

    const reportNotificationsFormatted = reportNotifications.map(rep => ({
      ...rep,
      type: "report",
      message: `${rep.category} Report - ${rep.status}`,
      createdAt: rep.createdAt,
      status: rep.status,
      isRead: rep.isRead || false,
      notificationId: rep.notificationId
    }));

    const allNotifications = [...reservationNotifications, ...reportNotificationsFormatted]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let results = [...allNotifications];
    
    if (statusFilter !== "all") {
      results = results.filter(notif => notif.status === statusFilter);
    }
    
    if (unreadOnly) {
      results = results.filter(notif => !notif.isRead);
    }
    
    setFilteredNotifications(results);
  }, [reservations, reportNotifications, statusFilter, unreadOnly]);

  // Mark notification as read - UPDATED to refresh unread count
  const markAsRead = async (notificationId, itemId, itemType) => {
    try {
      // Update local state immediately for better UX
      setFilteredNotifications(prev => prev.map(notif => 
        (notif._id === itemId || notif.notificationId === notificationId) ? { ...notif, isRead: true } : notif
      ));
      
      setReservations(prev => prev.map(res => 
        (res._id === itemId || res.notificationId === notificationId) ? { ...res, isRead: true } : res
      ));
      
      setReportNotifications(prev => prev.map(rep => 
        (rep._id === itemId || rep.notificationId === notificationId) ? { ...rep, isRead: true } : rep
      ));

      // Call backend to mark as read if we have a notification ID
      if (notificationId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/notifications/${notificationId}/read`);
      } else {
        // If no notification ID, try to mark all as read for staff
        await axios.put(`${import.meta.env.VITE_API_URL}/api/notifications/mark-all-read/${staff._id}`);
      }

      // Refresh unread count after marking as read
      await fetchUnreadCount();

    } catch (err) {
      console.error("Failed to mark as read:", err);
      // Keep local state changes even if API fails
      // Update unread count locally
      const currentUnread = unreadCount - 1;
      setUnreadCount(currentUnread >= 0 ? currentUnread : 0);
    }
  };

  // Mark all as read - UPDATED to refresh unread count
  const markAllAsRead = async () => {
    try {
      // Update all local state first
      setFilteredNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
      setReservations(prev => prev.map(res => ({ ...res, isRead: true })));
      setReportNotifications(prev => prev.map(rep => ({ ...rep, isRead: true })));

      // Call API to mark all as read
      await axios.put(`${import.meta.env.VITE_API_URL}/api/notifications/mark-all-read/${staff._id}`);

      // Update unread count to 0
      setUnreadCount(0);

    } catch (err) {
      console.error("Failed to mark all as read:", err);
      // Local state already updated for better UX
      setUnreadCount(0);
    }
  };

  // Refresh data function - UPDATED to include unread count
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

  const statusColor = (status) => {
    switch (status) {
      case "Approved": return "bg-green-100 text-green-800 border-green-200";
      case "Rejected":
      case "Cancelled":
      case "Expired": return "bg-red-100 text-red-800 border-red-200";
      case "Pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "In Progress":
      case "Ongoing": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Resolved": return "bg-green-50 text-green-800 border-green-100";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Pending": return <Clock className="w-4 h-4" />;
      case "In Progress":
      case "Ongoing": return <PlayCircle className="w-4 h-4" />;
      case "Resolved":
      case "Approved": return <CheckCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const updateReportStatus = async (newStatus) => {
    if (!selectedReport) return;
    try {
      setIsProcessing(true);
      
      if (newStatus === "In Progress") {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/reports/${selectedReport._id}/start`, {
          startedBy: staff._id
        });
      } else if (newStatus === "Resolved") {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/reports/${selectedReport._id}/resolve`, {
          actionTaken: "Issue resolved by staff",
          resolvedBy: staff._id
        });
      } else {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/reports/${selectedReport._id}/status`, {
          status: newStatus,
          updatedBy: staff._id
        });
      }
      
      setReportNotifications((prev) =>
        prev.map((r) => (r._id === selectedReport._id ? { ...r, status: newStatus } : r))
      );
      
      const updated = { ...selectedReport, status: newStatus };
      setSelectedReport(updated);

      if (newStatus === "Resolved") {
        setTimeout(() => setSelectedReport(null), 1500);
      }
      
      refreshData();
    } catch (err) {
      console.error("Failed to update report status:", err);
      alert("Failed to update report status. Please try again.");
    } finally {
      setIsProcessing(false);
    }
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

  const handleViewReservations = () => {
    setView("staffReservation");
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setUnreadOnly(false);
  };

  const currentUnreadCount = filteredNotifications.filter(n => !n.isRead).length;

  // Custom SVG Icons
  const ClockIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  const CheckCircleIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const BellIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const BellOffIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.62998 8.62999C8.20998 9.23999 7.99998 9.99999 7.99998 10.83V11C7.99998 15 5.99998 17 5.99998 17H15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17.67 17.67C16.94 17.94 16.02 18 15 18H9C6.5 18 4.5 16 4.5 13.5V10.84C4.5 9.67 4.95 8.55 5.75 7.7L6.07 7.37" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.99998 4.16C9.02998 4.16 9.04998 4.16 9.07998 4.16C9.67998 4.09 10.26 4 10.83 3.85" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14.92 4.16C14.57 3.4 14.02 2.77 13.33 2.33" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 8C19.5304 8 20.0391 8.21071 20.4142 8.58579C20.7893 8.96086 21 9.46957 21 10V11C21 12.66 20.44 14.11 19.5 15.31" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 21L3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const FilterIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CloseIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const EyeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const RefreshIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M23 4V10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1 20V14H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.51 9C4.01717 7.56678 4.87913 6.2854 6.01547 5.27542C7.1518 4.26543 8.52547 3.55976 10.0083 3.22426C11.4911 2.88875 13.0348 2.93434 14.4952 3.35677C15.9556 3.77921 17.2853 4.56471 18.36 5.64L23 10M1 14L5.64 18.36C6.71475 19.4353 8.04437 20.2208 9.50481 20.6432C10.9652 21.0657 12.5089 21.1113 13.9917 20.7757C15.4745 20.4402 16.8482 19.7346 17.9845 18.7246C19.1209 17.7146 19.9828 16.4332 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
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

  const getStatusConfig = (status) => {
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
        <StaffNavigation setView={setView} currentView="staffNotification" staff={staff} unseenCount={unreadCount} />
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
                <div className="animate-pulse space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <div className="flex justify-between">
                        <div className="h-5 bg-gray-200 rounded w-1/4 mb-3"></div>
                        <div className="h-5 bg-gray-200 rounded w-16"></div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
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
        {/* Header - Keeping the same size */}
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
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all cursor-pointer flex-1 sm:flex-none justify-center min-w-[140px] ${
                      unreadOnly 
                        ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {unreadOnly ? <BellOffIcon /> : <BellIcon />}
                    {unreadOnly ? 'Unread Only' : 'All Notifications'}
                  </button>
                  
                  <button 
                    onClick={() => setShowFilterModal(true)}
                    className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all text-sm cursor-pointer flex-1 sm:flex-none justify-center min-w-[100px]"
                  >
                    <FilterIcon />
                    Filter
                  </button>
                  
                  {(statusFilter !== "all" || unreadOnly) && (
                    <button 
                      onClick={clearFilters}
                      className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all text-sm cursor-pointer flex-1 sm:flex-none justify-center min-w-[120px]"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Active filters display */}
              {(statusFilter !== "all" || unreadOnly) && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {statusFilter !== "all" && (
                    <div className="bg-gray-100 px-3 py-1.5 rounded-full text-sm flex items-center gap-1 border border-gray-300">
                      <span className="text-gray-700">Status: {statusFilter}</span>
                      <button 
                        onClick={() => setStatusFilter("all")}
                        className="text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
                      >
                        <CloseIcon />
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
                        <CloseIcon />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Mark all as read button */}
              {currentUnreadCount > 0 && !unreadOnly && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-red-700 font-medium">
                      {currentUnreadCount} unread {currentUnreadCount === 1 ? 'notification' : 'notifications'}
                    </span>
                  </div>
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-red-200 hover:bg-red-50 transition-all cursor-pointer w-full sm:w-auto justify-center"
                  >
                    <CheckCircleIcon />
                    Mark all as read
                  </button>
                </div>
              )}

              {/* Notifications list */}
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="mx-auto text-gray-300 mb-4" style={{ width: '64px', height: '64px' }}>
                    <BellIcon />
                  </div>
                  <p className="text-gray-500 text-base sm:text-lg font-medium mb-2">
                    No notifications found
                  </p>
                  <p className="text-gray-400 text-sm sm:text-base max-w-sm mx-auto">
                    {statusFilter !== "all" || unreadOnly 
                      ? "Try adjusting your filters to see more notifications." 
                      : "You're all caught up! New reservations and reports will appear here."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification._id || notification.notificationId}
                      className={`border rounded-xl p-4 transition-all duration-200 hover:shadow-sm cursor-pointer ${
                        notification.isRead 
                          ? 'bg-white border-gray-200' 
                          : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                      }`}
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
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                            )}
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusColor(notification.status)}`}>
                              {getStatusIcon(notification.status)}
                              {notification.status}
                            </span>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatRelativeTime(notification.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            {notification.type === "reservation" ? (
                              <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            )}
                            <h3 className="font-semibold text-gray-900 truncate">
                              {notification.type === "reservation" 
                                ? `${notification.roomName} Reservation` 
                                : `${notification.category} Report`}
                            </h3>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">
                            {notification.type === "reservation" 
                              ? `${notification.eventName} • ${notification.location}` 
                              : `${notification.details?.substring(0, 100)}${notification.details?.length > 100 ? '...' : ''}`}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <ClockIcon />
                              {formatDateTime(notification.createdAt)}
                            </span>
                            {notification.type === "reservation" && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {notification.attendees || "N/A"} attendees
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!notification.isRead) {
                              markAsRead(notification.notificationId, notification._id, notification.type);
                            }
                            if (notification.type === "reservation") {
                              setSelectedReservation(notification);
                            } else if (notification.type === "report") {
                              setSelectedReport(notification);
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm cursor-pointer flex-shrink-0"
                        >
                          <EyeIcon />
                          View Details
                        </button>
                      </div>
                    </div>
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
                  <CloseIcon />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
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
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="unreadOnly" className="text-sm text-gray-700 cursor-pointer">
                    Show unread notifications only
                  </label>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={clearFilters}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
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

        {/* Report Modal - FIXED to match Report.js schema */}
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
                    <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 text-sm font-medium ${getStatusConfig(selectedReport.status).color}`}>
                      {getStatusConfig(selectedReport.status).icon}
                      {selectedReport.status}
                    </div>
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
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

              {/* Footer - REMOVED BUTTONS */}
              <div className="border-t border-gray-200 bg-gray-50 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Report ID:</span>{" "}
                    <span className="font-mono text-gray-800">{selectedReport?._id?.slice(-8)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium text-sm"
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