import { useEffect, useRef, useState } from "react";
import Logo from "../assets/logo.png";
import {
  LogOut,
  LayoutDashboard,
  CalendarCheck,
  DoorOpen,
  Users,
  MessageSquare,
  FileText,
  Bell,
  Newspaper,
  ListOrdered,
  User,
  Shield,
  Cog,
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
  ChevronDown,
  ChevronRight
} from "lucide-react";

function AdminNavigation({ admin, setView, currentView, onLogout }) {
  const navRefs = useRef({});
  const [profile, setProfile] = useState(() =>
    admin || JSON.parse(localStorage.getItem("admin") || "{}")
  );
  
  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    main: true,
    analytics: false,
    archive: false,
    settings: false
  });

  // Mock data for notifications
  const [unreadMessages] = useState(3);
  const [unreadNotifications] = useState(5);

  useEffect(() => {
    if (admin && admin.username) {
      setProfile(admin);
      localStorage.setItem("admin", JSON.stringify(admin));
    }
  }, [admin]);

  useEffect(() => {
    const btn = navRefs.current[currentView];
    btn?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    btn?.focus();
  }, [currentView]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Combined Navigation Items with categories
  const navItems = [
    // Main
    { 
      id: "adminDashboard", 
      label: "Dashboard", 
      category: "main",
      description: "Overview and statistics",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
    },
    { 
      id: "adminReservation", 
      label: "Reservations", 
      category: "main",
      description: "Manage bookings",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
    },
    { 
      id: "adminRoom", 
      label: "Rooms", 
      category: "main",
      description: "Manage rooms and amenities",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10,17 15,12 10,7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
    },
    { 
      id: "adminUsers", 
      label: "Users", 
      category: "main",
      description: "Manage user accounts",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
    },
    { 
      id: "adminMessage", 
      label: "Messages", 
      category: "main",
      description: "View and send messages",
      badge: unreadMessages,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    },
    { 
      id: "adminReports", 
      label: "Reports", 
      category: "main",
      description: "Generate and view reports",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10,9 9,9 8,9"></polyline></svg>
    },
    { 
      id: "adminNotifications", 
      label: "Notifications", 
      category: "main",
      description: "System notifications",
      badge: unreadNotifications,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
    },
    { 
      id: "adminNews", 
      label: "News", 
      category: "main",
      description: "Manage news articles",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>
    },
    { 
      id: "adminLogs", 
      label: "Logs", 
      category: "main",
      description: "System activity logs",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
    },

    // Analytics
    { 
      id: "analyticsOverview", 
      label: "Overview", 
      category: "analytics",
      description: "Key metrics and trends",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
    },
    { 
      id: "analyticsUsers", 
      label: "User Analytics", 
      category: "analytics",
      description: "User behavior and growth",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path><polyline points="16 8 20 12 16 16"></polyline><line x1="20" y1="12" x2="12" y2="12"></line></svg>
    },
    { 
      id: "analyticsReservations", 
      label: "Reservation Analytics", 
      category: "analytics",
      description: "Booking patterns and revenue",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
    },
    { 
      id: "analyticsRooms", 
      label: "Room Analytics", 
      category: "analytics",
      description: "Room performance metrics",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10,17 15,12 10,7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line><polyline points="22 12 18 12 18 8"></polyline></svg>
    },
    { 
      id: "analyticsEngagement", 
      label: "Engagement", 
      category: "analytics",
      description: "User engagement metrics",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9-4-18-3 9H2"></path></svg>
    },

    // Archive
    { 
      id: "archivedUsers", 
      label: "Archived Users", 
      category: "archive",
      description: "Inactive user accounts",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
    },
    { 
      id: "archivedReservations", 
      label: "Archived Reservations", 
      category: "archive",
      description: "Past bookings",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
    },
    { 
      id: "archivedReports", 
      label: "Archived Reports", 
      category: "archive",
      description: "Historical reports",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10,9 9,9 8,9"></polyline></svg>
    },
    { 
      id: "archivedNews", 
      label: "Archived News", 
      category: "archive",
      description: "Old news articles",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>
    },

    // Settings
    { 
      id: "profileSettings", 
      label: "Profile", 
      category: "settings",
      description: "Manage your profile",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
    },
    { 
      id: "passwordSecurity", 
      label: "Security", 
      category: "settings",
      description: "Password and security",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
    },
    { 
      id: "systemSettings", 
      label: "System", 
      category: "settings",
      description: "System configuration",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
    },
  ];

  // Group items by category
  const mainItems = navItems.filter(item => item.category === "main");
  const analyticsItems = navItems.filter(item => item.category === "analytics");
  const archiveItems = navItems.filter(item => item.category === "archive");
  const settingsItems = navItems.filter(item => item.category === "settings");

  const handleNavClick = (viewId) => {
    setView(viewId);
  };

  const renderNavItems = (items) => {
    return items.map(({ id, label, svg, description, badge }) => (
      <button
        key={id}
        ref={(el) => (navRefs.current[id] = el)}
        onClick={() => handleNavClick(id)}
        className={`w-full flex items-center gap-2 px-4 py-2 text-left transition-all duration-200 border-l-4 group relative ${
          currentView === id
            ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white border-red-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            : "text-gray-400 border-transparent hover:bg-gray-800/50 hover:text-gray-200 hover:border-gray-600"
        }`}
        title={description}
      >
        <div className="flex items-center gap-2 min-w-0 w-full">
          <div className="text-gray-300 flex-shrink-0 transform transition-transform group-hover:scale-110">
            {svg}
          </div>
          <span className="text-xs truncate flex-1">{label}</span>
          {badge > 0 && (
            <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">
              {badge}
            </span>
          )}
          {/* Tooltip on hover */}
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-[10px] text-gray-300 px-2 py-1 rounded border border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
            {description || label}
          </div>
        </div>
      </button>
    ));
  };

  const renderSection = (title, items, sectionKey, icon) => (
    <div className="w-full">
      <div 
        className="px-4 py-2 mt-1 flex items-center justify-between cursor-pointer hover:bg-gray-800/30 transition-colors"
        onClick={() => toggleSection(sectionKey)}
      >
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
          {icon && <span className="text-gray-600">{icon}</span>}
          {title}
        </h3>
        <button className="text-gray-600 hover:text-gray-400">
          {expandedSections[sectionKey] ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
        </button>
      </div>
      
      {expandedSections[sectionKey] && (
        <div className="grid grid-cols-1 gap-0 animate-slideDown">
          {renderNavItems(items)}
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside>
        <div className="fixed top-0 left-0 h-screen w-[250px] bg-[#030303] p-0 flex flex-col border-r border-gray-800 z-[99999]">
          {/* Logo + Title - Original width but compact height */}
          <div className="flex items-center gap-3 p-3 border-b border-gray-800 bg-[#0a0a0a] z-[9999] w-full">
            <img src={Logo} alt="Logo" className="h-[36px] w-[36px] flex-shrink-0" />
            <div className="flex flex-col">
              <h1 className="text-[14px] font-medium text-gray-200 leading-tight truncate">
                USA | CircuLink
              </h1>
              <span className="text-[8px] text-gray-600">v2.1.0</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-2 border-b border-gray-800">
            <div className="relative">
              <input
                type="text"
                placeholder="Search menu... (Ctrl+K)"
                className="w-full bg-gray-900 text-xs text-gray-300 px-2 py-1.5 pl-7 rounded border border-gray-700 focus:border-red-500 outline-none transition-colors"
              />
              <svg className="absolute left-2 top-2 text-gray-600" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>

          {/* Recent Items */}
          <div className="px-4 py-2 bg-gray-900/30 border-b border-gray-800">
            <h3 className="text-[10px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              RECENT
            </h3>
            <div className="flex gap-1">
              <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded-full">Dashboard</span>
              <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded-full">Users</span>
              <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded-full">Reports</span>
            </div>
          </div>

          {/* Navigation - Ultra compact layout */}
          <div className="flex flex-col h-full bg-[#030303] pointer-events-auto w-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            <div className="flex flex-col flex-grow pointer-events-auto w-full py-0.5">
              
              {/* Main Section */}
              {renderSection("MAIN", mainItems, "main", <LayoutDashboard size={12} />)}
              
              {/* Analytics Section */}
              {renderSection("ANALYTICS", analyticsItems, "analytics", <BarChart3 size={12} />)}
              
              {/* Archive Section */}
              {renderSection("ARCHIVE", archiveItems, "archive", <MessageSquare size={12} />)}
              
              {/* Settings Section */}
              {renderSection("SETTINGS", settingsItems, "settings", <Bell size={12} />)}
              
            </div>

            {/* System Info */}
            <div className="px-4 py-2">
              <div className="text-[8px] text-gray-700 flex items-center justify-between">
                <span>System: Online</span>
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              </div>
            </div>

            {/* Logout - Compact */}
            <div className="mt-auto border-t border-gray-800 bg-[#0a0a0a] w-full flex-shrink-0">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('showLogoutModal'));
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs text-gray-400 hover:bg-red-900/20 hover:text-red-300 transition-all duration-200 hover:border-l-4 hover:border-red-500 cursor-pointer group"
              >
                <div className="text-gray-400 flex-shrink-0 transform transition-transform group-hover:scale-110 group-hover:text-red-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16,17 21,12 16,7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </div>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Add animation styles */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

export default AdminNavigation;