import { useEffect, useState, useRef } from "react";
import socket from "../utils/socket";
import api from "../utils/api";
import Logo from "../assets/logo3.png";
import AnnouncementModal from "./Modals/AnnouncementModal";
import {
  LayoutDashboard,
  History,
  Bell,
  MessageSquare,
  UserCircle,
  LogOut,
  Calendar as CalendarIcon,
  HelpCircle,
  Menu,
  X,
  AlertTriangle,
} from "lucide-react";

function Navigation_User({ user: initialUser, setView, currentView, onLogout }) {
  const [user, setUser] = useState(initialUser);
  const [imgTimestamp, setImgTimestamp] = useState(Date.now());
  const [unreadCounts, setUnreadCounts] = useState({
    notifications: 0,
    messages: 0,
  });
  const [showHelp, setShowHelp] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [suspensionData, setSuspensionData] = useState(null);
  
  // ANNOUNCEMENT STATES
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);

  // 🔊 Notification sound — uses /ringtone_message.wav from public folder
  const messageSound = useRef(null);
  
  // FIXED: Use ref to track if socket listeners are set up
  const socketListenersSet = useRef(false);
  
  useEffect(() => {
    // Create audio element only when needed and hide it
    messageSound.current = new Audio("/ringtone_message.wav");
    messageSound.current.volume = 0.75;
    
    // Hide audio element from accessibility and visual display
    if (messageSound.current) {
      messageSound.current.style.display = 'none';
      messageSound.current.setAttribute('aria-hidden', 'true');
      messageSound.current.controls = false;
    }
    
    return () => {
      // Cleanup
      if (messageSound.current) {
        messageSound.current.pause();
        messageSound.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setUser(initialUser);
    
    // Check if user is suspended when component mounts or user changes
    if (initialUser?.suspended) {
      setSuspensionData({
        reason: initialUser.suspensionReason || 'Violation of terms of service',
        duration: initialUser.suspensionDuration || 'Indefinite',
        suspendedUntil: initialUser.suspendedUntil || null,
      });
      setShowSuspensionModal(true);
    }
  }, [initialUser]);

  // Play sound function with better error handling
  const playNotificationSound = () => {
    try {
      if (messageSound.current) {
        messageSound.current.currentTime = 0;
        messageSound.current.play().catch((error) => {
          // Silent fail - don't show errors to user
          console.log("Audio play failed (user gesture required):", error);
        });
      }
    } catch (error) {
      // Silent fail
      console.log("Audio error:", error);
    }
  };

  const fetchUnreadCounts = async () => {
    if (!initialUser?._id) {
      console.warn('No user ID available for fetching unread counts');
      return;
    }

    try {
      console.log('🔔 Fetching unread counts for user:', initialUser._id);
      
      // Use Promise.allSettled to handle individual failures
      const [messageResult, notificationResult] = await Promise.allSettled([
        api.get(`/messages/unread-count/${initialUser._id}`),
        api.get(`/notifications/unread-count/${initialUser._id}`)
      ]);

      let messageCount = 0;
      let notificationCount = 0;

      // Handle message count result
      if (messageResult.status === 'fulfilled') {
        const messageData = messageResult.value.data;
        messageCount = messageData.count || messageData.unreadCount || 0;
        console.log('✅ Message count fetched:', messageCount);
      } else {
        console.error('❌ Message count fetch failed:', messageResult.reason);
        // Fallback: try alternative endpoint
        try {
          const fallbackResponse = await api.get(`/messages/user/${initialUser._id}`);
          if (fallbackResponse.data) {
            const messages = Array.isArray(fallbackResponse.data) ? fallbackResponse.data : 
                           fallbackResponse.data.messages || [];
            messageCount = messages.filter(msg => !msg.read).length;
            console.log('✅ Message count (fallback):', messageCount);
          }
        } catch (fallbackError) {
          console.error('❌ Fallback message count also failed:', fallbackError);
        }
      }

      // Handle notification count result
      if (notificationResult.status === 'fulfilled') {
        const notificationData = notificationResult.value.data;
        notificationCount = notificationData.count || notificationData.unreadCount || 0;
        console.log('✅ Notification count fetched:', notificationCount);
      } else {
        console.error('❌ Notification count fetch failed:', notificationResult.reason);
        // Fallback: try alternative endpoint
        try {
          const fallbackResponse = await api.get(`/notifications/user/${initialUser._id}`);
          if (fallbackResponse.data) {
            const notifications = Array.isArray(fallbackResponse.data) ? fallbackResponse.data : 
                                fallbackResponse.data.notifications || [];
            notificationCount = notifications.filter(notif => !notif.read).length;
            console.log('✅ Notification count (fallback):', notificationCount);
          }
        } catch (fallbackError) {
          console.error('❌ Fallback notification count also failed:', fallbackError);
        }
      }

      console.log('📊 Final unread counts:', { 
        messages: messageCount, 
        notifications: notificationCount 
      });

      setUnreadCounts({
        notifications: notificationCount,
        messages: messageCount,
      });

    } catch (err) {
      console.error("❌ Overall unread counts fetch failed:", err);
      // Set fallback values if API fails
      setUnreadCounts({
        notifications: 0,
        messages: 0,
      });
    }
  };

  const fetchUserData = async () => {
    try {
      const { data: userData } = await api.get(`/users/${initialUser._id}`);
      const updatedUser = userData.user ?? userData;
      setUser(updatedUser);
      setImgTimestamp(Date.now());

      // Check for suspension after fetching user data
      if (updatedUser.suspended) {
        setSuspensionData({
          reason: updatedUser.suspensionReason || 'Violation of terms of service',
          duration: updatedUser.suspensionDuration || 'Indefinite',
          suspendedUntil: updatedUser.suspendedUntil || null,
        });
        setShowSuspensionModal(true);
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
    }
  };

  const fetchData = async () => {
    await Promise.all([
      fetchUserData(),
      fetchUnreadCounts()
    ]);
  };

  // ANNOUNCEMENT FUNCTIONS
  const fetchAnnouncements = async () => {
    try {
      // Pass user ID as query parameter instead of relying on auth
      const response = await api.get(`/announcements/active?userId=${initialUser?._id}&userRole=${initialUser?.role || 'student'}`);
      if (response.data.success && response.data.announcements.length > 0) {
        setAnnouncements(response.data.announcements);
        setShowAnnouncementModal(true);
        setCurrentAnnouncementIndex(0);
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    }
  };

  const handleDismissAnnouncement = async (announcementId) => {
    try {
      // Pass user ID in request body instead of relying on auth
      await api.post(`/announcements/${announcementId}/dismiss`, { userId: user?._id });
      
      // Remove from local state
      setAnnouncements(prev => prev.filter(ann => ann._id !== announcementId));
      
      // If no more announcements, close modal
      if (announcements.length <= 1) {
        setShowAnnouncementModal(false);
      } else {
        // Move to next announcement
        setCurrentAnnouncementIndex(0);
      }
    } catch (error) {
      console.error('Failed to dismiss announcement:', error);
    }
  };

  const handleNextAnnouncement = () => {
    if (currentAnnouncementIndex < announcements.length - 1) {
      setCurrentAnnouncementIndex(prev => prev + 1);
    } else {
      setShowAnnouncementModal(false);
    }
  };

  const handleCloseAllAnnouncements = () => {
    // Dismiss all announcements
    announcements.forEach(announcement => {
      handleDismissAnnouncement(announcement._id);
    });
    setShowAnnouncementModal(false);
  };

  // FIXED: Setup socket listeners only once
  const setupSocketListeners = () => {
    if (socketListenersSet.current) return;
    
    console.log('🔌 Setting up socket listeners for Navigation_User');

    const handleUserUpdate = (updatedId) => {
      if (updatedId === initialUser?._id) {
        console.log('🔄 User update received, refreshing data...');
        fetchData();
      }
    };
    
    const handleUserSuspended = (suspendedUserId, suspensionInfo) => {
      if (suspendedUserId === initialUser?._id) {
        setSuspensionData({
          reason: suspensionInfo.reason || 'Violation of terms of service',
          duration: suspensionInfo.duration || 'Indefinite',
          suspendedUntil: suspensionInfo.suspendedUntil || null,
        });
        setShowSuspensionModal(true);
      }
    };
    
    const handleUserUnsuspended = (unsuspendedUserId) => {
      if (unsuspendedUserId === initialUser?._id) {
        setShowSuspensionModal(false);
        setSuspensionData(null);
      }
    };
    
    // FIXED: Improved notification handler
    const handleNewNotification = (newNotif) => {
      if (newNotif.userId === initialUser?._id || newNotif.targetRole === 'user' || newNotif.targetRole === 'all') {
        console.log('🆕 New notification received:', newNotif);
        setUnreadCounts((prev) => ({
          ...prev,
          notifications: prev.notifications + 1,
        }));
        
        // Play sound for new notifications
        if (currentView !== "notification") {
          playNotificationSound();
        }
      }
    };
    
    const handleNewMessage = () => {
      console.log('🆕 New message received, refreshing counts...');
      // FIXED: Don't increment locally, fetch fresh data from server
      fetchUnreadCounts();
      
      // 🔊 Play sound when receiving new messages while NOT on messages page
      if (currentView !== "messages") {
        playNotificationSound();
      }
    };
    
    // FIXED: Handle notifications read event (when user manually marks as read in Notification component)
    const handleReadNotifications = (data) => {
      if (data.userId === initialUser?._id) {
        console.log('📭 Notifications read event received in Navigation');
        fetchUnreadCounts(); // Refresh counts from server
      }
    };
    
    // FIXED: Handle messages read event
    const handleReadMessages = () => {
      console.log('📭 Messages read event received');
      setUnreadCounts((prev) => ({ ...prev, messages: 0 }));
    };

    // FIXED: Handle unread count updates from socket
    const handleUnreadCountUpdate = (data) => {
      console.log('🔢 Unread count update received in Navigation:', data);
      if (data.userId === initialUser?._id) {
        setUnreadCounts(prev => ({
          ...prev,
          messages: data.count || 0
        }));
      }
    };

    // FIXED: Handle refresh unread counts event
    const handleRefreshUnreadCounts = (data) => {
      if (data.userId === initialUser?._id) {
        console.log('🔄 Refresh unread counts event received');
        fetchUnreadCounts();
      }
    };

    // FIXED: Handle unread-counts-updated event (from mark-as-read functions)
    const handleUnreadCountsUpdated = () => {
      console.log('🔄 Unread counts updated event received in Navigation');
      fetchUnreadCounts();
    };

    // ANNOUNCEMENT SOCKET HANDLERS
    const handleNewAnnouncement = (announcement) => {
      setAnnouncements(prev => [announcement, ...prev]);
      setShowAnnouncementModal(true);
      setCurrentAnnouncementIndex(0);
    };
    
    const handleAnnouncementUpdate = (updatedAnnouncement) => {
      setAnnouncements(prev => 
        prev.map(ann => 
          ann._id === updatedAnnouncement._id ? updatedAnnouncement : ann
        )
      );
    };
    
    const handleAnnouncementDelete = (deletedId) => {
      setAnnouncements(prev => prev.filter(ann => ann._id !== deletedId));
    };

    // Set up all socket listeners
    socket.on("user-updated", handleUserUpdate);
    socket.on("user-suspended", handleUserSuspended);
    socket.on("user-unsuspended", handleUserUnsuspended);
    socket.on("new-notification", handleNewNotification);
    socket.on("notification", handleNewNotification); // Added for your notification system
    socket.on("new-message", handleNewMessage);
    socket.on("notifications-read", handleReadNotifications); // FIXED: Listen for notifications read events
    socket.on("messages-read", handleReadMessages);
    
    // FIXED: Add all the unread count update handlers
    socket.on("unreadCountUpdate", handleUnreadCountUpdate);
    socket.on("refresh-unread-counts", handleRefreshUnreadCounts);
    socket.on("unread-counts-updated", handleUnreadCountsUpdated);
    
    // ANNOUNCEMENT SOCKET EVENTS
    socket.on('new-announcement', handleNewAnnouncement);
    socket.on('announcement-updated', handleAnnouncementUpdate);
    socket.on('announcement-deleted', handleAnnouncementDelete);

    socketListenersSet.current = true;

    // Return cleanup function
    return () => {
      console.log('🧹 Cleaning up Navigation_User socket listeners');
      socket.off("user-updated", handleUserUpdate);
      socket.off("user-suspended", handleUserSuspended);
      socket.off("user-unsuspended", handleUserUnsuspended);
      socket.off("new-notification", handleNewNotification);
      socket.off("notification", handleNewNotification); // Added for your notification system
      socket.off("new-message", handleNewMessage);
      socket.off("notifications-read", handleReadNotifications);
      socket.off("messages-read", handleReadMessages);
      
      // FIXED: Remove all unread count update handlers
      socket.off("unreadCountUpdate", handleUnreadCountUpdate);
      socket.off("refresh-unread-counts", handleRefreshUnreadCounts);
      socket.off("unread-counts-updated", handleUnreadCountsUpdated);
      
      // ANNOUNCEMENT SOCKET CLEANUP
      socket.off('new-announcement', handleNewAnnouncement);
      socket.off('announcement-updated', handleAnnouncementUpdate);
      socket.off('announcement-deleted', handleAnnouncementDelete);
      
      socketListenersSet.current = false;
    };
  };

  // FIXED: Optimized useEffect hooks for better performance
  useEffect(() => {
    if (initialUser?._id) {
      console.log('👤 User ID available, fetching initial data...');
      fetchData();
      fetchAnnouncements();

      // Setup socket listeners and get cleanup function
      const cleanupSocketListeners = setupSocketListeners();

      // Return cleanup function
      return cleanupSocketListeners;
    } else {
      console.log('⏳ User ID not available yet, skipping data fetch');
    }
  }, [initialUser?._id]);

  // FIXED: Only refresh counts when switching to notification/messages pages
  useEffect(() => {
    if (currentView === "notification" || currentView === "messages") {
      console.log(`🔄 Switched to ${currentView} view, refreshing counts...`);
      fetchUnreadCounts();
    }
  }, [currentView]);

  const handleForcedLogout = () => {
    localStorage.clear();
    window.location.href = "/"; // Force redirect to home page
  };

  const navButtons = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    // { id: "calendar", label: "Calendar", icon: <CalendarIcon size={18} /> },
    { id: "history", label: "History", icon: <History size={18} /> },
    {
      id: "notification",
      label: "Notification",
      icon: <Bell size={18} />,
      badge: unreadCounts.notifications > 0 ? unreadCounts.notifications : null,
    },
    {
      id: "messages",
      label: "Messages",
      icon: <MessageSquare size={18} />,
      badge: unreadCounts.messages > 0 ? unreadCounts.messages : null,
    },
    { 
      id: "profile", 
      label: user?.name || "Profile", 
      icon: (
        <div className="w-6 h-6 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center text-white text-xs font-bold">
          {user?.profilePicture ? (
            <img
              src={
                user.profilePicture.startsWith("http")
                  ? `${user.profilePicture}?t=${imgTimestamp}`
                  : `${import.meta.env.VITE_API_URL}${user.profilePicture}?t=${imgTimestamp}`
              }
              alt="Profile"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/default-avatar.png";
              }}
            />
          ) : (
            user?.name?.charAt(0)?.toUpperCase() || "?"
          )}
        </div>
      ),
    },
  ];

  const handleNavClick = (viewId) => {
    // Don't allow navigation if user is suspended
    if (user?.suspended) return;
    
    setView(viewId);
    
    // FIXED: REMOVED automatic marking of notifications as read
    // Users should manually mark notifications as read in the Notification component
    
    // FIXED: When clicking on messages, mark messages as read via API
    if (viewId === "messages") {
      socket.emit("mark-messages-read", user._id);
    } 
    
    setShowHelp(false);
    setIsMobileMenu(false);
  };

  const isActive = (btnId) => {
    if (btnId === "profile") {
      return (
        currentView === "profile" ||
        currentView === "editProfile" ||
        currentView === "edit-profile"
      );
    }
    return currentView === btnId;
  };

  const setIsMobileMenu = (open) => {
    setIsMobileMenuOpen(open);
    // Prevent body scroll when mobile menu is open
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  };

  return (
    <>
      {/* Suspension Modal */}
      {showSuspensionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[90%] max-w-md rounded-2xl bg-white shadow-2xl px-6 py-8 relative mx-4">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
                <AlertTriangle size={32} className="text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Account Suspended
              </h2>
              <div className="w-12 h-1 bg-red-600 rounded-full mb-4"></div>
              
              <p className="text-gray-600 text-sm leading-relaxed">
                Your account has been suspended due to violation of our terms of service. 
                You will be logged out automatically. Please contact the administration 
                if you believe this is a mistake.
              </p>
            </div>
            
            <div className="border-t border-gray-200 mb-6" />
            
            <button
              onClick={handleForcedLogout}
              className="w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              autoFocus
            >
              OK, I Understand
            </button>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      <AnnouncementModal
        announcements={announcements}
        currentAnnouncementIndex={currentAnnouncementIndex}
        onDismiss={handleDismissAnnouncement}
        onNext={handleNextAnnouncement}
        onCloseAll={handleCloseAllAnnouncements}
        showModal={showAnnouncementModal}
      />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#171717] z-50 flex items-center justify-between px-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobileMenu(!isMobileMenuOpen)}
            className="p-2 text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            disabled={user?.suspended}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <img src={Logo} alt="Logo" className="h-10 w-10" />
          <div>
            <h1 className="text-white font-semibold text-sm">CircuLink</h1>
            <p className="text-gray-400 text-xs">University of San Agustin</p>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside>
        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenu(false)}
          />
        )}

        {/* Navigation Panel - FIXED: Made sidebar responsive and scrollable */}
        <div className={`
          fixed top-0 left-0 z-50
          transition-all duration-300 ease-in-out
          ${isMobileMenuOpen 
            ? 'w-full h-full p-6 translate-x-0' 
            : '-translate-x-full lg:translate-x-0 w-[250px] h-screen p-6'
          }
          bg-[#171717] shadow-md flex flex-col
          lg:rounded-tr-3xl
        `}>
          {/* Close Button - Mobile Only */}
          <div className="lg:hidden flex justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              <img src={Logo} alt="Logo" className="h-10 w-10" />
              <div>
                <h1 className="text-white font-semibold text-sm">CircuLink</h1>
                <p className="text-gray-400 text-xs">University of San Agustin</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenu(false)}
              className="p-2 text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>

          {/* Logo - Desktop Only */}
          <div className="hidden lg:flex items-center justify-around mb-4">
            <img src={Logo} alt="Logo" className="h-[100px] w-[100px]" />
            <div className="flex flex-col items-start">
              <h1 className="text-[15px] font-serif text-white">
                University of <br /> San Agustin
              </h1>
              <div className="border w-full border-b-white/50"></div>
              <p className="text-[20px] font-serif font-semibold text-white">CircuLink</p>
            </div>
          </div>
          
          <div className="border-b border-gray-700 opacity-50 w-full my-4 lg:my-4"></div>

          {/* Navigation Buttons - FIXED: Made container scrollable on mobile */}
          <div className={`
            flex-1 flex flex-col mt-4
            ${isMobileMenuOpen ? 'overflow-y-auto' : ''}
          `}>
            <div className="flex flex-col gap-2.5">
              {navButtons.map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => handleNavClick(btn.id)}
                  disabled={user?.suspended}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 justify-start cursor-pointer relative group
                    ${isActive(btn.id)
                      ? "bg-red-600 text-white shadow-md"
                      : "bg-[#2a2a2a] text-gray-300 hover:bg-[#333333] hover:text-white"
                    }
                    ${user?.suspended ? 'opacity-50 cursor-not-allowed' : ''}
                    text-sm
                  `}
                >
                  <span
                    className={`transition-transform duration-200 ${
                      isActive(btn.id) ? "scale-110" : "group-hover:scale-110"
                    }`}
                  >
                    {btn.icon}
                  </span>
                  <span className="flex-1 text-left truncate">{btn.label}</span>
                  {btn.badge && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] flex-shrink-0">
                      {btn.badge > 9 ? "9+" : btn.badge}
                    </span>
                  )}
                </button>
              ))}

              {/* Help Button */}
              <div className="relative mt-1">
                <button
                  onClick={() => !user?.suspended && setShowHelp((prev) => !prev)}
                  disabled={user?.suspended}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 justify-start cursor-pointer w-full
                    ${showHelp ||
                      currentView === "help" ||
                      currentView === "guidelines"
                        ? "bg-red-600 text-white shadow-md"
                        : "bg-[#2a2a2a] text-gray-300 hover:bg-[#333333] hover:text-white"
                    }
                    ${user?.suspended ? 'opacity-50 cursor-not-allowed' : ''}
                    text-sm
                  `}
                >
                  <HelpCircle size={18} />
                  <span className="truncate">Help</span>
                </button>

                {showHelp && !user?.suspended && (
                  <div className={`
                    ${isMobileMenuOpen 
                      ? 'fixed inset-0 flex items-center justify-center z-50 lg:hidden' 
                      : 'hidden lg:block absolute top-0 left-full ml-2 z-50'
                    }
                  `}>
                    {/* Mobile: Centered Modal */}
                    {isMobileMenuOpen && (
                      <>
                        <div 
                          className="absolute inset-0 bg-black/50"
                          onClick={() => setShowHelp(false)}
                        />
                        <div className="relative bg-white rounded-xl shadow-lg border border-gray-200 p-4 w-[90%] max-w-[300px]">
                          <div className="flex flex-col space-y-3">
                            <button
                              onClick={() => {
                                setView("help");
                                setShowHelp(false);
                                setIsMobileMenu(false);
                              }}
                              className="bg-white border border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm rounded-xl w-full flex flex-col items-center justify-center text-center p-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                              aria-label="Go to help center"
                            >
                              <h2 className="text-sm font-semibold text-gray-800">
                                Help Center
                              </h2>
                              <p className="text-xs text-gray-600 mt-1">
                                Get answers to your questions
                              </p>
                            </button>

                            <button
                              onClick={() => {
                                setView("guidelines");
                                setShowHelp(false);
                                setIsMobileMenu(false);
                              }}
                              className="bg-white border border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm rounded-xl w-full flex flex-col items-center justify-center text-center p-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                              aria-label="View guidelines"
                            >
                              <h2 className="text-sm font-semibold text-gray-800">
                                Room Guidelines
                              </h2>
                              <p className="text-xs text-gray-600 mt-1">
                                Learn how to use rooms properly
                              </p>
                            </button>
                            
                            <button
                              onClick={() => setShowHelp(false)}
                              className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-sm font-medium"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Desktop: Right Side Dropdown */}
                    {!isMobileMenuOpen && (
                      <div className="flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-[240px]">
                        <button
                          onClick={() => {
                            setView("help");
                            setShowHelp(false);
                          }}
                          className="bg-white border border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm rounded-xl w-full flex flex-col items-center justify-center text-center p-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                          aria-label="Go to help center"
                        >
                          <h2 className="text-sm font-semibold text-gray-800">
                            Help Center
                          </h2>
                          <p className="text-xs text-gray-600 mt-1">
                            Get answers to your questions
                          </p>
                        </button>

                        <button
                          onClick={() => {
                            setView("guidelines");
                            setShowHelp(false);
                          }}
                          className="bg-white border border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm rounded-xl w-full flex flex-col items-center justify-center text-center p-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 mt-3"
                          aria-label="View guidelines"
                        >
                          <h2 className="text-sm font-semibold text-gray-800">
                            Room Guidelines
                          </h2>
                          <p className="text-xs text-gray-600 mt-1">
                            Learn how to use rooms properly
                              </p>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Logout - FIXED: Positioned at bottom */}
            <div className="mt-auto pt-4">
              <button
                onClick={onLogout}
                disabled={user?.suspended}
                className={`
                  w-full flex items-center gap-3 justify-center px-4 py-3 rounded-lg bg-[#2a2a2a] font-medium text-white hover:bg-red-600 transition-all duration-200 cursor-pointer group
                  ${user?.suspended ? 'opacity-50 cursor-not-allowed' : ''}
                  text-sm
                `}
              >
                <LogOut
                  size={16}
                  className="group-hover:scale-110 transition-transform duration-200"
                />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Spacer */}
      <div className="lg:hidden h-16"></div>
    </>
  );
}

export default Navigation_User;