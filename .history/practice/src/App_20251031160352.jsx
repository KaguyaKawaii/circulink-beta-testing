import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import api from "./utils/api";
import socket from "./utils/socket";


/* --------------- shared components --------------- */
import Header from "./Homepage/Header.jsx";
import Body from "./Homepage/Body.jsx";
import Body2 from "./Homepage/Body2.jsx";
import Body3 from "./Homepage/Body3.jsx";
import Body4 from "./Homepage/Body4.jsx";
import Body5 from "./Homepage/Body5.jsx";
import Footer from "./Homepage/Footer.jsx";
import Login_User from "./Login/Login_User.jsx";
import Login_Admin from "./Login/Login_Admin.jsx";
import SignUp_User from "./Login/SignUp_User.jsx";
import ResetPassword from "./Login/ResetPassword.jsx";
import MaintenanceScreen from "./Homepage/MaintenanceScreen.jsx";
import Developers from "./Homepage/Links/Developers.jsx"; // Add this import


/* ---- user ---- */
import Navigation from "./User/Navigation_User.jsx";
import Dashboard from "./User/Dashboard.jsx";
import History from "./User/History.jsx";
import Notification from "./User/Notification.jsx";
import Profile from "./User/Profile.jsx";
import ReserveRoom from "./User/ReserveRoom.jsx";
import ReservationDetails from "./User/ReservationDetails.jsx";
import Messages from "./User/Message.jsx";
import Guidelines from "./User/Guidelines.jsx";
import HelpCenter from "./User/HelpCenter.jsx";
import EditProfile from "./User/EditProfile.jsx";
import Calendar from "./User/Calendar.jsx";
import News from "./User/News.jsx";

/* ---- admin ---- */
import AdminNavigation from "./Admin/AdminNavigation.jsx";
import AdminDashboard from "./Admin/AdminDashboard.jsx";
import AdminReservations from "./Admin/AdminReservations.jsx";
import AdminRooms from "./Admin/AdminRooms.jsx";
import AdminUsers from "./Admin/AdminUsers.jsx";
import AdminMessages from "./Admin/AdminMessages.jsx";
import AdminReports from "./Admin/AdminReports.jsx";
import AdminNotification from "./Admin/AdminNotification.jsx";
import AdminNews from "./Admin/AdminNews.jsx";
import AdminLogs from "./Admin/AdminLogs.jsx";

/* ---- admin archive ---- */
import ArchivedUsers from "./Admin/Archive/ArchivedUsers.jsx";
import ArchivedReservations from "./Admin/Archive/ArchivedReservations.jsx";
import ArchivedReports from "./Admin/Archive/ArchivedReports.jsx";
import ArchivedNews from "./Admin/Archive/ArchivedNews.jsx";

/* ---- admin settings ---- */
import ProfileSettings from "./Admin/Settings/ProfileSettings.jsx";
import PasswordSecurity from "./Admin/Settings/PasswordSecurity.jsx";
import SystemSettings from "./Admin/Settings/SystemSettings.jsx";

