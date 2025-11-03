import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import AdminNews from "./AdminNews";
import AdminLogs from "./AdminLogs";
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
  Eye
} from "lucide-react";

// Import room images configuration
import { availableRoomImages } from "../data/roomImages";

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

  // 🆕 ADD WEBSOCKET LISTENER FOR REAL-TIME UPDATES
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

  // 🆕 ADD FUNCTION TO PROCESS SOCKET UPDATES
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
    }
  };

  // 🆕 ENHANCED REFRESH FUNCTION FOR UNREAD COUNTS
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
    setRooms(Array.isArray(roomsData) ? roomsData.filter(room => room.isActive !== false) : []);
    
    const logsData = data.logs?.error ? [] : data.logs;
    setLogs(logsData);

    setUnreadBreakdown(unreadConversations);
    updateRecentActivity(logsData);
  };

  // FIXED: Enhanced room availability calculation with precise matching
  useEffect(() => {
    if (!reservations.length) return;

    const availability = {};
    
    // Initialize all rooms from roomImages as available
    availableRoomImages.forEach(roomImage => {
      availability[roomImage.name] = [];
    });

    // Process reservations for the selected date
    reservations.forEach(reservation => {
      const reservationDate = new Date(reservation.datetime);
      const selectedDateStart = new Date(selectedDate);
      selectedDateStart.setHours(0, 0, 0, 0);
      const selectedDateEnd = new Date(selectedDate);
      selectedDateEnd.setHours(23, 59, 59, 999);
      
      // Check if reservation is on the selected date
      if (reservationDate >= selectedDateStart && reservationDate <= selectedDateEnd) {
        const reservationRoomName = reservation.roomName || reservation.room;
        
        // FIXED: Find exact room match using room mapping
        const matchedRoom = findExactRoomMatch(reservationRoomName);
        
        if (matchedRoom && availability[matchedRoom.name]) {
          // Check for duplicate reservations
          const isDuplicate = availability[matchedRoom.name].some(
            existing => 
              existing.time === reservationDate.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }) && 
              existing.user === (reservation.userId?.name || reservation.userName || 'Unknown User') &&
              existing.status === reservation.status
          );

          if (!isDuplicate) {
            availability[matchedRoom.name].push({
              time: reservationDate.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              status: reservation.status,
              user: reservation.userId?.name || reservation.userName || 'Unknown User',
              reservationId: reservation._id
            });
          }
        }
      }
    });

    setRoomAvailability(availability);
  }, [selectedDate, reservations]);

  // FIXED: Precise room matching function to avoid conflicts
  const findExactRoomMatch = (reservationRoomName) => {
    if (!reservationRoomName) return null;

    const reservationRoomLower = reservationRoomName.toLowerCase().trim();
    
    // Exact match first
    let exactMatch = availableRoomImages.find(room => 
      room.name.toLowerCase() === reservationRoomLower
    );
    
    if (exactMatch) return exactMatch;

    // Specific case handling for common room types
    if (reservationRoomLower.includes('faculty room')) {
      if (reservationRoomLower.includes('2nd') || reservationRoomLower.includes('second')) {
        return availableRoomImages.find(room => 
          room.name.toLowerCase().includes('2nd floor faculty room')
        );
      }
      return availableRoomImages.find(room => 
        room.name.toLowerCase().includes('faculty room') && 
        !room.name.toLowerCase().includes('2nd')
      );
    }

    if (reservationRoomLower.includes('collaboration room') || reservationRoomLower.includes('collab room')) {
      return availableRoomImages.find(room => 
        room.name.toLowerCase().includes('collaboration room')
      );
    }

    if (reservationRoomLower.includes('discussion room')) {
      if (reservationRoomLower.includes('2nd') || reservationRoomLower.includes('second')) {
        return availableRoomImages.find(room => 
          room.name.toLowerCase().includes('2nd floor discussion room')
        );
      }
      return availableRoomImages.find(room => 
        room.name.toLowerCase().includes('discussion room') && 
        !room.name.toLowerCase().includes('2nd')
      );
    }

    if (reservationRoomLower.includes('graduate research hub')) {
      return availableRoomImages.find(room => 
        room.name.toLowerCase().includes('graduate research hub')
      );
    }

    // Partial match as last resort
    return availableRoomImages.find(room => 
      room.name.toLowerCase().includes(reservationRoomLower) ||
      reservationRoomLower.includes(room.name.toLowerCase())
    );
  };

  // FIXED: Get floor information with precise mapping
  const getFloorForRoom = (roomName) => {
    const roomImage = availableRoomImages.find(img => img.name === roomName);
    
    if (roomImage) {
      if (roomImage.name.includes("1st Floor") || 
          (roomImage.category === "Discussion" && !roomImage.name.includes("2nd")) ||
          roomImage.category === "Graduate") {
        return "1st Floor";
      } else if (roomImage.name.includes("2nd Floor") || roomImage.category === "Faculty") {
        return "2nd Floor";
      } else if (roomImage.name.includes("Ground Floor")) {
        return "Ground Floor";
      } else if (roomImage.name.includes("Fifth Floor") || roomImage.name.includes("5th Floor")) {
        return "5th Floor";
      } else if (roomImage.category === "Special") {
        if (roomImage.name.includes("Faculty Room")) return "4th Floor";
        if (roomImage.name.includes("Collaboration Room")) return "4th Floor";
        return "Special Area";
      } else {
        return roomImage.category === "Floor" ? roomImage.name : "General Floor";
      }
    }
    
    return "Unknown Floor";
  };

  const getAvailabilityStatus = (roomName) => {
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

  const getRoomBookings = (roomName) => {
    return roomAvailability[roomName] || [];
  };

  // FIXED: Get display rooms without duplicates
  const getAllDisplayRooms = () => {
    const uniqueRooms = [];
    const seenRooms = new Set();
    
    availableRoomImages.forEach(roomImage => {
      if (!seenRooms.has(roomImage.name)) {
        seenRooms.add(roomImage.name);
        uniqueRooms.push({
          name: roomImage.name,
          floor: getFloorForRoom(roomImage.name),
          category: roomImage.category
        });
      }
    });
    
    return uniqueRooms;
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-50 border-green-200';
      case 'booked': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

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

                {unreadBreakdown.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Conversations Requiring Attention</h3>
                    <div className="space-y-3">
                      {unreadBreakdown.map((conversation, index) => (
                        <div key={conversation._id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{conversation.name || 'Unknown User'}</p>
                              <p className="text-xs text-gray-600 capitalize">
                                {conversation.type || 'user'} • {conversation.department || 'No department'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-lg text-sm font-bold">
                              {conversation.unreadCount} unread
                            </span>
                            <button
                              onClick={() => {
                                setView("adminMessage");
                                setTimeout(refreshUnreadCounts, 1000);
                              }}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="mx-auto mb-3 text-gray-400" size={32} />
                    <p className="text-gray-500 text-sm mb-4">No conversation details available</p>
                    <button
                      onClick={() => {
                        setView("adminMessage");
                        setTimeout(refreshUnreadCounts, 1000);
                      }}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
                    >
                      Check Messages
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Calendar & Recent Activity */}
          <div className="space-y-6">
            {/* Calendar */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Calendar</h2>
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                className="border-0 w-full"
                tileClassName={({ date, view }) =>
                  view === 'month' && date.toDateString() === selectedDate.toDateString()
                    ? 'bg-[#CC0000] text-white rounded-lg'
                    : ''
                }
              />
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.user} - {activity.action}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                        {activity.details && (
                          <p className="text-xs text-gray-600 mt-1 truncate">{activity.details}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Clock className="mx-auto mb-2 text-gray-400" size={24} />
                    <p className="text-gray-500 text-sm">No recent activity</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setCurrentSubView("logs")}
                className="w-full mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                View All Activity
              </button>
            </div>
          </div>
        </div>

        {/* FIXED: Room Availability Section */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <MapPin className="mr-3 text-blue-600" size={24} />
              Room Availability for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Booked</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Pending</span>
              </div>
            </div>
          </div>

          {/* FIXED: Room Availability Grid - Organized by Floor */}
          {['1st Floor', '2nd Floor', 'Ground Floor', '4th Floor', '5th Floor', 'Special'].map(floor => {
            const floorRooms = getAllDisplayRooms().filter(room => room.floor === floor);
            
            if (floorRooms.length === 0) return null;
            
            return (
              <div key={floor} className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  {floor}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {floorRooms.map((room) => {
                    const availability = getAvailabilityStatus(room.name);
                    const bookings = getRoomBookings(room.name);
                    
                    return (
                      <div key={room.name} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
                        {/* Room Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{room.name}</h4>
                            <p className="text-sm text-gray-500 flex items-center mt-1">
                              <MapPin size={12} className="mr-1" />
                              {room.category}
                            </p>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(availability.status)}`}>
                            {availability.status === 'available' && <Check size={10} className="inline mr-1" />}
                            {availability.status === 'booked' && <X size={10} className="inline mr-1" />}
                            {availability.status === 'pending' && <Clock size={10} className="inline mr-1" />}
                            {availability.message}
                          </div>
                        </div>

                        {/* Bookings List */}
                        {bookings.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-700 mb-2">Scheduled Bookings:</p>
                            <div className="space-y-2">
                              {bookings.map((booking, index) => (
                                <div key={index} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                                  <div className="flex-1">
                                    <span className="font-medium text-gray-900">{booking.time}</span>
                                    <span className="text-gray-500 ml-1">• {booking.user}</span>
                                  </div>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    booking.status === 'Approved' || booking.status === 'Ongoing' 
                                      ? 'bg-red-100 text-red-800 border border-red-200' 
                                      : booking.status === 'Completed'
                                      ? 'bg-gray-100 text-gray-800 border border-gray-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}>
                                    {booking.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* No Bookings Message */}
                        {bookings.length === 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                            <Check size={14} className="mx-auto text-green-500 mb-1" />
                            <p className="text-xs text-green-600 font-medium">No bookings today</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* No Rooms Message */}
          {getAllDisplayRooms().length === 0 && (
            <div className="text-center py-8">
              <Home className="mx-auto mb-3 text-gray-400" size={32} />
              <p className="text-gray-500 text-sm">No rooms available for display</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default AdminDashboard;