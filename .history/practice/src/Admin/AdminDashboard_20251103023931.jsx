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
  TrendingUp,
  Eye,
  Star,
  Zap,
  BarChart3
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

    // FIXED: Remove duplicate rooms and ensure consistent naming
    const uniqueRooms = Array.isArray(roomsData) 
      ? roomsData.reduce((acc, room) => {
          // Normalize room name for comparison (trim, lowercase)
          const normalizedRoomName = room.room?.trim().toLowerCase();
          
          // Check if we already have this room
          const existingRoom = acc.find(r => 
            r.room?.trim().toLowerCase() === normalizedRoomName
          );
          
          if (!existingRoom && room.room) {
            acc.push({
              ...room,
              // Ensure consistent room name format
              room: room.room.trim()
            });
          } else if (existingRoom) {
            console.warn(`⚠️ Duplicate room found: "${room.room}". Keeping first occurrence.`);
          }
          
          return acc;
        }, [])
      : [];

    console.log('🔄 Room processing:', {
      original: roomsData?.length || 0,
      unique: uniqueRooms.length,
      duplicates: (roomsData?.length || 0) - uniqueRooms.length
    });

    // MODIFIED: Include all rooms including inactive ones for 5th floor
    const allRooms = uniqueRooms.filter(room => {
      // Ensure room has required properties
      if (!room.room) {
        console.warn('Room missing name property:', room);
        return false;
      }
      return true; // Include all rooms including inactive ones
    });

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
    
    // Use all rooms including inactive ones
    setRooms(allRooms);
    
    const logsData = data.logs?.error ? [] : data.logs;
    setLogs(logsData);

    setUnreadBreakdown(unreadConversations);
    updateRecentActivity(logsData);
  };

  // FIXED: Enhanced room availability calculation with duplicate prevention
  useEffect(() => {
    if (!reservations.length || !rooms.length) {
      console.log('📊 Room availability calculation:', {
        reservations: reservations.length,
        rooms: rooms.length,
        roomNames: rooms.map(r => r.room)
      });
      return;
    }

    const availability = {};
    
    // Initialize all rooms with normalized names
    rooms.forEach(room => {
      const roomName = room.room?.trim(); // Normalize room name
      if (roomName) {
        availability[roomName] = [];
      }
    });

    console.log('🔍 Processing reservations for date:', selectedDate.toDateString());
    console.log('🏠 Available rooms:', Object.keys(availability));

    // Process reservations for the selected date
    reservations.forEach(reservation => {
      const roomName = (reservation.roomName || reservation.room)?.trim();
      if (!roomName) {
        console.warn('Reservation missing room name:', reservation);
        return;
      }

      const reservationDate = new Date(reservation.datetime);
      const selectedDateStart = new Date(selectedDate);
      selectedDateStart.setHours(0, 0, 0, 0);
      const selectedDateEnd = new Date(selectedDate);
      selectedDateEnd.setHours(23, 59, 59, 999);
      
      // Check if reservation is on the selected date
      if (reservationDate >= selectedDateStart && reservationDate <= selectedDateEnd) {
        if (!availability[roomName]) {
          console.warn(`❌ Reservation for unknown room: "${roomName}"`);
          availability[roomName] = [];
        }
        
        // Create booking object
        const booking = {
          time: reservationDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          status: reservation.status,
          user: reservation.userId?.name || reservation.userName || 'Unknown User',
          reservationId: reservation._id // Use reservation ID for uniqueness
        };
        
        // Check for duplicate reservations (same time, same user, same room)
        const isDuplicate = availability[roomName].some(existingBooking => 
          existingBooking.time === booking.time &&
          existingBooking.user === booking.user &&
          existingBooking.reservationId === booking.reservationId
        );
        
        if (!isDuplicate) {
          availability[roomName].push(booking);
          console.log(`✅ Added booking for ${roomName}:`, booking);
        } else {
          console.warn(`🔄 Duplicate booking skipped for ${roomName}:`, booking);
        }
      }
    });

    // Log final availability state
    console.log('📋 Final room availability:', availability);
    setRoomAvailability(availability);
  }, [selectedDate, reservations, rooms]);

  // Fixed room availability status calculation
  const getAvailabilityStatus = (room) => {
    const roomName = room.room?.trim();
    const bookings = roomAvailability[roomName] || [];
    
    // Check if room is active first
    if (room.isActive === false) {
      return { status: 'inactive', message: 'Room unavailable', color: 'gray' };
    }
    
    if (bookings.length === 0) {
      return { status: 'available', message: 'Available all day', color: 'green' };
    }
    
    const pending = bookings.filter(b => b.status === 'Pending').length;
    const approved = bookings.filter(b => b.status === 'Approved' || b.status === 'Ongoing').length;
    
    if (approved > 0) {
      return { 
        status: 'occupied', 
        message: `Booked (${approved} reservation${approved > 1 ? 's' : ''})`,
        color: 'red'
      };
    }
    
    if (pending > 0) {
      return { 
        status: 'pending', 
        message: `Pending approval (${pending})`,
        color: 'amber'
      };
    }
    
    return { status: 'available', message: 'Available', color: 'green' };
  };

  const getRoomBookings = (room) => {
    const roomName = room.room?.trim();
    
    // Direct match
    if (roomAvailability[roomName]) {
      return roomAvailability[roomName];
    }
    
    // Case-insensitive match as fallback
    const roomKey = Object.keys(roomAvailability).find(
      key => key.toLowerCase() === roomName?.toLowerCase()
    );
    
    return roomKey ? roomAvailability[roomKey] : [];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-50 border-green-200';
      case 'occupied': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'inactive': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return <Check size={14} className="mr-1" />;
      case 'occupied': return <X size={14} className="mr-1" />;
      case 'pending': return <Clock size={14} className="mr-1" />;
      case 'inactive': return <X size={14} className="mr-1" />;
      default: return <Check size={14} className="mr-1" />;
    }
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
    { id: "adminReservation", icon: <CalendarIcon size={20} />, label: "Reservations", color: "blue", description: "Manage bookings" },
    { id: "adminUsers", icon: <Users size={20} />, label: "Users", color: "green", description: "User management" },
    { id: "adminRoom", icon: <Home size={20} />, label: "Rooms", color: "purple", description: "Room settings" },
    { id: "adminMessage", icon: <MessageSquare size={20} />, label: "Messages", color: "amber", description: "Chat & support" },
    { id: "adminNews", icon: <FileText size={20} />, label: "News", color: "indigo", description: "Announcements" },
    { id: "adminReports", icon: <AlertCircle size={20} />, label: "Reports", color: "red", description: "Issue tracking" },
    { id: "adminNotifications", icon: <Bell size={20} />, label: "Notifications", color: "cyan", description: "Alerts & notifications" },
    { id: "adminSettings", icon: <Settings size={20} />, label: "Settings", color: "gray", description: "System configuration" }
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
      blue: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-200 hover:from-blue-100 hover:to-blue-200 hover:border-blue-300 hover:shadow-lg',
      green: 'bg-gradient-to-br from-green-50 to-green-100 text-green-700 border-green-200 hover:from-green-100 hover:to-green-200 hover:border-green-300 hover:shadow-lg',
      purple: 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-700 border-purple-200 hover:from-purple-100 hover:to-purple-200 hover:border-purple-300 hover:shadow-lg',
      amber: 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 border-amber-200 hover:from-amber-100 hover:to-amber-200 hover:border-amber-300 hover:shadow-lg',
      indigo: 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 border-indigo-200 hover:from-indigo-100 hover:to-indigo-200 hover:border-indigo-300 hover:shadow-lg',
      red: 'bg-gradient-to-br from-red-50 to-red-100 text-red-700 border-red-200 hover:from-red-100 hover:to-red-200 hover:border-red-300 hover:shadow-lg',
      cyan: 'bg-gradient-to-br from-cyan-50 to-cyan-100 text-cyan-700 border-cyan-200 hover:from-cyan-100 hover:to-cyan-200 hover:border-cyan-300 hover:shadow-lg',
      gray: 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 border-gray-200 hover:from-gray-100 hover:to-gray-200 hover:border-gray-300 hover:shadow-lg'
    };
    return colors[color] || colors.gray;
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
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-64 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden mb-4">
            <div className="h-full bg-gradient-to-r from-[#CC0000] to-red-600 animate-[loading_1.2s_ease-in-out_infinite] rounded-full"></div>
          </div>
          <p className="text-gray-800 font-bold text-lg mb-1">Loading dashboard data...</p>
          <p className="text-gray-500 font-medium text-sm">Please Wait...</p>

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
    <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Header - Unchanged as requested */}
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
        <div className="mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
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
        {/* Enhanced Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Reservation Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 shadow-inner">
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
                <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  {summaryData.pendingReservations}
                </span>
              </div>
            </div>
          </div>

          {/* Users Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-green-100 text-green-600 shadow-inner">
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
                <span className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                  +{getNewUsersThisWeek()}
                </span>
              </div>
            </div>
          </div>

          {/* Messages Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 shadow-inner">
                <MessageSquare size={24} />
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold px-2 py-1 rounded ${summaryData.unreadMessages > 0 ? 'text-gray-900' : 'text-gray-600 bg-gray-50'}`}>
                  {summaryData.unreadMessages}
                </span>
                <p className="text-gray-500 text-sm font-medium">Unread Messages</p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Require attention</span>
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${summaryData.unreadMessages > 0 ? 'text-red-600 bg-red-50 border border-red-200' : 'text-gray-600 bg-gray-50 border border-gray-200'}`}>
                  {summaryData.unreadMessages}
                </span>
              </div>
            </div>
          </div>

          {/* Reports Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-50 to-red-100 text-red-600 shadow-inner">
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
                <span className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">
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
            {/* Enhanced Quick Actions */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Zap className="mr-3 text-amber-500" size={24} />
                  Quick Actions
                </h2>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
                  {quickActions.length} options
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => setView(action.id)}
                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${getColorClasses(action.color)}`}
                  >
                    <div className="p-3 rounded-xl bg-white border mb-3 shadow-sm">
                      {action.icon}
                    </div>
                    <span className="text-sm font-semibold text-center mb-1">{action.label}</span>
                    <span className="text-xs text-gray-600 text-center">{action.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Enhanced Unread Messages Overview */}
            {summaryData.unreadMessages > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Mail className="mr-3 text-amber-600" size={24} />
                    Unread Messages Overview
                  </h2>
                  <span className="bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-semibold border border-amber-200">
                    {summaryData.unreadMessages} total unread
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-800 text-sm font-semibold">From Users</span>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-bold">
                        {summaryData.unreadUserMessages}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-800 text-sm font-semibold">From Staff</span>
                      <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-lg text-sm font-bold">
                        {summaryData.unreadStaffMessages}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
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
                        <div key={conversation._id || index} className="flex items-center justify-between p-4 bg-white rounded-xl border border-amber-100 shadow-sm">
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
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
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-lg text-sm font-bold border border-red-200">
                              {conversation.unreadCount} unread
                            </span>
                            <button
                              onClick={() => {
                                setView("adminMessage");
                                setTimeout(refreshUnreadCounts, 1000);
                              }}
                              className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-white rounded-xl border border-amber-100">
                    <MessageSquare className="mx-auto mb-3 text-amber-400" size={32} />
                    <p className="text-gray-500 text-sm mb-4">No conversation details available</p>
                    <button
                      onClick={() => {
                        setView("adminMessage");
                        setTimeout(refreshUnreadCounts, 1000);
                      }}
                      className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm"
                    >
                      Check Messages
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Enhanced Room Availability with Floor Grouping - Shows ALL rooms including inactive */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <MapPin className="mr-3 text-blue-500" size={24} />
                  Room Availability
                </h2>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-700 bg-gray-100 px-4 py-2 rounded-lg border border-gray-200 font-medium">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>

              {rooms.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                  <MapPin className="mx-auto text-gray-400 mb-3" size={40} />
                  <p className="text-gray-500 text-sm">No rooms found</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group rooms by floor - Show ALL floors including 5th floor with inactive rooms */}
                  {["Ground Floor", "1st Floor", "2nd Floor", "4th Floor", "5th Floor"].map(floor => {
                    const floorRooms = rooms.filter(room => 
                      room.floor?.toLowerCase() === floor.toLowerCase() || 
                      (floor === "1st Floor" && !room.floor) // Handle rooms without floor specified
                    );
                    
                    // Always show the floor section even if no rooms (for 5th floor)
                    if (floorRooms.length === 0 && floor !== "5th Floor") return null;

                    return (
                      <div key={floor} className="border border-gray-200 rounded-xl overflow-hidden">
                        {/* Floor Header */}
                        <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                          <h3 className="font-semibold text-gray-800 text-base flex items-center">
                            <Home size={16} className="mr-2" />
                            {floor}
                            {floorRooms.length === 0 && (
                              <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                No rooms
                              </span>
                            )}
                          </h3>
                        </div>
                        
                        {/* Room Grid - Show message if no rooms, otherwise show rooms */}
                        {floorRooms.length === 0 ? (
                          <div className="p-6 text-center bg-gray-50/50">
                            <p className="text-gray-500 text-sm">No rooms available on this floor</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50/50">
                            {floorRooms.map(room => {
                              const availability = getAvailabilityStatus(room);
                              const bookings = getRoomBookings(room);
                              
                              return (
                                <div
                                  key={room._id}
                                  className={`p-4 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 ${
                                    room.isActive === false ? 'bg-gray-100 opacity-75' : 'bg-white'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                      <div className={`p-2 rounded-lg shadow-inner ${
                                        room.isActive === false 
                                          ? 'bg-gray-200 text-gray-500' 
                                          : 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600'
                                      }`}>
                                        <Home size={18} />
                                      </div>
                                      <div>
                                        <h3 className={`font-semibold text-base ${
                                          room.isActive === false ? 'text-gray-500' : 'text-gray-900'
                                        }`}>
                                          {room.room}
                                          {room.isActive === false && " (Inactive)"}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                          {room.floor || 'No floor specified'} • {room.capacity || 'N/A'} capacity
                                        </p>
                                      </div>
                                    </div>
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(availability.status)} shadow-sm`}>
                                      {getStatusIcon(availability.status)}
                                      {availability.status === 'available' ? 'Available' : 
                                       availability.status === 'occupied' ? 'Occupied' : 
                                       availability.status === 'pending' ? 'Pending' : 'Inactive'}
                                    </div>
                                  </div>
                                  
                                  <p className={`text-sm mb-3 ${
                                    room.isActive === false ? 'text-gray-500' : 'text-gray-600'
                                  }`}>
                                    {availability.message}
                                  </p>
                                  
                                  {bookings.length > 0 && room.isActive !== false && (
                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                      <p className="text-sm font-semibold text-gray-700 mb-2">Scheduled Bookings</p>
                                      <div className="space-y-2">
                                        {bookings.slice(0, 2).map((booking, index) => (
                                          <div key={index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded-lg border border-gray-100">
                                            <span className="text-gray-700 font-medium">{booking.time}</span>
                                            <span className="text-gray-600 truncate ml-2 max-w-[120px]">
                                              {booking.user}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium border ${
                                              booking.status === 'Approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                              booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                              'bg-blue-100 text-blue-800 border-blue-200'
                                            }`}>
                                              {booking.status}
                                            </span>
                                          </div>
                                        ))}
                                        {bookings.length > 2 && (
                                          <p className="text-xs text-gray-500 text-center pt-2 bg-white py-1 rounded-lg border border-gray-200">
                                            +{bookings.length - 2} more bookings
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Room Type Badge */}
                                  {room.type && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                        {room.type}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Handle rooms without floor specification */}
                  {(() => {
                    const noFloorRooms = rooms.filter(room => !room.floor);
                    if (noFloorRooms.length > 0) {
                      return (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                            <h3 className="font-semibold text-gray-800 text-base flex items-center">
                              <Home size={16} className="mr-2" />
                              Other Rooms
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50/50">
                            {noFloorRooms.map(room => {
                              const availability = getAvailabilityStatus(room);
                              const bookings = getRoomBookings(room);
                              
                              return (
                                <div
                                  key={room._id}
                                  className={`p-4 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 ${
                                    room.isActive === false ? 'bg-gray-100 opacity-75' : 'bg-white'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                      <div className={`p-2 rounded-lg shadow-inner ${
                                        room.isActive === false 
                                          ? 'bg-gray-200 text-gray-500' 
                                          : 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600'
                                      }`}>
                                        <Home size={18} />
                                      </div>
                                      <div>
                                        <h3 className={`font-semibold text-base ${
                                          room.isActive === false ? 'text-gray-500' : 'text-gray-900'
                                        }`}>
                                          {room.room}
                                          {room.isActive === false && " (Inactive)"}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                          No floor specified • {room.capacity || 'N/A'} capacity
                                        </p>
                                      </div>
                                    </div>
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(availability.status)} shadow-sm`}>
                                      {getStatusIcon(availability.status)}
                                      {availability.status === 'available' ? 'Available' : 
                                       availability.status === 'occupied' ? 'Occupied' : 
                                       availability.status === 'pending' ? 'Pending' : 'Inactive'}
                                    </div>
                                  </div>
                                  
                                  <p className={`text-sm mb-3 ${
                                    room.isActive === false ? 'text-gray-500' : 'text-gray-600'
                                  }`}>
                                    {availability.message}
                                  </p>
                                  
                                  {bookings.length > 0 && room.isActive !== false && (
                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                      <p className="text-sm font-semibold text-gray-700 mb-2">Scheduled Bookings</p>
                                      <div className="space-y-2">
                                        {bookings.slice(0, 2).map((booking, index) => (
                                          <div key={index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded-lg border border-gray-100">
                                            <span className="text-gray-700 font-medium">{booking.time}</span>
                                            <span className="text-gray-600 truncate ml-2 max-w-[120px]">
                                              {booking.user}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium border ${
                                              booking.status === 'Approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                              booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                              'bg-blue-100 text-blue-800 border-blue-200'
                                            }`}>
                                              {booking.status}
                                            </span>
                                          </div>
                                        ))}
                                        {bookings.length > 2 && (
                                          <p className="text-xs text-gray-500 text-center pt-2 bg-white py-1 rounded-lg border border-gray-200">
                                            +{bookings.length - 2} more bookings
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* Enhanced Availability Legend */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <BarChart3 size={16} className="mr-2" />
                  Status Legend
                </h3>
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="flex items-center px-3 py-2 bg-green-50 rounded-xl border border-green-200 shadow-sm">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2 shadow-sm"></div>
                    <span className="text-green-800 font-medium">Available</span>
                  </div>
                  <div className="flex items-center px-3 py-2 bg-red-50 rounded-xl border border-red-200 shadow-sm">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2 shadow-sm"></div>
                    <span className="text-red-800 font-medium">Occupied</span>
                  </div>
                  <div className="flex items-center px-3 py-2 bg-yellow-50 rounded-xl border border-yellow-200 shadow-sm">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2 shadow-sm"></div>
                    <span className="text-yellow-800 font-medium">Pending</span>
                  </div>
                  <div className="flex items-center px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
                    <div className="w-3 h-3 bg-gray-500 rounded-full mr-2 shadow-sm"></div>
                    <span className="text-gray-800 font-medium">Inactive</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Recent News */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FileText className="mr-3 text-indigo-500" size={24} />
                  Recent News
                </h2>
                <button
                  onClick={() => setCurrentSubView("news")}
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 shadow-sm"
                >
                  <FileText size={16} className="mr-2" />
                  Manage News
                </button>
              </div>
              
              {newsList.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                  <FileText className="mx-auto text-gray-400 mb-3" size={40} />
                  <p className="text-gray-500 text-sm">No news posted yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {newsList.slice(0, 3).map((news) => (
                    <div key={news._id} className="p-4 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-gray-50/50">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900 text-base leading-tight">{news.title}</h3>
                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-lg font-medium border border-gray-200">
                          {new Date(news.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                        {news.content.replace(/<[^>]*>/g, '')}
                      </p>
                    </div>
                  ))}
                  {newsList.length > 3 && (
                    <button 
                      onClick={() => setCurrentSubView("news")}
                      className="w-full py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-colors duration-200 border border-gray-200 hover:border-blue-200"
                    >
                      View all news articles ({newsList.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Calendar & Activity */}
          <div className="space-y-6">
            {/* Enhanced Calendar */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <CalendarIcon className="mr-3 text-purple-500" size={24} />
                Calendar
              </h2>
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                className="border-0 w-full rounded-lg"
                tileClassName={({ date, view }) =>
                  view === 'month' && date.toDateString() === selectedDate.toDateString()
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg shadow-sm'
                    : 'hover:bg-gray-100 rounded-lg'
                }
              />
              <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-800 font-medium flex items-center">
                  <Star size={16} className="mr-2" />
                  Selected: {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Enhanced Recent Activity */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <TrendingUp className="mr-3 text-green-500" size={24} />
                  Recent Activity
                </h2>
                <button
                  onClick={() => setCurrentSubView("logs")}
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 shadow-sm"
                >
                  <Eye size={16} className="mr-2" />
                  View Logs
                </button>
              </div>
              
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                  <Clock className="mx-auto text-gray-400 mb-3" size={40} />
                  <p className="text-gray-500 text-sm">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-gray-50/50">
                      <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full mt-2 shadow-sm"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{activity.action}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{activity.details}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">{activity.user}</span>
                          <span className="text-xs text-gray-400 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 text-blue-600">{activity.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default AdminDashboard;