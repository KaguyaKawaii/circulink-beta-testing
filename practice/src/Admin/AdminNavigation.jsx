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
} from "lucide-react";

function AdminNavigation({ admin, setView, currentView, onLogout }) {
  const navRefs = useRef({});
  const [profile, setProfile] = useState(() =>
    admin || JSON.parse(localStorage.getItem("admin") || "{}")
  );

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

  // Combined Navigation Items with categories - icons slightly larger for better visibility
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
      label: "Reports", 
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

    // Settings
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
  ];

  // Group items by category
  const mainItems = navItems.filter(item => item.category === "main");
  const analyticsItems = navItems.filter(item => item.category === "analytics");
  const archiveItems = navItems.filter(item => item.category === "archive");
  const settingsItems = navItems.filter(item => item.category === "settings");

  const handleNavClick = (viewId) => {
    setView(viewId);
  };

  return (
    <>
      <aside>
        {/* Sidebar - ORIGINAL WIDTH 250px preserved */}
        <div className="fixed top-0 left-0 h-screen w-[250px] bg-[#030303] p-0 flex flex-col border-r border-gray-800 z-[99999] shadow-xl">
          
          {/* Logo + Title - Increased padding and font size */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-800 bg-[#0a0a0a] z-[9999] w-full">
            <img src={Logo} alt="Logo" className="h-[40px] w-[40px] flex-shrink-0 rounded-lg" />
            <h1 className="text-[16px] font-semibold text-gray-100 leading-tight truncate tracking-wide">
              USA | CircuLink
            </h1>
          </div>

          {/* Navigation - Enhanced spacing and larger text, NO SCROLLING */}
          <div className="flex flex-col h-full bg-[#030303] pointer-events-auto w-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            <div className="flex flex-col flex-grow pointer-events-auto w-full py-2">
              
              {/* Main Items - Most Used - INCREASED padding and text size */}
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

              {/* Section Divider - Analytics - Enhanced typography */}
              <div className="px-4 py-2 mt-2">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Analytics
                </h3>
              </div>

              {/* Analytics Items */}
              <div className="grid grid-cols-1 gap-0.5">
                {analyticsItems.map(({ id, label, svg }) => (
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

              {/* Section Divider - Archive */}
              <div className="px-4 py-2 mt-2">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Archive
                </h3>
              </div>

              {/* Archive Items */}
              <div className="grid grid-cols-1 gap-0.5">
                {archiveItems.map(({ id, label, svg }) => (
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

              {/* Section Divider - Settings */}
              <div className="px-4 py-2 mt-2">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Settings
                </h3>
              </div>

              {/* Settings Items */}
              <div className="grid grid-cols-1 gap-0.5">
                {settingsItems.map(({ id, label, svg }) => (
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
            </div>

            {/* Logout - Enhanced size and better visual */}
            <div className="mt-auto border-t border-gray-800 bg-[#0a0a0a] w-full flex-shrink-0">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('showLogoutModal'));
                  }
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
        </div>
      </aside>
    </>
  );
}

export default AdminNavigation;