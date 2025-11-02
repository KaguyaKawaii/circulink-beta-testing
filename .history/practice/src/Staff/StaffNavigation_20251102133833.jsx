import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import Logo from "../assets/logo.png";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  MessageSquare,
  Bell,
  User,
  LogOut,
  FileText,
  ChevronDown,
  AlertTriangle,
  Menu,
  X,
} from "lucide-react";

const socket = io(`${import.meta.env.VITE_API_URL}`);

function StaffNavigation({ staff, setView, currentView, onLogout }) {
  const [unreadCounts, setUnreadCounts] = useState({
    notifications: 0,
    messages: 0,
    reports: 0,
    reservations: 0
  });
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(() =>
    staff || JSON.parse(localStorage.getItem("staff") || "{}")
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navRefs = useRef({});

  // 🔊 Improved notification sound handling
  const messageSound = useRef(null);
  
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

  // Handle responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Auto-collapse on medium screens (tablet size)
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (staff && staff._id) {
      setProfile(staff);
      localStorage.setItem("staff", JSON.stringify(staff));
    }
  }, [staff]);

  useEffect(() => {
    const btn = navRefs.current[currentView];
    btn?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    btn?.focus();
  }, [currentView]);

  // Fetch unread counts for all navigation items
  const fetchUnreadCounts = async () => {
    if (!staff?._id) return;
    
    try {
      setLoading(true);
      
      // Fetch notification unread count
      let notificationsCount = 0;
      try {
        const notificationsResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications/unread-count/${staff._id}`);
        notificationsCount = notificationsResponse.data.count || 0;
      } catch (error) {
        console.log("Notifications endpoint not available");
      }

      // Fetch messages unread count - USE STAFF TOTAL UNREAD COUNT
      let messagesCount = 0;
      try {
        const messagesResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/messages/staff-total-unread/${staff._id}`);
        messagesCount = messagesResponse.data.count || 0;
      } catch (error) {
        console.log("Messages endpoint not available");
        // Fallback to regular unread count
        try {
          const fallbackResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/messages/unread-count/${staff._id}`);
          messagesCount = fallbackResponse.data.count || 0;
        } catch (fallbackError) {
          console.log("Messages fallback endpoint not available");
        }
      }

      // Reports and Reservations - SET TO 0 (remove API calls that don't exist)
      const reportsCount = 0;
      const reservationsCount = 0;

      setUnreadCounts({
        notifications: notificationsCount,
        messages: messagesCount,
        reports: reportsCount,
        reservations: reservationsCount
      });

    } catch (error) {
      console.error("Failed to fetch unread counts:", error);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    if (!staff?._id) return;

    // Join staff room for real-time updates
    socket.emit("join", { userId: staff._id });
    socket.emit("join", { userId: staff.floor });

    // Fetch initial counts
    fetchUnreadCounts();
    
    // Set up socket listeners for real-time updates
    const handleUnreadCountUpdate = (data) => {
      if (data.userId === staff._id) {
        // Update messages count in real-time
        setUnreadCounts(prev => ({
          ...prev,
          messages: data.count || 0
        }));
      }
    };

    const handleNewMessage = (msg) => {
      // If this message is relevant to staff, refresh counts
      if (msg.receiver === staff._id || msg.receiver === staff.floor || msg.sender === "admin") {
        fetchUnreadCounts();
        
        // 🔊 Play sound when receiving new messages while NOT on messages page
        if (currentView !== "staffMessages") {
          // Only play sound for messages not sent by current staff
          if (msg.sender !== staff._id) {
            playNotificationSound();
          }
        }
      }
    };

    // Listen for unread count updates
    socket.on("unreadCountUpdate", handleUnreadCountUpdate);
    socket.on("newMessage", handleNewMessage);
    
    // Set up interval to refresh counts every 60 seconds
    const interval = setInterval(fetchUnreadCounts, 60000);
    
    return () => {
      clearInterval(interval);
      socket.off("unreadCountUpdate", handleUnreadCountUpdate);
      socket.off("newMessage", handleNewMessage);
    };
  }, [staff?._id, currentView]);

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      // Fallback logout
      localStorage.removeItem("staff");
      localStorage.removeItem("user");
      window.location.reload();
    }
    setShowLogoutConfirm(false);
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleNavClick = (viewId) => {
    setView(viewId);
    // Refresh counts when navigating
    fetchUnreadCounts();
    
    // Close mobile menu after navigation
    if (isMobile) {
      setShowMobileMenu(false);
    }
  };

  const navButtons = [
    { 
      id: "staffDashboard", 
      label: "Dashboard", 
      icon: LayoutDashboard,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
      badge: 0
    },
    { 
      id: "staffReservation", 
      label: "Reservations", 
      icon: CalendarDays,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
      badge: unreadCounts.reservations
    },
    { 
      id: "staffReports", 
      label: "Reports", 
      icon: FileText,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10,9 9,9 8,9"></polyline></svg>,
      badge: unreadCounts.reports
    },
    { 
      id: "staffUsers", 
      label: "Users", 
      icon: Users,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
      badge: 0
    },
    { 
      id: "staffMessages", 
      label: "Messages", 
      icon: MessageSquare,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
      badge: unreadCounts.messages
    },
    { 
      id: "staffNotification", 
      label: "Notifications", 
      icon: Bell,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>,
      badge: unreadCounts.notifications
    },
    { 
      id: "staffProfile", 
      label: "Profile", 
      icon: User,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
      badge: 0
    },
  ];

  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  // Mobile menu button for small screens
  const MobileMenuButton = () => (
    <button
      onClick={() => setShowMobileMenu(!showMobileMenu)}
      className="fixed top-4 left-4 z-[100000] bg-[#030303] text-white p-2 rounded-lg shadow-lg lg:hidden"
    >
      {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
    </button>
  );

  return (
    <>
      <MobileMenuButton />
      
      <aside>
        {/* Desktop Sidebar */}
        <div className={`fixed top-0 left-0 h-screen bg-[#030303] p-0 flex flex-col border-r border-gray-800 z-[99999] transition-all duration-300 ${
          isCollapsed ? 'w-[70px]' : 'w-[250px]'
        } ${isMobile && !showMobileMenu ? '-translate-x-full' : 'translate-x-0'}`}>
          
          {/* Logo + Title */}
          <div className={`flex items-center gap-3 p-4 border-b border-gray-800 bg-[#0a0a0a] z-[9999] ${
            isCollapsed ? 'justify-center' : ''
          }`}>
            <img src={Logo} alt="Logo" className="h-[40px] w-[40px]" />
            {!isCollapsed && (
              <h1 className="text-[15px] font-medium text-gray-200 leading-tight">
                University of San Agustin | CircuLink
              </h1>
            )}
          </div>

          {/* Toggle Button - Desktop only */}
          {!isMobile && (
            <button
              onClick={toggleSidebar}
              className="absolute -right-3 top-20 bg-[#030303] border border-gray-700 text-gray-400 p-1 rounded-full hover:bg-gray-800 hover:text-white transition-all duration-200 z-10"
            >
              <ChevronDown size={16} className={`transform transition-transform ${isCollapsed ? 'rotate-90' : '-rotate-90'}`} />
            </button>
          )}

          {/* Navigation Buttons */}
          <div className="flex flex-col h-full overflow-y-auto bg-[#030303] pointer-events-auto">
            <div className="flex flex-col flex-grow pointer-events-auto">
              {navButtons.map(({ id, label, icon: Icon, svg, badge }) => (
                <button
                  key={id}
                  ref={(el) => (navRefs.current[id] = el)}
                  onClick={() => handleNavClick(id)}
                  className={`relative w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 focus:outline-none border-l-4 cursor-pointer group ${
                    isCollapsed ? 'justify-center' : ''
                  } ${
                    currentView === id
                      ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white font-medium border-red-500 shadow-lg"
                      : "text-gray-400 border-transparent hover:bg-gray-800 hover:text-gray-200 hover:border-gray-600"
                  }`}
                  title={isCollapsed ? label : ''}
                >
                  <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="text-gray-300">
                      {svg}
                    </div>
                    {!isCollapsed && (
                      <span className="text-sm">{label}</span>
                    )}
                  </div>
                  
                  {/* Badge for unread counts */}
                  {badge > 0 && (
                    <span className={`absolute inline-flex items-center justify-center text-xs font-bold h-5 min-w-5 px-1 rounded-full ${
                      isCollapsed 
                        ? 'top-1 right-1' 
                        : 'right-4 top-1/2 -translate-y-1/2'
                    } ${
                      currentView === id 
                        ? 'bg-white text-red-600' 
                        : 'bg-red-500 text-white'
                    }`}>
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                      {label}
                      {badge > 0 && ` (${badge} unread)`}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Logout - Fixed with proper click handling */}
            <div className="mt-auto border-t border-gray-800 bg-[#0a0a0a] relative z-[99999] pointer-events-auto">
              <button
                onClick={handleLogoutConfirm}
                className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-400 hover:bg-red-900/20 hover:text-red-300 transition-all duration-200 hover:border-l-4 hover:border-red-500 cursor-pointer relative z-[99999] group ${
                  isCollapsed ? 'justify-center' : ''
                }`}
                title={isCollapsed ? "Logout" : ""}
              >
                <div className="text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16,17 21,12 16,7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </div>
                {!isCollapsed && <span>Logout</span>}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                    Logout
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Overlay */}
        {isMobile && showMobileMenu && (
          <div 
            className="fixed inset-0 bg-black/50 z-[99998] lg:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
        )}
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Logout
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to logout? You will need to login again to access the staff panel.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelLogout}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default StaffNavigation;