/* ---- staff ---- */
import StaffNavigation from "./Staff/StaffNavigation.jsx";
import StaffDashboard from "./Staff/StaffDashboard.jsx";
import StaffReservations from "./Staff/StaffReservations.jsx";
import StaffUsers from "./Staff/StaffUsers.jsx";
import StaffMessages from "./Staff/StaffMessages.jsx";
import StaffNotification from "./Staff/StaffNotifications.jsx";
import StaffProfile from "./Staff/StaffProfile.jsx";
import StaffReports from "./Staff/StaffReports.jsx";

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState("home");
  const [isInitialized, setIsInitialized] = useState(false);
  const [viewHistory, setViewHistory] = useState(["home"]); // Track navigation history

  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [allowAdminAccess, setAllowAdminAccess] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isMaintenanceChecked, setIsMaintenanceChecked] = useState(false);

  /* ---------- ROUTE MAP ---------- */
  const viewToPath = {
    home: "/",
    maintenance: "/maintenance",
    login: "/login",
    signup: "/signup",
    adminLogin: "/admin-login",
    dashboard: "/dashboard",
  developers: "/developers", // Add this route
    news: "/news",
    calendar: "/calendar",
    history: "/history",
    notification: "/notification",
    messages: "/messages",
    profile: "/profile",
    editProfile: "/edit-profile",
    reserve: "/reserve",
    guidelines: "/guidelines",
    help: "/help",
    resetPassword: "/reset-password",
    reservationDetails: "/reservation-details",
    adminDashboard: "/admin/dashboard",
    adminReservation: "/admin/reservations",
    adminRoom: "/admin/rooms",
    adminUsers: "/admin/users",
    adminMessage: "/admin/messages",
    adminReports: "/admin/reports",
    adminNotifications: "/admin/notifications",
    adminNews: "/admin/news",
    adminLogs: "/admin/logs",
    archivedUsers: "/admin/archive/users",
    archivedReservations: "/admin/archive/reservations",
    archivedReports: "/admin/archive/reports",
    archivedNews: "/admin/archive/news",
    profileSettings: "/admin/settings/profile",
    passwordSecurity: "/admin/settings/password-security",
    systemSettings: "/admin/settings/system",
    staffDashboard: "/staff/dashboard",
    staffReservation: "/staff/reservations",
    staffUsers: "/staff/users",
    staffMessages: "/staff/messages",
    staffNotification: "/staff/notifications",
    staffProfile: "/staff/profile",
    staffReports: "/staff/reports"
  };

  const pathToView = Object.fromEntries(
    Object.entries(viewToPath).map(([v, p]) => [p, v])
  );

  /* ---------- TRACK VIEW HISTORY ---------- */
  useEffect(() => {
    if (!isInitialized) return;

    // Add current view to history when it changes
    setViewHistory(prev => {
      // Don't add consecutive duplicates
      if (prev[prev.length - 1] === view) return prev;
      
      const newHistory = [...prev, view];
      // Keep only last 20 entries to prevent memory issues
      return newHistory.slice(-20);
    });
  }, [view, isInitialized]);

  /* ---------- INITIAL ROUTE SETUP ---------- */
  useEffect(() => {
    if (isInitialized) return;

    const initializeView = () => {
      const path = location.pathname;
      const viewFromPath = pathToView[path];
      
      console.log("Initial route setup:", { path, viewFromPath, user: user?.role });
      
      if (viewFromPath) {
        setView(viewFromPath);
        setViewHistory([viewFromPath]);
      } else {
        // Handle unknown routes - redirect to appropriate dashboard or home
        if (user) {
          const role = user.role.toLowerCase();
          if (role === "staff") {
            setView("staffDashboard");
            setViewHistory(["staffDashboard"]);
            navigate("/staff/dashboard", { replace: true });
          } else if (role === "admin") {
            setView("adminDashboard");
            setViewHistory(["adminDashboard"]);
            navigate("/admin/dashboard", { replace: true });
          } else {
            setView("dashboard");
            setViewHistory(["dashboard"]);
            navigate("/dashboard", { replace: true });
          }
        } else {
          setView("home");
          setViewHistory(["home"]);
          navigate("/", { replace: true });
        }
      }
      
      setIsInitialized(true);
    };

    initializeView();
  }, [location.pathname, user, isInitialized]);

  /* ---------- ROUTE SYNC ---------- */
  useEffect(() => {
    if (!isInitialized) return;

    // Only sync to URL when view changes (not during initial load)
    const path = viewToPath[view];
    if (path && path !== location.pathname) {
      console.log("Syncing view to URL:", { view, path, currentPath: location.pathname });
      navigate(path, { replace: false }); // Use push instead of replace for proper history
    }
  }, [view, isInitialized]);

  /* ---------- BACK BUTTON HANDLING ---------- */
  useEffect(() => {
    const handlePopState = () => {
      console.log("Back button pressed, current view history:", viewHistory);
      
      if (viewHistory.length > 1) {
        // Go back to previous view in history
        const previousView = viewHistory[viewHistory.length - 2];
        console.log("Navigating back to:", previousView);
        
        // Remove current view from history
        setViewHistory(prev => prev.slice(0, -1));
        setView(previousView);
      } else {
        // If no history, go to home or appropriate default
        if (user) {
          const role = user.role.toLowerCase();
          if (role === "staff") setView("staffDashboard");
          else if (role === "admin") setView("adminDashboard");
          else setView("dashboard");
        } else {
          setView("home");
        }
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [viewHistory, user]);

  /* ---------- FORCE LOGOUT FUNCTION ---------- */
  const handleForceLogout = () => {
    const userRole = user?.role;
    const userEmail = user?.email;
    
    localStorage.clear();
    setUser(null);
    setViewHistory(["home"]);
    setView("maintenance");
    
    console.log(`Force logged out ${userRole} user: ${userEmail} due to maintenance mode`);
  };

  /* ---------- MAINTENANCE MODE CHECK ---------- */
  const handleMaintenanceRedirect = (maintenanceData) => {
    if (!maintenanceData.maintenanceMode) {
      if (view === "maintenance") {
        if (user) {
          const role = user.role.toLowerCase();
          if (role === "staff") setView("staffDashboard");
          else if (role === "admin") setView("adminDashboard");
          else setView("dashboard");
        } else {
          setView("home");
        }
      }
      return;
    }

    const isAdmin = user?.role === 'admin';
    const isStaff = user?.role === 'staff';
    const isAdminPage = view.startsWith('admin');
    const isStaffPage = view.startsWith('staff');
    const isAdminLogin = view === 'adminLogin';
    const isPublicAuthPage = ['login', 'signup', 'resetPassword', 'adminLogin'].includes(view);
    const isMaintenancePage = view === 'maintenance';
    
    // Allow access for admins (if allowed), staff, public auth pages, and maintenance page
    const canAccess = (isAdmin && maintenanceData.allowAdminAccess) || 
                     isStaff ||
                     isPublicAuthPage || 
                     isMaintenancePage;
    
    // If maintenance mode is active and user is not allowed, force logout non-admin users
    if (maintenanceData.maintenanceMode && user && !canAccess) {
      console.log("Maintenance mode: Force logging out user", user.role, user.email);
      handleForceLogout();
      return;
    }
    
    if (!canAccess && !isMaintenancePage) {
      console.log("Redirecting to maintenance mode. User:", user?.role, "Admin access allowed:", maintenanceData.allowAdminAccess);
      setView("maintenance");
    } else {
      console.log("Access allowed. User:", user?.role, "Admin access allowed:", maintenanceData.allowAdminAccess);
    }
  };

  useEffect(() => {
    checkMaintenanceMode();
    
    socket.on('maintenance-mode-updated', (data) => {
      console.log("Maintenance mode updated via socket:", data);
      setMaintenanceMode(data.maintenanceMode);
      setMaintenanceMessage(data.maintenanceMessage || "");
      setAllowAdminAccess(data.allowAdminAccess);
      
      if (data.maintenanceMode) {
        // Check if current user should be force logged out
        const isAdmin = user?.role === 'admin';
        const canStayLoggedIn = (isAdmin && data.allowAdminAccess);
        
        if (user && !canStayLoggedIn) {
          console.log("Maintenance mode activated - force logging out user", user.role);
          handleForceLogout();
        } else {
          handleMaintenanceRedirect(data);
        }
      } else {
        // Maintenance mode turned off
        if (view === "maintenance") {
          if (user) {
            const role = user.role.toLowerCase();
            if (role === "staff") setView("staffDashboard");
            else if (role === "admin") setView("adminDashboard");
            else setView("dashboard");
          } else {
            setView("home");
          }
        }
      }
    });

    const interval = setInterval(checkMaintenanceMode, 30000);
    return () => {
      clearInterval(interval);
      socket.off('maintenance-mode-updated');
    };
  }, [view, user]);

  const checkMaintenanceMode = async () => {
    try {
      // Use the same endpoint that SystemSettings uses
      const response = await api.get('/admin/system/settings');
      if (response.data.success) {
        const settings = response.data.settings || {};
        console.log("Fetched maintenance settings:", settings);
        
        setMaintenanceMode(settings.maintenanceMode || false);
        setMaintenanceMessage(settings.maintenanceMessage || "");
        setAllowAdminAccess(settings.allowAdminAccess !== undefined ? settings.allowAdminAccess : true);
        
        handleMaintenanceRedirect({
          maintenanceMode: settings.maintenanceMode || false,
          maintenanceMessage: settings.maintenanceMessage || "",
          allowAdminAccess: settings.allowAdminAccess !== undefined ? settings.allowAdminAccess : true
        });
      }
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
      // If there's an error, assume no maintenance mode
      setMaintenanceMode(false);
      setMaintenanceMessage("");
      setAllowAdminAccess(true);
    } finally {
      setIsLoading(false);
      setIsMaintenanceChecked(true);
    }
  };

  /* ---------- MAINTENANCE MODE ACCESS CONTROL ---------- */
  useEffect(() => {
    if (maintenanceMode && isMaintenanceChecked) {
      console.log("Maintenance mode active, checking access...", {
        userRole: user?.role,
        allowAdminAccess,
        currentView: view
      });

      // Force logout non-admin users who are still logged in
      if (user) {
        const isAdmin = user.role === 'admin';
        const canStayLoggedIn = (isAdmin && allowAdminAccess);
        
        if (!canStayLoggedIn) {
          console.log("Force logging out non-admin user during maintenance:", user.role);
          handleForceLogout();
        } else {
          handleMaintenanceRedirect({
            maintenanceMode,
            maintenanceMessage,
            allowAdminAccess
          });
        }
      } else {
        handleMaintenanceRedirect({
          maintenanceMode,
          maintenanceMessage,
          allowAdminAccess
        });
      }
    } else if (!maintenanceMode && view === "maintenance" && isMaintenanceChecked) {
      console.log("Maintenance mode disabled, redirecting from maintenance screen");
      if (user) {
        const role = user.role.toLowerCase();
        if (role === "staff") setView("staffDashboard");
        else if (role === "admin") setView("adminDashboard");
        else setView("dashboard");
      } else {
        setView("home");
      }
    }
  }, [view, user, maintenanceMode, isMaintenanceChecked]);

  /* ---------- FETCH USER DATA ---------- */
  const fetchUser = async () => {
    try {
      if (!user?._id) return;
      const { data } = await api.get(`/users/${user._id}`);
      const updatedUser = data.user ?? data;
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  };

  useEffect(() => {
    if (user?._id) fetchUser();
  }, [view]);

  useEffect(() => {
    const handler = (updatedId) => {
      if (updatedId === user?._id) fetchUser();
    };
    socket.on("user-updated", handler);
    return () => socket.off("user-updated", handler);
  }, [user?._id]);

  /* ---------- LOGIN & LOGOUT ---------- */
  const handleLoginSuccess = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    const role = userData.role.toLowerCase();
    
    if (maintenanceMode) {
      if ((role === 'admin' && allowAdminAccess) || role === 'staff') {
        if (role === "staff") {
          setView("staffDashboard");
          setViewHistory(["staffDashboard"]);
        } else {
          setView("adminDashboard");
          setViewHistory(["adminDashboard"]);
        }
      } else {
        setView("maintenance");
        setViewHistory(["maintenance"]);
      }
    } else {
      if (role === "staff") {
        setView("staffDashboard");
        setViewHistory(["staffDashboard"]);
      } else if (role === "admin") {
        setView("adminDashboard");
        setViewHistory(["adminDashboard"]);
      } else {
        setView("dashboard");
        setViewHistory(["dashboard"]);
      }
    }
  };

  const handleSignupSuccess = (newUserData) => {
    handleLoginSuccess(newUserData);
  };

  const handleAdminLoginSuccess = (adminData) => {
    localStorage.setItem("user", JSON.stringify(adminData));
    setUser(adminData);
    
    if (maintenanceMode && !allowAdminAccess) {
      setView("maintenance");
      setViewHistory(["maintenance"]);
    } else {
      setView("adminDashboard");
      setViewHistory(["adminDashboard"]);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setShowLogoutModal(false);
    setViewHistory(["home"]);
    if (maintenanceMode) {
      setView("maintenance");
    } else {
      setView("home");
    }
  };

  /* ---------- NAVIGATION WRAPPERS ---------- */
  const renderUserNavigation = (Component) => (
    <>
      <Navigation
        user={user}
        setView={setView}
        currentView={view}
        onLogout={() => setShowLogoutModal(true)}
      />
      {Component}
    </>
  );

  const renderAdminNavigation = (Component) => (
    <>
      <AdminNavigation
        admin={user}
        setView={setView}
        currentView={view}
        onLogout={() => setShowLogoutModal(true)}
      />
      {Component}
    </>
  );

  const renderStaffNavigation = (Component) => (
    <>
      <StaffNavigation
        staff={user}
        setView={setView}
        currentView={view}
        onLogout={() => setShowLogoutModal(true)}
      />
      {Component}
    </>
  );

  /* ---------- CHECK IF CURRENT VIEW IS ALLOWED ---------- */
  const isViewAllowed = () => {
    if (!maintenanceMode) return true;
    
    const isAdmin = user?.role === 'admin';
    const isStaff = user?.role === 'staff';
    const isAdminPage = view.startsWith('admin');
    const isStaffPage = view.startsWith('staff');
    const isAdminLogin = view === 'adminLogin';
    const isPublicAuthPage = ['login', 'signup', 'resetPassword', 'adminLogin'].includes(view);
    const isMaintenancePage = view === 'maintenance';
    
    return (isAdmin && allowAdminAccess) || 
           isStaff ||
           isPublicAuthPage || 
           isMaintenancePage;
  };

  /* ---------- RENDER ---------- */
  
  if (isLoading) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
         
        </div>
        
        {/* Loading Text */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading CircuLink</h3>
          <p className="text-gray-600">Please wait while we set things up</p>
        </div>
        
        {/* Simple Horizontal Bar */}
        <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto overflow-hidden">
          <div className="h-full bg-red-600 rounded-full animate-pulse"></div>
        </div>
        
        
      </div>
    </div>
  );
}
  

  // Only show maintenance screen after maintenance check is complete
  if (maintenanceMode && isMaintenanceChecked && !isViewAllowed()) {
    console.log("Showing maintenance screen. User role:", user?.role, "Admin access allowed:", allowAdminAccess);
    return (
      <MaintenanceScreen 
        message={maintenanceMessage}
        setView={setView}
      />
    );
  }

  return (
    <div>
      {/* Public Pages */}
      {view === "home" && (
        <>
          <Header 
            onLoginClick={() => setView("login")} 
            onSignUpClick={() => setView("signup")}
          />
          <Body onReserveClick={() => setView("login")} />
          <Body2 />
          <Body3 />
          <Body4 />
          <Body5 />
          <Footer />
        </>
      )}
      {view === "developers" && <Developers />} {/* Add this line */}

      {view === "login" && (
        <Login_User
          onSwitchToSignUp={() => setView("signup")}
          onLoginSuccess={handleLoginSuccess}
          setView={setView}
          maintenanceMode={maintenanceMode}
          maintenanceMessage={maintenanceMessage}
        />
      )}
      {view === "signup" && (
        <SignUp_User
          onSwitchToLogin={() => setView("login")}
          onSignupSuccess={handleSignupSuccess}
          maintenanceMode={maintenanceMode}
          maintenanceMessage={maintenanceMessage}
        />
      )}
      {view === "resetPassword" && <ResetPassword setView={setView} onBackToLogin={() => setView("login")} />}
      {view === "adminLogin" && (
        <Login_Admin
          onAdminLoginSuccess={handleAdminLoginSuccess}
          onBackToUserLogin={() => setView("login")}
        />
      )}

      {/* Maintenance Screen */}
      {view === "maintenance" && (
        <MaintenanceScreen 
          message={maintenanceMessage}
          setView={setView}
        />
      )}

      {/* User Pages */}
      {view === "dashboard" &&
        renderUserNavigation(
          <Dashboard
            user={user}
            setView={setView}
            setSelectedReservation={setSelectedReservation}
          />
        )}
      {view === "news" && renderUserNavigation(<News user={user} setView={setView} />)}
      {view === "calendar" && renderUserNavigation(<Calendar user={user} setView={setView} />)}
      {view === "history" &&
        renderUserNavigation(
          <History
            user={user}
            setView={setView}
            setSelectedReservation={setSelectedReservation}
            refreshKey={historyRefreshKey}
          />
        )}
      {view === "notification" &&
        renderUserNavigation(
          <Notification
            user={user}
            setView={setView}
            setSelectedReservation={setSelectedReservation}
          />
        )}
      {view === "messages" && renderUserNavigation(<Messages user={user} setView={setView} />)}
      {view === "profile" && renderUserNavigation(<Profile user={user} setView={setView} />)}
      {view === "editProfile" && renderUserNavigation(<EditProfile user={user} setView={setView} />)}
      {view === "guidelines" && renderUserNavigation(<Guidelines user={user} setView={setView} />)}
      {view === "help" && renderUserNavigation(<HelpCenter user={user} setView={setView} />)}
      {view === "reserve" &&
        renderUserNavigation(
          <ReserveRoom
            user={user}
            setView={setView}
            onReservationSubmitted={() => setHistoryRefreshKey((prev) => prev + 1)}
          />
        )}
      {view === "reservationDetails" && 
        renderUserNavigation(
          <ReservationDetails
            reservation={selectedReservation}
            setView={setView}
            refreshReservations={() => setHistoryRefreshKey((prev) => prev + 1)}
            user={user}
          />
        )}

      {/* Admin Pages */}
      {view === "adminDashboard" && renderAdminNavigation(<AdminDashboard setView={setView} />)}
      {view === "adminReservation" && renderAdminNavigation(<AdminReservations setView={setView} />)}
      {view === "adminRoom" && renderAdminNavigation(<AdminRooms setView={setView} />)}
      {view === "adminUsers" && renderAdminNavigation(<AdminUsers setView={setView} />)}
      {view === "adminMessage" && renderAdminNavigation(<AdminMessages setView={setView} />)}
      {view === "adminReports" && renderAdminNavigation(<AdminReports setView={setView} />)}
      {view === "adminNotifications" && renderAdminNavigation(<AdminNotification setView={setView} />)}
      {view === "archivedUsers" && renderAdminNavigation(<ArchivedUsers setView={setView} />)}
      {view === "archivedReservations" && renderAdminNavigation(<ArchivedReservations setView={setView} />)}
      {view === "archivedReports" && renderAdminNavigation(<ArchivedReports setView={setView} />)}
      {view === "archivedNews" && renderAdminNavigation(<ArchivedNews setView={setView} />)}
      {view === "adminNews" && renderAdminNavigation(<AdminNews setView={setView} />)}
      {view === "adminLogs" && renderAdminNavigation(<AdminLogs setView={setView} />)}

      {/* Admin Settings Pages */}
      {view === "profileSettings" && renderAdminNavigation(<ProfileSettings setView={setView} admin={user} />)}
      {view === "passwordSecurity" && renderAdminNavigation(<PasswordSecurity setView={setView} admin={user} />)}
      {view === "systemSettings" && renderAdminNavigation(<SystemSettings setView={setView} admin={user} />)}

      {/* Staff Pages */}
      {view === "staffDashboard" && renderStaffNavigation(<StaffDashboard setView={setView} staff={user} />)}
      {view === "staffReservation" && renderStaffNavigation(<StaffReservations setView={setView} staff={user} />)}
      {view === "staffUsers" && renderStaffNavigation(<StaffUsers setView={setView} staff={user} />)}
      {view === "staffMessages" && renderStaffNavigation(<StaffMessages setView={setView} staff={user} />)}
      {view === "staffNotification" && renderStaffNavigation(<StaffNotification setView={setView} staff={user} />)}
      {view === "staffProfile" && renderStaffNavigation(<StaffProfile setView={setView} staff={user} />)}
      {view === "staffReports" && renderStaffNavigation(<StaffReports setView={setView} staff={user} />)}

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[360px] rounded-xl bg-white shadow-2xl px-6 py-8 relative">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="mb-3 flex items-center justify-center w-14 h-14 rounded-full bg-red-100">
                <LogOut size={28} className="text-[#CC0000]" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">
                Log out of your account?
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                You'll need to sign in again to access your dashboard.
              </p>
            </div>
            <div className="border-t border-gray-200 mb-6" />
            <div className="flex justify-between">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 mr-3 px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                No, stay
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-5 py-2 bg-[#CC0000] text-white rounded-lg hover:bg-red-600 cursor-pointer"
              >
                Yes, log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;