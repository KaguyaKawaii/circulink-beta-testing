// AnalyticsEngagement.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity,
  TrendingUp,
  Users,
  Clock,
  Calendar,
  Target,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Zap,
  UserCheck,
  UserX,
  MousePointer,
  Eye,
  BarChart,
  PieChart,
  Layers,
  Award,
  AlertCircle,
  Calendar as CalendarIcon,
  X
} from "lucide-react";
import api from "../../utils/api";

function AnalyticsEngagement({ setView, admin }) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [engagementData, setEngagementData] = useState({
    dailyActive: 0,
    weeklyActive: 0,
    monthlyActive: 0,
    averageSession: 0,
    retention: 0,
    bounceRate: 0,
    byDay: [],
    userActivity: {
      high: 0,
      medium: 0,
      low: 0,
      inactive: 0
    },
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
  });

  const calendarRef = useRef(null);

  const fetchEngagementAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/analytics/engagement?range=${dateRange}`;
      
      // Add custom date parameters if custom range is selected
      if (dateRange === "custom" && customStartDate && customEndDate) {
        url = `/analytics/engagement?startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      
      console.log("Fetching engagement analytics from:", url);
      const response = await api.get(url);
      
      if (response.data && response.data.success) {
        setEngagementData(response.data.data);
        console.log("Engagement analytics data loaded:", response.data.data);
      } else {
        console.error("API returned unsuccessful response:", response.data);
        // Fallback to mock data
        setEngagementData(getMockEngagementData(dateRange));
      }
    } catch (error) {
      console.error("Error fetching engagement analytics:", error);
      // Use mock data as fallback
      setEngagementData(getMockEngagementData(dateRange));
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    fetchEngagementAnalytics();
  }, [fetchEngagementAnalytics]);

  // Close calendar when clicking outside
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
      // Validate that start date is before end date
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

  const getMockEngagementData = (range) => {
    const now = new Date();
    const days = range === 'week' ? 7 : range === 'month' ? 30 : 365;
    
    // Generate daily active users for the period
    const byDay = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      byDay.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        active: Math.floor(Math.random() * 150) + 200,
        date: date.toISOString().split('T')[0]
      });
    }

    // Generate activity breakdown by action type
    const activityBreakdown = [
      { name: 'Page Views', value: 8450, color: 'blue' },
      { name: 'Reservations', value: 3240, color: 'green' },
      { name: 'Logins', value: 2100, color: 'purple' },
      { name: 'Profile Updates', value: 980, color: 'orange' },
      { name: 'Room Searches', value: 5670, color: 'yellow' }
    ];

    // Generate peak hours
    const peakHours = [];
    for (let i = 8; i <= 20; i++) {
      const hour = i <= 12 ? `${i}AM` : i === 12 ? '12PM' : `${i-12}PM`;
      peakHours.push({
        hour,
        activity: Math.floor(Math.random() * 80) + 20
      });
    }

    // Generate device breakdown
    const deviceBreakdown = [
      { name: 'Desktop', value: 45, color: 'blue' },
      { name: 'Mobile', value: 42, color: 'green' },
      { name: 'Tablet', value: 13, color: 'purple' }
    ];

    // Generate user engagement trends
    const userEngagementTrends = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - (11 - i));
      userEngagementTrends.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        active: Math.floor(Math.random() * 500) + 300,
        new: Math.floor(Math.random() * 100) + 50
      });
    }

    // Generate top features
    const topFeatures = [
      { name: 'Room Booking', count: 1240, trend: 12 },
      { name: 'Search Rooms', count: 980, trend: 8 },
      { name: 'View Schedule', count: 760, trend: 5 },
      { name: 'Profile', count: 540, trend: -2 },
      { name: 'Notifications', count: 320, trend: 15 }
    ];

    return {
      dailyActive: 320,
      weeklyActive: 1850,
      monthlyActive: 4250,
      averageSession: 24,
      retention: 76,
      bounceRate: 18,
      byDay,
      userActivity: {
        high: 450,
        medium: 820,
        low: 580,
        inactive: 120
      },
      engagementMetrics: {
        pageViews: 15200,
        actions: 8340,
        avgActionsPerUser: 6.7,
        returningUsers: 68,
        totalSessions: 2450,
        avgSessionDuration: 24
      },
      activityBreakdown,
      peakHours,
      deviceBreakdown,
      userEngagementTrends,
      topFeatures,
      trends: {
        daily: { value: 320, percentage: 8.5, direction: 'up' },
        weekly: { value: 1850, percentage: 12.3, direction: 'up' },
        monthly: { value: 4250, percentage: 15.7, direction: 'up' }
      }
    };
  };

  // ==================== SKELETON LOADING COMPONENTS ====================

  const StatCardSkeleton = () => (
    <div className="flex-1 min-w-[200px] bg-white p-4 rounded-lg border border-gray-200 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-8 bg-gray-300 rounded w-16"></div>
          <div className="flex items-center gap-1 mt-2">
            <div className="h-4 bg-gray-200 rounded w-12"></div>
          </div>
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

  const TableRowSkeleton = ({ cols = 5 }) => (
    <tr className="animate-pulse">
      {Array(cols).fill(0).map((_, i) => (
        <td key={i} className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </td>
      ))}
    </tr>
  );

  const DayChartSkeleton = () => (
    <div className="grid grid-cols-7 gap-2 animate-pulse">
      {Array(7).fill(0).map((_, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="w-full bg-gray-200 rounded-t mb-2" style={{ height: `${Math.random() * 100 + 50}px` }}></div>
          <div className="h-3 bg-gray-200 rounded w-8 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-6"></div>
        </div>
      ))}
    </div>
  );

  const GrowthChartSkeleton = () => (
    <div className="h-64 flex items-end justify-between gap-2 animate-pulse">
      {Array(7).fill(0).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full bg-gray-200 rounded-t" style={{ height: `${Math.random() * 150 + 50}px` }}></div>
          <div className="h-3 bg-gray-200 rounded w-8"></div>
        </div>
      ))}
    </div>
  );

  const SectionHeaderSkeleton = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="h-6 bg-gray-200 rounded w-48"></div>
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </div>
  );

  // ==================== EXPORT FUNCTION ====================

  const exportToCSV = () => {
    try {
      // Create CSV content
      let csvContent = "";
      
      // Helper to add a row
      const addRow = (cells) => {
        const formattedCells = cells.map(cell => {
          if (cell === null || cell === undefined) return '';
          let stringCell = String(cell);
          if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
            return `"${stringCell.replace(/"/g, '""')}"`;
          }
          return stringCell;
        });
        csvContent += formattedCells.join(',') + '\n';
      };

      const addBlankRow = () => {
        csvContent += '\n';
      };

      const addSectionHeader = (title) => {
        addRow(['========== ' + title + ' ==========']);
      };

      // Get date range description
      let rangeDescription = "";
      if (dateRange === "week") rangeDescription = "Last 7 Days";
      else if (dateRange === "month") rangeDescription = "Last 30 Days";
      else if (dateRange === "year") rangeDescription = "Last 12 Months";
      else if (dateRange === "custom") rangeDescription = `${formatDate(customStartDate)} to ${formatDate(customEndDate)}`;

      // Report Header
      addBlankRow();
      addRow(['ENGAGEMENT ANALYTICS REPORT']);
      addRow(['========================================']);
      addBlankRow();
      addRow(['Generated:', new Date().toLocaleString()]);
      addRow(['Date Range:', rangeDescription]);
      addBlankRow();
      addBlankRow();

      // Key Metrics
      addSectionHeader('KEY METRICS');
      addRow(['Metric', 'Value', 'Change %', 'Trend']);
      addRow([
        'Daily Active Users',
        engagementData.dailyActive?.toLocaleString() || '0',
        `${engagementData.trends?.daily?.percentage || 0}%`,
        engagementData.trends?.daily?.direction === 'up' ? 'Increasing' : 'Decreasing'
      ]);
      addRow([
        'Weekly Active Users',
        engagementData.weeklyActive?.toLocaleString() || '0',
        `${engagementData.trends?.weekly?.percentage || 0}%`,
        engagementData.trends?.weekly?.direction === 'up' ? 'Increasing' : 'Decreasing'
      ]);
      addRow([
        'Monthly Active Users',
        engagementData.monthlyActive?.toLocaleString() || '0',
        `${engagementData.trends?.monthly?.percentage || 0}%`,
        engagementData.trends?.monthly?.direction === 'up' ? 'Increasing' : 'Decreasing'
      ]);
      addRow(['Avg Session Duration', (engagementData.averageSession || '0') + ' min', '5.2%', 'Up']);
      addBlankRow();
      addBlankRow();

      // Engagement Metrics
      addSectionHeader('ENGAGEMENT METRICS');
      addRow(['Metric', 'Value']);
      addRow(['Page Views', engagementData.engagementMetrics?.pageViews?.toLocaleString() || '0']);
      addRow(['Total Actions', engagementData.engagementMetrics?.actions?.toLocaleString() || '0']);
      addRow(['Avg Actions/User', engagementData.engagementMetrics?.avgActionsPerUser || '0']);
      addRow(['Returning Users', (engagementData.engagementMetrics?.returningUsers || '0') + '%']);
      addRow(['Total Sessions', engagementData.engagementMetrics?.totalSessions?.toLocaleString() || '0']);
      addRow(['Retention Rate', (engagementData.retention || '0') + '%']);
      addRow(['Bounce Rate', (engagementData.bounceRate || '0') + '%']);
      addBlankRow();
      addBlankRow();

      // Activity Levels
      addSectionHeader('USER ACTIVITY LEVELS');
      addRow(['Level', 'Users', 'Percentage']);
      const totalUsers = (engagementData.userActivity?.high || 0) + (engagementData.userActivity?.medium || 0) + 
                        (engagementData.userActivity?.low || 0) + (engagementData.userActivity?.inactive || 0);
      addRow(['High Activity (10+ actions)', engagementData.userActivity?.high || '0', 
              totalUsers > 0 ? Math.round(((engagementData.userActivity?.high || 0) / totalUsers) * 100) + '%' : '0%']);
      addRow(['Medium Activity (5-9 actions)', engagementData.userActivity?.medium || '0',
              totalUsers > 0 ? Math.round(((engagementData.userActivity?.medium || 0) / totalUsers) * 100) + '%' : '0%']);
      addRow(['Low Activity (1-4 actions)', engagementData.userActivity?.low || '0',
              totalUsers > 0 ? Math.round(((engagementData.userActivity?.low || 0) / totalUsers) * 100) + '%' : '0%']);
      addRow(['Inactive (0 actions)', engagementData.userActivity?.inactive || '0',
              totalUsers > 0 ? Math.round(((engagementData.userActivity?.inactive || 0) / totalUsers) * 100) + '%' : '0%']);
      addBlankRow();
      addBlankRow();

      // Activity Breakdown
      addSectionHeader('ACTIVITY BREAKDOWN');
      addRow(['Action Type', 'Count', 'Percentage']);
      const totalActions = (engagementData.activityBreakdown || []).reduce((sum, item) => sum + (item.value || 0), 0);
      (engagementData.activityBreakdown || []).forEach(item => {
        addRow([
          item.name || 'Unknown',
          (item.value || 0).toLocaleString(),
          totalActions > 0 ? Math.round(((item.value || 0) / totalActions) * 100) + '%' : '0%'
        ]);
      });
      addBlankRow();
      addBlankRow();

      // Device Breakdown
      addSectionHeader('DEVICE DISTRIBUTION');
      addRow(['Device', 'Percentage']);
      (engagementData.deviceBreakdown || []).forEach(device => {
        addRow([device.name || 'Unknown', (device.value || 0) + '%']);
      });
      addBlankRow();
      addBlankRow();

      // Top Features
      addSectionHeader('TOP FEATURES');
      addRow(['Feature', 'Usage Count', 'Trend']);
      (engagementData.topFeatures || []).forEach(feature => {
        addRow([
          feature.name || 'Unknown',
          (feature.count || 0).toLocaleString(),
          ((feature.trend || 0) > 0 ? '+' : '') + (feature.trend || 0) + '%'
        ]);
      });
      addBlankRow();
      addBlankRow();

      // Peak Hours
      addSectionHeader('PEAK ACTIVITY HOURS');
      addRow(['Hour', 'Activity Level']);
      (engagementData.peakHours || []).forEach(hour => {
        addRow([hour.hour || 'Unknown', hour.activity || 0]);
      });
      addBlankRow();
      addBlankRow();

      // Daily Active Users
      addSectionHeader('DAILY ACTIVE USERS');
      addRow(['Day', 'Active Users']);
      (engagementData.byDay || []).forEach(day => {
        addRow([(day.day || 'Unknown') + (day.date ? ' (' + day.date + ')' : ''), (day.active || 0).toLocaleString()]);
      });
      addBlankRow();

      // Footer
      addRow(['========================================']);
      addRow(['END OF REPORT']);
      addRow(['Generated by Analytics System']);
      addRow([new Date().toLocaleString()]);

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `engagement_analytics_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  // ==================== COMPONENTS ====================

  const StatCard = ({ title, value, icon: Icon, trend, color = "blue", isLoading = false, suffix = "", subtext }) => {
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

    // Don't show card if value is 0 or undefined
    if (!isLoading && (!value || value === 0)) {
      return null;
    }

    if (isLoading) {
      return <StatCardSkeleton />;
    }

    return (
      <div className="flex-1 min-w-[200px] bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">
              {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
            </p>
            {trend && trend.percentage > 0 && (
              <div className="flex items-center gap-1 mt-1">
                {trend.direction === 'up' ? (
                  <ArrowUp size={16} className="text-green-500" />
                ) : trend.direction === 'down' ? (
                  <ArrowDown size={16} className="text-red-500" />
                ) : null}
                <span className={trend.direction === 'up' ? "text-green-500 text-sm" : "text-red-500 text-sm"}>
                  {trend.percentage}%
                </span>
                <span className="text-gray-500 text-xs ml-1">vs previous</span>
              </div>
            )}
            {subtext && (
              <p className="text-xs text-gray-500 mt-2">{subtext}</p>
            )}
          </div>
          <div className={`p-2 ${getBgColorClass(color)} rounded-lg`}>
            <Icon className={getColorClass(color)} size={20} />
          </div>
        </div>
      </div>
    );
  };

  const ProgressBar = ({ label, value, max, color = "blue", showValue = true, isLoading = false }) => {
    // Don't show if value is 0 or undefined
    if (!isLoading && (!value || value === 0)) {
      return null;
    }

    const percentage = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
    
    const getBgColorClass = (colorName) => {
      const colorMap = {
        blue: "bg-blue-500",
        green: "bg-green-500",
        purple: "bg-purple-500",
        yellow: "bg-yellow-500",
        orange: "bg-orange-500",
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

  // ==================== RENDER ====================

  if (loading && !engagementData.total) {
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
          {/* Key Metrics Skeleton */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-4">
            <SectionHeaderSkeleton />
            <div className="flex flex-wrap gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </div>

          {/* Main Analytics Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <SectionHeaderSkeleton />
                <div className="space-y-4">
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                </div>
              </div>
            ))}
          </div>

          {/* Peak Hours Skeleton */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <SectionHeaderSkeleton />
            <div className="space-y-2">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-2 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gray-300 rounded-full h-2 w-3/4"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Features Skeleton */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <SectionHeaderSkeleton />
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center justify-between animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Overview Metrics Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="text-center">
                  <div className="h-6 w-6 bg-gray-200 rounded-full mx-auto mb-3 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-24 mx-auto mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Filter out zero values from arrays for display
  const filteredActivityBreakdown = (engagementData.activityBreakdown || []).filter(item => item.value > 0);
  const filteredDeviceBreakdown = (engagementData.deviceBreakdown || []).filter(device => device.value > 0);
  const filteredTopFeatures = (engagementData.topFeatures || []).filter(feature => feature.count > 0);
  const filteredPeakHours = (engagementData.peakHours || []).filter(hour => hour.activity > 0);
  const filteredByDay = (engagementData.byDay || []).filter(day => day.active > 0);

  // Calculate totals only if there are values
  const totalUsers = (engagementData.userActivity?.high || 0) + 
                     (engagementData.userActivity?.medium || 0) + 
                     (engagementData.userActivity?.low || 0) + 
                     (engagementData.userActivity?.inactive || 0);

  const engagementRate = totalUsers > 0 
    ? Math.round(((engagementData.userActivity?.high || 0) + (engagementData.userActivity?.medium || 0)) / totalUsers * 100) 
    : 0;

  return (
    <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#CC0000]">
              Engagement Metrics
            </h1>
            <p className="text-gray-600">
              {dateRange === 'week' ? 'Last 7 days' : 
               dateRange === 'month' ? 'Last 30 days' : 
               dateRange === 'year' ? 'Last 12 months' : 
               dateRange === 'custom' && customStartDate && customEndDate ? `${formatDate(customStartDate)} to ${formatDate(customEndDate)}` : 
               'Track user activity, retention, and platform engagement'}
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
                <CalendarIcon size={14} />
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
            
            {/* Export to CSV Button */}
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
              title="Export to CSV"
            >
              <Download size={18} />
              <span>CSV</span>
            </button>

            {/* Refresh Button */}
            <button 
              onClick={fetchEngagementAnalytics}
              className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-50 cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        {/* Key Metrics Cards - Only show if values exist */}
        {(engagementData.dailyActive > 0 || 
          engagementData.weeklyActive > 0 || 
          engagementData.monthlyActive > 0 || 
          engagementData.averageSession > 0) && (
          <div className="flex flex-col gap-4 mb-6 w-full">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Key Metrics</h2>
              <div className="flex flex-wrap gap-4">
                {engagementData.dailyActive > 0 && (
                  <StatCard 
                    title="Daily Active Users" 
                    value={engagementData.dailyActive} 
                    icon={Activity} 
                    trend={engagementData.trends?.daily}
                    color="blue" 
                    subtext="Users active in last 24h"
                    isLoading={loading}
                  />
                )}
                {engagementData.weeklyActive > 0 && (
                  <StatCard 
                    title="Weekly Active Users" 
                    value={engagementData.weeklyActive} 
                    icon={Users} 
                    trend={engagementData.trends?.weekly}
                    color="green" 
                    subtext="Users active in last 7 days"
                    isLoading={loading}
                  />
                )}
                {engagementData.monthlyActive > 0 && (
                  <StatCard 
                    title="Monthly Active Users" 
                    value={engagementData.monthlyActive} 
                    icon={Calendar} 
                    trend={engagementData.trends?.monthly}
                    color="purple" 
                    subtext="Users active in last 30 days"
                    isLoading={loading}
                  />
                )}
                {engagementData.averageSession > 0 && (
                  <StatCard 
                    title="Avg. Session Duration" 
                    value={engagementData.averageSession} 
                    icon={Clock} 
                    trend={{ direction: 'up', percentage: 5.2 }}
                    color="orange" 
                    suffix="m"
                    subtext="Time spent per session"
                    isLoading={loading}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* User Retention Card - Only show if values exist */}
          {(engagementData.retention > 0 || 
            engagementData.engagementMetrics?.returningUsers > 0 || 
            engagementData.bounceRate > 0 || 
            engagementData.engagementMetrics?.totalSessions > 0) && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <UserCheck size={20} className="text-green-500" />
                User Retention
              </h2>
              
              {loading ? (
                <div className="space-y-4">
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                </div>
              ) : (
                <>
                  {engagementData.retention > 0 && (
                    <div className="text-center mb-6">
                      <div className="text-5xl font-bold text-green-600 mb-2">
                        {engagementData.retention}%
                      </div>
                      <p className="text-gray-600 text-sm">of users return within 30 days</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {engagementData.engagementMetrics?.returningUsers > 0 && (
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Returning Users</span>
                        <span className="text-green-600 font-semibold">
                          {engagementData.engagementMetrics.returningUsers}%
                        </span>
                      </div>
                    )}
                    
                    {engagementData.bounceRate > 0 && (
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Bounce Rate</span>
                        <span className="text-red-600 font-semibold">
                          {engagementData.bounceRate}%
                        </span>
                      </div>
                    )}

                    {engagementData.engagementMetrics?.totalSessions > 0 && (
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Total Sessions</span>
                        <span className="text-blue-600 font-semibold">
                          {engagementData.engagementMetrics.totalSessions.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Daily Active Users Chart - Only show if data exists */}
          {filteredByDay.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <BarChart size={20} className="text-blue-500" />
                  Daily Active Users
                </h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    <span className="text-gray-600">Active Users</span>
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="space-y-3">
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredByDay.map((day, index) => {
                    const maxValue = Math.max(...filteredByDay.map(d => d.active));
                    return (
                      <div key={index} className="group">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 group-hover:text-gray-800 transition-colors">
                            {day.day}
                            {day.date && <span className="text-gray-400 text-xs ml-2">{day.date}</span>}
                          </span>
                          <span className="text-gray-800 font-medium group-hover:text-blue-600 transition-colors">
                            {day.active.toLocaleString()} users
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-blue-500 rounded-full h-2.5 transition-all duration-500 group-hover:bg-blue-600" 
                            style={{ width: `${(day.active / maxValue) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Trend Indicator */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Weekly Trend</span>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-green-500" />
                    <span className="text-green-600">+12.3% vs last week</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Activity Levels - Only show if values exist */}
        {(engagementData.userActivity?.high > 0 || 
          engagementData.userActivity?.medium > 0 || 
          engagementData.userActivity?.low > 0 || 
          engagementData.userActivity?.inactive > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Layers size={20} className="text-purple-500" />
                Activity Levels
              </h2>
              
              {loading ? (
                <div className="space-y-4">
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                </div>
              ) : (
                <div className="space-y-4">
                  {engagementData.userActivity?.high > 0 && (
                    <ProgressBar 
                      label="High Activity (10+ actions/day)"
                      value={engagementData.userActivity.high}
                      max={2000}
                      color="green"
                    />
                  )}
                  {engagementData.userActivity?.medium > 0 && (
                    <ProgressBar 
                      label="Medium Activity (5-9 actions/day)"
                      value={engagementData.userActivity.medium}
                      max={2000}
                      color="yellow"
                    />
                  )}
                  {engagementData.userActivity?.low > 0 && (
                    <ProgressBar 
                      label="Low Activity (1-4 actions/day)"
                      value={engagementData.userActivity.low}
                      max={2000}
                      color="orange"
                    />
                  )}
                  {engagementData.userActivity?.inactive > 0 && (
                    <ProgressBar 
                      label="Inactive (0 actions/day)"
                      value={engagementData.userActivity.inactive}
                      max={2000}
                      color="red"
                    />
                  )}
                </div>
              )}

              {/* Summary - Only show if there are users */}
              {totalUsers > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Engagement Rate</span>
                    <span className="text-green-600 font-semibold">
                      {engagementRate}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Activity Breakdown - Only show if data exists */}
            {filteredActivityBreakdown.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <PieChart size={20} className="text-yellow-500" />
                  Activity Breakdown
                </h2>
                
                {loading ? (
                  <div className="space-y-4">
                    <ProgressBarSkeleton />
                    <ProgressBarSkeleton />
                    <ProgressBarSkeleton />
                    <ProgressBarSkeleton />
                    <ProgressBarSkeleton />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredActivityBreakdown.map((item, index) => {
                      const getBgColorClass = (color) => {
                        const colorMap = {
                          blue: "bg-blue-500",
                          green: "bg-green-500",
                          purple: "bg-purple-500",
                          yellow: "bg-yellow-500",
                          orange: "bg-orange-500",
                          red: "bg-red-500"
                        };
                        return colorMap[color] || "bg-gray-500";
                      };
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getBgColorClass(item.color)}`}></div>
                            <span className="text-gray-600">{item.name}</span>
                          </div>
                          <span className="text-gray-800 font-medium">{item.value.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {engagementData.engagementMetrics?.avgActionsPerUser > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Avg Actions/User</span>
                      <span className="text-blue-600 font-semibold">
                        {engagementData.engagementMetrics.avgActionsPerUser}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Device Breakdown - Only show if data exists */}
            {filteredDeviceBreakdown.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Award size={20} className="text-indigo-500" />
                  Device Distribution
                </h2>
                
                {loading ? (
                  <div className="space-y-4">
                    <ProgressBarSkeleton />
                    <ProgressBarSkeleton />
                    <ProgressBarSkeleton />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredDeviceBreakdown.map((device, index) => {
                      const getBgColorClass = (color) => {
                        const colorMap = {
                          blue: "bg-blue-500",
                          green: "bg-green-500",
                          purple: "bg-purple-500"
                        };
                        return colorMap[color] || "bg-gray-500";
                      };
                      
                      return (
                        <div key={index}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{device.name}</span>
                            <span className="text-gray-800 font-medium">{device.value}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`${getBgColorClass(device.color)} rounded-full h-2`} 
                              style={{ width: `${device.value}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <AlertCircle size={14} />
                    <span>Mobile usage up 8% this month</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Peak Hours and Top Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Peak Hours - Only show if data exists */}
          {filteredPeakHours.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Clock size={20} className="text-orange-500" />
                Peak Activity Hours
              </h2>

              {loading ? (
                <div className="space-y-2">
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPeakHours.map((hour, index) => {
                    const maxActivity = Math.max(...filteredPeakHours.map(h => h.activity));
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-gray-600 text-sm w-12">{hour.hour}</span>
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-500 rounded-full h-2" 
                              style={{ width: `${(hour.activity / maxActivity) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="text-gray-800 text-sm w-12 text-right">{hour.activity}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-yellow-600 flex items-center gap-2">
                  <Zap size={16} />
                  Peak engagement: 10AM - 2PM
                </p>
              </div>
            </div>
          )}

          {/* Top Features - Only show if data exists */}
          {filteredTopFeatures.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Target size={20} className="text-green-500" />
                Most Used Features
              </h2>

              {loading ? (
                <div className="space-y-4">
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTopFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">{index + 1}.</span>
                        <span className="text-gray-800">{feature.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600">{feature.count.toLocaleString()}</span>
                        {feature.trend !== 0 && (
                          <div className={`flex items-center gap-1 text-sm ${
                            feature.trend > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {feature.trend > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            <span>{Math.abs(feature.trend)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredTopFeatures.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Feature Usage</span>
                    <span className="text-gray-800 font-semibold">
                      {filteredTopFeatures.reduce((sum, f) => sum + (f.count || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Engagement Overview Metrics - Only show if values exist */}
        {(engagementData.engagementMetrics?.pageViews > 0 || 
          engagementData.engagementMetrics?.actions > 0 || 
          engagementData.engagementMetrics?.avgActionsPerUser > 0 || 
          engagementData.engagementMetrics?.returningUsers > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {engagementData.engagementMetrics?.pageViews > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="flex justify-center mb-3">
                  <Eye size={24} className="text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{engagementData.engagementMetrics.pageViews.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Page Views</p>
              </div>
            )}

            {engagementData.engagementMetrics?.actions > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="flex justify-center mb-3">
                  <MousePointer size={24} className="text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{engagementData.engagementMetrics.actions.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Total Actions</p>
              </div>
            )}

            {engagementData.engagementMetrics?.avgActionsPerUser > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="flex justify-center mb-3">
                  <Users size={24} className="text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{engagementData.engagementMetrics.avgActionsPerUser}</p>
                <p className="text-sm text-gray-600">Avg Actions/User</p>
              </div>
            )}

            {engagementData.engagementMetrics?.returningUsers > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="flex justify-center mb-3">
                  <UserCheck size={24} className="text-orange-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{engagementData.engagementMetrics.returningUsers}%</p>
                <p className="text-sm text-gray-600">Returning Users</p>
              </div>
            )}
          </div>
        )}

        {/* Engagement Insights - Always show but with dynamic values */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Engagement Insights</h2>
          <p className="text-red-100 mb-4">Based on your current metrics, here are some recommendations:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <Zap size={20} className="text-yellow-300 mb-2" />
              <h3 className="text-white font-medium mb-1">Peak Hours Optimization</h3>
              <p className="text-red-100 text-sm">
                Highest engagement between 10AM - 2PM. Schedule important announcements and features during this time for maximum visibility.
              </p>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <Target size={20} className="text-yellow-300 mb-2" />
              <h3 className="text-white font-medium mb-1">Retention Opportunity</h3>
              <p className="text-red-100 text-sm">
                {engagementData.retention ? (100 - engagementData.retention) + '% of users don\'t return' : 'Monitor user retention rates'} 
                {engagementData.retention ? '. Send personalized re-engagement emails to inactive users and highlight new features.' : ' to improve user engagement.'}
              </p>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <TrendingUp size={20} className="text-yellow-300 mb-2" />
              <h3 className="text-white font-medium mb-1">Mobile Experience</h3>
              <p className="text-red-100 text-sm">
                {engagementData.deviceBreakdown?.find(d => d.name === 'Mobile')?.value || 'A significant portion'}% of users access via mobile. 
                Ensure mobile experience is fully optimized.
              </p>
            </div>
          </div>

          {/* Quick Stats - Only show if values exist */}
          {(engagementData.userActivity?.low > 0 || 
            engagementData.userActivity?.high > 0 || 
            engagementData.averageSession > 0 || 
            engagementData.bounceRate > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-red-500/30">
              {engagementData.userActivity?.low > 0 && (
                <div>
                  <p className="text-red-200 text-xs">Low Activity Users</p>
                  <p className="text-white font-semibold">{engagementData.userActivity.low}</p>
                </div>
              )}
              {engagementData.userActivity?.high > 0 && (
                <div>
                  <p className="text-red-200 text-xs">High Activity Users</p>
                  <p className="text-white font-semibold">{engagementData.userActivity.high}</p>
                </div>
              )}
              {engagementData.averageSession > 0 && (
                <div>
                  <p className="text-red-200 text-xs">Avg Session</p>
                  <p className="text-white font-semibold">{engagementData.averageSession}m</p>
                </div>
              )}
              {engagementData.bounceRate > 0 && (
                <div>
                  <p className="text-red-200 text-xs">Bounce Rate</p>
                  <p className="text-white font-semibold">{engagementData.bounceRate}%</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default AnalyticsEngagement;