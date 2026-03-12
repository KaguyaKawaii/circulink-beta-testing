import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// API service module with fixed endpoint for users
const apiService = {
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  
  async get(url) {
    try {
      console.log(`Fetching from: ${this.baseURL}${url}`);
      
      // FIX: Redirect /users to the correct backend endpoint
      let finalUrl = url;
      if (url === '/users') {
        finalUrl = '/users/all'; // Using the working endpoint from your backend
        console.log(`Redirecting users request to: ${finalUrl}`);
      }
      
      const response = await axios.get(`${this.baseURL}${finalUrl}`);
      console.log(`Response from ${finalUrl}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`API Error (GET ${this.baseURL}${url}):`, error.response?.data || error.message);
      
      // Return appropriate fallback based on the URL
      if (url.includes('/reservations')) return [];
      if (url.includes('/users')) return []; // Return empty array for users
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

// Constants
const STATUS_THEMES = {
  available: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: 'text-green-600',
    badge: 'bg-green-100 text-green-800 border-green-200'
  },
  booked: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'text-red-600',
    badge: 'bg-red-100 text-red-800 border-red-200'
  },
  pending: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: 'text-yellow-600',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }
};

const QUICK_ACTIONS = [
  { id: "staffReservation", icon: CalendarIcon, label: "Reservations" },
  { id: "staffNotification", icon: Bell, label: "Notifications" },
  { id: "staffMessages", icon: MessageSquare, label: "Messages" },
];

// Skeleton Components
const StatCardSkeleton = () => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-full"></div>
      </div>
      <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
    </div>
  </div>
);

const RoomCardSkeleton = () => (
  <div className="p-4 rounded-lg border border-gray-200 animate-pulse">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center">
        <div className="w-5 h-5 bg-gray-200 rounded mr-2"></div>
        <div className="h-5 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="h-6 bg-gray-200 rounded w-16"></div>
    </div>
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
  </div>
);

// Custom Hooks
const useDashboardData = (staff) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!staff?._id || !staff?.floor) return;

    try {
      setLoading(true);
      setError("");
      
      const endpoints = [
        { key: 'reservations', url: `/reservations` },
        { key: 'messages', url: `/messages/staff-total-unread/${staff._id}` },
        { key: 'notifications', url: `/notifications/unread-count/${staff._id}` },
        { key: 'users', url: '/users' }, // This will be redirected to /users/all
        { key: 'rooms', url: '/rooms' }
      ];

      const fetchPromises = endpoints.map(endpoint => 
        apiService.get(endpoint.url)
      );

      const results = await Promise.all(fetchPromises);
      
      const processedData = {};
      endpoints.forEach((endpoint, index) => {
        processedData[endpoint.key] = results[index];
      });

      setData(processedData);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [staff]);

  return { data, loading, error, refresh: fetchData };
};

const useRoomAvailability = (reservations, rooms, selectedDate, staff) => {
  return useMemo(() => {
    if (!staff?.floor || !reservations.length || !rooms.length) return {};

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

    const staffFloor = normalizeFloorName(staff.floor);
    const availability = {};

    // Initialize all rooms
    rooms.forEach(room => {
      availability[room.room] = [];
    });

    // Process reservations
    reservations.forEach(reservation => {
      const reservationFloor = reservation.location || reservation.floor || "";
      const normalizedReservationFloor = normalizeFloorName(reservationFloor);
      
      if (normalizedReservationFloor === staffFloor) {
        const roomName = reservation.roomName || reservation.room;
        const reservationDate = new Date(reservation.datetime);
        const selectedDateStart = new Date(selectedDate);
        selectedDateStart.setHours(0, 0, 0, 0);
        const selectedDateEnd = new Date(selectedDate);
        selectedDateEnd.setHours(23, 59, 59, 999);
        
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
      }
    });

    return availability;
  }, [reservations, rooms, selectedDate, staff]);
};

// Main Component
function StaffDashboard({ staff, setView, unreadCounts, onRefreshCounts }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [recentActivity, setRecentActivity] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    roomAvailability: true,
    recentActivity: true,
    calendar: true
  });

  const { data, loading, error, refresh } = useDashboardData(staff);
  const roomAvailability = useRoomAvailability(
    data?.reservations || [], 
    data?.rooms || [], 
    selectedDate, 
    staff
  );

  // Process data for display
  const { summaryData, filteredReservations, filteredRooms } = useMemo(() => {
    if (!data || !staff) {
      return { summaryData: {}, filteredReservations: [], filteredRooms: [] };
    }

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

    // FIX: Better handling of users data structure
    let allUsers = [];
    if (data.users) {
      if (Array.isArray(data.users)) {
        allUsers = data.users;
      } else if (data.users.users && Array.isArray(data.users.users)) {
        allUsers = data.users.users;
      } else if (data.users.data && Array.isArray(data.users.data)) {
        allUsers = data.users.data;
      } else if (typeof data.users === 'object') {
        // Try to find any array property in the response
        const possibleArrays = Object.values(data.users).find(val => Array.isArray(val));
        if (possibleArrays) {
          allUsers = possibleArrays;
        }
      }
    }
    
    const regularUsers = allUsers.filter(user => 
      user && user.role && user.role.toLowerCase() !== 'staff'
    );

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

    const summaryData = {
      reservations: safeLength(filteredReservations),
      users: safeLength(regularUsers),
      pendingReservations: filterByStatus(filteredReservations, 'Pending'),
      messages: finalMessagesCount,
      notifications: finalNotificationsCount
    };

    return { summaryData, filteredReservations, filteredRooms };
  }, [data, staff, unreadCounts]);

  // Update recent activity
  useEffect(() => {
    if (filteredReservations.length > 0) {
      const reservationActivities = filteredReservations.slice(0, 3).map((r) => ({
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
    }
  }, [filteredReservations]);

  // Room availability functions
  const getAvailabilityStatus = useCallback((room) => {
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
  }, [roomAvailability]);

  const getRoomBookings = useCallback((room) => {
    const roomName = room.room;
    if (roomAvailability[roomName]) {
      return roomAvailability[roomName];
    }
    const roomKey = Object.keys(roomAvailability).find(
      key => key.toLowerCase() === roomName.toLowerCase()
    );
    return roomKey ? roomAvailability[roomKey] : [];
  }, [roomAvailability]);

  // Calendar functions
  const tileContent = useCallback(({ date, view }) => {
    if (view !== 'month') return null;

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

    const staffFloor = normalizeFloorName(staff.floor);
    const floorReservations = filteredReservations.filter(reservation => {
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
      <div className="mt-1">
        <div className={`
          w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium mx-auto
          ${reservationsOnDate.length > 3 
            ? 'bg-red-100 text-red-800' 
            : reservationsOnDate.length > 1
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-blue-100 text-blue-800'
          }
        `}>
          {reservationsOnDate.length}
        </div>
      </div>
    );
  }, [filteredReservations, staff]);

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

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Event handlers
  const refreshData = async () => {
    setRefreshing(true);
    await refresh();
    if (onRefreshCounts) {
      onRefreshCounts();
    }
    setRefreshing(false);
  };

  const handleQuickAction = (actionId) => {
    if (setView) {
      setView(actionId);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleRoomClick = (room) => {
    // Future enhancement: Show room details modal
    console.log('Room clicked:', room);
  };

  // Initial data fetch only - no auto-refresh
  useEffect(() => {
    let isMounted = true;
    
    const fetchInitialData = async () => {
      if (!isMounted) return;
      await refresh();
    };
    
    fetchInitialData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - run only once on mount

  if (loading && !data) {
    return (
      <main className="lg:ml-[250px] lg:w-[calc(100%-250px)] w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CC0000] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="lg:ml-[250px] lg:w-[calc(100%-250px)] w-full min-h-screen bg-gray-50" aria-label="Staff dashboard">
      {/* Header */}
      <header className="bg-white px-4 lg:px-8 py-6 border-b border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#CC0000] mb-1">
              {staff?.floor || "Staff"} Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back, {staff?.name || "Staff"}
            </p>
          </div>
          <div className="flex items-center justify-between lg:justify-end space-x-4">
            <button
              onClick={refreshData}
              disabled={refreshing}
              className={`
                flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                ${refreshing 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-700 hover:shadow-md'
                }
              `}
              aria-label={`Refresh dashboard data. ${refreshing ? 'Currently refreshing' : ''}`}
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

      {/* Priority Alert Banner */}
      {summaryData.pendingReservations > 0 && (
        <div className="mx-4 lg:mx-8 mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center">
            <AlertCircle className="text-yellow-600 mr-3 flex-shrink-0" size={20} />
            <div className="flex-1">
              <p className="font-semibold text-yellow-800">
                {summaryData.pendingReservations} reservation{summaryData.pendingReservations > 1 ? 's' : ''} need{summaryData.pendingReservations === 1 ? 's' : ''} approval
              </p>
              <button 
                onClick={() => setView("staffReservation")}
                className="text-yellow-700 underline text-sm mt-1 hover:text-yellow-800"
              >
                Review now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mx-4 lg:mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900 ml-3"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 lg:p-8">
        {/* Enhanced Stats Section */}
        <section aria-labelledby="stats-heading" className="mb-8">
          <h2 id="stats-heading" className="sr-only">Dashboard statistics</h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {[...Array(4)].map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
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
                      ? 'bg-gradient-to-br from-red-500 to-red-600' 
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
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
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
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column */}
          <div className="xl:col-span-2 space-y-6">
            {/* Quick Actions */}
            <section aria-labelledby="quick-actions-heading" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 id="quick-actions-heading" className="text-lg font-semibold text-gray-800">
                  Quick Actions
                </h2>
              </div>
              <div className="overflow-x-auto lg:overflow-visible">
                <div className="flex lg:grid lg:grid-cols-3 gap-3 min-w-max lg:min-w-0">
                  {QUICK_ACTIONS.map((action) => {
                    const IconComponent = action.icon;
                    const count = summaryData[action.id.replace('staff', '').toLowerCase()] || 0;
                    
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action.id)}
                        className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group min-w-[200px] lg:min-w-0"
                      >
                        <div className="mr-3 p-2 rounded-lg bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                          <IconComponent size={18} />
                        </div>
                        <div className="text-left flex-1">
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                              {action.label}
                            </p>
                            {count > 0 && (
                              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                {count}
                              </span>
                            )}
                          </div>
                          <ChevronRight size={16} className="text-gray-400 mt-1 group-hover:text-blue-400" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Room Availability Section */}
            <section aria-labelledby="room-availability-heading" className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div 
                className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection('roomAvailability')}
              >
                <h2 id="room-availability-heading" className="text-lg font-semibold text-gray-800">
                  Room Availability - {staff?.floor}
                </h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg hidden sm:block">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                  {expandedSections.roomAvailability ? (
                    <ChevronUp size={20} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                  )}
                </div>
              </div>

              {expandedSections.roomAvailability && (
                <div className="px-6 pb-6">
                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <RoomCardSkeleton key={i} />
                      ))}
                    </div>
                  ) : filteredRooms.length === 0 ? (
                    <div className="text-center py-8">
                      <MapPin className="mx-auto text-gray-400 mb-3" size={40} />
                      <p className="text-gray-500 text-lg mb-2">No rooms found</p>
                      <p className="text-sm text-gray-400">No rooms are currently assigned to {staff?.floor}.</p>
                    </div>
                  ) : (
                    <>
                      {/* Room Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                        {filteredRooms.map(room => {
                          const availability = getAvailabilityStatus(room);
                          const theme = STATUS_THEMES[availability.status];
                          
                          return (
                            <div
                              key={room._id}
                              tabIndex={0}
                              onClick={() => handleRoomClick(room)}
                              className={`
                                aspect-square rounded-xl flex items-center justify-center flex-col p-3
                                transition-all duration-300 cursor-pointer border-2
                                ${theme.bg} ${theme.border} ${theme.text}
                                hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                              `}
                            >
                              <Home size={20} className={theme.icon} />
                              <span className="font-semibold text-sm mt-2">{room.room}</span>
                              <span className="text-xs opacity-75 mt-1 text-center">
                                {availability.message}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Detailed Room List */}
                      <div className="space-y-4">
                        {filteredRooms.map(room => {
                          const availability = getAvailabilityStatus(room);
                          const bookings = getRoomBookings(room);
                          const theme = STATUS_THEMES[availability.status];
                          
                          return (
                            <div
                              key={room._id}
                              className={`
                                p-4 rounded-lg border transition-all duration-200
                                ${theme.border} hover:shadow-sm
                              `}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center">
                                  <Home size={18} className="text-gray-500 mr-2" />
                                  <h3 className="font-semibold text-gray-800">{room.room}</h3>
                                </div>
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${theme.badge}`}>
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
                                        <span className="text-gray-500 flex ml-2 max-w-[120px] lg:max-w-[180px] truncate">
                                          {booking.user}
                                        </span>
                                        <span className={`px-2 py-1 rounded text-xs ${
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
                    </>
                  )}
                </div>
              )}
            </section>

            {/* Recent Reservations */}
            <section aria-labelledby="recent-reservations-heading" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 id="recent-reservations-heading" className="text-lg font-semibold text-gray-800">
                  Recent Reservations - {staff?.floor}
                </h2>
                <button 
                  onClick={() => setView("staffReservation")}
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  View all
                </button>
              </div>
              {filteredReservations.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-gray-500">No reservations found for {staff?.floor}.</p>
                  <p className="text-sm text-gray-400 mt-1">All reservations will appear here once created.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReservations.slice(0, 5).map((r) => (
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
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Calendar Section */}
            <section aria-labelledby="calendar-heading" className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div 
                className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection('calendar')}
              >
                <h2 id="calendar-heading" className="text-lg font-semibold text-gray-800">
                  Calendar - {formatMonthYear(selectedDate)}
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDate(new Date());
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Today
                  </button>
                  {expandedSections.calendar ? (
                    <ChevronUp size={20} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                  )}
                </div>
              </div>

              {expandedSections.calendar && (
                <div className="px-6 pb-6">
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
              )}
            </section>

            {/* Recent Activity */}
            <section aria-labelledby="recent-activity-heading" className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div 
                className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection('recentActivity')}
              >
                <h2 id="recent-activity-heading" className="text-lg font-semibold text-gray-800">
                  Recent Activity
                </h2>
                {expandedSections.recentActivity ? (
                  <ChevronUp size={20} className="text-gray-400" />
                ) : (
                  <ChevronDown size={20} className="text-gray-400" />
                )}
              </div>

              {expandedSections.recentActivity && (
                <div className="px-6 pb-6">
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
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

export default StaffDashboard;