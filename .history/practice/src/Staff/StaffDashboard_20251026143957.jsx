import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  Users,
  Calendar as CalendarIcon,
  MessageSquare,
  ChevronRight,
  Bell,
  AlertCircle,
  Activity,
  Check,
  X,
  Clock,
  Home,
  MapPin,
} from "lucide-react";

// API service module
const apiService = {
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  
  async get(url) {
    try {
      console.log(`Fetching from: ${this.baseURL}${url}`);
      const response = await axios.get(`${this.baseURL}${url}`);
      console.log(`Response from ${url}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`API Error (GET ${this.baseURL}${url}):`, error.response?.data || error.message);
      if (url.includes('/reservations')) return [];
      if (url.includes('/users')) return [];
      if (url.includes('/rooms')) return [];
      if (url.includes('/messages')) return { count: 0 };
      if (url.includes('/notifications')) return { count: 0 };
      return null;
    }
  },

  async post(url, data) {
    try {
      const response = await axios.post(`${this.baseURL}${url}`, data);
      return response.data;
    } catch (error) {
      console.error(`API Error (POST ${url}):`, error);
      throw error;
    }
  }
};

function StaffDashboard({ staff, setView, unreadCounts, onRefreshCounts }) {
  const [summaryData, setSummaryData] = useState({
    reservations: 0,
    users: 0,
    pendingReservations: 0,
    messages: 0,
    notifications: 0
  });
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [recentActivity, setRecentActivity] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roomAvailability, setRoomAvailability] = useState({});

  const normalizeFloorName = (floorName) => {
    if (!floorName) return "";
    const normalized = floorName.toLowerCase().trim();

    if (normalized.includes("2nd") || normalized.includes("second")) return "2nd Floor";
    if (normalized.includes("3rd") || normalized.includes("third")) return "3rd Floor";
    if (normalized.includes("4th") || normalized.includes("fourth")) return "4th Floor";
    if (normalized.includes("5th") || normalized.includes("fifth")) return "5th Floor";
    if (normalized.includes("ground")) return "Ground Floor";

    return floorName;
  };

  const fetchAllData = useCallback(async () => {
    if (!staff?._id || !staff?.floor) {
      console.log("No staff ID or floor available");
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      setError(null);
      
      console.log('Starting data fetch for staff:', staff);
      
      const endpoints = [
        { key: 'reservations', url: `/reservations` },
        { key: 'messages', url: `/messages/staff-total-unread/${staff._id}` },
        { key: 'notifications', url: `/notifications/unread-count/${staff._id}` },
        { key: 'users', url: '/users' },
        { key: 'rooms', url: '/rooms' }
      ];

      const fetchPromises = endpoints.map(endpoint => 
        apiService.get(endpoint.url)
      );

      const results = await Promise.all(fetchPromises);
      
      const data = {};
      endpoints.forEach((endpoint, index) => {
        data[endpoint.key] = results[index];
      });

      processFetchedData(data);

      if (onRefreshCounts) {
        onRefreshCounts();
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data. Please try refreshing.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [staff, onRefreshCounts]);

  const processFetchedData = (data) => {
    console.log('Processing fetched data:', data);
    
    const safeLength = (array) => (Array.isArray(array) ? array.length : 0);
    const filterByStatus = (array, status) => 
      Array.isArray(array) ? array.filter(item => item && item.status === status).length : 0;

    const allReservations = Array.isArray(data.reservations) ? data.reservations : [];
    const normalizedStaffFloor = normalizeFloorName(staff.floor);
    
    const filteredReservations = allReservations.filter(reservation => {
      if (!reservation) return false;
      
      const reservationFloor = reservation.location || reservation.floor || "";
      const normalizedReservationFloor = normalizeFloorName(reservationFloor);
      
      return normalizedReservationFloor === normalizedStaffFloor;
    });

    const allRooms = Array.isArray(data.rooms) ? data.rooms : [];
    const filteredRooms = allRooms.filter(room => {
      if (!room) return false;
      const roomFloor = room.floor || "";
      const normalizedRoomFloor = normalizeFloorName(roomFloor);
      return normalizedRoomFloor === normalizedStaffFloor && room.isActive !== false;
    });

    setRooms(filteredRooms);

    let allUsers = [];
    if (Array.isArray(data.users)) {
      allUsers = data.users;
    } else if (data.users && Array.isArray(data.users.users)) {
      allUsers = data.users.users;
    } else if (data.users && typeof data.users === 'object') {
      allUsers = Object.values(data.users).find(Array.isArray) || [];
    }
    
    const regularUsers = allUsers.filter(user => 
      user && user.role && user.role.toLowerCase() !== 'staff'
    );
    
    const totalRegularUsers = safeLength(regularUsers);

    let unreadMessagesCount = 0;
    if (typeof data.messages === 'number') {
      unreadMessagesCount = data.messages;
    } else if (data.messages && typeof data.messages.count === 'number') {
      unreadMessagesCount = data.messages.count;
    } else if (data.messages && typeof data.messages === 'object') {
      unreadMessagesCount = data.messages.unreadCount || 0;
    }

    let unreadNotificationsCount = 0;
    if (typeof data.notifications === 'number') {
      unreadNotificationsCount = data.notifications;
    } else if (data.notifications && typeof data.notifications.count === 'number') {
      unreadNotificationsCount = data.notifications.count;
    } else if (data.notifications && typeof data.notifications === 'object') {
      unreadNotificationsCount = data.notifications.unreadCount || 0;
    }

    const finalMessagesCount = unreadCounts?.messages !== undefined ? unreadCounts.messages : unreadMessagesCount;
    const finalNotificationsCount = unreadCounts?.notifications !== undefined ? unreadCounts.notifications : unreadNotificationsCount;

    setSummaryData({
      reservations: safeLength(filteredReservations),
      users: totalRegularUsers,
      pendingReservations: filterByStatus(filteredReservations, 'Pending'),
      messages: finalMessagesCount,
      notifications: finalNotificationsCount
    });

    const sortedReservations = filteredReservations.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt) : 0;
      const bTime = b.createdAt ? new Date(b.createdAt) : 0;
      return bTime - aTime;
    });
    
    setReservations(sortedReservations);
    updateRecentActivity(sortedReservations);
  };

  // Fixed room availability calculation
  useEffect(() => {
    if (!staff?.floor || !reservations.length || !rooms.length) return;

    const staffFloor = normalizeFloorName(staff.floor);
    
    const floorReservations = reservations.filter(reservation => {
      const reservationFloor = reservation.location || reservation.floor || "";
      const normalizedReservationFloor = normalizeFloorName(reservationFloor);
      return normalizedReservationFloor === staffFloor;
    });

    const availability = {};
    
    // Initialize all rooms as available
    rooms.forEach(room => {
      availability[room.room] = [];
    });

    // Process reservations for the selected date
    floorReservations.forEach(reservation => {
      const roomName = reservation.roomName || reservation.room;
      const reservationDate = new Date(reservation.datetime);
      const selectedDateStart = new Date(selectedDate);
      selectedDateStart.setHours(0, 0, 0, 0);
      const selectedDateEnd = new Date(selectedDate);
      selectedDateEnd.setHours(23, 59, 59, 999);
      
      // Check if reservation is on the selected date
      if (reservationDate >= selectedDateStart && reservationDate <= selectedDateEnd) {
        if (!availability[roomName]) {
          availability[roomName] = [];
        }
        availability[roomName].push({
          time: reservationDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          status: reservation.status,
          user: reservation.userId?.name || reservation.userName || 'Unknown User'
        });
      }
    });

    setRoomAvailability(availability);
  }, [selectedDate, staff, reservations, rooms]);

  const getAvailabilityStatus = (room) => {
    const roomName = room.room;
    const bookings = roomAvailability[roomName] || [];
    
    if (bookings.length === 0) {
      return { status: 'available', message: 'Available all day' };
    }
    
    const pending = bookings.filter(b => b.status === 'Pending').length;
    const approved = bookings.filter(b => b.status === 'Approved' || b.status === 'Ongoing').length;
    
    if (approved > 0) {
      return { 
        status: 'booked', 
        message: `Booked (${approved} reservation${approved > 1 ? 's' : ''})` 
      };
    }
    
    if (pending > 0) {
      return { 
        status: 'pending', 
        message: `Pending approval (${pending})` 
      };
    }
    
    return { status: 'available', message: 'Available' };
  };

  const getRoomBookings = (room) => {
    const roomName = room.room;
    
    // Try exact match first
    if (roomAvailability[roomName]) {
      return roomAvailability[roomName];
    }
    
    // Try case-insensitive match
    const roomKey = Object.keys(roomAvailability).find(
      key => key.toLowerCase() === roomName.toLowerCase()
    );
    
    return roomKey ? roomAvailability[roomKey] : [];
  };

  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;

    const staffFloor = normalizeFloorName(staff.floor);
    const floorReservations = reservations.filter(reservation => {
      const reservationFloor = reservation.location || reservation.floor || "";
      const normalizedReservationFloor = normalizeFloorName(reservationFloor);
      return normalizedReservationFloor === staffFloor;
    });

    const reservationsOnDate = floorReservations.filter(reservation => {
      const reservationDate = new Date(reservation.datetime);
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      return reservationDate >= dateStart && reservationDate <= dateEnd;
    });

    if (reservationsOnDate.length === 0) return null;

    return (
      <div className="flex justify-center mt-1">
        <div className="flex space-x-1">
          {reservationsOnDate.slice(0, 3).map((_, index) => (
            <div
              key={index}
              className="w-1 h-1 bg-blue-500 rounded-full"
            />
          ))}
          {reservationsOnDate.length > 3 && (
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
          )}
        </div>
      </div>
    );
  };

  const updateRecentActivity = (reservationsData) => {
    const reservationActivities = reservationsData.slice(0, 3).map((r) => ({
      id: r._id || `res-${Date.now()}`,
      action: `Reservation in ${r.roomName || r.room || 'Unknown Room'}`,
      time: r.datetime ? new Date(r.datetime).toLocaleDateString() : "Unknown date",
      user: r.userId?.name || "Unknown",
      type: "reservation",
      status: r.status
    }));

    const mockActivities = [
      {
        id: 'mock-1',
        action: 'System maintenance completed',
        time: new Date().toLocaleDateString(),
        user: 'System',
        type: 'notification',
      },
      {
        id: 'mock-2', 
        action: 'New user registered',
        time: new Date().toLocaleDateString(),
        user: 'System',
        type: 'notification',
      }
    ];

    setRecentActivity([...reservationActivities, ...mockActivities].slice(0, 4));
  };

  const refreshData = () => {
    fetchAllData();
  };

  useEffect(() => {
    fetchAllData();
    
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const quickActions = [
    { id: "staffReservation", icon: <CalendarIcon size={18} />, label: "Reservations", count: summaryData.reservations },
    { id: "staffNotification", icon: <Bell size={18} />, label: "Notifications", count: summaryData.notifications },
    { id: "staffMessages", icon: <MessageSquare size={18} />, label: "Messages", count: summaryData.messages },
  ];

  const handleQuickAction = (actionId) => {
    if (setView) {
      setView(actionId);
    }
  };

  // Fixed navigationLabel function to properly display month and year
  const navigationLabel = ({ date, view }) => {
    if (view === 'month') {
      return (
        <span className="text-base font-semibold text-gray-900">
          {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
      );
    }
    return null;
  };

  // Format month year for display
  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CC0000] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-8 py-6 border-b border-gray-200 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#CC0000] mb-1">
              {staff?.floor || "Staff"} Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back, {staff?.name || "Staff"}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
            >
              <svg className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <span className="text-sm font-medium text-gray-700 bg-white px-4 py-2 rounded-lg border border-gray-200">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-700 hover:text-red-900"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-8">
        {/* Enhanced Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Reservations Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-gray-500 text-sm font-medium mb-2">
                  Total Reservations
                </p>
                <div className="flex items-baseline gap-2 mb-2">
                  <p className="text-3xl font-bold text-gray-800">
                    {summaryData.reservations}
                  </p>
                  {summaryData.pendingReservations > 0 && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                      +{summaryData.pendingReservations} pending
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600">
                  For {staff?.floor || "your floor"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <CalendarIcon size={24} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  {summaryData.pendingReservations === 0 ? (
                    "All reservations processed"
                  ) : (
                    <>
                      <span className="font-semibold text-yellow-600">
                        {summaryData.pendingReservations}
                      </span>{" "}
                      need approval
                    </>
                  )}
                </p>
                {summaryData.pendingReservations > 0 && (
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                )}
              </div>
            </div>
          </div>

          {/* Users Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-2">Total Users</p>
                <p className="text-3xl font-bold text-gray-800 mb-2">
                  {summaryData.users}
                </p>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Users size={12} />
                  <span>Students and Faculty only</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                <Users size={24} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Excluding staff accounts
                </p>
                <div className={`w-2 h-2 rounded-full ${
                  summaryData.users > 0 ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
              </div>
            </div>
          </div>

          {/* Notifications Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-2">
                  Notifications
                </p>
                <div className="flex items-baseline gap-2 mb-2">
                  <p className="text-3xl font-bold text-gray-800">
                    {summaryData.notifications}
                  </p>
                  {summaryData.notifications > 0 && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                      Unread
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600">
                  Your unread notifications
                </p>
              </div>
              <div className={`p-3 rounded-xl shadow-lg ${
                summaryData.notifications > 0 
                  ? 'bg-gradient-to-br from-red-500 to-red-600 animate-pulse' 
                  : 'bg-gradient-to-br from-purple-500 to-purple-600'
              } text-white`}>
                <Bell size={24} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  {summaryData.notifications === 0 ? (
                    "All clear!"
                  ) : (
                    "Requires your attention"
                  )}
                </p>
                {summaryData.notifications > 0 && (
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                )}
              </div>
            </div>
          </div>

          {/* Messages Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-2">
                  Messages
                </p>
                <div className="flex items-baseline gap-2 mb-2">
                  <p className="text-3xl font-bold text-gray-800">
                    {summaryData.messages}
                  </p>
                  {summaryData.messages > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                      Unread
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600">
                  Your unread messages
                </p>
              </div>
              <div className={`p-3 rounded-xl shadow-lg ${
                summaryData.messages > 0 
                  ? 'bg-gradient-to-br from-amber-500 to-amber-600' 
                  : 'bg-gradient-to-br from-gray-500 to-gray-600'
              } text-white`}>
                <MessageSquare size={24} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  {summaryData.messages === 0 ? (
                    "No new messages"
                  ) : (
                    "Unread messages waiting"
                  )}
                </p>
                {summaryData.messages > 0 && (
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid - 3 Columns */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Quick Actions & Reservations */}
          <div className="xl:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action.id)}
                    className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group"
                  >
                    <div className="mr-3 p-2 rounded-lg bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600">
                      {action.icon}
                    </div>
                    <div className="text-left flex-1">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                          {action.label}
                        </p>
                        {action.count > 0 && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                            {action.count}
                          </span>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-gray-400 mt-1 group-hover:text-blue-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Room Availability Section - Fixed */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-800">
                  Room Availability - {staff?.floor}
                </h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>

              {rooms.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="mx-auto text-gray-400 mb-3" size={40} />
                  <p className="text-gray-500 text-lg mb-2">No rooms found</p>
                  <p className="text-sm text-gray-400">No rooms are currently assigned to {staff?.floor}.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rooms.map(room => {
                    const availability = getAvailabilityStatus(room);
                    const bookings = getRoomBookings(room);
                    
                    return (
                      <div
                        key={room._id}
                        className="p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            <Home size={18} className="text-gray-500 mr-2" />
                            <h3 className="font-semibold text-gray-800">{room.room}</h3>
                          </div>
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            availability.status === 'available' 
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : availability.status === 'booked'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          }`}>
                            {availability.status === 'available' && <Check size={14} className="mr-1" />}
                            {availability.status === 'booked' && <X size={14} className="mr-1" />}
                            {availability.status === 'pending' && <Clock size={14} className="mr-1" />}
                            {availability.status === 'available' ? 'Available' : 
                             availability.status === 'booked' ? 'Booked' : 'Pending'}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{availability.message}</p>
                        
                        {bookings.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-700 mb-2">Bookings:</p>
                            <div className="space-y-2">
                              {bookings.map((booking, index) => (
                                <div key={index} className="flex justify-between items-center text-xs">
                                  <span className="text-gray-600 font-semibold">{booking.time}</span>
                                  <span className="text-gray-500 flex ml-2 max-w-[180px]">
                                    {booking.user}
                                  </span>
                                  <span className={`px-2 py-1 rounded ${
                                    booking.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                    booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {booking.status}
                                  </span>
                                  
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Availability Legend */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Status Legend</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center p-2 bg-green-50 rounded-lg">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <div>
                      <p className="font-medium text-green-800">Available</p>
                      <p className="text-green-600">Room is free</p>
                    </div>
                  </div>
                  <div className="flex items-center p-2 bg-red-50 rounded-lg">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <div>
                      <p className="font-medium text-red-800">Booked</p>
                      <p className="text-red-600">Reserved for today</p>
                    </div>
                  </div>
                  <div className="flex items-center p-2 bg-yellow-50 rounded-lg">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    <div>
                      <p className="font-medium text-yellow-800">Pending</p>
                      <p className="text-yellow-600">Awaiting approval</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Reservations */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Recent Reservations - {staff?.floor}
                </h2>
                <button 
                  onClick={() => setView("staffReservation")}
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  View all
                </button>
              </div>
              {reservations.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-gray-500">No reservations found for {staff?.floor}.</p>
                  <p className="text-sm text-gray-400 mt-1">All reservations will appear here once created.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reservations.slice(0, 5).map((r) => (
                    <div
                      key={r._id}
                      className="p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium text-gray-800">
                          {r.roomName || r.room}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          r.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          r.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          r.status === 'Ongoing' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {r.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Reserved by {r.userId?.name || "Unknown"}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-gray-500">
                          {r.datetime ? new Date(r.datetime).toLocaleDateString() : "Unknown date"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {r.datetime ? new Date(r.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Calendar & Recent Activity */}
          <div className="space-y-6">
            {/* Calendar Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Calendar - {formatMonthYear(selectedDate)}
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedDate(new Date())}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Today
                  </button>
                </div>
              </div>
              
              <div className="calendar-container">
                <Calendar
                  onChange={setSelectedDate}
                  value={selectedDate}
                  tileContent={tileContent}
                  navigationLabel={navigationLabel}
                  className="border-0 w-full"
                />
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-gray-600">Reservations</span>
                  </div>
                  <span className="text-gray-500">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Recent Activity
              </h2>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className={`p-2 rounded-full ${
                      activity.type === "reservation" 
                        ? "bg-blue-100 text-blue-600"
                        : "bg-purple-100 text-purple-600"
                    }`}>
                      {activity.type === "reservation" ? (
                        <Activity size={16} />
                      ) : (
                        <Bell size={16} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.user} • {activity.time}
                      </p>
                      {activity.status && (
                        <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                          activity.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          activity.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {activity.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default StaffDashboard;