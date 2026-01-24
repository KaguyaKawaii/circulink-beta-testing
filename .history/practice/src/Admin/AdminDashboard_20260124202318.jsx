import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import AdminNews from "./AdminNews";
import AdminLogs from "./AdminLogs";
import RoomAvailabilityModal from "./AdminRoomAvailabilityModal";

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
  ChevronRight
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
  
  // Room Availability Modal State
  const [showAvailModal, setShowAvailModal] = useState(false);
  const [modalDate, setModalDate] = useState(new Date());
  const [roomStatuses, setRoomStatuses] = useState([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState(null);

  // WebSocket listener for real-time updates
  useEffect(() => {
    if (!window.socketConnected) {
      const socket = io(import.meta.env.VITE_WS_URL);
      
      socket.on('adminUnreadUpdate', (data) => {
        updateUnreadCountsFromSocket(data);
      });

      socket.on('newMessage', (message) => {
        if (message.receiver === 'admin' || message.sender === 'admin') {
          refreshUnreadCounts();
        }
      });

      window.socketConnected = true;
      
      return () => {
        socket.off('adminUnreadUpdate');
        socket.off('newMessage');
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
      console.error('Failed to refresh unread counts:', error);
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
    setRooms(Array.isArray(roomsData) ? roomsData.filter(room => room.isActive !== false) : []);
    
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
      availability[room.room] = [];
    });

    reservations.forEach(reservation => {
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
    });

    setRoomAvailability(availability);
  }, [selectedDate, reservations, rooms]);

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
        message: `Booked (${approved})` 
      };
    }
    
    if (pending > 0) {
      return { 
        status: 'pending', 
        message: `Pending (${pending})` 
      };
    }
    
    return { status: 'available', message: 'Available' };
  };

  const getRoomBookings = (room) => {
    const roomName = room.room;
    
    if (roomAvailability[roomName]) {
      return roomAvailability[roomName];
    }
    
    const roomKey = Object.keys(roomAvailability).find(
      key => key.toLowerCase() === roomName.toLowerCase()
    );
    
    return roomKey ? roomAvailability[roomKey] : [];
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
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const refreshData = () => {
    fetchAllData();
  };

  // Calendar Functions
  const handleDateClick = (date) => {
    setSelectedDate(date);
    setModalDate(date);
    fetchRoomAvailabilityForDate(date);
  };

  const fetchRoomAvailabilityForDate = async (date) => {
    try {
      setAvailLoading(true);
      setAvailError(null);
      setShowAvailModal(true);
      
      const formattedDate = date.toISOString().split('T')[0];
      
      try {
        const availabilityData = await apiService.get(`/api/rooms/availability?date=${formattedDate}&userId=admin`);
        
        if (Array.isArray(availabilityData)) {
          const processedData = availabilityData.map(room => ({
            _id: room._id || room.room,
            room: room.room || "Unnamed Room",
            floor: room.floor || "Unknown Floor",
            isActive: room.isActive !== false,
            occupied: Array.isArray(room.occupied) ? room.occupied : [],
            pending: Array.isArray(room.pending) ? room.pending : []
          }));
          
          setRoomStatuses(processedData);
        } else {
          setAvailError("No room data available");
          setRoomStatuses([]);
        }
      } catch (apiError) {
        setAvailError("Unable to load room availability");
        setRoomStatuses([]);
      }
    } catch (error) {
      console.error("Error in room availability process:", error);
      setAvailError("Failed to load room availability");
    } finally {
      setAvailLoading(false);
    }
  };
  
  const renderCalendarTile = ({ date, view }) => {
    if (view !== 'month') return null;
    
    const dateStr = date.toISOString().split('T')[0];
    
    const dayReservations = reservations.filter(reservation => {
      const reservationDate = new Date(reservation.datetime).toISOString().split('T')[0];
      return reservationDate === dateStr;
    });
    
    if (dayReservations.length === 0) return null;
    
    return (
      <div className="absolute bottom-1 left-0 right-0 flex justify-center">
        <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
      </div>
    );
  };

  useEffect(() => {
    fetchAllData();
    
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const quickActions = [
    { id: "adminReservation", icon: <CalendarIcon size={18} />, label: "Reservations", color: "blue", count: summaryData.pendingReservations },
    { id: "adminUsers", icon: <Users size={18} />, label: "Users", color: "green", count: getNewUsersThisWeek() },
    { id: "adminRoom", icon: <Home size={18} />, label: "Rooms", color: "purple", count: rooms.length },
    { id: "adminMessage", icon: <MessageSquare size={18} />, label: "Messages", color: "amber", count: summaryData.unreadMessages },
    { id: "adminNews", icon: <FileText size={18} />, label: "News", color: "indigo", count: newsList.length },
    { id: "adminReports", icon: <AlertCircle size={18} />, label: "Reports", color: "red", count: summaryData.pendingReports },
    { id: "adminNotifications", icon: <Bell size={18} />, label: "Notifications", color: "cyan" },
    { id: "adminSettings", icon: <Settings size={18} />, label: "Settings", color: "gray" }
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
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="mt-6 text-gray-700 font-medium">Loading dashboard...</p>
          <p className="text-gray-500 text-sm">Please wait a moment</p>
        </div>
      </main>
    );
  }

  const getGradientClass = (color) => {
    const gradients = {
      blue: 'from-blue-50 to-blue-100 border-blue-200',
      green: 'from-green-50 to-green-100 border-green-200',
      purple: 'from-purple-50 to-purple-100 border-purple-200',
      amber: 'from-amber-50 to-amber-100 border-amber-200',
      indigo: 'from-indigo-50 to-indigo-100 border-indigo-200',
      red: 'from-red-50 to-red-100 border-red-200',
      cyan: 'from-cyan-50 to-cyan-100 border-cyan-200',
      gray: 'from-gray-50 to-gray-100 border-gray-200'
    };
    return gradients[color] || gradients.gray;
  };

  const getStatGradient = (color) => {
    const gradients = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      amber: 'from-amber-500 to-amber-600',
      red: 'from-red-500 to-red-600'
    };
    return gradients[color] || gradients.blue;
  };

  return (
    <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm px-8 py-6 border-b border-gray-200/50 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-600 text-sm mt-1 flex items-center">
              Welcome back, Administrator 
              <span className="mx-2">•</span>
              <span className="text-blue-600 font-medium">Real-time updates active</span>
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="flex items-center px-4 py-2.5 text-sm font-medium rounded-xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 hover:shadow-sm"
            >
              <RefreshCw size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-2.5 rounded-xl border border-blue-200">
              <span className="text-sm font-medium text-blue-800">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="mx-8 mt-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle size={20} className="text-red-500" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-800 hover:text-red-900 text-lg font-bold ml-4"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6 space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Reservation Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-200/50">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                <CalendarIcon size={22} className="text-blue-600" />
              </div>
              <div className="text-right">
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-gray-900">{summaryData.reservations}</p>
                  {summaryData.pendingReservations > 0 && (
                    <span className="ml-2 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                      +{summaryData.pendingReservations}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm font-medium mt-1">Reservations</p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending approval</span>
                <div className="relative">
                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${getStatGradient('blue')} rounded-full`}
                      style={{ width: `${Math.min((summaryData.pendingReservations / Math.max(summaryData.reservations, 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Users Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300 hover:border-green-200/50">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                <Users size={22} className="text-green-600" />
              </div>
              <div className="text-right">
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-gray-900">{summaryData.users}</p>
                  {getNewUsersThisWeek() > 0 && (
                    <span className="ml-2 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                      +{getNewUsersThisWeek()}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm font-medium mt-1">Users</p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">New this week</span>
                <span className="text-sm font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">
                  {getNewUsersThisWeek()}
                </span>
              </div>
            </div>
          </div>

          {/* Messages Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-200/50">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
                <MessageSquare size={22} className="text-amber-600" />
              </div>
              <div className="text-right">
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-gray-900">{summaryData.unreadMessages}</p>
                  {summaryData.unreadMessages > 0 && (
                    <div className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                </div>
                <p className="text-gray-500 text-sm font-medium mt-1">Unread Messages</p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Require attention</span>
                <span className={`text-sm font-semibold ${
                  summaryData.unreadMessages > 0 
                    ? 'text-red-600 bg-red-50' 
                    : 'text-gray-600 bg-gray-50'
                } px-2.5 py-1 rounded-lg`}>
                  {summaryData.unreadMessages}
                </span>
              </div>
            </div>
          </div>

          {/* Reports Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300 hover:border-red-200/50">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
                <AlertCircle size={22} className="text-red-600" />
              </div>
              <div className="text-right">
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-gray-900">{summaryData.reports}</p>
                  {summaryData.pendingReports > 0 && (
                    <span className="ml-2 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                      +{summaryData.pendingReports}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm font-medium mt-1">Reports</p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending review</span>
                <span className="text-sm font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">
                  {summaryData.pendingReports}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Quick Actions & Unread Messages */}
          <div className="xl:col-span-2 space-y-8">
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/50 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
                <p className="text-sm text-gray-500">Manage system components</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => setView(action.id)}
                    className={`group relative flex flex-col items-center p-5 rounded-xl border transition-all duration-300 bg-gradient-to-b ${getGradientClass(action.color)} hover:scale-[1.02] hover:shadow-md`}
                  >
                    <div className="p-3 rounded-xl bg-white/80 border border-white/50 shadow-sm mb-3 group-hover:shadow transition-shadow">
                      {action.icon}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 text-center mb-1">{action.label}</span>
                    {action.count !== undefined && action.count > 0 ? (
                      <span className={`text-xs font-bold ${
                        action.color === 'blue' ? 'text-blue-700' :
                        action.color === 'green' ? 'text-green-700' :
                        action.color === 'amber' ? 'text-amber-700' :
                        action.color === 'red' ? 'text-red-700' :
                        'text-gray-700'
                      } bg-white/80 px-2 py-1 rounded-lg`}>
                        {action.count}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                    <ChevronRight size={14} className="absolute top-3 right-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>

            {/* Unread Messages Overview */}
            {summaryData.unreadMessages > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-200/50 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                      <Mail className="mr-3 text-amber-600" size={24} />
                      Unread Messages
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">Messages requiring your attention</p>
                  </div>
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm">
                    {summaryData.unreadMessages} unread
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white/80 p-4 rounded-xl border border-blue-200/50">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-800 text-sm font-semibold">From Users</span>
                      <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">
                        {summaryData.unreadUserMessages}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-white/80 p-4 rounded-xl border border-purple-200/50">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-800 text-sm font-semibold">From Staff</span>
                      <span className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">
                        {summaryData.unreadStaffMessages}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-white/80 p-4 rounded-xl border border-amber-200/50">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-800 text-sm font-semibold">Total Unread</span>
                      <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">
                        {summaryData.unreadMessages}
                      </span>
                    </div>
                  </div>
                </div>

                {unreadBreakdown.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Active Conversations</h3>
                    <div className="space-y-3">
                      {unreadBreakdown.map((conversation, index) => (
                        <div key={conversation._id || index} className="flex items-center justify-between p-4 bg-white/80 rounded-xl border border-gray-200/50 hover:border-amber-200 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{conversation.name || 'Unknown User'}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs text-gray-500 capitalize">{conversation.type || 'user'}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs text-gray-500">{conversation.department || 'No department'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                              {conversation.unreadCount} unread
                            </span>
                            <button
                              onClick={() => {
                                setView("adminMessage");
                                setTimeout(refreshUnreadCounts, 1000);
                              }}
                              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:shadow-md transition-all duration-200 hover:scale-105"
                            >
                              Reply Now
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="mx-auto mb-4 text-gray-400" size={40} />
                    <p className="text-gray-500 text-sm mb-4">No conversation details available</p>
                    <button
                      onClick={() => {
                        setView("adminMessage");
                        setTimeout(refreshUnreadCounts, 1000);
                      }}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:shadow-md transition-all duration-200"
                    >
                      Check All Messages
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Recent News */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/50 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Recent News</h2>
                  <p className="text-sm text-gray-500 mt-1">Latest announcements and updates</p>
                </div>
                <button
                  onClick={() => setCurrentSubView("news")}
                  className="flex items-center px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:shadow-sm"
                >
                  <FileText size={16} className="mr-2" />
                  Manage News
                </button>
              </div>
              
              {newsList.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                  <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-500 text-sm">No news articles posted yet</p>
                  <button
                    onClick={() => setCurrentSubView("news")}
                    className="mt-4 text-blue-600 text-sm font-medium hover:text-blue-700"
                  >
                    Create your first article
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {newsList.slice(0, 3).map((news, index) => (
                    <div key={news._id} className="group p-5 rounded-xl border border-gray-200 hover:border-blue-200 transition-all duration-300 hover:shadow-sm bg-gradient-to-r from-white to-gray-50/50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 text-xs font-bold">{index + 1}</span>
                          </div>
                          <h3 className="font-semibold text-gray-900 text-base leading-tight group-hover:text-blue-600 transition-colors">{news.title}</h3>
                        </div>
                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap">
                          {new Date(news.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 ml-11">
                        {news.content.replace(/<[^>]*>/g, '')}
                      </p>
                    </div>
                  ))}
                  {newsList.length > 3 && (
                    <button 
                      onClick={() => setCurrentSubView("news")}
                      className="w-full py-3.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-200 border border-gray-200 hover:border-blue-200 group"
                    >
                      <div className="flex items-center justify-center">
                        View all news articles
                        <span className="ml-2 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                          {newsList.length}
                        </span>
                        <ChevronRight size={16} className="ml-2 text-blue-500 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Calendar & Activity */}
          <div className="space-y-8">
            {/* Calendar */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/50 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Reservation Calendar</h2>
              <Calendar
                onClickDay={handleDateClick}
                value={selectedDate}
                className="border-0 w-full"
                tileContent={renderCalendarTile}
                tileClassName={({ date, view }) => {
                  if (view !== "month") return "";
                  const today = new Date();
                  const tileDate = new Date(date);
                  const isToday = today.toDateString() === tileDate.toDateString();
                  return `relative h-10 sm:h-12 hover:bg-gray-50 rounded-lg transition-all duration-200 ${
                    isToday ? 'bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200' : ''
                  }`;
                }}
                prevLabel={<span className="text-gray-600 hover:text-blue-600 transition-colors p-2">◀</span>}
                nextLabel={<span className="text-gray-600 hover:text-blue-600 transition-colors p-2">▶</span>}
                prev2Label={null}
                next2Label={null}
                aria-label="Reservation calendar"
              />
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-blue-800 font-medium">
                    Selected: {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <button
                    onClick={() => handleDateClick(selectedDate)}
                    className="text-blue-600 text-sm font-medium hover:text-blue-700"
                  >
                    View availability →
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/50 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                  <p className="text-sm text-gray-500 mt-1">Latest system events</p>
                </div>
                <button
                  onClick={() => setCurrentSubView("logs")}
                  className="flex items-center px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:shadow-sm"
                >
                  <Eye size={16} className="mr-2" />
                  View Logs
                </button>
              </div>
              
              {recentActivity.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                  <Clock className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-500 text-sm">No recent activity recorded</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={activity.id} className="group flex items-start space-x-4 p-4 rounded-xl border border-gray-200 hover:border-blue-200 transition-all duration-200 hover:shadow-sm">
                      <div className="relative">
                        <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mt-2"></div>
                        {index === 0 && (
                          <div className="absolute inset-0 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">{activity.action}</p>
                          <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{activity.time}</span>
                        </div>
                        {activity.details && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{activity.details}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-xs text-gray-600 font-medium">
                                {activity.user.charAt(0)}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">{activity.user}</span>
                          </div>
                          <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
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

      {/* Room Availability Modal */}
      {showAvailModal && (
        <RoomAvailabilityModal
          selectedDate={modalDate}
          roomStatuses={roomStatuses}
          availLoading={availLoading}
          availError={availError}
          onClose={() => setShowAvailModal(false)}
        />
      )}
    </main>
  );
}

export default AdminDashboard;