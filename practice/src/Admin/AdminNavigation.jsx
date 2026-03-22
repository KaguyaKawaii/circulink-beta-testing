// AdminNavigation.jsx - Fully Responsive Version with Facility Closures
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
  ChevronRight,
  Archive,
  Menu,
  X,
  CalendarX, // Add this import for the calendar x icon
} from "lucide-react";

function AdminNavigation({ admin, setView, currentView, onLogout }) {
  const navRefs = useRef({});
  const [profile, setProfile] = useState(() =>
    admin || JSON.parse(localStorage.getItem("admin") || "{}")
  );
  
  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Dropdown state
  const [openDropdowns, setOpenDropdowns] = useState({
    analytics: false,
    archive: false,
    settings: false,
  });

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuOpen && !event.target.closest('.mobile-sidebar') && !event.target.closest('.mobile-menu-button')) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  // Close mobile menu when view changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentView]);

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

  const toggleDropdown = (dropdown) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [dropdown]: !prev[dropdown]
    }));
  };

  // Combined Navigation Items with categories
  const navItems = [
    // Main
    { 
      id: "adminDashboard", 
      label: "Dashboard", 
      category: "main",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
    },
    { 
      id: "adminReservation", 
      label: "Reservations", 
      category: "main",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
    },
    { 
      id: "adminRoom", 
      label: "Rooms", 
      category: "main",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10,17 15,12 10,7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
    },
    { 
      id: "adminUsers", 
      label: "Users", 
      category: "main",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
    },
    { 
      id: "adminMessage", 
      label: "Messages", 
      category: "main",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    },
    { 
      id: "adminReports", 
      label: "Issues", 
      category: "main",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10,9 9,9 8,9"></polyline></svg>
    },
    { 
      id: "adminNotifications", 
      label: "Notifications", 
      category: "main",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
    },
    { 
      id: "adminNews", 
      label: "News", 
      category: "main",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>
    },
    { 
      id: "adminLogs", 
      label: "Logs", 
      category: "main",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
    },

    // Analytics
    { 
      id: "analyticsOverview", 
      label: "Overview", 
      category: "analytics",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
    },
    { 
      id: "analyticsUsers", 
      label: "User Analytics", 
      category: "analytics",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path><polyline points="16 8 20 12 16 16"></polyline><line x1="20" y1="12" x2="12" y2="12"></line></svg>
    },
    { 
      id: "analyticsReservations", 
      label: "Reservation Analytics", 
      category: "analytics",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
    },
    { 
      id: "analyticsRooms", 
      label: "Room Analytics", 
      category: "analytics",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10,17 15,12 10,7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line><polyline points="22 12 18 12 18 8"></polyline></svg>
    },
    { 
      id: "analyticsEngagement", 
      label: "Engagement", 
      category: "analytics",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9-4-18-3 9H2"></path></svg>
    },

    // Archive
    { 
      id: "archivedUsers", 
      label: "Archived Users", 
      category: "archive",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
    },
    { 
      id: "archivedReservations", 
      label: "Archived Reservations", 
      category: "archive",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
    },
    { 
      id: "archivedReports", 
      label: "Archived Reports", 
      category: "archive",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10,9 9,9 8,9"></polyline></svg>
    },
    { 
      id: "archivedNews", 
      label: "Archived News", 
      category: "archive",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>
    },

    // Settings - ADD THE NEW FACILITY CLOSURES ITEM HERE
    { 
      id: "profileSettings", 
      label: "Profile", 
      category: "settings",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
    },
    { 
      id: "passwordSecurity", 
      label: "Security", 
      category: "settings",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
    },
    { 
      id: "systemSettings", 
      label: "System", 
      category: "settings",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
    },
    // ADD THIS NEW FACILITY CLOSURES ITEM
    { 
      id: "adminClosures", 
      label: "Facility Closures", 
      category: "settings",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"></path>
      </svg>
    },
  ];

  // Group items by category
  const mainItems = navItems.filter(item => item.category === "main");
  const analyticsItems = navItems.filter(item => item.category === "analytics");
  const archiveItems = navItems.filter(item => item.category === "archive");
  const settingsItems = navItems.filter(item => item.category === "settings");

  const handleNavClick = (viewId) => {
    setView(viewId);
    setMobileMenuOpen(false);
  };

  // Helper function to check if any item in a category is active
  const isCategoryActive = (items) => {
    return items.some(item => item.id === currentView);
  };

  // Navigation content component (reused for both desktop and mobile)
  const NavigationContent = ({ isMobileView = false }) => (
    <div className="flex flex-col h-full bg-[#030303] w-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
      <div className="flex flex-col flex-grow w-full py-2">
        {/* Main Items */}
        <div className="grid grid-cols-1 gap-0.5">
          {mainItems.map(({ id, label, svg }) => (
            <button
              key={id}
              ref={(el) => (navRefs.current[id] = el)}
              onClick={() => handleNavClick(id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-200 focus:outline-none border-l-4 cursor-pointer ${
                currentView === id
                  ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white font-medium border-red-500"
                  : "text-gray-300 border-transparent hover:bg-gray-800/80 hover:text-white hover:border-gray-500"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex-shrink-0 ${currentView === id ? "text-red-400" : "text-gray-400"}`}>
                  {svg}
                </div>
                <span className="text-sm font-medium truncate">{label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Analytics Dropdown Section */}
        <div className="mt-2">
          <button
            onClick={() => toggleDropdown('analytics')}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-all duration-200 focus:outline-none cursor-pointer ${
              isCategoryActive(analyticsItems)
                ? "text-red-400 bg-gray-800/50"
                : "text-gray-300 hover:bg-gray-800/80 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 size={18} className="flex-shrink-0" />
              <span className="text-sm font-medium">Analytics</span>
            </div>
            {openDropdowns.analytics ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
          
          {openDropdowns.analytics && (
            <div className="ml-4 pl-2 border-l border-gray-700/50">
              {analyticsItems.map(({ id, label, svg }) => (
                <button
                  key={id}
                  ref={(el) => (navRefs.current[id] = el)}
                  onClick={() => handleNavClick(id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-all duration-200 focus:outline-none border-l-4 cursor-pointer ${
                    currentView === id
                      ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white font-medium border-red-500"
                      : "text-gray-300 border-transparent hover:bg-gray-800/80 hover:text-white hover:border-gray-500"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex-shrink-0 ${currentView === id ? "text-red-400" : "text-gray-400"}`}>
                      {svg}
                    </div>
                    <span className="text-sm font-medium truncate">{label}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Archive Dropdown Section */}
        <div className="mt-1">
          <button
            onClick={() => toggleDropdown('archive')}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-all duration-200 focus:outline-none cursor-pointer ${
              isCategoryActive(archiveItems)
                ? "text-red-400 bg-gray-800/50"
                : "text-gray-300 hover:bg-gray-800/80 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <Archive size={18} className="flex-shrink-0" />
              <span className="text-sm font-medium">Archive</span>
            </div>
            {openDropdowns.archive ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
          
          {openDropdowns.archive && (
            <div className="ml-4 pl-2 border-l border-gray-700/50">
              {archiveItems.map(({ id, label, svg }) => (
                <button
                  key={id}
                  ref={(el) => (navRefs.current[id] = el)}
                  onClick={() => handleNavClick(id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-all duration-200 focus:outline-none border-l-4 cursor-pointer ${
                    currentView === id
                      ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white font-medium border-red-500"
                      : "text-gray-300 border-transparent hover:bg-gray-800/80 hover:text-white hover:border-gray-500"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex-shrink-0 ${currentView === id ? "text-red-400" : "text-gray-400"}`}>
                      {svg}
                    </div>
                    <span className="text-sm font-medium truncate">{label}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Settings Dropdown Section */}
        <div className="mt-1">
          <button
            onClick={() => toggleDropdown('settings')}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-all duration-200 focus:outline-none cursor-pointer ${
              isCategoryActive(settingsItems)
                ? "text-red-400 bg-gray-800/50"
                : "text-gray-300 hover:bg-gray-800/80 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <Cog size={18} className="flex-shrink-0" />
              <span className="text-sm font-medium">Settings</span>
            </div>
            {openDropdowns.settings ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
          
          {openDropdowns.settings && (
            <div className="ml-4 pl-2 border-l border-gray-700/50">
              {settingsItems.map(({ id, label, svg }) => (
                <button
                  key={id}
                  ref={(el) => (navRefs.current[id] = el)}
                  onClick={() => handleNavClick(id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-all duration-200 focus:outline-none border-l-4 cursor-pointer ${
                    currentView === id
                      ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white font-medium border-red-500"
                      : "text-gray-300 border-transparent hover:bg-gray-800/80 hover:text-white hover:border-gray-500"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex-shrink-0 ${currentView === id ? "text-red-400" : "text-gray-400"}`}>
                      {svg}
                    </div>
                    <span className="text-sm font-medium truncate">{label}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Logout Button */}
      <div className="mt-auto border-t border-gray-800 bg-[#0a0a0a] w-full flex-shrink-0">
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('showLogoutModal'));
            }
            setMobileMenuOpen(false);
          }}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-red-900/30 hover:text-red-300 transition-all duration-200 hover:border-l-4 hover:border-red-500 cursor-pointer group"
        >
          <div className="text-gray-400 flex-shrink-0 group-hover:text-red-300 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16,17 21,12 16,7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </div>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile, visible on md and up */}
      <aside className="hidden md:block">
        <div className="fixed top-0 left-0 h-screen w-[250px] bg-[#030303] p-0 flex flex-col border-r border-gray-800 z-[99999] shadow-xl">
          {/* Logo + Title */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-800 bg-[#0a0a0a] z-[9999] w-full">
            <img src={Logo} alt="Logo" className="h-[40px] w-[40px] flex-shrink-0 rounded-lg" />
            <h1 className="text-[16px] font-semibold text-gray-100 leading-tight truncate tracking-wide">
              USA | CircuLink
            </h1>
          </div>
          <NavigationContent isMobileView={false} />
        </div>
      </aside>

      {/* Mobile Menu Button - Visible only on mobile */}
      <button
        className="mobile-menu-button md:hidden fixed top-4 left-4 z-[100000] bg-[#CC0000] text-white p-2 rounded-lg shadow-lg hover:bg-red-700 transition-colors"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[100000] md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar - Slide in from left */}
      <aside
        className={`mobile-sidebar fixed top-0 left-0 h-screen w-[280px] bg-[#030303] flex flex-col border-r border-gray-800 z-[100001] shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo + Title - Mobile */}
        <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-800 bg-[#0a0a0a] w-full">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="Logo" className="h-[36px] w-[36px] flex-shrink-0 rounded-lg" />
            <h1 className="text-[14px] font-semibold text-gray-100 leading-tight truncate tracking-wide">
              USA | CircuLink
            </h1>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="text-gray-400 hover:text-white p-1"
          >
            <X size={20} />
          </button>
        </div>
        <NavigationContent isMobileView={true} />
      </aside>

      {/* Add custom scrollbar styles */}
      <style>{`
        /* Custom scrollbar for sidebar */
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #1f1f1f;
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #4a4a4a;
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #6b6b6b;
        }
        
        /* Smooth transitions */
        .transition-transform {
          transition-property: transform;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 300ms;
        }
      `}</style>
    </>
  );
}

export default AdminNavigation;