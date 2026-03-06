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
  LogOut,
  HelpCircle,
  Menu,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Home,
  Calendar,
  User,
  Settings,
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
  
  // Sidebar collapsed state - Instagram style
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // ANNOUNCEMENT STATES
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);

  // Check if device is tablet/desktop
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  // Notification sound
  const messageSound = useRef(null);
  const socketListenersSet = useRef(false);
  
  useEffect(() => {
    messageSound.current = new Audio("/ringtone_message.wav");
    messageSound.current.volume = 0.75;
    
    if (messageSound.current) {
      messageSound.current.style.display = 'none';
      messageSound.current.setAttribute('aria-hidden', 'true');
      messageSound.current.controls = false;
    }
    
    return () => {
      if (messageSound.current) {
        messageSound.current.pause();
        messageSound.current = null;
      }
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsTablet(width >= 768 && width < 1024);
      setIsDesktop(width >= 1024);
      
      // Auto-collapse on tablet
      if (width >= 768 && width < 1024) {
        setIsCollapsed(true);
      }
      
      if (width >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setUser(initialUser);
    
    if (initialUser?.suspended) {
      setSuspensionData({
        reason: initialUser.suspensionReason || 'Violation of terms of service',
        duration: initialUser.suspensionDuration || 'Indefinite',
        suspendedUntil: initialUser.suspendedUntil || null,
      });
      setShowSuspensionModal(true);
    }
  }, [initialUser]);

  const playNotificationSound = () => {
    try {
      if (messageSound.current) {
        messageSound.current.currentTime = 0;
        messageSound.current.play().catch(() => {});
      }
    } catch (error) {}
  };

  const fetchUnreadCounts = async () => {
    if (!initialUser?._id) return;

    try {
      const [messageResult, notificationResult] = await Promise.allSettled([
        api.get(`/messages/unread-count/${initialUser._id}`),
        api.get(`/notifications/unread-count/${initialUser._id}`)
      ]);

      let messageCount = 0;
      let notificationCount = 0;

      if (messageResult.status === 'fulfilled') {
        messageCount = messageResult.value.data.count || messageResult.value.data.unreadCount || 0;
      }

      if (notificationResult.status === 'fulfilled') {
        notificationCount = notificationResult.value.data.count || notificationResult.value.data.unreadCount || 0;
      }

      setUnreadCounts({
        notifications: notificationCount,
        messages: messageCount,
      });

    } catch (err) {
      console.error("Failed to fetch unread counts:", err);
    }
  };

  const fetchUserData = async () => {
    try {
      const { data: userData } = await api.get(`/users/${initialUser._id}`);
      const updatedUser = userData.user ?? userData;
      setUser(updatedUser);
      setImgTimestamp(Date.now());

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
      await api.post(`/announcements/${announcementId}/dismiss`, { userId: user?._id });
      setAnnouncements(prev => prev.filter(ann => ann._id !== announcementId));
      
      if (announcements.length <= 1) {
        setShowAnnouncementModal(false);
      } else {
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
    announcements.forEach(announcement => {
      handleDismissAnnouncement(announcement._id);
    });
    setShowAnnouncementModal(false);
  };

  // Socket listeners setup
  const setupSocketListeners = () => {
    if (socketListenersSet.current) return;
    
    const handleUserUpdate = (updatedId) => {
      if (updatedId === initialUser?._id) {
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
    
    const handleNewNotification = (newNotif) => {
      if (newNotif.userId === initialUser?._id || newNotif.targetRole === 'user' || newNotif.targetRole === 'all') {
        setUnreadCounts((prev) => ({
          ...prev,
          notifications: prev.notifications + 1,
        }));
        
        if (currentView !== "notification") {
          playNotificationSound();
        }
      }
    };
    
    const handleNewMessage = () => {
      fetchUnreadCounts();
      
      if (currentView !== "messages") {
        playNotificationSound();
      }
    };
    
    const handleReadNotifications = (data) => {
      if (data.userId === initialUser?._id) {
        fetchUnreadCounts();
      }
    };
    
    const handleReadMessages = () => {
      setUnreadCounts((prev) => ({ ...prev, messages: 0 }));
    };

    const handleUnreadCountUpdate = (data) => {
      if (data.userId === initialUser?._id) {
        setUnreadCounts(prev => ({
          ...prev,
          messages: data.count || 0
        }));
      }
    };

    const handleRefreshUnreadCounts = (data) => {
      if (data.userId === initialUser?._id) {
        fetchUnreadCounts();
      }
    };

    const handleUnreadCountsUpdated = () => {
      fetchUnreadCounts();
    };

    const handleNewAnnouncement = (announcement) => {
      setAnnouncements(prev => [announcement, ...prev]);
      setShowAnnouncementModal(true);
      setCurrentAnnouncementIndex(0);
    };
    
    const handleAnnouncementUpdate = (updatedAnnouncement) => {
      setAnnouncements(prev => 
        prev.map(ann => ann._id === updatedAnnouncement._id ? updatedAnnouncement : ann)
      );
    };
    
    const handleAnnouncementDelete = (deletedId) => {
      setAnnouncements(prev => prev.filter(ann => ann._id !== deletedId));
    };

    socket.on("user-updated", handleUserUpdate);
    socket.on("user-suspended", handleUserSuspended);
    socket.on("user-unsuspended", handleUserUnsuspended);
    socket.on("new-notification", handleNewNotification);
    socket.on("notification", handleNewNotification);
    socket.on("new-message", handleNewMessage);
    socket.on("notifications-read", handleReadNotifications);
    socket.on("messages-read", handleReadMessages);
    socket.on("unreadCountUpdate", handleUnreadCountUpdate);
    socket.on("refresh-unread-counts", handleRefreshUnreadCounts);
    socket.on("unread-counts-updated", handleUnreadCountsUpdated);
    socket.on('new-announcement', handleNewAnnouncement);
    socket.on('announcement-updated', handleAnnouncementUpdate);
    socket.on('announcement-deleted', handleAnnouncementDelete);

    socketListenersSet.current = true;

    return () => {
      socket.off("user-updated", handleUserUpdate);
      socket.off("user-suspended", handleUserSuspended);
      socket.off("user-unsuspended", handleUserUnsuspended);
      socket.off("new-notification", handleNewNotification);
      socket.off("notification", handleNewNotification);
      socket.off("new-message", handleNewMessage);
      socket.off("notifications-read", handleReadNotifications);
      socket.off("messages-read", handleReadMessages);
      socket.off("unreadCountUpdate", handleUnreadCountUpdate);
      socket.off("refresh-unread-counts", handleRefreshUnreadCounts);
      socket.off("unread-counts-updated", handleUnreadCountsUpdated);
      socket.off('new-announcement', handleNewAnnouncement);
      socket.off('announcement-updated', handleAnnouncementUpdate);
      socket.off('announcement-deleted', handleAnnouncementDelete);
      
      socketListenersSet.current = false;
    };
  };

  useEffect(() => {
    if (initialUser?._id) {
      fetchData();
      fetchAnnouncements();
      const cleanupSocketListeners = setupSocketListeners();
      return cleanupSocketListeners;
    }
  }, [initialUser?._id]);

  useEffect(() => {
    if (currentView === "notification" || currentView === "messages") {
      fetchUnreadCounts();
    }
  }, [currentView]);

  const handleForcedLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // Instagram-style navigation items
  const navItems = [
    { 
      id: "dashboard", 
      label: "Dashboard", 
      icon: <LayoutDashboard size={24} />,
      activeIcon: <LayoutDashboard size={24} fill="currentColor" />
    },
    { 
      id: "history", 
      label: "History", 
      icon: <History size={24} />,
      activeIcon: <History size={24} fill="currentColor" />
    },
    { 
      id: "notification", 
      label: "Notifications", 
      icon: <Bell size={24} />,
      activeIcon: <Bell size={24} fill="currentColor" />,
      badge: unreadCounts.notifications > 0 ? unreadCounts.notifications : null,
    },
    { 
      id: "messages", 
      label: "Messages", 
      icon: <MessageSquare size={24} />,
      activeIcon: <MessageSquare size={24} fill="currentColor" />,
      badge: unreadCounts.messages > 0 ? unreadCounts.messages : null,
    },
  ];

  const handleNavClick = (viewId) => {
    if (user?.suspended) return;
    
    setView(viewId);
    
    if (viewId === "messages") {
      socket.emit("mark-messages-read", user._id);
    } 
    
    setShowHelp(false);
    setIsMobileMenuOpen(false);
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

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Get profile picture URL
  const getProfilePictureUrl = () => {
    if (!user?.profilePicture) return null;
    
    return user.profilePicture.startsWith("http")
      ? `${user.profilePicture}?t=${imgTimestamp}`
      : `${import.meta.env.VITE_API_URL}${user.profilePicture}?t=${imgTimestamp}`;
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
                Your account has been suspended. You will be logged out automatically.
              </p>
            </div>
            
            <div className="border-t border-gray-200 mb-6" />
            
            <button
              onClick={handleForcedLogout}
              className="w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors duration-200 cursor-pointer"
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

      {/* Mobile Header - Instagram style */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white z-50 flex items-center justify-between px-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            disabled={user?.suspended}
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <h1 className="text-xl font-bold text-gray-800">CircuLink</h1>
        </div>
        
        {/* Mobile Profile Icon - Instagram style */}
        <button
          onClick={() => {
            setView("profile");
            setIsMobileMenuOpen(false);
          }}
          className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:border-red-500 transition-all"
          disabled={user?.suspended}
        >
          {user?.profilePicture ? (
            <img
              src={getProfilePictureUrl()}
              alt="Profile"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/default-avatar.png";
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}
        </button>
      </div>

      {/* Sidebar - Instagram Style */}
      <aside>
        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Navigation Panel - Instagram style sidebar */}
        <div className={`
          fixed top-0 left-0 z-50
          transition-all duration-300 ease-in-out
          bg-white shadow-lg flex flex-col
          border-r border-gray-200
          
          /* Mobile styles */
          ${!isDesktop && isMobileMenuOpen 
            ? 'w-[280px] h-full p-4 translate-x-0' 
            : !isDesktop && !isMobileMenuOpen
            ? '-translate-x-full'
            : ''
          }
          
          /* Desktop styles - Instagram style */
          ${isDesktop ? `
            ${isCollapsed ? 'w-[72px]' : 'w-[220px]'}
            p-3 translate-x-0 h-screen
          ` : ''}
        `}>
          {/* Logo Area - Desktop only */}
          {isDesktop && !isCollapsed && (
            <div className="px-3 py-4 mb-4">
              <h1 className="text-2xl font-bold text-gray-800">CircuLink</h1>
              <p className="text-xs text-gray-500">University of San Agustin</p>
            </div>
          )}

          {/* Logo - Collapsed view */}
          {isDesktop && isCollapsed && (
            <div className="flex justify-center py-4 mb-4">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                USA
              </div>
            </div>
          )}

          {/* Mobile Close Button */}
          {!isDesktop && (
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                  USA
                </div>
                <h2 className="text-lg font-bold text-gray-800">CircuLink</h2>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Navigation Items - Instagram style */}
          <div className="flex-1 flex flex-col">
            {/* Main Navigation */}
            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  disabled={user?.suspended}
                  className={`
                    flex items-center w-full rounded-xl transition-all duration-200
                    ${isDesktop && isCollapsed ? 'justify-center p-3' : 'px-3 py-3 gap-4'}
                    ${isActive(item.id)
                      ? "text-red-600 bg-red-50"
                      : "text-gray-600 hover:bg-gray-100"
                    }
                    ${user?.suspended ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    relative
                  `}
                  title={isDesktop && isCollapsed ? item.label : ''}
                >
                  <span className={isActive(item.id) ? "text-red-600" : "text-gray-500"}>
                    {isActive(item.id) ? item.activeIcon : item.icon}
                  </span>
                  
                  {(!isDesktop || (isDesktop && !isCollapsed)) && (
                    <span className="flex-1 text-left text-sm font-medium">
                      {item.label}
                    </span>
                  )}
                  
                  {/* Badge - Instagram style */}
                  {item.badge && (
                    <span className={`
                      bg-red-500 text-white text-xs font-bold rounded-full
                      flex items-center justify-center
                      ${isDesktop && isCollapsed 
                        ? 'absolute -top-1 -right-1 min-w-[18px] h-[18px]' 
                        : 'min-w-[20px] h-[20px]'
                      }
                    `}>
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Help Button */}
            <div className="relative mt-2">
              <button
                onClick={() => !user?.suspended && setShowHelp((prev) => !prev)}
                disabled={user?.suspended}
                className={`
                  flex items-center w-full rounded-xl transition-all duration-200
                  ${isDesktop && isCollapsed ? 'justify-center p-3' : 'px-3 py-3 gap-4'}
                  ${showHelp ? "text-red-600 bg-red-50" : "text-gray-600 hover:bg-gray-100"}
                  ${user?.suspended ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                title={isDesktop && isCollapsed ? 'Help' : ''}
              >
                <HelpCircle size={24} className={showHelp ? "text-red-600" : "text-gray-500"} />
                {(!isDesktop || (isDesktop && !isCollapsed)) && (
                  <span className="flex-1 text-left text-sm font-medium">Help</span>
                )}
              </button>

              {/* Help Dropdown - Instagram style */}
              {showHelp && !user?.suspended && (
                <div className={`
                  ${!isDesktop 
                    ? 'fixed inset-0 flex items-center justify-center z-50' 
                    : isCollapsed
                      ? 'absolute left-full ml-2 top-0 z-50'
                      : 'absolute left-full ml-2 top-0 z-50'
                  }
                `}>
                  {!isDesktop && (
                    <>
                      <div 
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowHelp(false)}
                      />
                      <div className="relative bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-[200px]">
                        <button
                          onClick={() => {
                            setView("help");
                            setShowHelp(false);
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                          Help Center
                        </button>
                        <button
                          onClick={() => {
                            setView("guidelines");
                            setShowHelp(false);
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                          Room Guidelines
                        </button>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          onClick={() => setShowHelp(false)}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 rounded-lg"
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )}

                  {isDesktop && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-2 w-[180px]">
                      <button
                        onClick={() => {
                          setView("help");
                          setShowHelp(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                      >
                        Help Center
                      </button>
                      <button
                        onClick={() => {
                          setView("guidelines");
                          setShowHelp(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                      >
                        Room Guidelines
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Bottom Section - Profile & Settings */}
            <div className="mt-auto pt-4 border-t border-gray-200">
              {/* Profile Button - Instagram style with circular image */}
              <button
                onClick={() => handleNavClick("profile")}
                disabled={user?.suspended}
                className={`
                  flex items-center w-full rounded-xl transition-all duration-200 mb-2
                  ${isDesktop && isCollapsed ? 'justify-center p-2' : 'px-3 py-2 gap-3'}
                  ${isActive("profile") ? "bg-red-50" : "hover:bg-gray-100"}
                  ${user?.suspended ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                title={isDesktop && isCollapsed ? 'Profile' : ''}
              >
                <div className={`
                  rounded-full overflow-hidden
                  ${isActive("profile") ? "ring-2 ring-red-500" : "ring-1 ring-gray-300"}
                  ${isDesktop && isCollapsed ? 'w-8 h-8' : 'w-8 h-8'}
                `}>
                  {user?.profilePicture ? (
                    <img
                      src={getProfilePictureUrl()}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/default-avatar.png";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                
                {(!isDesktop || (isDesktop && !isCollapsed)) && (
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {user?.name || "Profile"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      View your profile
                    </p>
                  </div>
                )}
              </button>

              {/* Desktop Toggle Button */}
              {isDesktop && (
                <button
                  onClick={toggleSidebar}
                  className={`
                    w-full flex items-center justify-center rounded-xl p-2
                    text-gray-500 hover:bg-gray-100 transition-all duration-200
                    ${isCollapsed ? 'mt-2' : 'mt-1'}
                  `}
                  title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                  {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                  {!isCollapsed && <span className="ml-2 text-sm">Collapse</span>}
                </button>
              )}

              {/* Logout Button */}
              <button
                onClick={onLogout}
                disabled={user?.suspended}
                className={`
                  flex items-center w-full rounded-xl transition-all duration-200 mt-1
                  ${isDesktop && isCollapsed ? 'justify-center p-3' : 'px-3 py-3 gap-4'}
                  text-gray-600 hover:bg-red-50 hover:text-red-600
                  ${user?.suspended ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                title={isDesktop && isCollapsed ? 'Logout' : ''}
              >
                <LogOut size={24} className="text-gray-500 group-hover:text-red-600" />
                {(!isDesktop || (isDesktop && !isCollapsed)) && (
                  <span className="flex-1 text-left text-sm font-medium">Logout</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Spacer */}
      <div className={`
        transition-all duration-300
        ${isDesktop 
          ? isCollapsed ? 'pl-[72px]' : 'pl-[220px]'
          : 'pl-0'
        }
      `}>
        {/* Mobile Spacer */}
        <div className="md:hidden h-14"></div>
      </div>
    </>
  );
}

export default Navigation_User;