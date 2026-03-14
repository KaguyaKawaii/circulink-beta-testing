// AnalyticsOverview.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users,
  CalendarCheck,
  DoorOpen,
  Activity,
  Download,
  RefreshCw,
  BarChart,
  Calendar,
  X,
  Target
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
    totalUsers: 0,
    totalReservations: 0,
    totalRooms: 0,
    activeToday: 0,
    pendingReservations: 0,
    completedReservations: 0,
    roomUtilization: 0,
    avgSessionDuration: 0,
    
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
      const [usersRes, reservationsRes, roomsRes, engagementRes] = await Promise.allSettled([
        api.get(`/analytics/users?range=${dateRange}${getCustomDateParams()}`),
        api.get(`/analytics/reservations/detailed?range=${dateRange}${getCustomDateParams()}`),
        api.get(`/analytics/rooms/detailed?range=${dateRange}${getCustomDateParams()}`),
        api.get(`/analytics/engagement?range=${dateRange}${getCustomDateParams()}`)
      ]);

      let usersData = { total: 0, active: 0, new: 0, deleted: 0, byRole: {}, byStatus: {}, byDepartment: [], growth: { labels: [], values: [] }, trends: {}, topUsers: [], registrationStats: {}, activityStats: {} };
      if (usersRes.status === 'fulfilled' && usersRes.value.data?.success) {
        usersData = usersRes.value.data.data;
      }

      let reservationsData = { 
        total: 0, pending: 0, approved: 0, rejected: 0, completed: 0, cancelled: 0, expired: 0, ongoing: 0, 
        byRoom: [], byDayOfWeek: {}, popularRooms: [], trends: {}, growth: { labels: [], values: [] }, 
        floorDistribution: [], avgGroupSize: 0, totalParticipants: 0, previousTotal: 0, 
        userDepartmentStats: [], topReservers: [] 
      };
      if (reservationsRes.status === 'fulfilled' && reservationsRes.value.data?.success) {
        reservationsData = reservationsRes.value.data.data;
      }

      let roomsData = { 
        total: 0, available: 0, occupied: 0, maintenance: 0, utilization: 0, byType: {}, 
        roomDetails: [], hourlyUtilization: [], topRooms: [], byFloor: {}, byCapacity: {}, 
        trends: {}, featureStats: {}, peakHours: [], bookingTrends: [], maintenanceHistory: [], topUsers: [] 
      };
      if (roomsRes.status === 'fulfilled' && roomsRes.value.data?.success) {
        roomsData = roomsRes.value.data.data;
      }

      let engagementData = { 
        dailyActive: 0, weeklyActive: 0, monthlyActive: 0, averageSession: 0, retention: 0, bounceRate: 0, 
        byDay: [], userActivity: {}, engagementMetrics: {}, activityBreakdown: [], peakHours: [], 
        deviceBreakdown: [], userEngagementTrends: [], topFeatures: [], trends: {} 
      };
      if (engagementRes.status === 'fulfilled' && engagementRes.value.data?.success) {
        engagementData = engagementRes.value.data.data;
      }

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

  const generateExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      const addSheet = (data, sheetName) => {
        const ws = XLSX.utils.aoa_to_sheet(data);
        
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
           (analyticsData.avgSessionDuration || 0) > 20 ? 'Engaged Users' : 'Short Sessions']
        ];
        addSheet(overviewData, 'Overview');
      }

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
           users.trends?.monthly?.direction === 'up' ? 'Increasing' : 'Decreasing',
           'All registered users (non-archived)'],
          ['Active Users (7 days)', users.active || 0,
           `${users.trends?.weekly?.percentage || 0}%`,
           users.trends?.weekly?.direction === 'up' ? 'Increasing' : 'Decreasing',
           'Users with activity in last 7 days'],
          ['New Users', users.new || 0,
           `${users.trends?.daily?.percentage || 0}%`,
           users.trends?.daily?.direction === 'up' ? 'Increasing' : 'Decreasing',
           'Users registered in selected period'],
          ['Retention Rate', `${users.activityStats?.retentionRate || 0}%`, 'N/A', 
           (users.activityStats?.retentionRate || 0) > 70 ? 'Good' : 'Needs Improvement',
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
           (users.byRole?.staff || 0) > totalUsers * 0.1 ? 'Significant' : 'Moderate']
        ];
        addSheet(usersData, 'Users');
      }

      if (selectedSections.reservations) {
        const reservations = analyticsData.reservations || {};
        const total = reservations.total || 1;
        
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
           reservations.trends?.total?.direction === 'up' ? 'Increasing' : 'Decreasing',
           reservations.trends?.total?.percentage > 0 ? 'Positive Growth' : 'Needs Attention'],
          ['Completed', reservations.completed || 0,
           `${reservations.trends?.completed?.percentage || 0}%`,
           reservations.trends?.completed?.direction === 'up' ? 'Increasing' : 'Decreasing',
           `Success Rate: ${Math.round((reservations.completed / total) * 100)}%`],
          ['Pending', reservations.pending || 0,
           `${reservations.trends?.pending?.percentage || 0}%`,
           reservations.trends?.pending?.direction === 'up' ? 'Increasing' : 'Decreasing',
           reservations.pending > 50 ? 'High Backlog' : 'Normal'],
          ['Cancelled', reservations.cancelled || 0,
           `${reservations.trends?.cancelled?.percentage || 0}%`,
           reservations.trends?.cancelled?.direction === 'up' ? 'Increasing' : 'Decreasing',
           `Cancellation Rate: ${Math.round((reservations.cancelled / total) * 100)}%`],
          [],
          ['SECTION 2: PARTICIPANT STATISTICS'],
          ['==============================================='],
          ['Metric', 'Value', 'Description'],
          ['Average Group Size', reservations.avgGroupSize || 0, 'People per reservation'],
          ['Total Participants', reservations.totalParticipants || 0, 'Combined attendees across all reservations']
        ];
        addSheet(reservationsData, 'Reservations');
      }

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
           rooms.trends?.total?.direction === 'up' ? 'Increasing' : 'Stable',
           `${rooms.available} available, ${rooms.occupied} occupied`],
          ['Available', rooms.available || 0,
           `${rooms.trends?.available?.percentage || 0}%`,
           rooms.trends?.available?.direction === 'up' ? 'Increasing' : 'Decreasing',
           'Ready for booking'],
          ['Occupied', rooms.occupied || 0,
           `${rooms.trends?.occupied?.percentage || 0}%`,
           rooms.trends?.occupied?.direction === 'up' ? 'Increasing' : 'Decreasing',
           'Currently in use'],
          ['Maintenance', rooms.maintenance || 0, 'N/A', 'N/A', 'Under maintenance'],
          ['Utilization Rate', `${rooms.utilization || 0}%`,
           `${rooms.trends?.utilization?.percentage || 0}%`,
           rooms.trends?.utilization?.direction === 'up' ? 'Improving' : 'Declining',
           rooms.utilization > 60 ? 'Optimal' : 'Underutilized']
        ];
        addSheet(roomsData, 'Rooms');
      }

      if (selectedSections.engagement) {
        const engagement = analyticsData.engagement || {};
        
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
           engagement.trends?.daily?.direction === 'up' ? 'Increasing' : 'Decreasing',
           'Users active in last 24h'],
          ['Weekly Active Users', engagement.weeklyActive || 0,
           `${engagement.trends?.weekly?.percentage || 0}%`,
           engagement.trends?.weekly?.direction === 'up' ? 'Increasing' : 'Decreasing',
           'Users active in last 7 days'],
          ['Monthly Active Users', engagement.monthlyActive || 0,
           `${engagement.trends?.monthly?.percentage || 0}%`,
           engagement.trends?.monthly?.direction === 'up' ? 'Increasing' : 'Decreasing',
           'Users active in last 30 days'],
          ['Avg Session Duration', `${engagement.averageSession || 0} minutes`, 'N/A', 'N/A', 'Time spent per session'],
          ['Retention Rate', `${engagement.retention || 0}%`, 'N/A',
           (engagement.retention || 0) > 70 ? 'Good' : 'Needs Improvement',
           'Users returning after first visit']
        ];
        addSheet(engagementData, 'Engagement');
      }

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
      <div className="w-full">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 truncate pr-2" title={label}>{label}</span>
          {showValue && <span className="text-gray-800 font-medium whitespace-nowrap">{value.toLocaleString()}</span>}
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

  if (loading) {
    return (
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
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

        <div className="p-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
            <div className="flex flex-wrap gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
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
            
            <button
              onClick={() => setShowDownloadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
              title="Download Report"
            >
              <Download size={18} />
              <span>Excel</span>
            </button>

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

      <div className="p-6">
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

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <SectionHeader title="User Analytics" icon={Users} color="blue" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <SectionHeader title="Reservation Analytics" icon={CalendarCheck} color="green" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Most Popular Rooms</h3>
              <div className="space-y-3">
                {(analyticsData.reservations?.popularRooms || []).slice(0, 3).map((room, idx) => (
                  <div key={idx} className="w-full">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 truncate pr-2 max-w-[70%]" title={room.name}>
                        {room.name}
                      </span>
                      <span className="text-gray-800 font-medium whitespace-nowrap">
                        {room.bookings.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`${idx === 0 ? "bg-blue-500" : idx === 1 ? "bg-green-500" : "bg-purple-500"} rounded-full h-2 transition-all duration-300`}
                        style={{ width: `${Math.min(100, Math.round((room.bookings / (analyticsData.reservations?.total || 1)) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <SectionHeader title="Room Analytics" icon={DoorOpen} color="purple" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <SectionHeader title="Engagement Metrics" icon={Activity} color="orange" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
        </div>

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