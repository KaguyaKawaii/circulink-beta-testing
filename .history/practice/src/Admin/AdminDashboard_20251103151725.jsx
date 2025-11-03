import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import AdminNews from "./AdminNews";
import AdminLogs from "./AdminLogs";
import RoomAvailabilityModal from "./../RoomAvailabilityModal"; // Add this import
import {
  Home,
  MapPin,
  Check,
  X,
  Clock,
  Users,
  Calendar as CalendarIcon,
  MessageSquare,
  Bell,
  FileText,
  Settings,
  AlertCircle,
  RefreshCw,
  Mail,
  TrendingUp,
  Eye,
  ChevronDown,
  ChevronUp,
  Search
} from "lucide-react";

// API service module for better organization
const apiService = {
  baseURL: import.meta.env.VITE_API_URL,
  
  async get(url) {
    try {
      const response = await axios.get(`${this.baseURL}${url}`);
      return response.data;
    } catch (error) {
      console.error(`API Error (GET ${url}):`, error);
      throw error;
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

// Room Availability Card Component
const RoomAvailabilityCard = ({ room, availability, bookings, selectedDate, onViewDetails }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'available':
        return {
          color: 'text-green-600 bg-green-50 border-green-200',
          icon: <Check size={14} />,
          text: 'Available',
          badgeColor: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'booked':
        return {
          color: 'text-red-600 bg-red-50 border-red-200',
          icon: <X size={14} />,
          text: 'Booked',
          badgeColor: 'bg-red-100 text-red-800 border-red-200'
        };
      case 'pending':
        return {
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          icon: <Clock size={14} />,
          text: 'Pending',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200'
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          icon: <Clock size={14} />,
          text: 'Unknown',
          badgeColor: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const statusConfig = getStatusConfig(availability.status);

  return (
    <div className="p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200 bg-white">
      {/* Room Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
            <Home size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-base">{room.room}</h3>
            <div className="flex items-center text-sm text-gray-500">
              <MapPin size={12} className="mr-1" />
              <span>{room.floor}</span>
            </div>
          </div>
        </div>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.color}`}>
          {statusConfig.icon}
          <span className="ml-1">{statusConfig.text}</span>
        </div>
      </div>
      
      {/* Availability Summary */}
      <div className="mb-3">
        <p className="text-sm text-gray-600">{availability.message}</p>
        {bookings.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {bookings.length} booking{bookings.length > 1 ? 's' : ''} scheduled
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={onViewDetails}
          className="flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
        >
          <Eye size={12} className="mr-1" />
          View Details
        </button>

        {/* Bookings Section */}
        {bookings.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center text-xs text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>{expanded ? 'Hide' : 'Show'} Bookings</span>
            {expanded ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
          </button>
        )}
      </div>

      {/* Bookings Section */}
      {expanded && bookings.length > 0 && (
        <div className="border-t border-gray-100 pt-3 mt-3">
          <div className="space-y-2">
            {bookings.map((booking, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{booking.time}</p>
                    <p className="text-xs text-gray-600 truncate max-w-[120px]">{booking.user}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  booking.status === 'Approved' ? 'bg-green-100 text-green-800 border border-green-200' :
                  booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                  'bg-blue-100 text-blue-800 border border-blue-200'
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
};

// Define the complete room structure
const ROOM_STRUCTURE = [
  // Ground Floor
  { floor: "Ground Floor", room: "Discussion Room 1" },
  { floor: "Ground Floor", room: "Discussion Room 2" },
  { floor: "Ground Floor", room: "Discussion Room 3" },
  { floor: "Ground Floor", room: "Graduate Research Hub 1" },
  { floor: "Ground Floor", room: "Graduate Research Hub 2" },
  { floor: "Ground Floor", room: "Graduate Research Hub 3" },
  
  // 2nd Floor
  { floor: "2nd Floor", room: "Discussion Room 1" },
  { floor: "2nd Floor", room: "Discussion Room 2" },
  { floor: "2nd Floor", room: "Faculty Room 1" },
  
  // 4th Floor
  { floor: "4th Floor", room: "Collaboration Room 1" },
  { floor: "4th Floor", room: "Faculty Room 1" },
  
  // 5th Floor
  { floor: "5th Floor", room: "Collaboration Room 1" },
  { floor: "5th Floor", room: "Faculty Room 1" }
];

function AdminDashboard({ setView }) {
  const [summaryData, setSummaryData] = useState({
    reservations: 0,
    users: 0,
    messages: 0,
    pendingReservations: 0,
    reports: 0,
    pendingReports: 0,
    unreadMessages: 0,
    unreadUserMessages: 0,
    unreadStaffMessages: 0
  });
  const [newsList, setNewsList] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [recentActivity, setRecentActivity] = useState([]);
  const [logs, setLogs] = useState([]);
  const [reports, setReports] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentSubView, setCurrentSubView] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [roomAvailability, setRoomAvailability] = useState({});
  const [unreadBreakdown, setUnreadBreakdown] = useState([]);
  const [availabilityView, setAvailabilityView] = useState("grid");
  const [selectedFloor, setSelectedFloor] = useState("All Floors");
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false); // Add modal state
  const [selectedRoomForModal, setSelectedRoomForModal] = useState(null); // Add selected room state

  // WebSocket listener for real-time updates
  useEffect(() => {
    if (!window.socketConnected) {
      console.log('🔌 Connecting to WebSocket for real-time updates...');
      const socket = io(import.meta.env.VITE_WS_URL);
      
      socket.on('adminUnreadUpdate', (data) => {
        console.log('📥 Received real-time admin unread update:', data);
        updateUnreadCountsFromSocket(data);
      });

      socket.on('newMessage', (message) => {
        if (message.receiver === 'admin' || message.sender === 'admin') {
          console.log('📥 New message affecting admin, refreshing counts');
          refreshUnreadCounts();
        }
      });

      socket.on('connect', () => {
        console.log('✅ Connected to WebSocket server');
      });

      socket.on('disconnect', () => {
        console.log('❌ Disconnected from WebSocket server');
      });

      window.socketConnected = true;
      
      return () => {
        socket.off('adminUnreadUpdate');
        socket.off('newMessage');
        socket.off('connect');
        socket.off('disconnect');
        socket.disconnect();
        window.socketConnected = false;
      };
    }
  }, []);

  const updateUnreadCountsFromSocket = (data) => {
    const { recipients, totalUnread } = data;
    
    if (Array.isArray(recipients)) {
      const unreadUserMessages = recipients
        .filter(recipient => recipient.type === 'user')
        .reduce((sum, recipient) => sum + (recipient.unreadCount || 0), 0);

      const unreadStaffMessages = recipients
        .filter(recipient => recipient.type === 'staff')
        .reduce((sum, recipient) => sum + (recipient.unreadCount || 0), 0);

      setSummaryData(prev => ({
        ...prev,
        unreadMessages: totalUnread || 0,
        unreadUserMessages,
        unreadStaffMessages
      }));

      setUnreadBreakdown(
        recipients
          .filter(recipient => recipient.unreadCount > 0)
          .sort((a, b) => b.unreadCount - a.unreadCount)
          .slice(0, 5)
      );
      
      console.log('✅ Unread counts updated via WebSocket:', { 
        totalUnread, 
        unreadUserMessages, 
        unreadStaffMessages 
      });
    }
  };

  const refreshUnreadCounts = async () => {
    try {
      console.log('🔄 Manually refreshing unread counts...');
      const adminRecipients = await apiService.get('/api/messages/recipients/admin');
      
      const totalUnread = Array.isArray(adminRecipients) 
        ? adminRecipients.reduce((sum, recipient) => sum + (recipient.unreadCount || 0), 0)
        : 0;

      const unreadUserMessages = Array.isArray(adminRecipients)
        ? adminRecipients
            .filter(recipient => recipient.type === 'user')
            .reduce((sum, recipient) => sum + (recipient.unreadCount || 0), 0)
        : 0;

      const unreadStaffMessages = Array.isArray(adminRecipients)
        ? adminRecipients
            .filter(recipient => recipient.type === 'staff')
            .reduce((sum, recipient) => sum + (recipient.unreadCount || 0), 0)
        : 0;

      setSummaryData(prev => ({
        ...prev,
        unreadMessages: totalUnread,
        unreadUserMessages,
        unreadStaffMessages
      }));

      setUnreadBreakdown(
        Array.isArray(adminRecipients)
          ? adminRecipients
              .filter(recipient => recipient.unreadCount > 0)
              .sort((a, b) => b.unreadCount - a.unreadCount)
              .slice(0, 5)
          : []
      );

      console.log('✅ Unread counts refreshed:', { totalUnread, unreadUserMessages, unreadStaffMessages });
    } catch (error) {
      console.error('❌ Failed to refresh unread counts:', error);
    }
  };

  const fetchAllData = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const endpoints = [
        { key: 'summary', url: '/api/admin/summary' },
        { key: 'news', url: '/api/news/active' },
        { key: 'logs', url: '/api/logs' },
        { key: 'messages', url: '/api/messages' },
        { key: 'users', url: '/api/users' },
        { key: 'reservations', url: '/api/reservations' },
        { key: 'reports', url: '/api/reports' },
        { key: 'rooms', url: '/api/rooms' },
        { key: 'adminRecipients', url: '/api/messages/recipients/admin' }
      ];

      const fetchPromises = endpoints.map(endpoint => 
        apiService.get(endpoint.url).catch(error => ({ error: true, message: error.message }))
      );

      const results = await Promise.all(fetchPromises);
      
      const data = {};
      endpoints.forEach((endpoint, index) => {
        data[endpoint.key] = results[index];
      });

      processFetchedData(data);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data. Please try refreshing.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const processFetchedData = (data) => {
    const safeLength = (array) => (Array.isArray(array) ? array.length : 0);
    
    const filterByStatus = (array, status) => 
      Array.isArray(array) ? array.filter(item => item.status === status).length : 0;

    const summary = data.summary?.error ? {} : data.summary;
    const usersData = data.users?.error ? [] : data.users;
    const reservationsData = data.reservations?.error ? [] : data.reservations;
    const messagesData = data.messages?.error ? [] : data.messages;
    const reportsData = data.reports?.error ? [] : data.reports;
    const roomsData = data.rooms?.error ? [] : data.rooms;
    const adminRecipients = data.adminRecipients;

    let totalUnread = 0;
    let unreadUserMessages = 0;
    let unreadStaffMessages = 0;
    let unreadConversations = [];

    if (adminRecipients && !adminRecipients.error) {
      totalUnread = Array.isArray(adminRecipients) 
        ? adminRecipients.reduce((sum, recipient) => sum + (recipient.unreadCount || 0), 0)
        : 0;

      unreadUserMessages = Array.isArray(adminRecipients)
        ? adminRecipients
            .filter(recipient => recipient.type === 'user')
            .reduce((sum, recipient) => sum + (recipient.unreadCount || 0), 0)
        : 0;

      unreadStaffMessages = Array.isArray(adminRecipients)
        ? adminRecipients
            .filter(recipient => recipient.type === 'staff')
            .reduce((sum, recipient) => sum + (recipient.unreadCount || 0), 0)
        : 0;

      unreadConversations = Array.isArray(adminRecipients)
        ? adminRecipients
            .filter(recipient => recipient.unreadCount > 0)
            .sort((a, b) => b.unreadCount - a.unreadCount)
            .slice(0, 5)
        : [];
    } else if (adminRecipients?.fallback) {
      console.log('Using fallback for unread messages count');
      const allMessages = Array.isArray(messagesData) ? messagesData : [];
      totalUnread = allMessages.filter(msg => 
        msg.receiver === 'admin' && msg.read === false
      ).length;
      
      unreadUserMessages = Math.floor(totalUnread * 0.7);
      unreadStaffMessages = Math.floor(totalUnread * 0.3);
    }

    setSummaryData({
      reservations: summary.reservations || safeLength(reservationsData),
      users: summary.users || safeLength(usersData),
      messages: summary.messages || safeLength(messagesData),
      pendingReservations: summary.pendingReservations || filterByStatus(reservationsData, 'pending'),
      reports: safeLength(reportsData),
      pendingReports: filterByStatus(reportsData, 'Pending'),
      unreadMessages: totalUnread,
      unreadUserMessages,
      unreadStaffMessages
    });

    setNewsList(data.news?.error ? [] : data.news);
    setReservations(reservationsData);
    setReports(reportsData);
    
    // Use predefined room structure instead of API data
    const predefinedRooms = ROOM_STRUCTURE.map(room => ({
      ...room,
      _id: `${room.floor}-${room.room}`.replace(/\s+/g, '-').toLowerCase(),
      isActive: true
    }));
    setRooms(predefinedRooms);
    
    const logsData = data.logs?.error ? [] : data.logs;
    setLogs(logsData);

    setUnreadBreakdown(unreadConversations);
    updateRecentActivity(logsData);
  };

  // Room availability calculation
  useEffect(() => {
    if (!reservations.length || !rooms.length) return;

    const availability = {};
    
    rooms.forEach(room => {
      const roomKey = `${room.floor}-${room.room}`;
      availability[roomKey] = [];
    });

    reservations.forEach(reservation => {
      const reservationDate = new Date(reservation.datetime);
      const selectedDateStart = new Date(selectedDate);
      selectedDateStart.setHours(0, 0, 0, 0);
      const selectedDateEnd = new Date(selectedDate);
      selectedDateEnd.setHours(23, 59, 59, 999);
      
      if (reservationDate >= selectedDateStart && reservationDate <= selectedDateEnd) {
        // Try to match room by name and floor
        const matchingRoom = rooms.find(room => 
          room.room === reservation.roomName || 
          room.room === reservation.room ||
          `${room.floor}-${room.room}` === reservation.roomName
        );
        
        if (matchingRoom) {
          const roomKey = `${matchingRoom.floor}-${matchingRoom.room}`;
          if (!availability[roomKey]) {
            availability[roomKey] = [];
          }
          availability[roomKey].push({
            time: reservationDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            status: reservation.status,
            user: reservation.userId?.name || reservation.userName || 'Unknown User',
            reservationData: reservation // Include full reservation data
          });
        }
      }
    });

    setRoomAvailability(availability);
  }, [selectedDate, reservations, rooms]);

  const getAvailabilityStatus = (room) => {
    const roomKey = `${room.floor}-${room.room}`;
    const bookings = roomAvailability[roomKey] || [];
    
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
    const roomKey = `${room.floor}-${room.room}`;
    return roomAvailability[roomKey] || [];
  };

  // Add function to handle room details view
  const handleViewRoomDetails = (room) => {
    setSelectedRoomForModal(room);
    setShowAvailabilityModal(true);
  };

  const updateRecentActivity = (logsData) => {
    const recentLogs = Array.isArray(logsData) ? logsData.slice(0, 5) : [];
    setRecentActivity(recentLogs.map(log => ({
      id: log._id,
      action: log.action,
      time: formatTimeAgo(new Date(log.createdAt)),
      user: log.userName || "System",
      details: log.details
    })));
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
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
    { id: "adminReservation", icon: <CalendarIcon size={20} />, label: "Reservations", color: "blue" },
    { id: "adminUsers", icon: <Users size={20} />, label: "Users", color: "green" },
    { id: "adminRoom", icon: <Home size={20} />, label: "Rooms", color: "purple" },
    { id: "adminMessage", icon: <MessageSquare size={20} />, label: "Messages", color: "amber" },
    { id: "adminNews", icon: <FileText size={20} />, label: "News", color: "indigo" },
    { id: "adminReports", icon: <AlertCircle size={20} />, label: "Reports", color: "red" },
    { id: "adminNotifications", icon: <Bell size={20} />, label: "Notifications", color: "cyan" },
    { id: "adminSettings", icon: <Settings size={20} />, label: "Settings", color: "gray" }
  ];

  const getNewUsersThisWeek = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return logs.filter(log => 
      log.action === "User registered" && 
      new Date(log.createdAt) > oneWeekAgo
    ).length;
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300',
      green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300',
      purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300',
      amber: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300',
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300',
      red: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300',
      cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100 hover:border-cyan-300',
      gray: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
    };
    return colors[color] || colors.gray;
  };

  // Get unique floors for filter
  const floors = ["All Floors", ...new Set(ROOM_STRUCTURE.map(room => room.floor))];
  
  // Filter rooms by selected floor
  const filteredRooms = selectedFloor === "All Floors" 
    ? rooms 
    : rooms.filter(room => room.floor === selectedFloor);

  // Render different views
  if (currentSubView === "news") {
    return <AdminNews setView={setView} admin={{}} />;
  }

  if (currentSubView === "logs") {
    return <AdminLogs setView={setView} />;
  }

  if (loading) {
    return (
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-64 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden mb-4">
            <div className="h-full bg-[#CC0000] animate-[loading_1.2s_ease-in-out_infinite]"></div>
          </div>
          <p className="text-gray-800 font-bold">Loading dashboard data...</p>
          <p className="text-gray-500 font-bold text-sm">Please Wait...</p>
          <style>
            {`
              @keyframes loading {
                0% { transform: translateX(-100%); }
                50% { transform: translateX(0%); }
                100% { transform: translateX(100%); }
              }
            `}
          </style>
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
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 text-sm mt-1">Welcome back, Administrator</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 shadow-sm"
            >
              <RefreshCw size={18} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <div className="bg-gray-100 px-4 py-2 rounded-lg border border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle size={20} className="text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-800 hover:text-red-900 text-lg font-bold"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Reservation Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                <CalendarIcon size={24} />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{summaryData.reservations}</p>
                <p className="text-gray-500 text-sm font-medium">Reservations</p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending approval</span>
                <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  {summaryData.pendingReservations}
                </span>
              </div>
            </div>
          </div>

          {/* Users Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-green-50 text-green-600">
                <Users size={24} />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{summaryData.users}</p>
                <p className="text-gray-500 text-sm font-medium">Users</p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">New this week</span>
                <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                  {getNewUsersThisWeek()}
                </span>
              </div>
            </div>
          </div>

          {/* Messages Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                <MessageSquare size={24} />
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold px-2 py-1 rounded ${
                  summaryData.unreadMessages > 0 
                    ? 'text-gray-900' 
                    : 'text-gray-600 bg-gray-50'
                }`}>
                  {summaryData.unreadMessages}
                </span>
                <p className="text-gray-500 text-sm font-medium">Unread Messages</p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Unread messages</span>
                <span className={`text-sm font-semibold px-2 py-1 rounded ${
                  summaryData.unreadMessages > 0 
                    ? 'text-red-600 bg-red-50' 
                    : 'text-gray-600 bg-gray-50'
                }`}>
                  {summaryData.unreadMessages}
                </span>
              </div>
            </div>
          </div>

          {/* Reports Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-red-50 text-red-600">
                <AlertCircle size={24} />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{summaryData.reports}</p>
                <p className="text-gray-500 text-sm font-medium">Reports</p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending review</span>
                <span className="text-sm font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                  {summaryData.pendingReports}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Quick Actions & Unread Messages */}
          <div className="xl:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => setView(action.id)}
                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${getColorClasses(action.color)}`}
                  >
                    <div className="p-3 rounded-xl bg-white border mb-3 shadow-sm">
                      {action.icon}
                    </div>
                    <span className="text-sm font-semibold text-center">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Unread Messages Overview */}
            {summaryData.unreadMessages > 0 && (
              <div className="bg-white p-6 rounded-xl border border-amber-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Mail className="mr-3 text-amber-600" size={24} />
                    Unread Messages Overview
                  </h2>
                  <span className="bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-semibold">
                    {summaryData.unreadMessages} total unread
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-800 text-sm font-semibold">From Users</span>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-bold">
                        {summaryData.unreadUserMessages}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-800 text-sm font-semibold">From Staff</span>
                      <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-lg text-sm font-bold">
                        {summaryData.unreadStaffMessages}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-800 text-sm font-semibold">Total Unread</span>
                      <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-lg text-sm font-bold">
                        {summaryData.unreadMessages}
                      </span>
                    </div>
                  </div>
                </div>

                {unreadBreakdown.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Conversations</h3>
                    <div className="space-y-3">
                      {unreadBreakdown.map((conversation, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center text-sm font-bold">
                              {conversation.type === 'user' ? 'U' : 'S'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {conversation.name || conversation.email || 'Unknown User'}
                              </p>
                              <p className="text-xs text-gray-600">
                                {conversation.type === 'user' ? 'User' : 'Staff Member'}
                              </p>
                            </div>
                          </div>
                          <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-bold">
                            {conversation.unreadCount} unread
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
                <button
                  onClick={() => setCurrentSubView("logs")}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  View All Logs
                </button>
              </div>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-sm text-gray-600">{activity.details}</p>
                        <div className="flex items-center mt-1 space-x-2">
                          <span className="text-xs text-gray-500">{activity.user}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{activity.time}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Calendar & Room Availability */}
          <div className="space-y-6">
            {/* Calendar */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Calendar</h2>
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                className="border-0 w-full"
                tileClassName={({ date }) => {
                  return date.toDateString() === selectedDate.toDateString()
                    ? 'bg-[#CC0000] text-white rounded-lg'
                    : 'hover:bg-gray-100 rounded-lg';
                }}
              />
            </div>

            {/* Room Availability */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Room Availability</h2>
                <div className="flex items-center space-x-2">
                  {/* Floor Filter */}
                  <select
                    value={selectedFloor}
                    onChange={(e) => setSelectedFloor(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-transparent"
                  >
                    {floors.map(floor => (
                      <option key={floor} value={floor}>{floor}</option>
                    ))}
                  </select>
                  
                  {/* View Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setAvailabilityView("grid")}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        availabilityView === "grid"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Grid
                    </button>
                    <button
                      onClick={() => setAvailabilityView("list")}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        availabilityView === "list"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      List
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-4">
                Showing availability for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>

              {filteredRooms.length > 0 ? (
                availabilityView === "grid" ? (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredRooms.map((room) => {
                      const availability = getAvailabilityStatus(room);
                      const bookings = getRoomBookings(room);
                      
                      return (
                        <RoomAvailabilityCard
                          key={`${room.floor}-${room.room}`}
                          room={room}
                          availability={availability}
                          bookings={bookings}
                          selectedDate={selectedDate}
                          onViewDetails={() => handleViewRoomDetails(room)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRooms.map((room) => {
                      const availability = getAvailabilityStatus(room);
                      const bookings = getRoomBookings(room);
                      const statusConfig = getStatusConfig(availability.status);
                      
                      return (
                        <div key={`${room.floor}-${room.room}`} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
                              <Home size={16} />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{room.room}</h4>
                              <p className="text-sm text-gray-500">{room.floor}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">{availability.message}</span>
                            <button
                              onClick={() => handleViewRoomDetails(room)}
                              className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                            >
                              View Details
                            </button>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.badgeColor}`}>
                              {availability.status.charAt(0).toUpperCase() + availability.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No rooms found for selected floor</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Room Availability Modal */}
      {showAvailabilityModal && (
        <RoomAvailabilityModal
          selectedDate={selectedDate}
          onClose={() => {
            setShowAvailabilityModal(false);
            setSelectedRoomForModal(null);
          }}
          isAdmin={true}
          rooms={selectedRoomForModal ? [selectedRoomForModal] : rooms}
          reservations={reservations}
          loading={loading}
          error={error}
        />
      )}
    </main>
  );
}

export default AdminDashboard;