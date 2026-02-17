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
  Zap,
  Home,
  Smartphone,
  Coffee
} from "lucide-react";
import api from "../../utils/api";
import * as XLSX from 'xlsx';

function AnalyticsOverview({ setView, admin }) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
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
      byRole: { student: 0, faculty: 0, staff: 0, admin: 0 },
      byStatus: { active: 0, inactive: 0, suspended: 0, verified: 0, unverified: 0, pending: 0 },
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
        completed: { value: 0, percentage: 0, direction: 'up' },
        cancelled: { value: 0, percentage: 0, direction: 'up' }
      },
      growth: { labels: [], values: [] },
      floorDistribution: [],
      avgGroupSize: 0,
      totalParticipants: 0,
      previousTotal: 0,
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
      byType: { lecture: 0, laboratory: 0, conference: 0, office: 0, general: 0 },
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
      let reservationsData = { 
        total: 0, pending: 0, approved: 0, rejected: 0, completed: 0, cancelled: 0, expired: 0, ongoing: 0, 
        byRoom: [], byDayOfWeek: {}, popularRooms: [], trends: {}, growth: { labels: [], values: [] }, 
        floorDistribution: [], avgGroupSize: 0, totalParticipants: 0, previousTotal: 0, 
        userDepartmentStats: [], topReservers: [] 
      };
      if (reservationsRes.status === 'fulfilled' && reservationsRes.value.data?.success) {
        reservationsData = reservationsRes.value.data.data;
      }

      // Process rooms data
      let roomsData = { 
        total: 0, available: 0, occupied: 0, maintenance: 0, utilization: 0, byType: {}, 
        roomDetails: [], hourlyUtilization: [], topRooms: [], byFloor: {}, byCapacity: {}, 
        trends: {}, featureStats: {}, peakHours: [], bookingTrends: [], maintenanceHistory: [], topUsers: [] 
      };
      if (roomsRes.status === 'fulfilled' && roomsRes.value.data?.success) {
        roomsData = roomsRes.value.data.data;
      }

      // Process engagement data
      let engagementData = { 
        dailyActive: 0, weeklyActive: 0, monthlyActive: 0, averageSession: 0, retention: 0, bounceRate: 0, 
        byDay: [], userActivity: {}, engagementMetrics: {}, activityBreakdown: [], peakHours: [], 
        deviceBreakdown: [], userEngagementTrends: [], topFeatures: [], trends: {} 
      };
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
        byRole: { student: 850, faculty: 280, staff: 120, admin: 0 },
        byStatus: { active: 850, inactive: 350, suspended: 15, verified: 1100, unverified: 150, pending: 25 },
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
          { name: "Bob Wilson", email: "bob@email.com", role: "Staff", reservations: 32 },
          { name: "Alice Brown", email: "alice@email.com", role: "Student", reservations: 28 },
          { name: "Charlie Lee", email: "charlie@email.com", role: "Faculty", reservations: 25 }
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
          { name: "Room 103", count: 520, approved: 450, pending: 30, completed: 420, cancelled: 25 },
          { name: "Room 201", count: 410, approved: 350, pending: 22, completed: 330, cancelled: 18 },
          { name: "Room 202", count: 390, approved: 330, pending: 20, completed: 310, cancelled: 16 }
        ],
        byDayOfWeek: { mon: 580, tue: 620, wed: 650, thu: 590, fri: 480, sat: 320, sun: 210 },
        popularRooms: [
          { name: "Room 103", bookings: 520, approved: 450, completed: 420, utilization: 85 },
          { name: "Room 101", bookings: 450, approved: 380, completed: 350, utilization: 78 },
          { name: "Room 202", bookings: 410, approved: 350, completed: 330, utilization: 72 },
          { name: "Lab A", bookings: 340, approved: 290, completed: 270, utilization: 68 },
          { name: "Conference A", bookings: 290, approved: 240, completed: 220, utilization: 58 }
        ],
        trends: {
          total: { value: 3450, percentage: 12.5, direction: 'up' },
          pending: { value: 45, percentage: -5.2, direction: 'down' },
          approved: { value: 320, percentage: 8.3, direction: 'up' },
          completed: { value: 2890, percentage: 15.8, direction: 'up' },
          cancelled: { value: 95, percentage: 3.2, direction: 'up' }
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
        previousTotal: 2980,
        userDepartmentStats: [
          { name: "Computer Science", count: 980 },
          { name: "Engineering", count: 850 },
          { name: "Business", count: 620 },
          { name: "Medicine", count: 450 },
          { name: "Arts", count: 380 }
        ],
        topReservers: [
          { name: "John Doe", department: "Computer Science", count: 45 },
          { name: "Jane Smith", department: "Engineering", count: 38 },
          { name: "Bob Wilson", department: "Business", count: 32 },
          { name: "Alice Brown", department: "Medicine", count: 28 },
          { name: "Charlie Lee", department: "Computer Science", count: 25 }
        ]
      },
      rooms: {
        total: 25,
        available: 10,
        occupied: 9,
        maintenance: 2,
        utilization: 68,
        byType: { lecture: 12, laboratory: 6, conference: 4, office: 3, general: 0 },
        roomDetails: [
          { id: 1, name: "Room 101", type: "Lecture", floor: "1st Floor", capacity: 6, bookings: 450, utilization: 78, status: "available", features: { wifi: true, aircon: true, projector: true, monitor: false } },
          { id: 2, name: "Room 102", type: "Lecture", floor: "1st Floor", capacity: 4, bookings: 380, utilization: 68, status: "occupied", features: { wifi: true, aircon: true, projector: false, monitor: true } },
          { id: 3, name: "Room 103", type: "Lecture", floor: "1st Floor", capacity: 8, bookings: 520, utilization: 85, status: "available", features: { wifi: true, aircon: true, projector: true, monitor: true } },
          { id: 4, name: "Room 104", type: "Laboratory", floor: "1st Floor", capacity: 5, bookings: 280, utilization: 62, status: "maintenance", features: { wifi: true, aircon: true, projector: false, monitor: true } },
          { id: 5, name: "Room 201", type: "Conference", floor: "2nd Floor", capacity: 7, bookings: 290, utilization: 52, status: "available", features: { wifi: true, aircon: true, projector: true, monitor: false } }
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
          { name: "Room 202", bookings: 410, utilization: 72, type: "Lecture", capacity: 6, floor: "2nd Floor", features: { wifi: true, aircon: true, projector: true, monitor: true } },
          { name: "Lab A", bookings: 340, utilization: 70, type: "Laboratory", capacity: 8, floor: "3rd Floor", features: { wifi: true, aircon: true, projector: false, monitor: true } },
          { name: "Room 201", bookings: 290, utilization: 52, type: "Conference", capacity: 7, floor: "2nd Floor", features: { wifi: true, aircon: true, projector: true, monitor: false } }
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
          { room: "Lab B", date: "2024-02-20 15:40:25", type: "Equipment Check", status: "Completed" },
          { room: "Room 203", date: "2024-02-15 08:45:30", type: "Projector Maintenance", status: "Completed" }
        ],
        topUsers: [
          { name: "Dr. Smith", department: "Engineering", bookings: 45, room: "Room 103" },
          { name: "Prof. Johnson", department: "Science", bookings: 38, room: "Lab A" },
          { name: "Dr. Williams", department: "Mathematics", bookings: 32, room: "Room 202" }
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
          { name: "Profile Updates", value: 980, color: "orange" },
          { name: "Room Searches", value: 5670, color: "yellow" }
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

  // ==================== EXCEL DOWNLOAD FUNCTION ====================

  const generateExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Helper function to add worksheet with formatting
      const addSheet = (data, sheetName) => {
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Set column widths for better readability
        const colWidths = [];
        if (data.length > 0) {
          const firstRow = data[0];
          firstRow.forEach((_, index) => {
            let maxLength = 15;
            data.forEach(row => {
              if (row[index] && row[index].toString().length > maxLength) {
                maxLength = Math.min(row[index].toString().length, 50);
              }
            });
            colWidths.push({ wch: maxLength + 2 });
          });
        }
        ws['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      };

      const getRangeDescription = () => {
        if (dateRange === "week") return "Last 7 Days";
        if (dateRange === "month") return "Last 30 Days";
        if (dateRange === "year") return "Last 12 Months";
        if (dateRange === "custom") return `${formatDate(customStartDate)} to ${formatDate(customEndDate)}`;
        return "";
      };

      // ==================== OVERVIEW SHEET ====================
      if (selectedSections.overview) {
        const overviewData = [
          ['==============================================='],
          ['ANALYTICS OVERVIEW REPORT'],
          ['==============================================='],
          [],
          ['REPORT INFORMATION'],
          ['==============================================='],
          ['Generated:', new Date().toLocaleString()],
          ['Date Range:', getRangeDescription()],
          ['Report ID:', `OVR-${Date.now()}`],
          [],
          ['SECTION 1: KEY METRICS'],
          ['==============================================='],
          ['Metric', 'Value', 'Description', 'Status'],
          ['Total Users', analyticsData.totalUsers || 0, 'All registered users (non-archived)', 
           analyticsData.totalUsers > 1000 ? 'Healthy' : 'Needs Attention'],
          ['Total Reservations', analyticsData.totalReservations || 0, 'All reservations in selected period',
           analyticsData.totalReservations > 3000 ? 'High Activity' : 'Normal Activity'],
          ['Total Rooms', analyticsData.totalRooms || 0, 'Total available rooms',
           analyticsData.totalRooms > 20 ? 'Adequate' : 'Limited'],
          ['Active Today', analyticsData.activeToday || 0, 'Users active in last 24 hours',
           analyticsData.activeToday > 300 ? 'High Engagement' : 'Low Engagement'],
          ['Pending Reservations', analyticsData.pendingReservations || 0, 'Reservations awaiting approval',
           (analyticsData.pendingReservations || 0) < 50 ? 'Normal' : 'High Backlog'],
          ['Completed Reservations', analyticsData.completedReservations || 0, 'Successfully completed reservations',
           (analyticsData.completedReservations || 0) > 2000 ? 'Good Completion Rate' : 'Needs Improvement'],
          ['Room Utilization', `${analyticsData.roomUtilization || 0}%`, 'Overall room usage rate',
           (analyticsData.roomUtilization || 0) > 60 ? 'Optimal' : 'Underutilized'],
          ['Avg Session Duration', `${analyticsData.avgSessionDuration || 0} minutes`, 'Average time spent per session',
           (analyticsData.avgSessionDuration || 0) > 20 ? 'Engaged Users' : 'Short Sessions'],
          [],
          ['SECTION 2: PERFORMANCE SUMMARY'],
          ['==============================================='],
          ['Metric', 'Value', 'Benchmark', 'Status'],
          ['Completion Rate', analyticsData.totalReservations > 0 
            ? `${Math.round((analyticsData.completedReservations / analyticsData.totalReservations) * 100)}%` 
            : '0%', '70%', 
            (analyticsData.completedReservations / analyticsData.totalReservations) * 100 >= 70 ? '✓ Meets Benchmark' : '⚠ Below Benchmark'],
          ['Pending Rate', analyticsData.totalReservations > 0 
            ? `${Math.round((analyticsData.pendingReservations / analyticsData.totalReservations) * 100)}%` 
            : '0%', '15%',
            (analyticsData.pendingReservations / analyticsData.totalReservations) * 100 <= 15 ? '✓ Normal' : '⚠ High Backlog'],
          ['User Activity Rate', analyticsData.totalUsers > 0 
            ? `${Math.round((analyticsData.activeToday / analyticsData.totalUsers) * 100)}%` 
            : '0%', '25%',
            (analyticsData.activeToday / analyticsData.totalUsers) * 100 >= 25 ? '✓ Good Engagement' : '⚠ Low Engagement'],
          [],
          ['SECTION 3: EXECUTIVE SUMMARY'],
          ['==============================================='],
          ['Key Finding', 'Insight', 'Recommendation'],
          ['User Growth', 
           `Total users: ${analyticsData.totalUsers} (${analyticsData.users?.trends?.monthly?.percentage || 0}% growth)`,
           analyticsData.users?.trends?.monthly?.direction === 'up' 
             ? 'Continue marketing efforts' 
             : 'Implement user acquisition strategies'],
          ['Reservation Trends',
           `Total: ${analyticsData.totalReservations} (${analyticsData.reservations?.trends?.total?.percentage || 0}% ${analyticsData.reservations?.trends?.total?.direction || 'stable'})`,
           analyticsData.reservations?.trends?.total?.direction === 'up'
             ? 'Maintain current booking policies'
             : 'Review booking process for improvements'],
          ['Room Utilization',
           `${analyticsData.roomUtilization || 0}% overall (${analyticsData.rooms?.available || 0} rooms available)`,
           analyticsData.roomUtilization < 60 
             ? 'Promote underutilized rooms' 
             : 'Consider adding more rooms during peak hours'],
          ['User Engagement',
           `${analyticsData.activeToday || 0} active today (${analyticsData.engagement?.retention || 0}% retention)`,
           analyticsData.engagement?.retention < 70
             ? 'Improve user onboarding and engagement features'
             : 'Continue engaging active users with new features']
        ];
        addSheet(overviewData, 'Overview');
      }

      // ==================== USER ANALYTICS SHEET ====================
      if (selectedSections.users) {
        const users = analyticsData.users || {};
        const totalUsers = users.total || 1;
        
        const usersData = [
          ['==============================================='],
          ['USER ANALYTICS REPORT'],
          ['==============================================='],
          [],
          ['SECTION 1: KEY METRICS'],
          ['==============================================='],
          ['Metric', 'Value', 'Change %', 'Trend', 'Description'],
          ['Total Users', users.total || 0, 
           `${users.trends?.monthly?.percentage || 0}%`,
           users.trends?.monthly?.direction === 'up' ? '↑ Increasing' : '↓ Decreasing',
           'All registered users (non-archived)'],
          ['Active Users (7 days)', users.active || 0,
           `${users.trends?.weekly?.percentage || 0}%`,
           users.trends?.weekly?.direction === 'up' ? '↑ Increasing' : '↓ Decreasing',
           'Users with activity in last 7 days'],
          ['New Users', users.new || 0,
           `${users.trends?.daily?.percentage || 0}%`,
           users.trends?.daily?.direction === 'up' ? '↑ Increasing' : '↓ Decreasing',
           'Users registered in selected period'],
          ['Deleted/Archived', users.deleted || 0, 'N/A', 'N/A', 'Users archived or deleted'],
          ['Retention Rate', `${users.activityStats?.retentionRate || 0}%`, 'N/A', 
           (users.activityStats?.retentionRate || 0) > 70 ? '↑ Good' : '↓ Needs Improvement',
           'Users returning after first visit'],
          [],
          ['SECTION 2: REGISTRATION STATISTICS'],
          ['==============================================='],
          ['Period', 'Count', 'Average'],
          ['Today', users.registrationStats?.today || 0, '-'],
          ['This Week', users.registrationStats?.thisWeek || 0, 
           `${Math.round((users.registrationStats?.thisWeek || 0) / 7)} per day`],
          ['This Month', users.registrationStats?.thisMonth || 0,
           `${Math.round((users.registrationStats?.thisMonth || 0) / 30)} per day`],
          ['Average Per Day', users.registrationStats?.avgPerDay || 0, '-'],
          [],
          ['SECTION 3: USERS BY ROLE'],
          ['==============================================='],
          ['Role', 'Count', 'Percentage of Total', 'Activity Level'],
          ['Students', users.byRole?.student || 0, 
           `${Math.round((users.byRole?.student || 0) / totalUsers * 100)}%`,
           (users.byRole?.student || 0) > totalUsers * 0.5 ? 'Majority' : 'Minority'],
          ['Faculty', users.byRole?.faculty || 0,
           `${Math.round((users.byRole?.faculty || 0) / totalUsers * 100)}%`,
           (users.byRole?.faculty || 0) > totalUsers * 0.2 ? 'Significant' : 'Moderate'],
          ['Staff', users.byRole?.staff || 0,
           `${Math.round((users.byRole?.staff || 0) / totalUsers * 100)}%`,
           (users.byRole?.staff || 0) > totalUsers * 0.1 ? 'Significant' : 'Moderate'],
          [],
          ['SECTION 4: ACCOUNT STATUS'],
          ['==============================================='],
          ['Status', 'Count', 'Percentage', 'Description'],
          ['Active (7 days)', users.byStatus?.active || 0,
           `${Math.round((users.byStatus?.active || 0) / totalUsers * 100)}%`,
           'Active in last 7 days'],
          ['Inactive', users.byStatus?.inactive || 0,
           `${Math.round((users.byStatus?.inactive || 0) / totalUsers * 100)}%`,
           'No activity in last 30 days'],
          ['Suspended', users.byStatus?.suspended || 0,
           `${Math.round((users.byStatus?.suspended || 0) / totalUsers * 100)}%`,
           'Account suspended'],
          ['Verified', users.byStatus?.verified || 0,
           `${Math.round((users.byStatus?.verified || 0) / totalUsers * 100)}%`,
           'Email verified'],
          ['Unverified', users.byStatus?.unverified || 0,
           `${Math.round((users.byStatus?.unverified || 0) / totalUsers * 100)}%`,
           'Email not verified'],
          ['Pending', users.byStatus?.pending || 0,
           `${Math.round((users.byStatus?.pending || 0) / totalUsers * 100)}%`,
           'Pending approval'],
          [],
          ['SECTION 5: TOP DEPARTMENTS'],
          ['==============================================='],
          ['Department', 'User Count', 'Percentage', 'Rank'],
          ...(users.byDepartment || []).map((dept, index) => [
            dept.name,
            dept.count,
            `${Math.round((dept.count / totalUsers) * 100)}%`,
            index === 0 ? '🥇 Most Users' : index === 1 ? '🥈 2nd' : index === 2 ? '🥉 3rd' : `#${index + 1}`
          ]),
          [],
          ['SECTION 6: TOP ACTIVE USERS'],
          ['==============================================='],
          ['Rank', 'Name', 'Email', 'Role', 'Actions', 'Contribution'],
          ...(users.topUsers || []).map((user, index) => [
            `#${index + 1}`,
            user.name,
            user.email,
            user.role,
            user.reservations || 0,
            `${Math.round(((user.reservations || 0) / (users.total || 1)) * 100)}%`
          ]),
          [],
          ['SECTION 7: GROWTH TRENDS'],
          ['==============================================='],
          ['Period', 'New Users', 'Change', 'Growth Rate'],
          ...(users.growth?.labels || []).map((label, idx) => {
            const value = users.growth?.values?.[idx] || 0;
            const prevValue = idx > 0 ? users.growth?.values?.[idx - 1] : value;
            const change = value - prevValue;
            const changePercent = prevValue > 0 ? Math.round((change / prevValue) * 100) : 0;
            return [
              label,
              value,
              change > 0 ? `+${change}` : change,
              changePercent > 0 ? `+${changePercent}%` : `${changePercent}%`
            ];
          }),
          [],
          ['SECTION 8: USER INSIGHTS'],
          ['==============================================='],
          ['Insight', 'Finding', 'Recommendation'],
          ['User Distribution',
           `Students: ${users.byRole?.student || 0}, Faculty: ${users.byRole?.faculty || 0}, Staff: ${users.byRole?.staff || 0}`,
           users.byRole?.student > users.byRole?.faculty * 3 
             ? 'Consider targeting faculty engagement' 
             : 'Balanced user distribution'],
          ['Account Verification',
           `${Math.round((users.byStatus?.verified || 0) / totalUsers * 100)}% of users verified`,
           (users.byStatus?.verified || 0) / totalUsers < 0.8 
             ? 'Send verification reminders' 
             : 'Good verification rate'],
          ['User Retention',
           `${users.activityStats?.retentionRate || 0}% retention rate`,
           (users.activityStats?.retentionRate || 0) < 70 
             ? 'Improve onboarding and engagement' 
             : 'Excellent user retention']
        ];
        addSheet(usersData, 'Users');
      }

      // ==================== RESERVATION ANALYTICS SHEET ====================
      if (selectedSections.reservations) {
        const reservations = analyticsData.reservations || {};
        const total = reservations.total || 1;
        const totalDays = Object.values(reservations.byDayOfWeek || {}).reduce((a, b) => a + b, 0) || 1;
        
        // Find peak day
        const peakDay = Object.entries(reservations.byDayOfWeek || {}).reduce((a, b) => 
          (b[1] > a[1] ? b : a), ['', 0]);
        
        const dayNames = {
          mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', 
          thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
        };
        
        const reservationsData = [
          ['==============================================='],
          ['RESERVATION ANALYTICS REPORT'],
          ['==============================================='],
          [],
          ['SECTION 1: KEY METRICS'],
          ['==============================================='],
          ['Metric', 'Value', 'Change %', 'Trend', 'Status'],
          ['Total Reservations', reservations.total || 0,
           `${reservations.trends?.total?.percentage || 0}%`,
           reservations.trends?.total?.direction === 'up' ? '↑ Increasing' : '↓ Decreasing',
           reservations.trends?.total?.percentage > 0 ? 'Positive Growth' : 'Needs Attention'],
          ['Completed', reservations.completed || 0,
           `${reservations.trends?.completed?.percentage || 0}%`,
           reservations.trends?.completed?.direction === 'up' ? '↑ Increasing' : '↓ Decreasing',
           `Success Rate: ${Math.round((reservations.completed / total) * 100)}%`],
          ['Pending', reservations.pending || 0,
           `${reservations.trends?.pending?.percentage || 0}%`,
           reservations.trends?.pending?.direction === 'up' ? '↑ Increasing' : '↓ Decreasing',
           reservations.pending > 50 ? '⚠ High Backlog' : '✓ Normal'],
          ['Approved', reservations.approved || 0, 'N/A', 'N/A', 'Awaiting start'],
          ['Rejected', reservations.rejected || 0, 'N/A', 'N/A', 'Not approved'],
          ['Cancelled', reservations.cancelled || 0,
           `${reservations.trends?.cancelled?.percentage || 0}%`,
           reservations.trends?.cancelled?.direction === 'up' ? '↑ Increasing' : '↓ Decreasing',
           `Cancellation Rate: ${Math.round((reservations.cancelled / total) * 100)}%`],
          ['Ongoing', reservations.ongoing || 0, 'N/A', 'N/A', 'Currently in progress'],
          ['Expired', reservations.expired || 0, 'N/A', 'N/A', 'Passed without action'],
          [],
          ['SECTION 2: PARTICIPANT STATISTICS'],
          ['==============================================='],
          ['Metric', 'Value', 'Description'],
          ['Average Group Size', reservations.avgGroupSize || 0, 'People per reservation'],
          ['Total Participants', reservations.totalParticipants || 0, 'Combined attendees across all reservations'],
          ['Previous Period Total', reservations.previousTotal || 0, 'Comparison baseline'],
          [],
          ['SECTION 3: RESERVATIONS BY DAY OF WEEK'],
          ['==============================================='],
          ['Day', 'Count', 'Percentage', 'Peak Status'],
          ['Monday', reservations.byDayOfWeek?.mon || 0,
           `${Math.round(((reservations.byDayOfWeek?.mon || 0) / totalDays) * 100)}%`,
           reservations.byDayOfWeek?.mon === peakDay[1] ? '★ Peak Day' : ''],
          ['Tuesday', reservations.byDayOfWeek?.tue || 0,
           `${Math.round(((reservations.byDayOfWeek?.tue || 0) / totalDays) * 100)}%`,
           reservations.byDayOfWeek?.tue === peakDay[1] ? '★ Peak Day' : ''],
          ['Wednesday', reservations.byDayOfWeek?.wed || 0,
           `${Math.round(((reservations.byDayOfWeek?.wed || 0) / totalDays) * 100)}%`,
           reservations.byDayOfWeek?.wed === peakDay[1] ? '★ Peak Day' : ''],
          ['Thursday', reservations.byDayOfWeek?.thu || 0,
           `${Math.round(((reservations.byDayOfWeek?.thu || 0) / totalDays) * 100)}%`,
           reservations.byDayOfWeek?.thu === peakDay[1] ? '★ Peak Day' : ''],
          ['Friday', reservations.byDayOfWeek?.fri || 0,
           `${Math.round(((reservations.byDayOfWeek?.fri || 0) / totalDays) * 100)}%`,
           reservations.byDayOfWeek?.fri === peakDay[1] ? '★ Peak Day' : ''],
          ['Saturday', reservations.byDayOfWeek?.sat || 0,
           `${Math.round(((reservations.byDayOfWeek?.sat || 0) / totalDays) * 100)}%`,
           reservations.byDayOfWeek?.sat === peakDay[1] ? '★ Peak Day' : ''],
          ['Sunday', reservations.byDayOfWeek?.sun || 0,
           `${Math.round(((reservations.byDayOfWeek?.sun || 0) / totalDays) * 100)}%`,
           reservations.byDayOfWeek?.sun === peakDay[1] ? '★ Peak Day' : ''],
          [],
          peakDay[0] ? ['Peak Day:', dayNames[peakDay[0]] || peakDay[0], 'with', peakDay[1], 'reservations - Busiest day of the week'] : [],
          [],
          ['SECTION 4: FLOOR DISTRIBUTION'],
          ['==============================================='],
          ['Floor', 'Reservations', 'Percentage', 'Ranking'],
          ...(reservations.floorDistribution || []).map((floor, idx) => [
            floor.name,
            floor.value,
            `${Math.round((floor.value / total) * 100)}%`,
            idx === 0 ? 'Most Active' : idx === (reservations.floorDistribution?.length || 1) - 1 ? 'Least Active' : `#${idx + 1}`
          ]),
          [],
          ['SECTION 5: DEPARTMENT STATISTICS'],
          ['==============================================='],
          ['Department', 'Reservations', 'Percentage', 'Activity Level'],
          ...(reservations.userDepartmentStats || []).map((dept, idx) => {
            const percentage = Math.round((dept.count / total) * 100);
            let activityLevel = 'Low';
            if (percentage > 30) activityLevel = 'High';
            else if (percentage > 15) activityLevel = 'Medium';
            return [
              dept.name,
              dept.count,
              `${percentage}%`,
              activityLevel
            ];
          }),
          [],
          ['SECTION 6: TOP RESERVERS'],
          ['==============================================='],
          ['Rank', 'Name', 'Department', 'Reservations', 'Percentage', 'Contribution'],
          ...(reservations.topReservers || []).map((user, index) => [
            `#${index + 1}`,
            user.name,
            user.department || 'N/A',
            user.count,
            `${Math.round((user.count / total) * 100)}%`,
            index === 0 ? 'Top Contributor' : index === 1 ? 'Major Contributor' : 'Contributor'
          ]),
          [],
          ['SECTION 7: POPULAR ROOMS'],
          ['==============================================='],
          ['Rank', 'Room Name', 'Total Bookings', 'Approved', 'Completed', 'Utilization', 'Performance'],
          ...(reservations.popularRooms || []).map((room, index) => {
            let performance = 'Average';
            if (room.utilization > 80) performance = '🌟 Excellent';
            else if (room.utilization > 60) performance = '✓ Good';
            else if (room.utilization > 40) performance = '∼ Average';
            else performance = '⚠ Low';
            return [
              `#${index + 1}`,
              room.name,
              room.bookings,
              room.approved || 0,
              room.completed || 0,
              `${room.utilization}%`,
              performance
            ];
          }),
          [],
          ['SECTION 8: ROOM DETAILS'],
          ['==============================================='],
          ['Room Name', 'Total', 'Approved', 'Pending', 'Completed', 'Cancelled', 'Success Rate', 'Note'],
          ...(reservations.byRoom || []).slice(0, 15).map((room) => {
            const successRate = room.count > 0 ? Math.round((room.completed || 0) / room.count * 100) : 0;
            let note = 'Normal operation';
            if (successRate > 80) note = '✓ High performing';
            else if (successRate < 40) note = '⚠ Low completion rate';
            else if ((room.pending || 0) > 10) note = '⚠ High pending';
            return [
              room.name,
              room.count,
              room.approved || 0,
              room.pending || 0,
              room.completed || 0,
              room.cancelled || 0,
              `${successRate}%`,
              note
            ];
          }),
          [],
          ['SECTION 9: GROWTH TRENDS'],
          ['==============================================='],
          ['Period', 'Reservations', 'Change', 'Change %', 'Trend'],
          ...(reservations.growth?.labels || []).map((label, idx) => {
            const value = reservations.growth?.values?.[idx] || 0;
            const prevValue = idx > 0 ? reservations.growth?.values?.[idx - 1] : value;
            const change = value - prevValue;
            const changePercent = prevValue > 0 ? Math.round((change / prevValue) * 100) : 0;
            const trend = change > 0 ? '↑ Growing' : change < 0 ? '↓ Declining' : '→ Stable';
            return [
              label,
              value,
              change > 0 ? `+${change}` : change,
              changePercent > 0 ? `+${changePercent}%` : `${changePercent}%`,
              trend
            ];
          }),
          [],
          ['SECTION 10: RESERVATION INSIGHTS'],
          ['==============================================='],
          ['Insight', 'Finding', 'Recommendation'],
          ['Peak Day',
           `${dayNames[peakDay[0]] || peakDay[0]} is busiest with ${peakDay[1]} reservations`,
           'Allocate additional resources on this day'],
          ['Completion Rate',
           `${Math.round((reservations.completed / total) * 100)}% of reservations completed`,
           Math.round((reservations.completed / total) * 100) < 70 
             ? 'Investigate barriers to completion' 
             : 'Good completion rate'],
          ['Cancellation Rate',
           `${Math.round((reservations.cancelled / total) * 100)}% cancellation rate`,
           Math.round((reservations.cancelled / total) * 100) > 10 
             ? 'Review cancellation policies' 
             : 'Acceptable cancellation rate'],
          ['Top Department',
           reservations.userDepartmentStats?.[0] 
             ? `${reservations.userDepartmentStats[0].name} leads with ${reservations.userDepartmentStats[0].count} reservations`
             : 'No department data',
           'Engage with top department for best practices'],
          ['Growth Trend',
           reservations.trends?.total?.direction === 'up' 
             ? `Growing at ${reservations.trends.total.percentage}%` 
             : 'Declining or stable',
           reservations.trends?.total?.direction === 'up' 
             ? 'Continue current strategies' 
             : 'Review booking process']
        ];
        addSheet(reservationsData, 'Reservations');
      }

      // ==================== ROOM ANALYTICS SHEET ====================
      if (selectedSections.rooms) {
        const rooms = analyticsData.rooms || {};
        const totalRooms = rooms.total || 1;
        
        const roomsData = [
          ['==============================================='],
          ['ROOM ANALYTICS REPORT'],
          ['==============================================='],
          [],
          ['SECTION 1: KEY METRICS'],
          ['==============================================='],
          ['Metric', 'Value', 'Change %', 'Trend', 'Status'],
          ['Total Rooms', rooms.total || 0,
           `${rooms.trends?.total?.percentage || 0}%`,
           rooms.trends?.total?.direction === 'up' ? '↑ Increasing' : '→ Stable',
           `${rooms.available} available, ${rooms.occupied} occupied`],
          ['Available', rooms.available || 0,
           `${rooms.trends?.available?.percentage || 0}%`,
           rooms.trends?.available?.direction === 'up' ? '↑ Increasing' : '↓ Decreasing',
           'Ready for booking'],
          ['Occupied', rooms.occupied || 0,
           `${rooms.trends?.occupied?.percentage || 0}%`,
           rooms.trends?.occupied?.direction === 'up' ? '↑ Increasing' : '↓ Decreasing',
           'Currently in use'],
          ['Maintenance', rooms.maintenance || 0, 'N/A', 'N/A', 'Under maintenance'],
          ['Utilization Rate', `${rooms.utilization || 0}%`,
           `${rooms.trends?.utilization?.percentage || 0}%`,
           rooms.trends?.utilization?.direction === 'up' ? '↑ Improving' : '↓ Declining',
           rooms.utilization > 60 ? 'Optimal' : 'Underutilized'],
          [],
          ['SECTION 2: ROOMS BY TYPE'],
          ['==============================================='],
          ['Type', 'Count', 'Percentage', 'Description'],
          ['Lecture Halls', rooms.byType?.lecture || 0,
           `${Math.round(((rooms.byType?.lecture || 0) / totalRooms) * 100)}%`,
           'For classes and presentations'],
          ['Laboratories', rooms.byType?.laboratory || 0,
           `${Math.round(((rooms.byType?.laboratory || 0) / totalRooms) * 100)}%`,
           'For experiments and practical work'],
          ['Conference Rooms', rooms.byType?.conference || 0,
           `${Math.round(((rooms.byType?.conference || 0) / totalRooms) * 100)}%`,
           'For meetings and discussions'],
          ['Offices', rooms.byType?.office || 0,
           `${Math.round(((rooms.byType?.office || 0) / totalRooms) * 100)}%`,
           'For administrative use'],
          [],
          ['SECTION 3: ROOMS BY FLOOR'],
          ['==============================================='],
          ['Floor', 'Count', 'Percentage', 'Most Active Room'],
          ...Object.entries(rooms.byFloor || {}).map(([floor, count], idx) => {
            const roomsOnFloor = rooms.roomDetails?.filter(r => r.floor === floor) || [];
            const topRoom = roomsOnFloor.length > 0 
              ? roomsOnFloor.reduce((max, r) => r.bookings > max.bookings ? r : max, roomsOnFloor[0])
              : null;
            return [
              floor,
              count,
              `${Math.round((count / totalRooms) * 100)}%`,
              topRoom ? `${topRoom.name} (${topRoom.bookings} bookings)` : 'N/A'
            ];
          }),
          [],
          ['SECTION 4: ROOM FEATURES'],
          ['==============================================='],
          ['Feature', 'Rooms with Feature', 'Coverage', 'Popularity'],
          ['WiFi', rooms.featureStats?.wifi || 0,
           `${Math.round(((rooms.featureStats?.wifi || 0) / totalRooms) * 100)}%`,
           'Essential'],
          ['Air Conditioning', rooms.featureStats?.aircon || 0,
           `${Math.round(((rooms.featureStats?.aircon || 0) / totalRooms) * 100)}%`,
           'High Demand'],
          ['Projector', rooms.featureStats?.projector || 0,
           `${Math.round(((rooms.featureStats?.projector || 0) / totalRooms) * 100)}%`,
           'Very Popular'],
          ['Monitor', rooms.featureStats?.monitor || 0,
           `${Math.round(((rooms.featureStats?.monitor || 0) / totalRooms) * 100)}%`,
           'Useful for collaboration'],
          [],
          ['SECTION 5: HOURLY UTILIZATION'],
          ['==============================================='],
          ['Time Slot', 'Utilization', 'Bookings', 'Peak Status'],
          ...(rooms.hourlyUtilization || []).map(hour => [
            hour.hour,
            `${hour.utilization}%`,
            hour.bookings || 0,
            hour.utilization > 70 ? '★ Peak' : hour.utilization > 50 ? '∼ Moderate' : '○ Off-Peak'
          ]),
          [],
          ['SECTION 6: TOP PERFORMING ROOMS'],
          ['==============================================='],
          ['Rank', 'Room', 'Type', 'Floor', 'Capacity', 'Bookings', 'Utilization', 'Rating'],
          ...(rooms.topRooms || []).map((room, index) => {
            let rating = '★';
            if (room.utilization > 80) rating = '★★★';
            else if (room.utilization > 60) rating = '★★';
            else if (room.utilization > 40) rating = '★';
            else rating = '☆';
            return [
              `#${index + 1}`,
              room.name,
              room.type,
              room.floor || 'N/A',
              room.capacity || 0,
              room.bookings,
              `${room.utilization}%`,
              rating
            ];
          }),
          [],
          ['SECTION 7: ROOM DETAILS'],
          ['==============================================='],
          ['Room', 'Type', 'Floor', 'Capacity', 'Bookings', 'Utilization', 'Status', 'Features'],
          ...(rooms.roomDetails || []).map(room => {
            const features = [];
            if (room.features?.wifi) features.push('WiFi');
            if (room.features?.aircon) features.push('AC');
            if (room.features?.projector) features.push('Projector');
            if (room.features?.monitor) features.push('Monitor');
            return [
              room.name,
              room.type,
              room.floor || 'N/A',
              room.capacity || 0,
              room.bookings,
              `${room.utilization}%`,
              room.status || 'N/A',
              features.join(', ') || 'None'
            ];
          }),
          [],
          ['SECTION 8: MAINTENANCE HISTORY'],
          ['==============================================='],
          ['Room', 'Date', 'Type', 'Status'],
          ...(rooms.maintenanceHistory || []).map(item => [
            item.room,
            item.date,
            item.type,
            item.status
          ]),
          [],
          ['SECTION 9: BOOKING TRENDS'],
          ['==============================================='],
          ['Month', 'Bookings', 'Change', 'Trend'],
          ...(rooms.bookingTrends || []).map((item, idx) => {
            const prevBookings = idx > 0 ? rooms.bookingTrends?.[idx - 1]?.bookings : item.bookings;
            const change = item.bookings - prevBookings;
            const trend = change > 0 ? '↑ Growing' : change < 0 ? '↓ Declining' : '→ Stable';
            return [
              item.month,
              item.bookings,
              change > 0 ? `+${change}` : change,
              trend
            ];
          }),
          [],
          ['SECTION 10: TOP USERS'],
          ['==============================================='],
          ['Name', 'Department', 'Bookings', 'Preferred Room'],
          ...(rooms.topUsers || []).map(user => [
            user.name,
            user.department || 'N/A',
            user.bookings,
            user.room || 'N/A'
          ]),
          [],
          ['SECTION 11: ROOM INSIGHTS'],
          ['==============================================='],
          ['Insight', 'Finding', 'Recommendation'],
          ['Peak Usage',
           `Highest utilization at ${rooms.peakHours?.[0]?.hour || 'N/A'} (${rooms.peakHours?.[0]?.utilization || 0}%)`,
           'Schedule maintenance during off-peak hours'],
          ['Underutilized Rooms',
           `Rooms with <40% utilization: ${rooms.roomDetails?.filter(r => r.utilization < 40).length || 0}`,
           'Promote these rooms for booking'],
          ['Feature Coverage',
           `WiFi: ${rooms.featureStats?.wifi || 0} rooms, Projector: ${rooms.featureStats?.projector || 0} rooms`,
           'Consider adding more projectors to high-demand rooms'],
          ['Maintenance Impact',
           `${rooms.maintenance || 0} rooms under maintenance`,
           rooms.maintenance > 2 ? 'Review maintenance schedule' : 'Normal maintenance levels']
        ];
        addSheet(roomsData, 'Rooms');
      }

      // ==================== ENGAGEMENT ANALYTICS SHEET ====================
      if (selectedSections.engagement) {
        const engagement = analyticsData.engagement || {};
        const totalActivityUsers = (engagement.userActivity?.high || 0) + 
                                   (engagement.userActivity?.medium || 0) + 
                                   (engagement.userActivity?.low || 0) + 
                                   (engagement.userActivity?.inactive || 1);
        
        const engagementData = [
          ['==============================================='],
          ['ENGAGEMENT ANALYTICS REPORT'],
          ['==============================================='],
          [],
          ['SECTION 1: KEY METRICS'],
          ['==============================================='],
          ['Metric', 'Value', 'Change %', 'Trend', 'Description'],
          ['Daily Active Users', engagement.dailyActive || 0,
           `${engagement.trends?.daily?.percentage || 0}%`,
           engagement.trends?.daily?.direction === 'up' ? '↑ Increasing' : '↓ Decreasing',
           'Users active in last 24h'],
          ['Weekly Active Users', engagement.weeklyActive || 0,
           `${engagement.trends?.weekly?.percentage || 0}%`,
           engagement.trends?.weekly?.direction === 'up' ? '↑ Increasing' : '↓ Decreasing',
           'Users active in last 7 days'],
          ['Monthly Active Users', engagement.monthlyActive || 0,
           `${engagement.trends?.monthly?.percentage || 0}%`,
           engagement.trends?.monthly?.direction === 'up' ? '↑ Increasing' : '↓ Decreasing',
           'Users active in last 30 days'],
          ['Avg Session Duration', `${engagement.averageSession || 0} minutes`, 'N/A', 'N/A', 'Time spent per session'],
          ['Retention Rate', `${engagement.retention || 0}%`, 'N/A',
           (engagement.retention || 0) > 70 ? '↑ Good' : '↓ Needs Improvement',
           'Users returning after first visit'],
          ['Bounce Rate', `${engagement.bounceRate || 0}%`, 'N/A',
           (engagement.bounceRate || 0) < 30 ? '✓ Good' : '⚠ High',
           'Single-action sessions'],
          [],
          ['SECTION 2: ENGAGEMENT METRICS'],
          ['==============================================='],
          ['Metric', 'Value', 'Description'],
          ['Page Views', engagement.engagementMetrics?.pageViews || 0, 'Total page views'],
          ['Total Actions', engagement.engagementMetrics?.actions || 0, 'All user actions'],
          ['Avg Actions/User', engagement.engagementMetrics?.avgActionsPerUser || 0, 'Average per active user'],
          ['Returning Users', `${engagement.engagementMetrics?.returningUsers || 0}%`, 'Percentage of returning users'],
          ['Total Sessions', engagement.engagementMetrics?.totalSessions || 0, 'Total user sessions'],
          [],
          ['SECTION 3: USER ACTIVITY LEVELS'],
          ['==============================================='],
          ['Level', 'Users', 'Percentage', 'Definition', 'Status'],
          ['High Activity', engagement.userActivity?.high || 0,
           `${Math.round(((engagement.userActivity?.high || 0) / totalActivityUsers) * 100)}%`,
           '10+ actions per day',
           engagement.userActivity?.high > 100 ? '🌟 Power Users' : 'Moderate'],
          ['Medium Activity', engagement.userActivity?.medium || 0,
           `${Math.round(((engagement.userActivity?.medium || 0) / totalActivityUsers) * 100)}%`,
           '5-9 actions per day',
           'Regular Users'],
          ['Low Activity', engagement.userActivity?.low || 0,
           `${Math.round(((engagement.userActivity?.low || 0) / totalActivityUsers) * 100)}%`,
           '1-4 actions per day',
           'Casual Users'],
          ['Inactive', engagement.userActivity?.inactive || 0,
           `${Math.round(((engagement.userActivity?.inactive || 0) / totalActivityUsers) * 100)}%`,
           'No actions in period',
           engagement.userActivity?.inactive > 200 ? '⚠ Re-engagement Needed' : 'Normal'],
          [],
          ['SECTION 4: ACTIVITY BREAKDOWN'],
          ['==============================================='],
          ['Action Type', 'Count', 'Percentage', 'Popularity'],
          ...(engagement.activityBreakdown || []).map(item => [
            item.name,
            item.value,
            `${Math.round((item.value / (engagement.engagementMetrics?.actions || 1)) * 100)}%`,
            item.value > 5000 ? '🔥 Very Popular' : item.value > 2000 ? '✓ Popular' : '○ Normal'
          ]),
          [],
          ['SECTION 5: DEVICE BREAKDOWN'],
          ['==============================================='],
          ['Device', 'Percentage', 'Users', 'Trend'],
          ...(engagement.deviceBreakdown || []).map(device => [
            device.name,
            `${device.value}%`,
            Math.round((device.value / 100) * (engagement.weeklyActive || 1000)),
            device.name === 'Mobile' ? '↑ Growing' : device.name === 'Desktop' ? '→ Stable' : '∼ Stable'
          ]),
          [],
          ['SECTION 6: PEAK HOURS'],
          ['==============================================='],
          ['Hour', 'Activity Level', 'Relative Usage', 'Recommendation'],
          ...(engagement.peakHours || []).map(hour => {
            const maxActivity = Math.max(...(engagement.peakHours || []).map(h => h.activity));
            const relativeUsage = maxActivity > 0 ? Math.round((hour.activity / maxActivity) * 100) : 0;
            let recommendation = 'Normal';
            if (relativeUsage > 80) recommendation = 'Peak time - ensure system stability';
            else if (relativeUsage < 20) recommendation = 'Off-peak - good for maintenance';
            return [
              hour.hour,
              hour.activity,
              `${relativeUsage}%`,
              recommendation
            ];
          }),
          [],
          ['SECTION 7: TOP FEATURES'],
          ['==============================================='],
          ['Feature', 'Usage Count', 'Trend', 'Status', 'Action'],
          ...(engagement.topFeatures || []).map(feature => [
            feature.name,
            feature.count,
            `${feature.trend > 0 ? '+' : ''}${feature.trend}%`,
            feature.trend > 0 ? '📈 Growing' : feature.trend < 0 ? '📉 Declining' : '→ Stable',
            feature.trend > 0 ? 'Promote further' : feature.trend < 0 ? 'Investigate decline' : 'Maintain'
          ]),
          [],
          ['SECTION 8: DAILY ACTIVE USERS'],
          ['==============================================='],
          ['Day', 'Active Users', 'Comparison to Avg', 'Status'],
          ...(engagement.byDay || []).map(day => {
            const avg = engagement.byDay.reduce((sum, d) => sum + d.active, 0) / (engagement.byDay.length || 1);
            const comparison = day.active > avg ? `+${Math.round((day.active / avg - 1) * 100)}%` : `-${Math.round((1 - day.active / avg) * 100)}%`;
            return [
              day.day,
              day.active,
              comparison,
              day.active > avg ? 'Above Average' : 'Below Average'
            ];
          }),
          [],
          ['SECTION 9: ENGAGEMENT TRENDS'],
          ['==============================================='],
          ['Month', 'Active Users', 'New Users', 'Growth Rate', 'Status'],
          ...(engagement.userEngagementTrends || []).slice(-6).map(trend => {
            const prevActive = engagement.userEngagementTrends?.[engagement.userEngagementTrends.indexOf(trend) - 1]?.active || trend.active;
            const growth = trend.active - prevActive;
            const growthRate = prevActive > 0 ? Math.round((growth / prevActive) * 100) : 0;
            return [
              trend.month,
              trend.active,
              trend.new,
              `${growthRate > 0 ? '+' : ''}${growthRate}%`,
              growth > 0 ? '📈 Growing' : growth < 0 ? '📉 Declining' : '→ Stable'
            ];
          }),
          [],
          ['SECTION 10: ENGAGEMENT INSIGHTS'],
          ['==============================================='],
          ['Insight', 'Finding', 'Recommendation'],
          ['Peak Engagement',
           `Peak at ${engagement.peakHours?.reduce((max, h) => h.activity > max.activity ? h : max, { activity: 0 })?.hour || 'N/A'}`,
           'Schedule important updates during peak hours'],
          ['Mobile Usage',
           `${engagement.deviceBreakdown?.find(d => d.name === 'Mobile')?.value || 0}% mobile users`,
           'Ensure mobile experience is optimized'],
          ['Feature Adoption',
           `Top feature: ${engagement.topFeatures?.[0]?.name || 'N/A'} (${engagement.topFeatures?.[0]?.count || 0} uses)`,
           engagement.topFeatures?.[0]?.trend < 0 ? 'Investigate declining usage' : 'Continue promoting'],
          ['User Retention',
           `${engagement.retention || 0}% retention rate`,
           engagement.retention < 70 ? 'Improve onboarding' : 'Good retention'],
          ['Activity Distribution',
           `High activity: ${Math.round(((engagement.userActivity?.high || 0) / totalActivityUsers) * 100)}% of users`,
           'Encourage medium/low users to increase engagement']
        ];
        addSheet(engagementData, 'Engagement');
      }

      // Save the file
      const fileName = `Analytics_Report_${getRangeDescription().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
    } catch (error) {
      console.error("Error generating Excel:", error);
      alert("Failed to generate Excel file. Please try again.");
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
    generateExcel();
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
              <span>Excel</span>
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
              <h3 className="text-lg font-semibold text-gray-800">Download Excel Report</h3>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
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
                Download Excel
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