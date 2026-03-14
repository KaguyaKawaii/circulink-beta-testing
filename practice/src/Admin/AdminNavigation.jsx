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
  Archive,
  Newspaper,
  ListOrdered,
  Settings,
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

  // Main Navigation Items
  const mainNavItems = [
    { 
      id: "adminDashboard", 
      label: "Dashboard", 
      icon: LayoutDashboard,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
    },
    { 
      id: "adminReservation", 
      label: "Reservations", 
      icon: CalendarCheck,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
    },
    { 
      id: "adminRoom", 
      label: "Manage Rooms", 
      icon: DoorOpen,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10,17 15,12 10,7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
    },
    { 
      id: "adminUsers", 
      label: "Manage Users", 
      icon: Users,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
    },
    { 
      id: "adminMessage", 
      label: "Messages", 
      icon: MessageSquare,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    },
    { 
      id: "adminReports", 
      label: "Reports", 
      icon: FileText,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10,9 9,9 8,9"></polyline></svg>
    },
    { 
      id: "adminNotifications", 
      label: "Notifications", 
      icon: Bell,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
    },
    { 
      id: "adminNews", 
      label: "Manage News", 
      icon: Newspaper,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>
    },
    { 
      id: "adminLogs", 
      label: "Activity Logs", 
      icon: ListOrdered,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
    },
  ];

  // Analytics Items
  const analyticsItems = [
    { 
      id: "analyticsOverview", 
      label: "Analytics Overview", 
      icon: BarChart3,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
    },
    { 
      id: "analyticsUsers", 
      label: "User Analytics", 
      icon: TrendingUp,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path><polyline points="16 8 20 12 16 16"></polyline><line x1="20" y1="12" x2="12" y2="12"></line></svg>
    },
    { 
      id: "analyticsReservations", 
      label: "Reservation Analytics", 
      icon: PieChart,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
    },
    { 
      id: "analyticsRooms", 
      label: "Room Analytics", 
      icon: Activity,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10,17 15,12 10,7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line><polyline points="22 12 18 12 18 8"></polyline></svg>
    },
    { 
      id: "analyticsEngagement", 
      label: "Engagement Metrics", 
      icon: Activity,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9-4-18-3 9H2"></path></svg>
    },
  ];

  // Archive Items
  const archiveItems = [
    { 
      id: "archivedUsers", 
      label: "Archived Users",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
    },
    { 
      id: "archivedReservations", 
      label: "Archived Reservations",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
    },
    { 
      id: "archivedReports", 
      label: "Archived Reports",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10,9 9,9 8,9"></polyline></svg>
    },
    { 
      id: "archivedNews", 
      label: "Archived News",
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>
    },
  ];

  // Settings Items
  const settingsItems = [
    { 
      id: "profileSettings", 
      label: "Profile Settings", 
      icon: User,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
    },
    { 
      id: "passwordSecurity", 
      label: "Password & Security", 
      icon: Shield,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
    },
    { 
      id: "systemSettings", 
      label: "System Settings", 
      icon: Cog,
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
    },
  ];

  const handleNavClick = (viewId) => {
    setView(viewId);
  };

  return (
    <>
      <aside>
        <div className="fixed top-0 left-0 h-screen w-[250px] bg-[#030303] p-0 flex flex-col border-r border-gray-800 z-[99999]">
          {/* Logo + Title */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-800 bg-[#0a0a0a] z-[9999] w-full">
            <img src={Logo} alt="Logo" className="h-[40px] w-[40px] flex-shrink-0" />
            <h1 className="text-[15px] font-medium text-gray-200 leading-tight truncate">
              University of San Agustin | CircuLink
            </h1>
          </div>

          {/* Navigation - All items visible */}
          <div className="flex flex-col h-full overflow-y-auto bg-[#030303] pointer-events-auto w-full scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            <div className="flex flex-col flex-grow pointer-events-auto w-full">
              {/* Main Navigation Items */}
              {mainNavItems.map(({ id, label, svg }) => (
                <button
                  key={id}
                  ref={(el) => (navRefs.current[id] = el)}
                  onClick={() => handleNavClick(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 focus:outline-none border-l-4 cursor-pointer flex-shrink-0 ${
                    currentView === id
                      ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white font-medium border-red-500 shadow-lg"
                      : "text-gray-400 border-transparent hover:bg-gray-800 hover:text-gray-200 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-gray-300 flex-shrink-0">
                      {svg}
                    </div>
                    <span className="text-sm truncate">{label}</span>
                  </div>
                </button>
              ))}

              {/* Section Divider - Analytics */}
              <div className="px-4 py-2 mt-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Analytics
                </h3>
              </div>

              {/* Analytics Items */}
              {analyticsItems.map(({ id, label, svg }) => (
                <button
                  key={id}
                  ref={(el) => (navRefs.current[id] = el)}
                  onClick={() => handleNavClick(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 focus:outline-none border-l-4 cursor-pointer flex-shrink-0 ${
                    currentView === id
                      ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white font-medium border-red-500 shadow-lg"
                      : "text-gray-400 border-transparent hover:bg-gray-800 hover:text-gray-200 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-gray-300 flex-shrink-0">
                      {svg}
                    </div>
                    <span className="text-sm truncate">{label}</span>
                  </div>
                </button>
              ))}

              {/* Section Divider - Archive */}
              <div className="px-4 py-2 mt-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Archive
                </h3>
              </div>

              {/* Archive Items */}
              {archiveItems.map(({ id, label, svg }) => (
                <button
                  key={id}
                  ref={(el) => (navRefs.current[id] = el)}
                  onClick={() => handleNavClick(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 focus:outline-none border-l-4 cursor-pointer flex-shrink-0 ${
                    currentView === id
                      ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white font-medium border-red-500 shadow-lg"
                      : "text-gray-400 border-transparent hover:bg-gray-800 hover:text-gray-200 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-gray-300 flex-shrink-0">
                      {svg}
                    </div>
                    <span className="text-sm truncate">{label}</span>
                  </div>
                </button>
              ))}

              {/* Section Divider - Settings */}
              <div className="px-4 py-2 mt-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Settings
                </h3>
              </div>

              {/* Settings Items */}
              {settingsItems.map(({ id, label, svg }) => (
                <button
                  key={id}
                  ref={(el) => (navRefs.current[id] = el)}
                  onClick={() => handleNavClick(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 focus:outline-none border-l-4 cursor-pointer flex-shrink-0 ${
                    currentView === id
                      ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white font-medium border-red-500 shadow-lg"
                      : "text-gray-400 border-transparent hover:bg-gray-800 hover:text-gray-200 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-gray-300 flex-shrink-0">
                      {svg}
                    </div>
                    <span className="text-sm truncate">{label}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Logout */}
            <div className="mt-auto border-t border-gray-800 bg-[#0a0a0a] relative z-[99999] pointer-events-auto w-full flex-shrink-0">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('showLogoutModal'));
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-gray-400 hover:bg-red-900/20 hover:text-red-300 transition-all duration-200 hover:border-l-4 hover:border-red-500 cursor-pointer relative z-[99999]"
              >
                <div className="text-gray-400 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16,17 21,12 16,7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
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