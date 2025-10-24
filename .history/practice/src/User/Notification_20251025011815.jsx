import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import socket from "../utils/socket";

function Notification({ user, setView, setSelectedReservation }) {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await axios.get(`http://localhost:5000/api/notifications/user/${user._id}`);
      const sorted = res.data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setNotifications(sorted);
      console.log("📬 Notifications fetched:", sorted.length);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [user._id]);

  useEffect(() => {
    if (!user?._id) return;

    let isSubscribed = true;

    const initializeSocket = async () => {
      try {
        await fetchNotifications();

        console.log("🔔 Joining user room:", user._id);
        socket.emit('join-user-room', user._id);

        const handleNewNotification = (newNotif) => {
          if (!isSubscribed) return;
          
          console.log("🎯 New notification received via socket:", newNotif);
          
          const isForCurrentUser = 
            newNotif.userId === user._id || 
            newNotif.userId?._id === user._id ||
            newNotif.targetRole === 'user' ||
            newNotif.targetRole === 'all';
          
          if (isForCurrentUser) {
            console.log("🔄 Auto-refreshing notifications for current user");
            fetchNotifications();
            
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Notification', {
                body: newNotif.message,
                icon: '/favicon.ico'
              });
            }
          } else {
            console.log("❌ Notification not for current user:", {
              notificationUserId: newNotif.userId,
              currentUserId: user._id,
              targetRole: newNotif.targetRole
            });
          }
        };

        const handleNotificationsRead = () => {
          if (!isSubscribed) return;
          console.log("📖 Notifications read event received");
          fetchNotifications();
        };

        const handleUserUpdated = (updatedUser) => {
          if (!isSubscribed) return;
          console.log("👤 User updated event received:", updatedUser);
          // If the updated user is the current user, refresh notifications
          if (updatedUser._id === user._id) {
            fetchNotifications();
          }
        };

        const handleConnect = () => {
          if (!isSubscribed) return;
          console.log("✅ Socket connected in Notification component");
          setSocketConnected(true);
          socket.emit('join-user-room', user._id);
        };

        const handleDisconnect = () => {
          if (!isSubscribed) return;
          console.log("❌ Socket disconnected in Notification component");
          setSocketConnected(false);
        };

        // Add error handler
        const handleError = (error) => {
          console.error("❌ Socket error:", error);
        };

        // Register all event listeners
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('error', handleError);
        socket.on('new-notification', handleNewNotification);
        socket.on('notification', handleNewNotification);
        socket.on('notifications-read', handleNotificationsRead);
        socket.on('user-updated', handleUserUpdated); // Listen for user updates too

        setSocketConnected(socket.connected);

      } catch (error) {
        console.error('Error initializing socket:', error);
        setLoading(false);
        setRefreshing(false);
      }
    };

    initializeSocket();

    return () => {
      isSubscribed = false;
      console.log("🧹 Cleaning up socket listeners for user:", user._id);
      
      socket.off('connect');
      socket.off('disconnect');
      socket.off('error');
      socket.off('new-notification');
      socket.off('notification');
      socket.off('notifications-read');
      socket.off('user-updated');
      
      socket.emit('leave-user-room', user._id);
    };
  }, [user, fetchNotifications]);

  useEffect(() => {
    let results = [...notifications];
    
    if (statusFilter !== "all") {
      results = results.filter(notif => notif.status === statusFilter);
    }
    
    if (unreadOnly) {
      results = results.filter(notif => !notif.isRead);
    }
    
    setFilteredNotifications(results);
  }, [notifications, statusFilter, unreadOnly]);

  const markAsRead = async (id) => {
    try {
      await axios.put(`http://localhost:5000/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(notif => 
        notif._id === id ? { ...notif, isRead: true } : notif
      ));
      
      if (socketConnected) {
        socket.emit("notification-read", { notificationId: id, userId: user._id });
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`http://localhost:5000/api/notifications/mark-all-read/${user._id}`);
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
      
      if (socketConnected) {
        socket.emit("all-notifications-read", { userId: user._id });
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // Add a manual refresh function
  const handleManualRefresh = () => {
    console.log("🔄 Manual refresh triggered");
    fetchNotifications();
  };

  const formatDateTime = (date) =>
    new Date(date).toLocaleString("en-PH", {
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
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDateTime(date);
  };

  const statusColor = (status) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "Rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      case "Expired":
        return "bg-red-100 text-red-800 border-red-200";
      case "Ongoing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Verified":
        return "bg-green-100 text-green-800 border-green-200";
      case "Unverified":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setUnreadOnly(false);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Function to remove "New" from notification messages
  const cleanNotificationMessage = (message) => {
    return message.replace(/\bNew\b\s*/gi, '').trim();
  };

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

  if (loading) {
    return (
      <main className="w-full min-h-screen flex flex-col bg-gray-50 lg:ml-[250px] lg:w-[calc(100%-250px)]">
        <header className="text-black px-4 sm:px-6 h-[60px] flex items-center justify-between shadow-sm bg-white">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wide">Notifications</h1>
        </header>

        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto w-full">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
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
    );
  }

  return (
    <main className="w-full min-h-screen flex flex-col bg-gray-50 lg:ml-[250px] lg:w-[calc(100%-250px)]">
      <header className="text-black px-4 sm:px-6 h-[60px] flex items-center justify-between shadow-sm bg-white">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wide">Notifications</h1>
       
      </header>

      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${unreadCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span className="text-sm text-gray-600">
                    {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
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

            {unreadCount > 0 && !unreadOnly && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-700 font-medium">
                    {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
                  </span>
                </div>
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-blue-200 hover:bg-blue-50 transition-all cursor-pointer w-full sm:w-auto justify-center"
                >
                  <CheckCircleIcon />
                  Mark all as read
                </button>
              </div>
            )}

            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="mx-auto text-gray-300 mb-4" style={{ width: '64px', height: '64px' }}>
                  <BellIcon />
                </div>
                <p className="text-gray-500 text-base sm:text-lg mb-2">
                  {notifications.length === 0 
                    ? "You don't have any notifications yet." 
                    : "No notifications match your filters."}
                </p>
                <p className="text-gray-400 text-xs sm:text-sm mb-4">
                  {notifications.length === 0 
                    ? "Notifications about your reservations and reports will appear here." 
                    : "Try adjusting your filters to see more results."}
                </p>
                {(statusFilter !== "all" || unreadOnly) && (
                  <button 
                    onClick={clearFilters}
                    className="text-blue-600 font-medium hover:text-blue-800 transition-all flex items-center gap-1 mx-auto cursor-pointer hover:underline"
                  >
                    Clear filters
                    <CloseIcon />
                  </button>
                )}
              </div>
            ) : (
              <ul className="space-y-3">
                {filteredNotifications.map((notif) => (
                  <li
                    key={notif._id}
                    className={`border rounded-xl p-4 transition-all duration-300 ${
                      notif.isRead 
                        ? "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm" 
                        : "bg-blue-50 border-blue-200 hover:border-blue-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                          <h3 className={`font-medium text-sm leading-relaxed ${notif.isRead ? 'text-gray-800' : 'text-gray-900'}`}>
                            {cleanNotificationMessage(notif.message)}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0 sm:ml-2">
                            <span
                              className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-semibold border ${statusColor(
                                notif.status
                              )}`}
                            >
                              {notif.status}
                            </span>
                            {!notif.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center text-xs text-gray-500 gap-1 mb-2">
                          <ClockIcon />
                          {formatRelativeTime(notif.createdAt)}
                          {formatRelativeTime(notif.createdAt).includes("ago") && (
                            <span className="text-gray-400 hidden sm:inline">• {formatDateTime(notif.createdAt)}</span>
                          )}
                        </div>

                        {!notif.isRead && (
                          <button
                            onClick={() => markAsRead(notif._id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mt-2 cursor-pointer hover:underline transition-colors"
                          >
                            <CheckCircleIcon />
                            Mark as read
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 items-start sm:items-end shrink-0">
                        {notif.reservationId && (
                          <button
                            onClick={() => {
                              setSelectedReservation(notif.reservationId);
                              setView("reservationDetails");
                              if (!notif.isRead) {
                                markAsRead(notif._id);
                              }
                            }}
                            className="text-blue-600 text-sm font-medium hover:text-blue-800 flex items-center gap-1 whitespace-nowrap px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all cursor-pointer border border-transparent hover:border-blue-200 w-full sm:w-auto justify-center"
                          >
                            <EyeIcon />
                            View Details
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <FilterIcon />
                  <h3 className="text-lg font-bold text-gray-800">Filter Notifications</h3>
                </div>
                <button 
                  onClick={() => setShowFilterModal(false)}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 cursor-pointer transition-all"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Filter by Status</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {["all", "Approved", "Pending", "Rejected", "Cancelled", "Ongoing", "Expired", "Verified", "Unverified"].map(status => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-2 rounded-lg text-sm border transition-all cursor-pointer ${
                          statusFilter === status 
                            ? status === "all" 
                              ? "bg-blue-100 text-blue-800 border-blue-300" 
                              : statusColor(status) + " border-current"
                            : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                        }`}
                      >
                        {status === "all" ? "All Statuses" : status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="text-sm font-medium text-gray-700">Show only unread</label>
                  <button
                    onClick={() => setUnreadOnly(!unreadOnly)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all cursor-pointer ${
                      unreadOnly ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all ${
                      unreadOnly ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3 pt-5 border-t border-gray-200">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all cursor-pointer order-2 sm:order-1"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium cursor-pointer order-1 sm:order-2"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Notification;