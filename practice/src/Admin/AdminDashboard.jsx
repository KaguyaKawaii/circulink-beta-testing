// AdminDashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import AdminNews from "./AdminNews";
import AdminLogs from "./AdminLogs";
import moment from "moment-timezone";

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
  UserPlus,
  CheckCircle,
  XCircle,
  Clock3,
  BarChart3,
  PieChart,
  Activity,
  Star,
  Award,
  Target,
  Zap,
  Percent,
  ChevronDown,
  ChevronUp,
  Building2,
  Maximize2
} from "lucide-react";

// API service module with correct endpoints
const apiService = {
  baseURL: import.meta.env.VITE_API_URL,
  
  async get(url) {
    try {
      console.log(`🌐 Fetching: ${this.baseURL}${url}`);
      const response = await axios.get(`${this.baseURL}${url}`);
      return response.data;
    } catch (error) {
      console.error(`API Error (GET ${url}):`, error);
      // Return empty array or object instead of throwing to prevent cascading failures
      if (error.response?.status === 404) {
        console.log(`⚠️ Endpoint ${url} not found, returning empty data`);
        return [];
      }
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
    unreadStaffMessages: 0,
    totalRooms: 0,
    activeRooms: 0,
    occupancyRate: 0,
    completedReservations: 0,
    cancelledReservations: 0
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
  const [unreadBreakdown, setUnreadBreakdown] = useState([]);
  const [popularRooms, setPopularRooms] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  
  // Room Availability State
  const [roomStatuses, setRoomStatuses] = useState([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState(null);
  const [expandedFloors, setExpandedFloors] = useState({});

  // Modal States
  const [showRoomAvailabilityModal, setShowRoomAvailabilityModal] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [showNewsModal, setShowNewsModal] = useState(false);

  // Admin user ID from localStorage - using id_number
  const getAdminId = () => {
    const admin = JSON.parse(localStorage.getItem("admin") || "{}");
    return admin.id_number || "admin";
  };

  // 🆕 ADD WEBSOCKET LISTENER FOR REAL-TIME UPDATES
  useEffect(() => {
    // Only set up socket if not already connected
    if (!window.socketConnected) {
      console.log('🔌 Connecting to WebSocket for real-time updates...');
      const socket = io(import.meta.env.VITE_WS_URL);
      
      // Listen for admin unread updates
      socket.on('adminUnreadUpdate', (data) => {
        console.log('📥 Received real-time admin unread update:', data);
        updateUnreadCountsFromSocket(data);
      });

      // Listen for new messages to admin
      socket.on('newMessage', (message) => {
        if (message.receiver === 'admin' || message.sender === 'admin') {
          console.log('📥 New message affecting admin, refreshing counts');
          refreshUnreadCounts();
        }
      });

      // Listen for connection events
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
      
      console.log('✅ Unread counts updated via WebSocket:', { 
        totalUnread, 
        unreadUserMessages, 
        unreadStaffMessages 
      });
    }
  };

  // 🆕 ENHANCED REFRESH FUNCTION FOR UNREAD COUNTS
  const refreshUnreadCounts = async () => {
    try {
      console.log('🔄 Manually refreshing unread counts...');
      // Use the correct endpoint from messageRoutes.js
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
      // Set fallback data
      setSummaryData(prev => ({
        ...prev,
        unreadMessages: 0,
        unreadUserMessages: 0,
        unreadStaffMessages: 0
      }));
    }
  };

const fetchAllData = useCallback(async () => {
  try {
    setRefreshing(true);
    setError(null);
    
    // Define all API endpoints to fetch - using correct endpoints from your routes
    const endpoints = [
      { key: 'reservations', url: '/api/reservations' },
      // ✅ FIXED: Changed from '/api/all/users' to '/api/users/all' to match your routes
      { key: 'users', url: '/api/users/all' },
      { key: 'reports', url: '/api/reports' },
      { key: 'rooms', url: '/api/rooms' },
      { key: 'news', url: '/api/news/active' },
      { key: 'logs', url: '/api/logs' },
      { key: 'adminRecipients', url: '/api/messages/recipients/admin' }
    ];

    // Fetch all data in parallel with error handling for each
    const fetchPromises = endpoints.map(async (endpoint) => {
      try {
        const data = await apiService.get(endpoint.url);
        return { key: endpoint.key, data };
      } catch (error) {
        console.log(`⚠️ Failed to fetch ${endpoint.key}, using empty data`);
        return { key: endpoint.key, data: [] };
      }
    });

    const results = await Promise.all(fetchPromises);
    
    // Process results
    const data = {};
    results.forEach(result => {
      data[result.key] = result.data;
    });

    // Process and validate data
    processFetchedData(data);

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    setError("Some dashboard data failed to load. Showing available information.");
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);

  const processFetchedData = (data) => {
    // Helper function to safely get array length
    const safeLength = (array) => (Array.isArray(array) ? array.length : 0);
    
    // Helper function to filter by status
    const filterByStatus = (array, status) => 
      Array.isArray(array) ? array.filter(item => item.status === status).length : 0;

    // Process data with safe fallbacks
    // FIXED: Handle the response structure from getAllUsers which returns { success: true, users: [...] }
    let usersData = [];
    if (data.users && data.users.success && Array.isArray(data.users.users)) {
      usersData = data.users.users;
    } else if (Array.isArray(data.users)) {
      usersData = data.users;
    }
    
    const reservationsData = Array.isArray(data.reservations) ? data.reservations : [];
    const reportsData = Array.isArray(data.reports) ? data.reports : [];
    const roomsData = Array.isArray(data.rooms) ? data.rooms : [];
    const adminRecipients = Array.isArray(data.adminRecipients) ? data.adminRecipients : [];

    // Calculate additional metrics
    const activeRooms = roomsData.filter(room => room.isActive !== false).length;
    
    const completedReservations = reservationsData.filter(res => 
      res.status === 'Completed' || res.status === 'Approved'
    ).length;
    
    const cancelledReservations = reservationsData.filter(res => 
      res.status === 'Cancelled' || res.status === 'Rejected'
    ).length;
    
    const occupancyRate = activeRooms > 0 
      ? Math.round((completedReservations / activeRooms) * 100) 
      : 0;

    // Calculate unread messages
    const totalUnread = adminRecipients.reduce((sum, recipient) => sum + (recipient.unreadCount || 0), 0);

    const unreadUserMessages = adminRecipients
      .filter(recipient => recipient.type === 'user')
      .reduce((sum, recipient) => sum + (recipient.unreadCount || 0), 0);

    const unreadStaffMessages = adminRecipients
      .filter(recipient => recipient.type === 'staff')
      .reduce((sum, recipient) => sum + (recipient.unreadCount || 0), 0);

    // Calculate popular rooms
    if (reservationsData.length > 0) {
      const roomCounts = {};
      reservationsData.forEach(res => {
        const roomName = res.roomName || res.room;
        if (roomName) {
          roomCounts[roomName] = (roomCounts[roomName] || 0) + 1;
        }
      });
      
      const popular = Object.entries(roomCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      setPopularRooms(popular);
    }

    // Calculate peak hours
    if (reservationsData.length > 0) {
      const hourCounts = {};
      reservationsData.forEach(res => {
        if (res.datetime) {
          const hour = new Date(res.datetime).getHours();
          const timeSlot = `${hour}:00 - ${hour + 1}:00`;
          hourCounts[timeSlot] = (hourCounts[timeSlot] || 0) + 1;
        }
      });
      
      const peak = Object.entries(hourCounts)
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      
      setPeakHours(peak);
    }

    setSummaryData({
      reservations: safeLength(reservationsData),
      users: safeLength(usersData),
      messages: safeLength(adminRecipients),
      pendingReservations: filterByStatus(reservationsData, 'pending'),
      reports: safeLength(reportsData),
      pendingReports: filterByStatus(reportsData, 'Pending'),
      unreadMessages: totalUnread,
      unreadUserMessages,
      unreadStaffMessages,
      totalRooms: safeLength(roomsData),
      activeRooms,
      occupancyRate,
      completedReservations,
      cancelledReservations
    });

    // Set other data states
    setNewsList(Array.isArray(data.news) ? data.news : []);
    setReservations(reservationsData);
    setReports(reportsData);
    setRooms(roomsData.filter(room => room.isActive !== false));
    
    const logsData = Array.isArray(data.logs) ? data.logs : [];
    setLogs(logsData);

    // Set unread breakdown
    setUnreadBreakdown(
      adminRecipients
        .filter(recipient => recipient.unreadCount > 0)
        .sort((a, b) => b.unreadCount - a.unreadCount)
        .slice(0, 5)
    );

    // Update recent activity
    updateRecentActivity(logsData);
  };

  // Fetch room availability for selected date
  const fetchRoomAvailabilityForDate = useCallback(async (date) => {
    try {
      console.log('🚀 Fetching room availability...');
      setAvailLoading(true);
      setAvailError(null);
      
      // Format date for API
      const formattedDate = date.toISOString().split('T')[0];
      const adminId = getAdminId();
      
      console.log('📋 Formatted date for API:', formattedDate);
      
      try {
        // Use the availability endpoint with proper userId
        const availabilityData = await apiService.get(`/api/rooms/availability?date=${formattedDate}&userId=${adminId}`);
        console.log('✅ Room availability data received:', availabilityData);
        
        if (Array.isArray(availabilityData)) {
          // Process the data to ensure consistent structure
          const processedData = availabilityData.map(room => ({
            _id: room._id || room.room,
            room: room.room || "Unnamed Room",
            floor: room.floor || "Unknown Floor",
            isActive: room.isActive !== false,
            occupied: Array.isArray(room.occupied) ? room.occupied : [],
            pending: Array.isArray(room.pending) ? room.pending : []
          }));
          
          setRoomStatuses(processedData);
          
          // Initialize expanded floors - expand all by default
          const floors = {};
          processedData.forEach(room => {
            const floor = room.floor || "Unknown Floor";
            if (!floors[floor]) {
              floors[floor] = true; // true = expanded
            }
          });
          setExpandedFloors(floors);
          
          console.log('📊 Room statuses updated:', processedData.length, 'rooms');
        } else {
          console.log('❌ Invalid room availability data format');
          setAvailError("No room data available for selected date");
          setRoomStatuses([]);
        }
      } catch (apiError) {
        console.log('⚠️ API endpoint error:', apiError);
        // If the API fails, use rooms data as fallback
        if (rooms.length > 0) {
          console.log('📋 Using rooms data as fallback');
          const fallbackData = rooms.map(room => ({
            _id: room._id,
            room: room.room,
            floor: room.floor,
            isActive: room.isActive,
            occupied: [],
            pending: []
          }));
          setRoomStatuses(fallbackData);
          
          // Initialize expanded floors
          const floors = {};
          fallbackData.forEach(room => {
            const floor = room.floor || "Unknown Floor";
            if (!floors[floor]) {
              floors[floor] = true;
            }
          });
          setExpandedFloors(floors);
          
          setAvailError("Using cached room data - availability may not be real-time");
        } else {
          setAvailError("Unable to load room availability at the moment");
          setRoomStatuses([]);
        }
      }
    } catch (error) {
      console.error("❌ Error in room availability process:", error);
      setAvailError("Failed to load room availability");
    } finally {
      setAvailLoading(false);
    }
  }, [rooms]);

  const updateRecentActivity = (logsData) => {
    const recentLogs = Array.isArray(logsData) ? logsData.slice(0, 8) : [];
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

  const formatTime = (iso) => {
    return moment(iso).tz("Asia/Manila").format("hh:mm A");
  };

  const refreshData = () => {
    fetchAllData();
    if (selectedDate) {
      fetchRoomAvailabilityForDate(selectedDate);
    }
  };

  // Calendar Functions
  const handleDateClick = (date) => {
    console.log('📅 Date clicked:', date);
    setSelectedDate(date);
    fetchRoomAvailabilityForDate(date);
  };

  const renderCalendarTile = ({ date, view }) => {
    if (view !== 'month') return null;
    
    const dateStr = date.toISOString().split('T')[0];
    
    // Count reservations for this date
    const dayReservations = reservations.filter(reservation => {
      const reservationDate = new Date(reservation.datetime).toISOString().split('T')[0];
      return reservationDate === dateStr;
    });
    
    if (dayReservations.length === 0) return null;
    
    // Determine dot color based on reservation count
    let dotColor = 'bg-blue-500';
    if (dayReservations.length >= 5) dotColor = 'bg-red-500';
    else if (dayReservations.length >= 3) dotColor = 'bg-amber-500';
    
    return (
      <div className="absolute bottom-1 left-0 right-0 flex justify-center">
        <div className={`w-2 h-2 ${dotColor} rounded-full`}></div>
      </div>
    );
  };

  useEffect(() => {
    fetchAllData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  useEffect(() => {
    if (rooms.length > 0 && selectedDate) {
      fetchRoomAvailabilityForDate(selectedDate);
    }
  }, [selectedDate, rooms, fetchRoomAvailabilityForDate]);

  const getNewUsersThisWeek = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return logs.filter(log => 
      log.action === "User registered" && 
      new Date(log.createdAt) > oneWeekAgo
    ).length;
  };

  const toggleFloor = (floorName) => {
    setExpandedFloors(prev => ({
      ...prev,
      [floorName]: !prev[floorName]
    }));
  };

  // Enhanced room status detection for admin
  const getRoomStatus = (room) => {
    const isRoomActive = room.isActive !== false;
    const hasOccupied = Array.isArray(room.occupied) && room.occupied.length > 0;
    const hasPending = Array.isArray(room.pending) && room.pending.length > 0;

    if (!isRoomActive) {
      return { status: 'inactive', color: 'gray', label: 'Inactive' };
    } else if (hasOccupied) {
      return { status: 'occupied', color: 'red', label: 'Occupied' };
    } else if (hasPending) {
      return { status: 'pending', color: 'amber', label: 'Pending' };
    } else {
      return { status: 'available', color: 'green', label: 'Available' };
    }
  };

  // Group rooms by floor
  const groupedByFloor = roomStatuses.reduce((acc, room) => {
    const floor = room.floor || "Unknown Floor";
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {});

  // Sort floors
  const allFloors = Object.keys(groupedByFloor).sort((a, b) => {
    const floorOrder = {
      "Ground Floor": 0,
      "2nd Floor": 1,
      "4th Floor": 2,
      "5th Floor": 3
    };
    return (floorOrder[a] || 999) - (floorOrder[b] || 999);
  });

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-50 border-green-200';
      case 'booked': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Calculate reservation status breakdown
  const pendingCount = summaryData.pendingReservations;
  const approvedCount = reservations.filter(r => r.status === 'Approved' || r.status === 'Ongoing').length;
  const completedCount = reservations.filter(r => r.status === 'Completed').length;
  const cancelledCount = reservations.filter(r => r.status === 'Cancelled' || r.status === 'Rejected').length;

  // Strip HTML tags from content
  const stripHtmlTags = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  // Handle news click
  const handleNewsClick = (news) => {
    setSelectedNews(news);
    setShowNewsModal(true);
  };

  return (
    <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-8 py-6 border-b border-gray-200 shadow-sm sticky top-0 z-10">
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

      {/* Error Banner - Show only if there's a critical error */}
      {error && (
        <div className="mx-8 mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle size={20} className="text-amber-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-amber-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-amber-800 hover:text-amber-900 text-lg font-bold"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Modified Grid Layout - Stats on Left, Calendar/Activity on Right */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - All Stats (2/3 width) */}
          <div className="xl:col-span-2 space-y-6">
            {/* Stats Overview - Expanded with more metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Reservation Card */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                    <CalendarIcon size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{summaryData.reservations}</p>
                    <p className="text-gray-500 text-sm font-medium">Total Reservations</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-100">
                  <div>
                    <span className="text-xs text-gray-500">Pending</span>
                    <p className="text-sm font-semibold text-amber-600">{pendingCount}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Approved</span>
                    <p className="text-sm font-semibold text-green-600">{approvedCount}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Completed</span>
                    <p className="text-sm font-semibold text-blue-600">{completedCount}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Cancelled</span>
                    <p className="text-sm font-semibold text-red-600">{cancelledCount}</p>
                  </div>
                </div>
              </div>

              {/* Users Card - Now showing correct count */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-green-50 text-green-600">
                    <Users size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{summaryData.users}</p>
                    <p className="text-gray-500 text-sm font-medium">Total Users</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">New this week</span>
                    <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                      {getNewUsersThisWeek()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active users</span>
                    <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {Math.round(summaryData.users * 0.7)} (est.)
                    </span>
                  </div>
                </div>
              </div>

              {/* Rooms Card */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                    <Home size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{summaryData.activeRooms}</p>
                    <p className="text-gray-500 text-sm font-medium">Active Rooms</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Total rooms</span>
                    <span className="text-sm font-semibold text-gray-700">{summaryData.totalRooms}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Occupancy rate</span>
                    <span className="text-sm font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded">
                      {summaryData.occupancyRate}%
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
                    <p className="text-gray-500 text-sm font-medium">Total Reports</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Pending review</span>
                    <span className="text-sm font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                      {summaryData.pendingReports}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Resolved</span>
                    <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                      {summaryData.reports - summaryData.pendingReports}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Second Row - Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">From users</span>
                    <span className="text-sm font-semibold text-blue-600">{summaryData.unreadUserMessages}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">From staff</span>
                    <span className="text-sm font-semibold text-purple-600">{summaryData.unreadStaffMessages}</span>
                  </div>
                </div>
              </div>

              {/* Peak Hours Card */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                    <Clock size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{peakHours.length}</p>
                    <p className="text-gray-500 text-sm font-medium">Peak Hours</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  {peakHours.length > 0 ? (
                    peakHours.map((hour, idx) => (
                      <div key={idx} className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">{hour.time}</span>
                        <span className="text-sm font-semibold text-indigo-600">{hour.count} bookings</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-2">No peak hours data</p>
                  )}
                </div>
              </div>

              {/* Popular Rooms Card */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-cyan-50 text-cyan-600">
                    <Star size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{popularRooms.length}</p>
                    <p className="text-gray-500 text-sm font-medium">Popular Rooms</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  {popularRooms.length > 0 ? (
                    popularRooms.map((room, idx) => (
                      <div key={idx} className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 truncate max-w-[120px]">{room.name}</span>
                        <span className="text-sm font-semibold text-cyan-600">{room.count} bookings</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-2">No popular rooms data</p>
                  )}
                </div>
              </div>

              {/* Success Rate Card */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-green-50 text-green-600">
                    <Percent size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {summaryData.reservations > 0 
                        ? Math.round((summaryData.completedReservations / summaryData.reservations) * 100) 
                        : 0}%
                    </p>
                    <p className="text-gray-500 text-sm font-medium">Success Rate</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Completed</span>
                    <span className="text-sm font-semibold text-green-600">{summaryData.completedReservations}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cancelled</span>
                    <span className="text-sm font-semibold text-red-600">{summaryData.cancelledReservations}</span>
                  </div>
                </div>
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
                        <div key={conversation._id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
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
                    <p className="text-gray-500 text-sm mb-4">No unread messages</p>
                    <button
                      onClick={() => {
                        setView("adminMessage");
                      }}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
                    >
                      Go to Messages
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Recent News - Updated with images, title and description */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent News</h2>
                <button
                  onClick={() => setCurrentSubView("news")}
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 shadow-sm"
                >
                  <FileText size={16} className="mr-2" />
                  Manage News
                </button>
              </div>
              
              {newsList.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <FileText className="mx-auto text-gray-400 mb-3" size={40} />
                  <p className="text-gray-500 text-sm">No news posted yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {newsList.slice(0, 3).map((news) => {
                    // Get first image if available
                    const firstImage = news.images && news.images.length > 0 ? news.images[0] : null;
                    // Strip HTML tags for description
                    const plainTextContent = stripHtmlTags(news.content).substring(0, 100) + (stripHtmlTags(news.content).length > 100 ? '...' : '');
                    
                    return (
                      <div 
                        key={news._id} 
                        className="p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                        onClick={() => handleNewsClick(news)}
                      >
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* Image */}
                          {firstImage ? (
                            <div className="sm:w-24 sm:h-24 w-full h-40 flex-shrink-0">
                              <img 
                                src={firstImage} 
                                alt={news.title}
                                className="w-full h-full object-cover rounded-lg"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://via.placeholder.com/96x96?text=No+Image';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="sm:w-24 sm:h-24 w-full h-40 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center">
                              <FileText size={32} className="text-gray-400" />
                            </div>
                          )}
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold text-gray-900 text-base leading-tight line-clamp-2 max-w-[250px]">{news.title}</h3>
                              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-lg font-medium whitespace-nowrap ml-2">
                                {new Date(news.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                              {plainTextContent}
                            </p>
                            {news.images && news.images.length > 1 && (
                              <p className="text-xs text-gray-500 mt-2">
                                +{news.images.length - 1} more image{news.images.length - 1 > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {newsList.length > 3 && (
                    <button 
                      onClick={() => setCurrentSubView("news")}
                      className="w-full py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 border border-gray-200"
                    >
                      View all news articles ({newsList.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Calendar & Activity (1/3 width) */}
          <div className="xl:col-span-1 space-y-6">
            {/* Calendar */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Calendar</h2>
                <button
                  onClick={() => setShowRoomAvailabilityModal(true)}
                  className="flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors duration-200"
                  title="View all room availability"
                >
                  <Maximize2 size={16} className="mr-1" />
                  Expand
                </button>
              </div>
              <Calendar
                onClickDay={handleDateClick}
                value={selectedDate}
                className="border-0 w-full"
                tileContent={renderCalendarTile}
                tileClassName={({ date, view }) => {
                  if (view !== "month") return "";
                  return "relative h-10 sm:h-12 hover:bg-gray-50 rounded-lg transition-colors duration-200";
                }}
                prevLabel={<span className="text-gray-600 hover:text-red-600 transition-colors">◀</span>}
                nextLabel={<span className="text-gray-600 hover:text-red-600 transition-colors">▶</span>}
                prev2Label={null}
                next2Label={null}
                aria-label="Reservation calendar"
              />
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 font-medium">
                  Selected: {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {reservations.filter(r => {
                    const rDate = new Date(r.datetime).toDateString();
                    return rDate === selectedDate.toDateString();
                  }).length} reservations on this day
                </p>
              </div>
            </div>

            {/* Room Availability Dashboard */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Room Availability</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {availLoading && (
                      <div className="flex items-center">
                        <RefreshCw size={16} className="animate-spin text-blue-600" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4">
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mb-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">Occupied</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">Pending</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-xs text-gray-600">Inactive</span>
                  </div>
                </div>

                {/* Room Status Content */}
                {availLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-gray-600 text-sm">Loading room availability...</p>
                  </div>
                ) : availError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <AlertCircle size={24} className="mx-auto mb-2 text-red-500" />
                    <p className="text-red-700 text-sm">{availError}</p>
                    <button
                      onClick={() => fetchRoomAvailabilityForDate(selectedDate)}
                      className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : roomStatuses.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="mx-auto mb-3 text-gray-400" size={40} />
                    <p className="text-gray-500 text-sm">No rooms available for selected date</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {allFloors.map((floorName) => {
                      const rooms = groupedByFloor[floorName] || [];
                      const floorStats = rooms.reduce((acc, room) => {
                        const { status } = getRoomStatus(room);
                        if (status === 'available') acc.available++;
                        else if (status === 'occupied') acc.occupied++;
                        else if (status === 'pending') acc.pending++;
                        else if (status === 'inactive') acc.inactive++;
                        return acc;
                      }, { available: 0, occupied: 0, pending: 0, inactive: 0 });

                      return (
                        <div key={floorName} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Floor Header - Clickable */}
                          <div 
                            className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => toggleFloor(floorName)}
                          >
                            <div className="flex items-center space-x-3">
                              <h3 className="font-semibold text-gray-800 text-sm">{floorName}</h3>
                              <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                                {rooms.length} rooms
                              </span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2 text-xs">
                                {floorStats.available > 0 && (
                                  <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                    {floorStats.available} avail
                                  </span>
                                )}
                                {floorStats.occupied > 0 && (
                                  <span className="text-red-600 bg-red-50 px-2 py-1 rounded-full">
                                    {floorStats.occupied} occ
                                  </span>
                                )}
                                {floorStats.pending > 0 && (
                                  <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                                    {floorStats.pending} pend
                                  </span>
                                )}
                              </div>
                              {expandedFloors[floorName] ? (
                                <ChevronUp size={18} className="text-gray-500" />
                              ) : (
                                <ChevronDown size={18} className="text-gray-500" />
                              )}
                            </div>
                          </div>
                          
                          {/* Room List - Collapsible */}
                          {expandedFloors[floorName] && (
                            <div className="divide-y divide-gray-100">
                              {rooms.map((room) => {
                                const { status, color, label } = getRoomStatus(room);
                                const isRoomActive = room.isActive !== false;

                                return (
                                  <div key={room._id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      {/* Room Info */}
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                          status === 'inactive' ? "bg-gray-400" :
                                          status === 'occupied' ? "bg-red-500" :
                                          status === 'pending' ? "bg-amber-500" : "bg-green-500"
                                        }`} />
                                        <div>
                                          <p className={`font-medium text-sm ${
                                            !isRoomActive ? "text-gray-500" : "text-gray-900"
                                          }`}>
                                            {room.room}
                                            {!isRoomActive && (
                                              <span className="ml-2 text-xs text-gray-500 font-normal">(Inactive)</span>
                                            )}
                                          </p>
                                          <p className="text-xs text-gray-500 mt-0.5">
                                            Floor {room.floor}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Status Badge */}
                                      <div className={`text-xs font-medium px-3 py-1.5 rounded-full inline-flex items-center justify-center ${
                                        status === 'inactive' ? "bg-gray-100 text-gray-600" :
                                        status === 'occupied' ? "bg-red-100 text-red-700" :
                                        status === 'pending' ? "bg-amber-100 text-amber-700" : 
                                        "bg-green-100 text-green-700"
                                      }`}>
                                        {label}
                                      </div>
                                    </div>

                                    {/* Booking Details */}
                                    {(room.occupied?.length > 0 || room.pending?.length > 0) && (
                                      <div className="mt-3 pt-3 border-t border-gray-100">
                                        {room.occupied?.length > 0 && (
                                          <div className="mb-2">
                                            <p className="text-xs font-semibold text-red-600 mb-1 flex items-center">
                                              <CheckCircle size={12} className="mr-1" />
                                              Approved Bookings ({room.occupied.length})
                                            </p>
                                            <div className="space-y-1">
                                              {room.occupied.slice(0, 2).map((booking, i) => (
                                                <div key={i} className="flex items-center justify-between text-xs bg-red-50 p-2 rounded">
                                                  <span className="text-gray-700">
                                                    {formatTime(booking.start)} - {formatTime(booking.end)}
                                                  </span>
                                                  {booking.userName && (
                                                    <span className="text-gray-500 ml-2">by {booking.userName}</span>
                                                  )}
                                                </div>
                                              ))}
                                              {room.occupied.length > 2 && (
                                                <p className="text-xs text-gray-500 mt-1">+{room.occupied.length - 2} more bookings</p>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {room.pending?.length > 0 && (
                                          <div>
                                            <p className="text-xs font-semibold text-amber-600 mb-1 flex items-center">
                                              <Clock3 size={12} className="mr-1" />
                                              Pending Approvals ({room.pending.length})
                                            </p>
                                            <div className="space-y-1">
                                              {room.pending.slice(0, 2).map((booking, i) => (
                                                <div key={i} className="flex items-center justify-between text-xs bg-amber-50 p-2 rounded">
                                                  <span className="text-gray-700">
                                                    {formatTime(booking.start)} - {formatTime(booking.end)}
                                                  </span>
                                                  {booking.userName && (
                                                    <span className="text-gray-500 ml-2">by {booking.userName}</span>
                                                  )}
                                                </div>
                                              ))}
                                              {room.pending.length > 2 && (
                                                <p className="text-xs text-gray-500 mt-1">+{room.pending.length - 2} more pending</p>
                                              )}
                                            </div>
                                          </div>
                                        )}
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
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
                <button
                  onClick={() => setCurrentSubView("logs")}
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 shadow-sm"
                >
                  <Eye size={16} className="mr-2" />
                  View Logs
                </button>
              </div>
              
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <Clock className="mx-auto text-gray-400 mb-3" size={40} />
                  <p className="text-gray-500 text-sm">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow duration-200">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{activity.action}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{activity.details}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">{activity.user}</span>
                          <span className="text-xs text-gray-400">{activity.time}</span>
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
      {showRoomAvailabilityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-200">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 size={24} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Room Availability Overview</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRoomAvailabilityModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mb-6 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Occupied</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Pending</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">Inactive</span>
                </div>
              </div>

              {/* Room Status Content */}
              {availLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600">Loading room availability...</p>
                </div>
              ) : availError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <AlertCircle size={40} className="mx-auto mb-3 text-red-500" />
                  <p className="text-red-700 mb-4">{availError}</p>
                  <button
                    onClick={() => {
                      fetchRoomAvailabilityForDate(selectedDate);
                    }}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : roomStatuses.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="mx-auto mb-3 text-gray-400" size={48} />
                  <p className="text-gray-500">No rooms available for selected date</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allFloors.map((floorName) => {
                    const rooms = groupedByFloor[floorName] || [];
                    const floorStats = rooms.reduce((acc, room) => {
                      const { status } = getRoomStatus(room);
                      if (status === 'available') acc.available++;
                      else if (status === 'occupied') acc.occupied++;
                      else if (status === 'pending') acc.pending++;
                      else if (status === 'inactive') acc.inactive++;
                      return acc;
                    }, { available: 0, occupied: 0, pending: 0, inactive: 0 });

                    return (
                      <div key={floorName} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Floor Header */}
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-semibold text-gray-800 text-lg">{floorName}</h3>
                              <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                                {rooms.length} rooms
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 text-sm">
                              {floorStats.available > 0 && (
                                <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full">
                                  {floorStats.available} Available
                                </span>
                              )}
                              {floorStats.occupied > 0 && (
                                <span className="text-red-600 bg-red-50 px-3 py-1 rounded-full">
                                  {floorStats.occupied} Occupied
                                </span>
                              )}
                              {floorStats.pending > 0 && (
                                <span className="text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                                  {floorStats.pending} Pending
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Room List */}
                        <div className="divide-y divide-gray-100">
                          {rooms.map((room) => {
                            const { status, label } = getRoomStatus(room);
                            const isRoomActive = room.isActive !== false;

                            return (
                              <div key={room._id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                  {/* Room Info */}
                                  <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                      status === 'inactive' ? "bg-gray-400" :
                                      status === 'occupied' ? "bg-red-500" :
                                      status === 'pending' ? "bg-amber-500" : "bg-green-500"
                                    }`} />
                                    <div>
                                      <p className={`font-semibold text-base ${
                                        !isRoomActive ? "text-gray-500" : "text-gray-900"
                                      }`}>
                                        {room.room}
                                        {!isRoomActive && (
                                          <span className="ml-2 text-sm text-gray-500 font-normal">(Inactive)</span>
                                        )}
                                      </p>
                                      <p className="text-sm text-gray-500 mt-1">
                                        Floor {room.floor}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Status Badge */}
                                  <div className={`text-sm font-medium px-4 py-2 rounded-full inline-flex items-center justify-center ${
                                    status === 'inactive' ? "bg-gray-100 text-gray-600" :
                                    status === 'occupied' ? "bg-red-100 text-red-700" :
                                    status === 'pending' ? "bg-amber-100 text-amber-700" : 
                                    "bg-green-100 text-green-700"
                                  }`}>
                                    {label}
                                  </div>
                                </div>

                                {/* Booking Details */}
                                {(room.occupied?.length > 0 || room.pending?.length > 0) && (
                                  <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                      {room.occupied?.length > 0 && (
                                        <div>
                                          <p className="text-sm font-semibold text-red-600 mb-2 flex items-center">
                                            <CheckCircle size={14} className="mr-1" />
                                            Approved Bookings ({room.occupied.length})
                                          </p>
                                          <div className="space-y-2">
                                            {room.occupied.map((booking, i) => (
                                              <div key={i} className="flex items-center justify-between text-sm bg-red-50 p-3 rounded">
                                                <div>
                                                  <span className="text-gray-700 font-medium">
                                                    {formatTime(booking.start)} - {formatTime(booking.end)}
                                                  </span>
                                                  {booking.userName && (
                                                    <p className="text-gray-500 text-xs mt-1">by {booking.userName}</p>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {room.pending?.length > 0 && (
                                        <div>
                                          <p className="text-sm font-semibold text-amber-600 mb-2 flex items-center">
                                            <Clock3 size={14} className="mr-1" />
                                            Pending Approvals ({room.pending.length})
                                          </p>
                                          <div className="space-y-2">
                                            {room.pending.map((booking, i) => (
                                              <div key={i} className="flex items-center justify-between text-sm bg-amber-50 p-3 rounded">
                                                <div>
                                                  <span className="text-gray-700 font-medium">
                                                    {formatTime(booking.start)} - {formatTime(booking.end)}
                                                  </span>
                                                  {booking.userName && (
                                                    <p className="text-gray-500 text-xs mt-1">by {booking.userName}</p>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
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
                  })}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowRoomAvailabilityModal(false)}
                className="px-6 py-2.5 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* News Modal */}
      {showNewsModal && selectedNews && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">News Details</h2>
              <button
                onClick={() => {
                  setShowNewsModal(false);
                  setSelectedNews(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-gray-900 mb-3">{selectedNews.title}</h3>
                <p className="text-sm text-gray-500">
                  Posted on: {new Date(selectedNews.createdAt).toLocaleString()}
                </p>
              </div>
              
              {selectedNews.images && selectedNews.images.length > 0 && (
                <div className="mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedNews.images.map((img, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={img}
                          alt={`News image ${index + 1}`}
                          className="w-full h-64 object-cover rounded-xl"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl"></div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 text-center mt-4">
                    {selectedNews.images.length} image{selectedNews.images.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
              
              <div
                className="prose max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: selectedNews.content }}
              />
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => {
                  setShowNewsModal(false);
                  setSelectedNews(null);
                }}
                className="px-6 py-2.5 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Close!
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminDashboard;