import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";

// Services
import api from "./utils/api";
import socket from "./utils/socket";
import AuthService from "./services/authService";
import MaintenanceService from "./services/maintenanceService";
import NavigationService from "./services/navigationService";
import UserService from "./services/userService";

// Config
import { viewToPath, pathToView } from "./config/routes";

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
import Developers from "./Homepage/Links/Developers.jsx";

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

  // State using services
  const [user, setUser] = useState(() => AuthService.getUser());
  const [view, setView] = useState("home");
  const [isInitialized, setIsInitialized] = useState(false);
  const [viewHistory, setViewHistory] = useState(["home"]);

  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Maintenance state
  const [maintenanceData, setMaintenanceData] = useState({
    maintenanceMode: false,
    maintenanceMessage: "",
    allowAdminAccess: true
  });

  /* ---------- TRACK VIEW HISTORY ---------- */
  useEffect(() => {
    if (!isInitialized) return;

    setViewHistory(prev => {
      if (prev[prev.length - 1] === view) return prev;
      const newHistory = [...prev, view];
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
      
      if (viewFromPath && NavigationService.isRouteAllowed(user?.role, viewFromPath)) {
        setView(viewFromPath);
        setViewHistory([viewFromPath]);
      } else {
        // Handle unknown routes using NavigationService
        const defaultRoute = NavigationService.getDefaultRoute(user?.role);
        setView(defaultRoute);
        setViewHistory([defaultRoute]);
        navigate(viewToPath[defaultRoute], { replace: true });
      }
      
      setIsInitialized(true);
    };

    initializeView();
  }, [location.pathname, user, isInitialized]);

  /* ---------- ROUTE SYNC ---------- */
  useEffect(() => {
    if (!isInitialized) return;

    const path = viewToPath[view];
    if (path && path !== location.pathname) {
      console.log("Syncing view to URL:", { view, path, currentPath: location.pathname });
      navigate(path, { replace: false });
    }
  }, [view, isInitialized]);

  /* ---------- BACK BUTTON HANDLING ---------- */
  useEffect(() => {
    const handlePopState = () => {
      console.log("Back button pressed, current view history:", viewHistory);
      
      if (viewHistory.length > 1) {
        const previousView = viewHistory[viewHistory.length - 2];
        console.log("Navigating back to:", previousView);
        
        setViewHistory(prev => prev.slice(0, -1));
        setView(previousView);
      } else {
        const defaultRoute = NavigationService.getDefaultRoute(user?.role);
        setView(defaultRoute);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [viewHistory, user]);

  /* ---------- FORCE LOGOUT FUNCTION ---------- */
  const handleForceLogout = () => {
    const userRole = user?.role;
    const userEmail = user?.email;
    
    AuthService.clearUser();
    setUser(null);
    setViewHistory(["home"]);
    setView("maintenance");
    
    console.log(`Force logged out ${userRole} user: ${userEmail} due to maintenance mode`);
  };

  /* ---------- MAINTENANCE MODE CHECK ---------- */
  const handleMaintenanceRedirect = (maintenanceSettings) => {
    if (!maintenanceSettings.maintenanceMode) {
      if (view === "maintenance") {
        const defaultRoute = NavigationService.getDefaultRoute(user?.role);
        setView(defaultRoute);
      }
      return;
    }

    // Use MaintenanceService to check access
    const canAccess = MaintenanceService.canAccessDuringMaintenance(user?.role, view);
    
    if (maintenanceSettings.maintenanceMode && user && !canAccess) {
      console.log("Maintenance mode: Force logging out user", user.role, user.email);
      handleForceLogout();
      return;
    }
    
    if (!canAccess && view !== "maintenance") {
      console.log("Redirecting to maintenance mode. User:", user?.role, "Admin access allowed:", maintenanceSettings.allowAdminAccess);
      setView("maintenance");
    } else {
      console.log("Access allowed. User:", user?.role, "Admin access allowed:", maintenanceSettings.allowAdminAccess);
    }
  };

  useEffect(() => {
    const initializeMaintenance = async () => {
      const settings = await MaintenanceService.checkMaintenanceMode();
      setMaintenanceData(settings);
      setIsLoading(false);
      handleMaintenanceRedirect(settings);
    };

    // Setup socket listener using MaintenanceService
    const cleanupSocket = MaintenanceService.setupMaintenanceListener((data) => {
      console.log("Maintenance mode updated via socket:", data);
      setMaintenanceData(data);
      
      if (data.maintenanceMode) {
        const canStayLoggedIn = MaintenanceService.canAccessDuringMaintenance(user?.role, view);
        
        if (user && !canStayLoggedIn) {
          console.log("Maintenance mode activated - force logging out user", user.role);
          handleForceLogout();
        } else {
          handleMaintenanceRedirect(data);
        }
      } else {
        if (view === "maintenance") {
          const defaultRoute = NavigationService.getDefaultRoute(user?.role);
          setView(defaultRoute);
        }
      }
    });

    initializeMaintenance();

    const interval = setInterval(async () => {
      const settings = await MaintenanceService.checkMaintenanceMode();
      setMaintenanceData(settings);
    }, 30000);

    return () => {
      clearInterval(interval);
      cleanupSocket();
    };
  }, [view, user]);

  /* ---------- MAINTENANCE MODE ACCESS CONTROL ---------- */
  useEffect(() => {
    if (maintenanceData.maintenanceMode) {
      console.log("Maintenance mode active, checking access...", {
        userRole: user?.role,
        allowAdminAccess: maintenanceData.allowAdminAccess,
        currentView: view
      });

      // Allow admin-related views during maintenance
      const adminRoutes = ['adminLogin', 'adminDashboard', 'adminReservation', 'adminRoom', 'adminUsers', 'adminMessage', 'adminReports', 'adminNotifications', 'adminNews', 'adminLogs'];
      const isAdminRoute = adminRoutes.includes(view);
      
      if (user) {
        const canStayLoggedIn = MaintenanceService.canAccessDuringMaintenance(user.role, view);
        
        if (!canStayLoggedIn && !isAdminRoute) {
          console.log("Force logging out non-admin user during maintenance:", user.role);
          handleForceLogout();
        }
      } else {
        // For non-logged in users, only allow admin login and maintenance views
        if (view !== 'adminLogin' && view !== 'maintenance' && !isAdminRoute) {
          setView("maintenance");
        }
      }
    } else if (!maintenanceData.maintenanceMode && view === "maintenance") {
      console.log("Maintenance mode disabled, redirecting from maintenance screen");
      const defaultRoute = NavigationService.getDefaultRoute(user?.role);
      setView(defaultRoute);
    }
  }, [view, user, maintenanceData]);

  /* ---------- FETCH USER DATA ---------- */
  const fetchUser = async () => {
    try {
      if (!user?._id) return;
      const updatedUser = await UserService.fetchUser(user._id);
      if (updatedUser) {
        setUser(updatedUser);
        AuthService.setUser(updatedUser);
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  };

  useEffect(() => {
    if (user?._id) fetchUser();
  }, [view]);

  useEffect(() => {
    const cleanup = UserService.setupUserUpdateListener(user?._id, fetchUser);
    return cleanup;
  }, [user?._id]);

  /* ---------- LOGIN & LOGOUT ---------- */
  const handleLoginSuccess = (userData) => {
    const updatedUser = AuthService.handleUserLogin(userData);
    setUser(updatedUser);
    const role = userData.role.toLowerCase();
    
    if (maintenanceData.maintenanceMode) {
      if ((role === 'admin' && maintenanceData.allowAdminAccess) || role === 'staff' || role === 'staff_office') {
        const defaultRoute = NavigationService.getDefaultRoute(userData.role);
        setView(defaultRoute);
        setViewHistory([defaultRoute]);
      } else {
        setView("maintenance");
        setViewHistory(["maintenance"]);
      }
    } else {
      const defaultRoute = NavigationService.getDefaultRoute(userData.role);
      setView(defaultRoute);
      setViewHistory([defaultRoute]);
    }
  };

  const handleSignupSuccess = (newUserData) => {
    handleLoginSuccess(newUserData);
  };

  const handleAdminLoginSuccess = (adminData) => {
    console.log("✅ Admin OTP verified successfully:", adminData);
    
    const updatedAdmin = AuthService.handleAdminLogin(adminData);
    setUser(updatedAdmin);
    
    // Always allow admin to access dashboard during maintenance
    if (maintenanceData.maintenanceMode) {
      if (maintenanceData.allowAdminAccess) {
        // Admin can access during maintenance
        console.log("✅ Maintenance mode active but admin access allowed - redirecting to admin dashboard");
        setView("adminDashboard");
        setViewHistory(["adminDashboard"]);
      } else {
        // Even if admin access is disabled, still let admin login but show maintenance
        console.log("⚠️ Maintenance mode active - admin logged in but showing maintenance screen");
        setView("maintenance");
        setViewHistory(["maintenance"]);
      }
    } else {
      // Normal flow - no maintenance
      console.log("✅ No maintenance mode - redirecting to admin dashboard");
      setView("adminDashboard");
      setViewHistory(["adminDashboard"]);
    }
  };

  const handleLogout = () => {
    AuthService.clearUser();
    setUser(null);
    setShowLogoutModal(false);
    setViewHistory(["home"]);
    if (maintenanceData.maintenanceMode) {
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
      onLogout={() => setShowLogoutModal(true)}  // ← This triggers App.jsx modal
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
      onLogout={() => setShowLogoutModal(true)}  // ← onLogout is passed here
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
      onLogout={() => setShowLogoutModal(true)}  // This should already be here
    />
    {Component}
  </>
);

  /* ---------- CHECK IF CURRENT VIEW IS ALLOWED ---------- */
  const isViewAllowed = () => {
    if (!maintenanceData.maintenanceMode) return true;
    return MaintenanceService.canAccessDuringMaintenance(user?.role, view);
  };

  /* ---------- RENDER ---------- */
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading CircuLink</h3>
            <p className="text-gray-600">Please wait while we set things up</p>
          </div>
          <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto overflow-hidden">
            <div className="h-full bg-red-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Only show maintenance screen if maintenance mode is active and view is not allowed
  if (maintenanceData.maintenanceMode && !isViewAllowed()) {
    console.log("Showing maintenance screen. User role:", user?.role, "Admin access allowed:", maintenanceData.allowAdminAccess);
    return (
      <MaintenanceScreen 
        message={maintenanceData.maintenanceMessage}
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
          <Body5 />
          <Body4 />
          <Footer />
        </>
      )}
      {view === "developers" && <Developers />}

      {view === "login" && (
        <Login_User
          onSwitchToSignUp={() => setView("signup")}
          onLoginSuccess={handleLoginSuccess}
          setView={setView}
          maintenanceMode={maintenanceData.maintenanceMode}
          maintenanceMessage={maintenanceData.maintenanceMessage}
        />
      )}
      {view === "signup" && (
        <SignUp_User
          onSwitchToLogin={() => setView("login")}
          onSignupSuccess={handleSignupSuccess}
          maintenanceMode={maintenanceData.maintenanceMode}
          maintenanceMessage={maintenanceData.maintenanceMessage}
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
          message={maintenanceData.maintenanceMessage}
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



{view === "adminDashboard" && renderAdminNavigation(<AdminDashboard setView={setView} admin={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "adminReservation" && renderAdminNavigation(<AdminReservations setView={setView} admin={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "adminRoom" && renderAdminNavigation(<AdminRooms setView={setView} admin={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "adminUsers" && renderAdminNavigation(<AdminUsers setView={setView} admin={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "adminMessage" && renderAdminNavigation(<AdminMessages setView={setView} admin={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "adminReports" && renderAdminNavigation(<AdminReports setView={setView} admin={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "adminNotifications" && renderAdminNavigation(<AdminNotification setView={setView} admin={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "archivedUsers" && renderAdminNavigation(<ArchivedUsers setView={setView} admin={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "archivedReservations" && renderAdminNavigation(<ArchivedReservations setView={setView} admin={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "archivedReports" && renderAdminNavigation(<ArchivedReports setView={setView} admin={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "archivedNews" && renderAdminNavigation(<ArchivedNews setView={setView} admin={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "adminNews" && renderAdminNavigation(<AdminNews setView={setView} admin={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "adminLogs" && renderAdminNavigation(<AdminLogs setView={setView} admin={user} onLogout={() => setShowLogoutModal(true)} />)}

{/* Admin Settings Pages */}
{view === "profileSettings" && renderAdminNavigation(<ProfileSettings setView={setView} admin={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "passwordSecurity" && renderAdminNavigation(<PasswordSecurity setView={setView} admin={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "systemSettings" && renderAdminNavigation(<SystemSettings setView={setView} admin={user} onLogout={() => setShowLogoutModal(true)} />)}

{/* Staff Pages - UPDATED: Pass onLogout prop to all staff components */}
{view === "staffDashboard" && renderStaffNavigation(<StaffDashboard setView={setView} staff={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "staffReservation" && renderStaffNavigation(<StaffReservations setView={setView} staff={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "staffUsers" && renderStaffNavigation(<StaffUsers setView={setView} staff={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "staffMessages" && renderStaffNavigation(<StaffMessages setView={setView} staff={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "staffNotification" && renderStaffNavigation(<StaffNotification setView={setView} staff={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "staffProfile" && renderStaffNavigation(<StaffProfile setView={setView} staff={user} onLogout={() => setShowLogoutModal(true)} />)}
{view === "staffReports" && renderStaffNavigation(<StaffReports setView={setView} staff={user} onLogout={() => setShowLogoutModal(true)} />)}

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
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