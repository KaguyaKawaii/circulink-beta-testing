// AnalyticsOverview.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users,
  CalendarCheck,
  DoorOpen,
  Activity,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  GraduationCap,
  UserCog,
  UserCheck,
  UserX,
  Award,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Building,
  Wifi,
  Wind,
  Video,
  Monitor,
  PieChart,
  BarChart,
  Target,
  Calendar,
  X,
  Eye,
  MousePointer,
  Layers,
  Zap
} from "lucide-react";
import api from "../../utils/api";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function AnalyticsOverview({ setView, admin }) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState("excel");
  const [selectedSections, setSelectedSections] = useState({
    overview: true,
    users: true,
    reservations: true,
    rooms: true,
    engagement: true
  });

  const [analyticsData, setAnalyticsData] = useState({
    // Overview metrics
    totalUsers: 0,
    totalReservations: 0,
    totalRooms: 0,
    activeToday: 0,
    pendingReservations: 0,
    completedReservations: 0,
    roomUtilization: 0,
    avgSessionDuration: 0,
    
    // User data
    users: {
      total: 0,
      active: 0,
      new: 0,
      deleted: 0,
      byRole: { student: 0, faculty: 0, staff: 0 },
      byStatus: { active: 0, inactive: 0, suspended: 0, verified: 0, unverified: 0 },
      byDepartment: [],
      growth: { labels: [], values: [] },
      trends: {
        daily: { value: 0, percentage: 0, direction: 'up' },
        weekly: { value: 0, percentage: 0, direction: 'up' },
        monthly: { value: 0, percentage: 0, direction: 'up' }
      },
      topUsers: [],
      registrationStats: { today: 0, thisWeek: 0, thisMonth: 0, avgPerDay: 0 },
      activityStats: { activeToday: 0, activeThisWeek: 0, activeThisMonth: 0, retentionRate: 0 }
    },
    
    // Reservation data
    reservations: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      cancelled: 0,
      expired: 0,
      ongoing: 0,
      byRoom: [],
      byDayOfWeek: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
      popularRooms: [],
      trends: {
        total: { value: 0, percentage: 0, direction: 'up' },
        pending: { value: 0, percentage: 0, direction: 'up' },
        approved: { value: 0, percentage: 0, direction: 'up' },
        completed: { value: 0, percentage: 0, direction: 'up' }
      },
      growth: { labels: [], values: [] },
      floorDistribution: [],
      avgGroupSize: 0,
      totalParticipants: 0,
      userDepartmentStats: [],
      topReservers: []
    },
    
    // Room data
    rooms: {
      total: 0,
      available: 0,
      occupied: 0,
      maintenance: 0,
      utilization: 0,
      byType: { lecture: 0, laboratory: 0, conference: 0, office: 0 },
      roomDetails: [],
      hourlyUtilization: [],
      topRooms: [],
      byFloor: {},
      byCapacity: { small: 0, medium: 0, large: 0, xlarge: 0 },
      trends: {
        total: { value: 0, percentage: 0, direction: 'up' },
        utilization: { value: 0, percentage: 0, direction: 'up' },
        available: { value: 0, percentage: 0, direction: 'up' },
        occupied: { value: 0, percentage: 0, direction: 'up' }
      },
      featureStats: { wifi: 0, aircon: 0, projector: 0, monitor: 0 },
      peakHours: [],
      bookingTrends: [],
      maintenanceHistory: [],
      topUsers: []
    },
    
    // Engagement data
    engagement: {
      dailyActive: 0,
      weeklyActive: 0,
      monthlyActive: 0,
      averageSession: 0,
      retention: 0,
      bounceRate: 0,
      byDay: [],
      userActivity: { high: 0, medium: 0, low: 0, inactive: 0 },
      engagementMetrics: {
        pageViews: 0,
        actions: 0,
        avgActionsPerUser: 0,
        returningUsers: 0,
        totalSessions: 0,
        avgSessionDuration: 0
      },
      activityBreakdown: [],
      peakHours: [],
      deviceBreakdown: [],
      userEngagementTrends: [],
      topFeatures: [],
      trends: {
        daily: { value: 0, percentage: 0, direction: 'up' },
        weekly: { value: 0, percentage: 0, direction: 'up' },
        monthly: { value: 0, percentage: 0, direction: 'up' }
      }
    }
  });

  const calendarRef = useRef(null);

  const fetchAllAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all analytics data in parallel
      const [usersRes, reservationsRes, roomsRes, engagementRes] = await Promise.allSettled([
        api.get(`/analytics/users?range=${dateRange}${getCustomDateParams()}`),
        api.get(`/analytics/reservations/detailed?range=${dateRange}${getCustomDateParams()}`),
        api.get(`/analytics/rooms/detailed?range=${dateRange}${getCustomDateParams()}`),
        api.get(`/analytics/engagement?range=${dateRange}${getCustomDateParams()}`)
      ]);

      // Process users data
      let usersData = { total: 0, active: 0, new: 0, deleted: 0, byRole: {}, byStatus: {}, byDepartment: [], growth: { labels: [], values: [] }, trends: {}, topUsers: [], registrationStats: {}, activityStats: {} };
      if (usersRes.status === 'fulfilled' && usersRes.value.data?.success) {
        usersData = usersRes.value.data.data;
      }

      // Process reservations data
      let reservationsData = { total: 0, pending: 0, approved: 0, rejected: 0, completed: 0, cancelled: 0, expired: 0, ongoing: 0, byRoom: [], byDayOfWeek: {}, popularRooms: [], trends: {}, growth: { labels: [], values: [] }, floorDistribution: [], avgGroupSize: 0, totalParticipants: 0, userDepartmentStats: [], topReservers: [] };
      if (reservationsRes.status === 'fulfilled' && reservationsRes.value.data?.success) {
        reservationsData = reservationsRes.value.data.data;
      }

      // Process rooms data
      let roomsData = { total: 0, available: 0, occupied: 0, maintenance: 0, utilization: 0, byType: {}, roomDetails: [], hourlyUtilization: [], topRooms: [], byFloor: {}, byCapacity: {}, trends: {}, featureStats: {}, peakHours: [], bookingTrends: [], maintenanceHistory: [], topUsers: [] };
      if (roomsRes.status === 'fulfilled' && roomsRes.value.data?.success) {
        roomsData = roomsRes.value.data.data;
      }

      // Process engagement data
      let engagementData = { dailyActive: 0, weeklyActive: 0, monthlyActive: 0, averageSession: 0, retention: 0, bounceRate: 0, byDay: [], userActivity: {}, engagementMetrics: {}, activityBreakdown: [], peakHours: [], deviceBreakdown: [], userEngagementTrends: [], topFeatures: [], trends: {} };
      if (engagementRes.status === 'fulfilled' && engagementRes.value.data?.success) {
        engagementData = engagementRes.value.data.data;
      }

      // Calculate overview metrics
      const overviewMetrics = {
        totalUsers: usersData.total || 0,
        totalReservations: reservationsData.total || 0,
        totalRooms: roomsData.total || 0,
        activeToday: engagementData.dailyActive || 0,
        pendingReservations: reservationsData.pending || 0,
        completedReservations: reservationsData.completed || 0,
        roomUtilization: roomsData.utilization || 0,
        avgSessionDuration: engagementData.averageSession || 0
      };

      setAnalyticsData({
        ...overviewMetrics,
        users: usersData,
        reservations: reservationsData,
        rooms: roomsData,
        engagement: engagementData
      });

    } catch (error) {
      console.error("Error fetching analytics:", error);
      // Fallback to mock data
      setAnalyticsData(getMockAnalyticsData(dateRange));
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate]);

  const getCustomDateParams = () => {
    if (dateRange === "custom" && customStartDate && customEndDate) {
      return `&startDate=${customStartDate}&endDate=${customEndDate}`;
    }
    return "";
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, [fetchAllAnalytics]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCustomDate(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getMockAnalyticsData = (range) => {
    return {
      totalUsers: 1250,
      totalReservations: 3450,
      totalRooms: 25,
      activeToday: 320,
      pendingReservations: 45,
      completedReservations: 2890,
      roomUtilization: 68,
      avgSessionDuration: 24,
      users: {
        total: 1250,
        active: 850,
        new: 45,
        deleted: 12,
        byRole: { student: 850, faculty: 280, staff: 120 },
        byStatus: { active: 850, inactive: 350, suspended: 15, verified: 1100, unverified: 150 },
        byDepartment: [
          { name: "Computer Science", count: 320 },
          { name: "Engineering", count: 280 },
          { name: "Business", count: 210 },
          { name: "Medicine", count: 180 },
          { name: "Arts", count: 150 }
        ],
        growth: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          values: [1120, 1150, 1180, 1210, 1230, 1250]
        },
        trends: {
          daily: { value: 45, percentage: 8.5, direction: 'up' },
          weekly: { value: 280, percentage: 12.3, direction: 'up' },
          monthly: { value: 1250, percentage: 15.7, direction: 'up' }
        },
        topUsers: [
          { name: "John Doe", email: "john@email.com", role: "Student", reservations: 45 },
          { name: "Jane Smith", email: "jane@email.com", role: "Faculty", reservations: 38 },
          { name: "Bob Wilson", email: "bob@email.com", role: "Staff", reservations: 32 }
        ],
        registrationStats: { today: 5, thisWeek: 32, thisMonth: 145, avgPerDay: 4.8 },
        activityStats: { activeToday: 320, activeThisWeek: 850, activeThisMonth: 1150, retentionRate: 76 }
      },
      reservations: {
        total: 3450,
        pending: 45,
        approved: 320,
        rejected: 85,
        completed: 2890,
        cancelled: 95,
        expired: 15,
        ongoing: 25,
        byRoom: [
          { name: "Room 101", count: 450, approved: 380, pending: 25, completed: 350, cancelled: 20 },
          { name: "Room 102", count: 380, approved: 320, pending: 18, completed: 300, cancelled: 15 },
          { name: "Room 103", count: 520, approved: 450, pending: 30, completed: 420, cancelled: 25 }
        ],
        byDayOfWeek: { mon: 580, tue: 620, wed: 650, thu: 590, fri: 480, sat: 320, sun: 210 },
        popularRooms: [
          { name: "Room 103", bookings: 520, approved: 450, completed: 420, utilization: 85 },
          { name: "Room 101", bookings: 450, approved: 380, completed: 350, utilization: 78 },
          { name: "Room 202", bookings: 410, approved: 350, completed: 330, utilization: 72 }
        ],
        trends: {
          total: { value: 3450, percentage: 12.5, direction: 'up' },
          pending: { value: 45, percentage: -5.2, direction: 'down' },
          approved: { value: 320, percentage: 8.3, direction: 'up' },
          completed: { value: 2890, percentage: 15.8, direction: 'up' }
        },
        growth: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          values: [2850, 2980, 3120, 3250, 3380, 3450]
        },
        floorDistribution: [
          { name: "1st Floor", value: 1450 },
          { name: "2nd Floor", value: 1120 },
          { name: "3rd Floor", value: 880 }
        ],
        avgGroupSize: 4.2,
        totalParticipants: 14500,
        userDepartmentStats: [
          { name: "Computer Science", count: 980 },
          { name: "Engineering", count: 850 },
          { name: "Business", count: 620 }
        ],
        topReservers: [
          { name: "John Doe", department: "Computer Science", count: 45 },
          { name: "Jane Smith", department: "Engineering", count: 38 },
          { name: "Bob Wilson", department: "Business", count: 32 }
        ]
      },
      rooms: {
        total: 25,
        available: 10,
        occupied: 9,
        maintenance: 2,
        utilization: 68,
        byType: { lecture: 12, laboratory: 6, conference: 4, office: 3 },
        roomDetails: [
          { id: 1, name: "Room 101", type: "Lecture", floor: "1st Floor", capacity: 6, bookings: 450, utilization: 78, status: "available", features: { wifi: true, aircon: true, projector: true, monitor: false } },
          { id: 2, name: "Room 102", type: "Lecture", floor: "1st Floor", capacity: 4, bookings: 380, utilization: 68, status: "occupied", features: { wifi: true, aircon: true, projector: false, monitor: true } },
          { id: 3, name: "Room 103", type: "Lecture", floor: "1st Floor", capacity: 8, bookings: 520, utilization: 85, status: "available", features: { wifi: true, aircon: true, projector: true, monitor: true } }
        ],
        hourlyUtilization: [
          { hour: "8AM", utilization: 45, bookings: 12 },
          { hour: "9AM", utilization: 65, bookings: 18 },
          { hour: "10AM", utilization: 82, bookings: 24 },
          { hour: "11AM", utilization: 88, bookings: 26 },
          { hour: "12PM", utilization: 72, bookings: 20 },
          { hour: "1PM", utilization: 68, bookings: 19 },
          { hour: "2PM", utilization: 85, bookings: 25 },
          { hour: "3PM", utilization: 90, bookings: 28 },
          { hour: "4PM", utilization: 78, bookings: 22 },
          { hour: "5PM", utilization: 62, bookings: 16 }
        ],
        topRooms: [
          { name: "Room 103", bookings: 520, utilization: 85, type: "Lecture", capacity: 8, floor: "1st Floor", features: { wifi: true, aircon: true, projector: true, monitor: true } },
          { name: "Room 101", bookings: 450, utilization: 78, type: "Lecture", capacity: 6, floor: "1st Floor", features: { wifi: true, aircon: true, projector: true, monitor: false } },
          { name: "Room 202", bookings: 410, utilization: 72, type: "Lecture", capacity: 6, floor: "2nd Floor", features: { wifi: true, aircon: true, projector: true, monitor: true } }
        ],
        byFloor: { "1st Floor": 4, "2nd Floor": 3, "3rd Floor": 5 },
        byCapacity: { small: 13, medium: 0, large: 0, xlarge: 0 },
        trends: {
          total: { value: 25, percentage: 4.2, direction: 'up' },
          utilization: { value: 68, percentage: 2.1, direction: 'up' },
          available: { value: 10, percentage: 5.0, direction: 'up' },
          occupied: { value: 9, percentage: 3.5, direction: 'down' }
        },
        featureStats: { wifi: 22, aircon: 20, projector: 15, monitor: 12 },
        peakHours: [
          { hour: "10:00 AM", utilization: 92, bookings: 8 },
          { hour: "11:00 AM", utilization: 88, bookings: 7 },
          { hour: "2:00 PM", utilization: 85, bookings: 7 },
          { hour: "3:00 PM", utilization: 90, bookings: 8 }
        ],
        bookingTrends: [
          { month: "Jan", bookings: 2850 },
          { month: "Feb", bookings: 2980 },
          { month: "Mar", bookings: 3120 },
          { month: "Apr", bookings: 3250 },
          { month: "May", bookings: 3380 },
          { month: "Jun", bookings: 3450 }
        ],
        maintenanceHistory: [
          { room: "Room 104", date: "2024-03-01 11:45:20", type: "AC Repair", status: "Completed" },
          { room: "Lab B", date: "2024-02-20 15:40:25", type: "Equipment Check", status: "Completed" }
        ],
        topUsers: [
          { name: "Dr. Smith", department: "Engineering", bookings: 45, room: "Room 103" },
          { name: "Prof. Johnson", department: "Science", bookings: 38, room: "Lab A" }
        ]
      },
      engagement: {
        dailyActive: 320,
        weeklyActive: 1850,
        monthlyActive: 4250,
        averageSession: 24,
        retention: 76,
        bounceRate: 18,
        byDay: [
          { day: "Mon", active: 420, date: "2024-01-01" },
          { day: "Tue", active: 450, date: "2024-01-02" },
          { day: "Wed", active: 480, date: "2024-01-03" },
          { day: "Thu", active: 460, date: "2024-01-04" },
          { day: "Fri", active: 520, date: "2024-01-05" },
          { day: "Sat", active: 380, date: "2024-01-06" },
          { day: "Sun", active: 320, date: "2024-01-07" }
        ],
        userActivity: { high: 450, medium: 820, low: 580, inactive: 120 },
        engagementMetrics: {
          pageViews: 15200,
          actions: 8340,
          avgActionsPerUser: 6.7,
          returningUsers: 68,
          totalSessions: 2450,
          avgSessionDuration: 24
        },
        activityBreakdown: [
          { name: "Page Views", value: 8450, color: "blue" },
          { name: "Reservations", value: 3240, color: "green" },
          { name: "Logins", value: 2100, color: "purple" },
          { name: "Profile Updates", value: 980, color: "orange" }
        ],
        peakHours: [
          { hour: "9AM", activity: 45 },
          { hour: "10AM", activity: 72 },
          { hour: "11AM", activity: 88 },
          { hour: "12PM", activity: 65 },
          { hour: "1PM", activity: 58 },
          { hour: "2PM", activity: 82 },
          { hour: "3PM", activity: 90 },
          { hour: "4PM", activity: 75 }
        ],
        deviceBreakdown: [
          { name: "Desktop", value: 45, color: "blue" },
          { name: "Mobile", value: 42, color: "green" },
          { name: "Tablet", value: 13, color: "purple" }
        ],
        userEngagementTrends: [
          { month: "Jan", active: 3850, new: 450 },
          { month: "Feb", active: 3980, new: 480 },
          { month: "Mar", active: 4120, new: 520 },
          { month: "Apr", active: 4080, new: 490 },
          { month: "May", active: 4250, new: 530 },
          { month: "Jun", active: 4350, new: 550 }
        ],
        topFeatures: [
          { name: "Room Booking", count: 1240, trend: 12 },
          { name: "Search Rooms", count: 980, trend: 8 },
          { name: "View Schedule", count: 760, trend: 5 },
          { name: "Profile", count: 540, trend: -2 },
          { name: "Notifications", count: 320, trend: 15 }
        ],
        trends: {
          daily: { value: 320, percentage: 8.5, direction: 'up' },
          weekly: { value: 1850, percentage: 12.3, direction: 'up' },
          monthly: { value: 4250, percentage: 15.7, direction: 'up' }
        }
      }
    };
  };

  const formatDate = (date) => {
    if (!date) return "";
    try {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch (error) {
      return "";
    }
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      if (new Date(customStartDate) > new Date(customEndDate)) {
        alert("Start date must be before end date");
        return;
      }
      setDateRange("custom");
      setShowCustomDate(false);
    } else {
      alert("Please select both start and end dates");
    }
  };

  const handleCustomDateClear = () => {
    setCustomStartDate("");
    setCustomEndDate("");
    setShowCustomDate(false);
    setDateRange("month");
  };

  // ==================== DOWNLOAD FUNCTIONS ====================

  const generateExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Helper function to add worksheet
      const addSheet = (data, sheetName) => {
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      };

      // Overview Sheet
      if (selectedSections.overview) {
        const overviewData = [
          ['OVERVIEW ANALYTICS', `Generated: ${new Date().toLocaleString()}`],
          ['Date Range:', getRangeDescription()],
          [],
          ['KEY METRICS'],
          ['Metric', 'Value'],
          ['Total Users', analyticsData.totalUsers || 0],
          ['Total Reservations', analyticsData.totalReservations || 0],
          ['Total Rooms', analyticsData.totalRooms || 0],
          ['Active Today', analyticsData.activeToday || 0],
          ['Pending Reservations', analyticsData.pendingReservations || 0],
          ['Completed Reservations', analyticsData.completedReservations || 0],
          ['Room Utilization', `${analyticsData.roomUtilization || 0}%`],
          ['Avg Session Duration', `${analyticsData.avgSessionDuration || 0}m`]
        ];
        addSheet(overviewData, 'Overview');
      }

      // Users Sheet
      if (selectedSections.users) {
        const users = analyticsData.users || {};
        const usersData = [
          ['USER ANALYTICS'],
          [],
          ['KEY METRICS'],
          ['Metric', 'Value'],
          ['Total Users', users.total || 0],
          ['Active Users (7d)', users.active || 0],
          ['New Users', users.new || 0],
          ['Deleted/Archived', users.deleted || 0],
          ['Retention Rate', `${users.activityStats?.retentionRate || 0}%`],
          [],
          ['USERS BY ROLE'],
          ['Role', 'Count', 'Percentage'],
          ['Students', users.byRole?.student || 0, 
           `${Math.round((users.byRole?.student || 0) / (users.total || 1) * 100)}%`],
          ['Faculty', users.byRole?.faculty || 0,
           `${Math.round((users.byRole?.faculty || 0) / (users.total || 1) * 100)}%`],
          ['Staff', users.byRole?.staff || 0,
           `${Math.round((users.byRole?.staff || 0) / (users.total || 1) * 100)}%`],
          [],
          ['USERS BY STATUS'],
          ['Status', 'Count'],
          ['Active (7d)', users.byStatus?.active || 0],
          ['Inactive', users.byStatus?.inactive || 0],
          ['Suspended', users.byStatus?.suspended || 0],
          ['Verified', users.byStatus?.verified || 0],
          ['Unverified', users.byStatus?.unverified || 0],
          [],
          ['TOP DEPARTMENTS'],
          ['Department', 'User Count', 'Percentage'],
          ...(users.byDepartment || []).map(dept => [
            dept.name,
            dept.count,
            `${Math.round((dept.count / (users.total || 1)) * 100)}%`
          ]),
          [],
          ['TOP ACTIVE USERS'],
          ['Name', 'Email', 'Role', 'Actions'],
          ...(users.topUsers || []).map(user => [
            user.name,
            user.email,
            user.role,
            user.reservations || 0
          ])
        ];
        addSheet(usersData, 'Users');
      }

      // Reservations Sheet
      if (selectedSections.reservations) {
        const reservations = analyticsData.reservations || {};
        const reservationsData = [
          ['RESERVATION ANALYTICS'],
          [],
          ['KEY METRICS'],
          ['Metric', 'Value'],
          ['Total Reservations', reservations.total || 0],
          ['Completed', reservations.completed || 0],
          ['Pending', reservations.pending || 0],
          ['Approved', reservations.approved || 0],
          ['Rejected', reservations.rejected || 0],
          ['Cancelled', reservations.cancelled || 0],
          ['Ongoing', reservations.ongoing || 0],
          ['Expired', reservations.expired || 0],
          ['Avg Group Size', reservations.avgGroupSize || 0],
          ['Total Participants', reservations.totalParticipants || 0],
          [],
          ['RESERVATIONS BY DAY OF WEEK'],
          ['Day', 'Count', 'Percentage'],
          ['Monday', reservations.byDayOfWeek?.mon || 0,
           `${Math.round(((reservations.byDayOfWeek?.mon || 0) / (reservations.total || 1)) * 100)}%`],
          ['Tuesday', reservations.byDayOfWeek?.tue || 0,
           `${Math.round(((reservations.byDayOfWeek?.tue || 0) / (reservations.total || 1)) * 100)}%`],
          ['Wednesday', reservations.byDayOfWeek?.wed || 0,
           `${Math.round(((reservations.byDayOfWeek?.wed || 0) / (reservations.total || 1)) * 100)}%`],
          ['Thursday', reservations.byDayOfWeek?.thu || 0,
           `${Math.round(((reservations.byDayOfWeek?.thu || 0) / (reservations.total || 1)) * 100)}%`],
          ['Friday', reservations.byDayOfWeek?.fri || 0,
           `${Math.round(((reservations.byDayOfWeek?.fri || 0) / (reservations.total || 1)) * 100)}%`],
          ['Saturday', reservations.byDayOfWeek?.sat || 0,
           `${Math.round(((reservations.byDayOfWeek?.sat || 0) / (reservations.total || 1)) * 100)}%`],
          ['Sunday', reservations.byDayOfWeek?.sun || 0,
           `${Math.round(((reservations.byDayOfWeek?.sun || 0) / (reservations.total || 1)) * 100)}%`],
          [],
          ['POPULAR ROOMS'],
          ['Room', 'Bookings', 'Approved', 'Completed', 'Utilization'],
          ...(reservations.popularRooms || []).map(room => [
            room.name,
            room.bookings,
            room.approved || 0,
            room.completed || 0,
            `${room.utilization}%`
          ]),
          [],
          ['TOP RESERVERS'],
          ['Name', 'Department', 'Reservations'],
          ...(reservations.topReservers || []).map(user => [
            user.name,
            user.department || 'N/A',
            user.count
          ])
        ];
        addSheet(reservationsData, 'Reservations');
      }

      // Rooms Sheet
      if (selectedSections.rooms) {
        const rooms = analyticsData.rooms || {};
        const roomsData = [
          ['ROOM ANALYTICS'],
          [],
          ['KEY METRICS'],
          ['Metric', 'Value'],
          ['Total Rooms', rooms.total || 0],
          ['Available', rooms.available || 0],
          ['Occupied', rooms.occupied || 0],
          ['Maintenance', rooms.maintenance || 0],
          ['Utilization Rate', `${rooms.utilization || 0}%`],
          [],
          ['ROOMS BY FLOOR'],
          ['Floor', 'Count', 'Percentage'],
          ...Object.entries(rooms.byFloor || {}).map(([floor, count]) => [
            floor,
            count,
            `${Math.round((count / (rooms.total || 1)) * 100)}%`
          ]),
          [],
          ['ROOM FEATURES'],
          ['Feature', 'Rooms with Feature', 'Percentage'],
          ['WiFi', rooms.featureStats?.wifi || 0,
           `${Math.round(((rooms.featureStats?.wifi || 0) / (rooms.total || 1)) * 100)}%`],
          ['Air Conditioning', rooms.featureStats?.aircon || 0,
           `${Math.round(((rooms.featureStats?.aircon || 0) / (rooms.total || 1)) * 100)}%`],
          ['Projector', rooms.featureStats?.projector || 0,
           `${Math.round(((rooms.featureStats?.projector || 0) / (rooms.total || 1)) * 100)}%`],
          ['Monitor', rooms.featureStats?.monitor || 0,
           `${Math.round(((rooms.featureStats?.monitor || 0) / (rooms.total || 1)) * 100)}%`],
          [],
          ['TOP PERFORMING ROOMS'],
          ['Room', 'Type', 'Floor', 'Capacity', 'Bookings', 'Utilization'],
          ...(rooms.topRooms || []).map(room => [
            room.name,
            room.type,
            room.floor || 'N/A',
            room.capacity || 0,
            room.bookings,
            `${room.utilization}%`
          ]),
          [],
          ['HOURLY UTILIZATION'],
          ['Hour', 'Utilization %', 'Bookings'],
          ...(rooms.hourlyUtilization || []).map(hour => [
            hour.hour,
            `${hour.utilization}%`,
            hour.bookings || 0
          ])
        ];
        addSheet(roomsData, 'Rooms');
      }

      // Engagement Sheet
      if (selectedSections.engagement) {
        const engagement = analyticsData.engagement || {};
        const totalActivityUsers = (engagement.userActivity?.high || 0) + 
                                   (engagement.userActivity?.medium || 0) + 
                                   (engagement.userActivity?.low || 0) + 
                                   (engagement.userActivity?.inactive || 1);
        
        const engagementData = [
          ['ENGAGEMENT ANALYTICS'],
          [],
          ['KEY METRICS'],
          ['Metric', 'Value'],
          ['Daily Active Users', engagement.dailyActive || 0],
          ['Weekly Active Users', engagement.weeklyActive || 0],
          ['Monthly Active Users', engagement.monthlyActive || 0],
          ['Avg Session Duration', `${engagement.averageSession || 0}m`],
          ['Retention Rate', `${engagement.retention || 0}%`],
          ['Bounce Rate', `${engagement.bounceRate || 0}%`],
          [],
          ['ENGAGEMENT METRICS'],
          ['Metric', 'Value'],
          ['Page Views', engagement.engagementMetrics?.pageViews || 0],
          ['Total Actions', engagement.engagementMetrics?.actions || 0],
          ['Avg Actions/User', engagement.engagementMetrics?.avgActionsPerUser || 0],
          ['Returning Users', `${engagement.engagementMetrics?.returningUsers || 0}%`],
          ['Total Sessions', engagement.engagementMetrics?.totalSessions || 0],
          [],
          ['USER ACTIVITY LEVELS'],
          ['Level', 'Users', 'Percentage'],
          ['High Activity', engagement.userActivity?.high || 0,
           `${Math.round(((engagement.userActivity?.high || 0) / totalActivityUsers) * 100)}%`],
          ['Medium Activity', engagement.userActivity?.medium || 0,
           `${Math.round(((engagement.userActivity?.medium || 0) / totalActivityUsers) * 100)}%`],
          ['Low Activity', engagement.userActivity?.low || 0,
           `${Math.round(((engagement.userActivity?.low || 0) / totalActivityUsers) * 100)}%`],
          ['Inactive', engagement.userActivity?.inactive || 0,
           `${Math.round(((engagement.userActivity?.inactive || 0) / totalActivityUsers) * 100)}%`],
          [],
          ['DEVICE BREAKDOWN'],
          ['Device', 'Percentage'],
          ...(engagement.deviceBreakdown || []).map(device => [
            device.name,
            `${device.value}%`
          ]),
          [],
          ['TOP FEATURES'],
          ['Feature', 'Usage Count', 'Trend'],
          ...(engagement.topFeatures || []).map(feature => [
            feature.name,
            feature.count,
            `${feature.trend > 0 ? '+' : ''}${feature.trend}%`
          ]),
          [],
          ['DAILY ACTIVE USERS'],
          ['Day', 'Active Users'],
          ...(engagement.byDay || []).map(day => [
            day.day,
            day.active
          ])
        ];
        addSheet(engagementData, 'Engagement');
      }

      // Save the file
      const fileName = `analytics_overview_${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
    } catch (error) {
      console.error("Error generating Excel:", error);
      alert("Failed to generate Excel file. Please try again.");
    }
  };

  const generatePDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(204, 0, 0);
      doc.text("ANALYTICS OVERVIEW REPORT", 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
      doc.text(`Date Range: ${getRangeDescription()}`, 14, 27);
      
      let yPosition = 35;

      // Overview Section
      if (selectedSections.overview) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("OVERVIEW METRICS", 14, yPosition);
        yPosition += 5;

        const overviewData = [
          ['Metric', 'Value'],
          ['Total Users', (analyticsData.totalUsers || 0).toString()],
          ['Total Reservations', (analyticsData.totalReservations || 0).toString()],
          ['Total Rooms', (analyticsData.totalRooms || 0).toString()],
          ['Active Today', (analyticsData.activeToday || 0).toString()],
          ['Pending Reservations', (analyticsData.pendingReservations || 0).toString()],
          ['Completed Reservations', (analyticsData.completedReservations || 0).toString()],
          ['Room Utilization', `${analyticsData.roomUtilization || 0}%`],
          ['Avg Session Duration', `${analyticsData.avgSessionDuration || 0}m`]
        ];

        doc.autoTable({
          startY: yPosition,
          head: [overviewData[0]],
          body: overviewData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [204, 0, 0], textColor: [255, 255, 255] },
          margin: { left: 14 },
          styles: { fontSize: 9, cellPadding: 3 }
        });

        yPosition = doc.lastAutoTable.finalY + 10;
      }

      // Users Section
      if (selectedSections.users && yPosition < 180) {
        if (yPosition > 160) {
          doc.addPage();
          yPosition = 20;
        }

        const users = analyticsData.users || {};
        
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("USER ANALYTICS", 14, yPosition);
        yPosition += 5;

        const usersData = [
          ['Metric', 'Value'],
          ['Total Users', (users.total || 0).toString()],
          ['Active Users (7d)', (users.active || 0).toString()],
          ['New Users', (users.new || 0).toString()],
          ['Retention Rate', `${users.activityStats?.retentionRate || 0}%`]
        ];

        doc.autoTable({
          startY: yPosition,
          head: [usersData[0]],
          body: usersData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [204, 0, 0], textColor: [255, 255, 255] },
          margin: { left: 14 },
          styles: { fontSize: 9, cellPadding: 3 }
        });

        yPosition = doc.lastAutoTable.finalY + 5;

        // Users by Role
        const roleData = [
          ['Role', 'Count', 'Percentage'],
          ['Students', (users.byRole?.student || 0).toString(),
           `${Math.round((users.byRole?.student || 0) / (users.total || 1) * 100)}%`],
          ['Faculty', (users.byRole?.faculty || 0).toString(),
           `${Math.round((users.byRole?.faculty || 0) / (users.total || 1) * 100)}%`],
          ['Staff', (users.byRole?.staff || 0).toString(),
           `${Math.round((users.byRole?.staff || 0) / (users.total || 1) * 100)}%`]
        ];

        doc.autoTable({
          startY: yPosition,
          head: [roleData[0]],
          body: roleData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [204, 0, 0], textColor: [255, 255, 255] },
          margin: { left: 14 },
          styles: { fontSize: 9, cellPadding: 3 }
        });

        yPosition = doc.lastAutoTable.finalY + 10;
      }

      // Reservations Section
      if (selectedSections.reservations && yPosition < 160) {
        if (yPosition > 140) {
          doc.addPage();
          yPosition = 20;
        }

        const reservations = analyticsData.reservations || {};

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("RESERVATION ANALYTICS", 14, yPosition);
        yPosition += 5;

        const reservationsData = [
          ['Metric', 'Value'],
          ['Total Reservations', (reservations.total || 0).toString()],
          ['Completed', (reservations.completed || 0).toString()],
          ['Pending', (reservations.pending || 0).toString()],
          ['Approved', (reservations.approved || 0).toString()],
          ['Rejected', (reservations.rejected || 0).toString()],
          ['Cancelled', (reservations.cancelled || 0).toString()],
          ['Avg Group Size', (reservations.avgGroupSize || 0).toString()]
        ];

        doc.autoTable({
          startY: yPosition,
          head: [reservationsData[0]],
          body: reservationsData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [204, 0, 0], textColor: [255, 255, 255] },
          margin: { left: 14 },
          styles: { fontSize: 9, cellPadding: 3 }
        });

        yPosition = doc.lastAutoTable.finalY + 10;
      }

      // Rooms Section
      if (selectedSections.rooms && yPosition < 160) {
        if (yPosition > 140) {
          doc.addPage();
          yPosition = 20;
        }

        const rooms = analyticsData.rooms || {};

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("ROOM ANALYTICS", 14, yPosition);
        yPosition += 5;

        const roomsData = [
          ['Metric', 'Value'],
          ['Total Rooms', (rooms.total || 0).toString()],
          ['Available', (rooms.available || 0).toString()],
          ['Occupied', (rooms.occupied || 0).toString()],
          ['Maintenance', (rooms.maintenance || 0).toString()],
          ['Utilization Rate', `${rooms.utilization || 0}%`]
        ];

        doc.autoTable({
          startY: yPosition,
          head: [roomsData[0]],
          body: roomsData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [204, 0, 0], textColor: [255, 255, 255] },
          margin: { left: 14 },
          styles: { fontSize: 9, cellPadding: 3 }
        });

        yPosition = doc.lastAutoTable.finalY + 10;
      }

      // Engagement Section
      if (selectedSections.engagement) {
        if (yPosition > 140) {
          doc.addPage();
          yPosition = 20;
        }

        const engagement = analyticsData.engagement || {};

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("ENGAGEMENT METRICS", 14, yPosition);
        yPosition += 5;

        const engagementData = [
          ['Metric', 'Value'],
          ['Daily Active Users', (engagement.dailyActive || 0).toString()],
          ['Weekly Active Users', (engagement.weeklyActive || 0).toString()],
          ['Monthly Active Users', (engagement.monthlyActive || 0).toString()],
          ['Avg Session Duration', `${engagement.averageSession || 0}m`],
          ['Retention Rate', `${engagement.retention || 0}%`]
        ];

        doc.autoTable({
          startY: yPosition,
          head: [engagementData[0]],
          body: engagementData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [204, 0, 0], textColor: [255, 255, 255] },
          margin: { left: 14 },
          styles: { fontSize: 9, cellPadding: 3 }
        });
      }

      // Save the PDF
      doc.save(`analytics_overview_${dateRange}_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF file. Please try again.");
    }
  };

  const handleDownload = () => {
    if (!selectedSections.overview && !selectedSections.users && 
        !selectedSections.reservations && !selectedSections.rooms && 
        !selectedSections.engagement) {
      alert("Please select at least one section to download");
      return;
    }

    setShowDownloadModal(false);

    if (downloadFormat === "excel") {
      generateExcel();
    } else {
      generatePDF();
    }
  };

  const getRangeDescription = () => {
    if (dateRange === "week") return "Last 7 Days";
    if (dateRange === "month") return "Last 30 Days";
    if (dateRange === "year") return "Last 12 Months";
    if (dateRange === "custom") return `${formatDate(customStartDate)} to ${formatDate(customEndDate)}`;
    return "";
  };

  // ==================== SKELETON COMPONENTS ====================

  const StatCardSkeleton = () => (
    <div className="flex-1 min-w-[200px] bg-white p-4 rounded-lg border border-gray-200 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-8 bg-gray-300 rounded w-16"></div>
        </div>
        <div className="p-2">
          <div className="w-5 h-5 bg-gray-300 rounded"></div>
        </div>
      </div>
    </div>
  );

  const ProgressBarSkeleton = () => (
    <div className="animate-pulse">
      <div className="flex justify-between mb-1">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-4 bg-gray-200 rounded w-12"></div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-gray-300 rounded-full h-2 w-3/4"></div>
      </div>
    </div>
  );

  const ChartSkeleton = () => (
    <div className="h-64 flex items-end justify-between gap-2 animate-pulse">
      {Array(7).fill(0).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full bg-gray-200 rounded-t" style={{ height: `${Math.random() * 150 + 50}px` }}></div>
          <div className="h-3 bg-gray-200 rounded w-8"></div>
        </div>
      ))}
    </div>
  );

  // ==================== COMPONENTS ====================

  const StatCard = ({ title, value, icon: Icon, color = "blue", subtext, isLoading = false }) => {
    const getColorClass = (colorName) => {
      const colorMap = {
        blue: "text-blue-500",
        green: "text-green-500",
        purple: "text-purple-500",
        yellow: "text-yellow-500",
        orange: "text-orange-500",
        red: "text-red-500",
        indigo: "text-indigo-500"
      };
      return colorMap[colorName] || "text-blue-500";
    };

    const getBgColorClass = (colorName) => {
      const colorMap = {
        blue: "bg-blue-100",
        green: "bg-green-100",
        purple: "bg-purple-100",
        yellow: "bg-yellow-100",
        orange: "bg-orange-100",
        red: "bg-red-100",
        indigo: "bg-indigo-100"
      };
      return colorMap[colorName] || "bg-blue-100";
    };

    if (isLoading) {
      return <StatCardSkeleton />;
    }

    return (
      <div className="flex-1 min-w-[200px] bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
          </div>
          <div className={`p-2 ${getBgColorClass(color)} rounded-lg`}>
            <Icon className={getColorClass(color)} size={20} />
          </div>
        </div>
      </div>
    );
  };

  const ProgressBar = ({ label, value, total, color = "blue", showValue = true, isLoading = false }) => {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    
    const getBgColorClass = (colorName) => {
      const colorMap = {
        blue: "bg-blue-500",
        green: "bg-green-500",
        purple: "bg-purple-500",
        orange: "bg-orange-500",
        yellow: "bg-yellow-500",
        red: "bg-red-500",
        indigo: "bg-indigo-500"
      };
      return colorMap[colorName] || "bg-blue-500";
    };

    if (isLoading) {
      return <ProgressBarSkeleton />;
    }

    return (
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">{label}</span>
          {showValue && <span className="text-gray-800 font-medium">{value.toLocaleString()}</span>}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`${getBgColorClass(color)} rounded-full h-2 transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  const SectionHeader = ({ title, icon: Icon, color = "red" }) => (
    <div className="flex items-center gap-2 mb-4">
      <div className={`p-2 bg-${color}-100 rounded-lg`}>
        <Icon size={20} className={`text-${color}-600`} />
      </div>
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
    </div>
  );

  // ==================== RENDER ====================

  if (loading) {
    return (
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        {/* Header Skeleton */}
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <div className="h-10 bg-gray-200 rounded w-16 mx-1 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-16 mx-1 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-16 mx-1 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-20 mx-1 animate-pulse"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-10 animate-pulse"></div>
            </div>
          </div>
        </header>

        {/* Main Content Skeleton */}
        <div className="p-6">
          {/* Overview Metrics Skeleton */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
            <div className="flex flex-wrap gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </div>

          {/* Quick Navigation Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
            ))}
          </div>

          {/* Charts Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
              <ChartSkeleton />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
              <ChartSkeleton />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#CC0000]">
              Analytics Overview
            </h1>
            <p className="text-gray-600">
              {dateRange === 'week' ? 'Last 7 days' : 
               dateRange === 'month' ? 'Last 30 days' : 
               dateRange === 'year' ? 'Last 12 months' : 
               dateRange === 'custom' && customStartDate && customEndDate ? `${formatDate(customStartDate)} to ${formatDate(customEndDate)}` : 
               'Comprehensive insights across all metrics'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Date Range Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1 relative">
              {["week", "month", "year"].map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setDateRange(range);
                    setShowCustomDate(false);
                  }}
                  className={`px-4 py-2 text-sm rounded-md transition-all cursor-pointer ${
                    dateRange === range && !showCustomDate
                      ? "bg-[#CC0000] text-white"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  {range === 'week' ? 'Week' : 
                   range === 'month' ? 'Month' : 
                   'Year'}
                </button>
              ))}
              
              {/* Custom Date Button */}
              <button
                onClick={() => setShowCustomDate(!showCustomDate)}
                className={`px-4 py-2 text-sm rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  showCustomDate || dateRange === 'custom'
                    ? "bg-[#CC0000] text-white"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                }`}
              >
                <Calendar size={14} />
                <span>Custom</span>
              </button>

              {/* Custom Date Range Picker */}
              {showCustomDate && (
                <div 
                  ref={calendarRef}
                  className="absolute top-12 right-0 bg-white p-4 rounded-lg shadow-lg border border-gray-200 z-50 w-72"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">Select Date Range</h3>
                    <button
                      onClick={() => setShowCustomDate(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                        max={customEndDate || undefined}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                        min={customStartDate || undefined}
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleCustomDateApply}
                        className="flex-1 bg-[#CC0000] text-white text-sm py-2 rounded-lg hover:bg-[#990000] transition-colors"
                      >
                        Apply
                      </button>
                      <button
                        onClick={handleCustomDateClear}
                        className="flex-1 bg-gray-200 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Download Button */}
            <button
              onClick={() => setShowDownloadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
              title="Download Report"
            >
              <Download size={18} />
              <span>Download</span>
            </button>

            {/* Refresh Button */}
            <button 
              onClick={fetchAllAnalytics}
              className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-50 cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Download Report</h3>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Format Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Format
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="format"
                    value="excel"
                    checked={downloadFormat === "excel"}
                    onChange={(e) => setDownloadFormat(e.target.value)}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="text-gray-700">Excel (.xlsx)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="format"
                    value="pdf"
                    checked={downloadFormat === "pdf"}
                    onChange={(e) => setDownloadFormat(e.target.value)}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="text-gray-700">PDF</span>
                </label>
              </div>
            </div>

            {/* Sections Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Sections to Include
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedSections.overview}
                    onChange={(e) => setSelectedSections({...selectedSections, overview: e.target.checked})}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="text-gray-700">Overview Metrics</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedSections.users}
                    onChange={(e) => setSelectedSections({...selectedSections, users: e.target.checked})}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="text-gray-700">User Analytics</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedSections.reservations}
                    onChange={(e) => setSelectedSections({...selectedSections, reservations: e.target.checked})}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="text-gray-700">Reservation Analytics</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedSections.rooms}
                    onChange={(e) => setSelectedSections({...selectedSections, rooms: e.target.checked})}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="text-gray-700">Room Analytics</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedSections.engagement}
                    onChange={(e) => setSelectedSections({...selectedSections, engagement: e.target.checked})}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="text-gray-700">Engagement Metrics</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 bg-[#CC0000] text-white py-2 rounded-lg hover:bg-[#990000] transition-colors"
              >
                Download
              </button>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6">
        {/* Overview Metrics */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <SectionHeader title="Overview Metrics" icon={BarChart} color="blue" />
          <div className="flex flex-wrap gap-4">
            <StatCard 
              title="Total Users" 
              value={analyticsData.totalUsers || 0} 
              icon={Users} 
              color="blue" 
              subtext={`${analyticsData.users?.active || 0} active (7d)`}
            />
            <StatCard 
              title="Total Reservations" 
              value={analyticsData.totalReservations || 0} 
              icon={CalendarCheck} 
              color="green" 
              subtext={`${analyticsData.completedReservations || 0} completed`}
            />
            <StatCard 
              title="Total Rooms" 
              value={analyticsData.totalRooms || 0} 
              icon={DoorOpen} 
              color="purple" 
              subtext={`${analyticsData.rooms?.available || 0} available`}
            />
            <StatCard 
              title="Active Today" 
              value={analyticsData.activeToday || 0} 
              icon={Activity} 
              color="orange" 
            />
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setView("analyticsUsers")}
            className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 hover:from-blue-700 hover:to-blue-800 transition-all cursor-pointer text-left"
          >
            <Users size={24} className="text-white mb-3" />
            <h3 className="text-lg font-semibold text-white">User Analytics</h3>
            <p className="text-blue-100 text-sm mt-1">View user growth and activity</p>
          </button>
          <button
            onClick={() => setView("analyticsReservations")}
            className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 hover:from-green-700 hover:to-green-800 transition-all cursor-pointer text-left"
          >
            <CalendarCheck size={24} className="text-white mb-3" />
            <h3 className="text-lg font-semibold text-white">Reservation Analytics</h3>
            <p className="text-green-100 text-sm mt-1">Track booking patterns</p>
          </button>
          <button
            onClick={() => setView("analyticsRooms")}
            className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 hover:from-purple-700 hover:to-purple-800 transition-all cursor-pointer text-left"
          >
            <DoorOpen size={24} className="text-white mb-3" />
            <h3 className="text-lg font-semibold text-white">Room Analytics</h3>
            <p className="text-purple-100 text-sm mt-1">Monitor room utilization</p>
          </button>
          <button
            onClick={() => setView("analyticsEngagement")}
            className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-6 hover:from-orange-700 hover:to-orange-800 transition-all cursor-pointer text-left"
          >
            <Activity size={24} className="text-white mb-3" />
            <h3 className="text-lg font-semibold text-white">Engagement Metrics</h3>
            <p className="text-orange-100 text-sm mt-1">Analyze user engagement</p>
          </button>
        </div>

        {/* User Analytics Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <SectionHeader title="User Analytics" icon={Users} color="blue" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Key Metrics */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Key Metrics</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Total Users</span>
                  <span className="text-blue-600 font-semibold">{(analyticsData.users?.total || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Active (7d)</span>
                  <span className="text-green-600 font-semibold">{(analyticsData.users?.active || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">New Users</span>
                  <span className="text-purple-600 font-semibold">{(analyticsData.users?.new || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Retention Rate</span>
                  <span className="text-orange-600 font-semibold">{analyticsData.users?.activityStats?.retentionRate || 0}%</span>
                </div>
              </div>
            </div>

            {/* Role Distribution */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Role Distribution</h3>
              <div className="space-y-3">
                <ProgressBar 
                  label="Students" 
                  value={analyticsData.users?.byRole?.student || 0} 
                  total={analyticsData.users?.total || 1} 
                  color="blue"
                />
                <ProgressBar 
                  label="Faculty" 
                  value={analyticsData.users?.byRole?.faculty || 0} 
                  total={analyticsData.users?.total || 1} 
                  color="green"
                />
                <ProgressBar 
                  label="Staff" 
                  value={analyticsData.users?.byRole?.staff || 0} 
                  total={analyticsData.users?.total || 1} 
                  color="purple"
                />
              </div>
            </div>

            {/* Top Departments */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Top Departments</h3>
              <div className="space-y-3">
                {(analyticsData.users?.byDepartment || []).slice(0, 3).map((dept, idx) => (
                  <ProgressBar 
                    key={idx}
                    label={dept.name} 
                    value={dept.count} 
                    total={analyticsData.users?.total || 1} 
                    color={idx === 0 ? "blue" : idx === 1 ? "green" : "purple"}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setView("analyticsUsers")}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              View Detailed User Analytics →
            </button>
          </div>
        </div>

        {/* Reservation Analytics Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <SectionHeader title="Reservation Analytics" icon={CalendarCheck} color="green" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Key Metrics */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Key Metrics</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Total Reservations</span>
                  <span className="text-blue-600 font-semibold">{(analyticsData.reservations?.total || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Completed</span>
                  <span className="text-green-600 font-semibold">{(analyticsData.reservations?.completed || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Pending</span>
                  <span className="text-yellow-600 font-semibold">{(analyticsData.reservations?.pending || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Avg Group Size</span>
                  <span className="text-orange-600 font-semibold">{analyticsData.reservations?.avgGroupSize || 0}</span>
                </div>
              </div>
            </div>

            {/* Day of Week Distribution */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Peak Days</h3>
              <div className="space-y-3">
                {Object.entries(analyticsData.reservations?.byDayOfWeek || {}).map(([day, count], idx) => {
                  const dayNames = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', 
                                   thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
                  return (
                    <ProgressBar 
                      key={day}
                      label={dayNames[day] || day} 
                      value={count} 
                      total={analyticsData.reservations?.total || 1} 
                      color={idx === 0 ? "blue" : idx === 1 ? "green" : "purple"}
                    />
                  );
                })}
              </div>
            </div>

            {/* Popular Rooms */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Most Popular Rooms</h3>
              <div className="space-y-3">
                {(analyticsData.reservations?.popularRooms || []).slice(0, 3).map((room, idx) => (
                  <ProgressBar 
                    key={idx}
                    label={room.name} 
                    value={room.bookings} 
                    total={analyticsData.reservations?.total || 1} 
                    color={idx === 0 ? "blue" : idx === 1 ? "green" : "purple"}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setView("analyticsReservations")}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              View Detailed Reservation Analytics →
            </button>
          </div>
        </div>

        {/* Room Analytics Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <SectionHeader title="Room Analytics" icon={DoorOpen} color="purple" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Key Metrics */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Key Metrics</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Total Rooms</span>
                  <span className="text-blue-600 font-semibold">{analyticsData.rooms?.total || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Available</span>
                  <span className="text-green-600 font-semibold">{analyticsData.rooms?.available || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Occupied</span>
                  <span className="text-orange-600 font-semibold">{analyticsData.rooms?.occupied || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Utilization</span>
                  <span className="text-purple-600 font-semibold">{analyticsData.rooms?.utilization || 0}%</span>
                </div>
              </div>
            </div>

            {/* Floor Distribution */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Rooms by Floor</h3>
              <div className="space-y-3">
                {Object.entries(analyticsData.rooms?.byFloor || {}).map(([floor, count], idx) => (
                  <ProgressBar 
                    key={floor}
                    label={floor} 
                    value={count} 
                    total={analyticsData.rooms?.total || 1} 
                    color={idx === 0 ? "blue" : idx === 1 ? "green" : "purple"}
                  />
                ))}
              </div>
            </div>

            {/* Feature Distribution */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Room Features</h3>
              <div className="space-y-3">
                <ProgressBar 
                  label="WiFi" 
                  value={analyticsData.rooms?.featureStats?.wifi || 0} 
                  total={analyticsData.rooms?.total || 1} 
                  color="blue"
                />
                <ProgressBar 
                  label="Air Conditioning" 
                  value={analyticsData.rooms?.featureStats?.aircon || 0} 
                  total={analyticsData.rooms?.total || 1} 
                  color="green"
                />
                <ProgressBar 
                  label="Projector" 
                  value={analyticsData.rooms?.featureStats?.projector || 0} 
                  total={analyticsData.rooms?.total || 1} 
                  color="purple"
                />
                <ProgressBar 
                  label="Monitor" 
                  value={analyticsData.rooms?.featureStats?.monitor || 0} 
                  total={analyticsData.rooms?.total || 1} 
                  color="orange"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setView("analyticsRooms")}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              View Detailed Room Analytics →
            </button>
          </div>
        </div>

        {/* Engagement Metrics Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <SectionHeader title="Engagement Metrics" icon={Activity} color="orange" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Key Metrics */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Key Metrics</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Daily Active</span>
                  <span className="text-blue-600 font-semibold">{(analyticsData.engagement?.dailyActive || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Weekly Active</span>
                  <span className="text-green-600 font-semibold">{(analyticsData.engagement?.weeklyActive || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Monthly Active</span>
                  <span className="text-purple-600 font-semibold">{(analyticsData.engagement?.monthlyActive || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Avg Session</span>
                  <span className="text-orange-600 font-semibold">{analyticsData.engagement?.averageSession || 0}m</span>
                </div>
              </div>
            </div>

            {/* Activity Levels */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Activity Levels</h3>
              <div className="space-y-3">
                <ProgressBar 
                  label="High Activity" 
                  value={analyticsData.engagement?.userActivity?.high || 0} 
                  total={(analyticsData.engagement?.userActivity?.high || 0) + 
                         (analyticsData.engagement?.userActivity?.medium || 0) + 
                         (analyticsData.engagement?.userActivity?.low || 0) + 
                         (analyticsData.engagement?.userActivity?.inactive || 1)} 
                  color="green"
                />
                <ProgressBar 
                  label="Medium Activity" 
                  value={analyticsData.engagement?.userActivity?.medium || 0} 
                  total={(analyticsData.engagement?.userActivity?.high || 0) + 
                         (analyticsData.engagement?.userActivity?.medium || 0) + 
                         (analyticsData.engagement?.userActivity?.low || 0) + 
                         (analyticsData.engagement?.userActivity?.inactive || 1)} 
                  color="yellow"
                />
                <ProgressBar 
                  label="Low Activity" 
                  value={analyticsData.engagement?.userActivity?.low || 0} 
                  total={(analyticsData.engagement?.userActivity?.high || 0) + 
                         (analyticsData.engagement?.userActivity?.medium || 0) + 
                         (analyticsData.engagement?.userActivity?.low || 0) + 
                         (analyticsData.engagement?.userActivity?.inactive || 1)} 
                  color="orange"
                />
                <ProgressBar 
                  label="Inactive" 
                  value={analyticsData.engagement?.userActivity?.inactive || 0} 
                  total={(analyticsData.engagement?.userActivity?.high || 0) + 
                         (analyticsData.engagement?.userActivity?.medium || 0) + 
                         (analyticsData.engagement?.userActivity?.low || 0) + 
                         (analyticsData.engagement?.userActivity?.inactive || 1)} 
                  color="red"
                />
              </div>
            </div>

            {/* Device Breakdown */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Device Usage</h3>
              <div className="space-y-3">
                {(analyticsData.engagement?.deviceBreakdown || []).map((device, idx) => (
                  <ProgressBar 
                    key={idx}
                    label={device.name} 
                    value={device.value} 
                    total={100} 
                    color={device.color}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setView("analyticsEngagement")}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              View Detailed Engagement Metrics →
            </button>
          </div>
        </div>

        {/* Top Features */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <SectionHeader title="Most Used Features" icon={Target} color="red" />
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {(analyticsData.engagement?.topFeatures || []).slice(0, 5).map((feature, idx) => (
              <div key={idx} className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-1">{feature.name}</p>
                <p className="text-xl font-bold text-gray-800">{feature.count.toLocaleString()}</p>
                <p className={`text-xs ${feature.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {feature.trend > 0 ? '+' : ''}{feature.trend}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default AnalyticsOverview;