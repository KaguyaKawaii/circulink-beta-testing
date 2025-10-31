export const viewToPath = {
  // Public/Marketing Routes
  home: "/",
  maintenance: "/maintenance", 
  login: "/login",
  signup: "/signup",
  adminLogin: "/admin-login",
  resetPassword: "/reset-password",
  developers: "/developers",

  // User App Routes
  dashboard: "/dashboard",
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
  reservationDetails: "/reservation-details",

  // Admin Routes
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

  // Staff Routes
  staffDashboard: "/staff/dashboard",
  staffReservation: "/staff/reservations",
  staffUsers: "/staff/users",
  staffMessages: "/staff/messages",
  staffNotification: "/staff/notifications",
  staffProfile: "/staff/profile",
  staffReports: "/staff/reports"
};

export const pathToView = Object.fromEntries(
  Object.entries(viewToPath).map(([v, p]) => [p, v])
);

// Route categories for code splitting
export const PUBLIC_ROUTES = [
  'home', 'login', 'signup', 'adminLogin', 'resetPassword', 
  'maintenance', 'developers'
];

export const USER_ROUTES = [
  'dashboard', 'news', 'calendar', 'history', 'notification',
  'messages', 'profile', 'editProfile', 'guidelines', 'help',
  'reserve', 'reservationDetails'
];

export const ADMIN_ROUTES = [
  'adminDashboard', 'adminReservation', 'adminRoom', 'adminUsers',
  'adminMessage', 'adminReports', 'adminNotifications', 'adminNews',
  'adminLogs', 'archivedUsers', 'archivedReservations', 'archivedReports',
  'archivedNews', 'profileSettings', 'passwordSecurity', 'systemSettings'
];

export const STAFF_ROUTES = [
  'staffDashboard', 'staffReservation', 'staffUsers', 'staffMessages',
  'staffNotification', 'staffProfile', 'staffReports'
];

// App types for conditional rendering
export const APP_TYPES = {
  MARKETING: 'marketing',
  USER: 'user', 
  ADMIN: 'admin',
  STAFF: 'staff'
};

export const getAppTypeFromView = (view) => {
  if (PUBLIC_ROUTES.includes(view)) return APP_TYPES.MARKETING;
  if (ADMIN_ROUTES.includes(view)) return APP_TYPES.ADMIN;
  if (STAFF_ROUTES.includes(view)) return APP_TYPES.STAFF;
  return APP_TYPES.USER;
};