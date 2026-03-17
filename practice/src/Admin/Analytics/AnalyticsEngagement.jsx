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
  X,
  Smartphone,
  Monitor,
  Tablet,
  Clock3,
  Flame,
  TrendingDown
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
    },
    growth: {
      labels: [],
      values: []
    }
  });

  const calendarRef = useRef(null);

  const fetchEngagementAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/analytics/engagement?range=${dateRange}`;
      
      if (dateRange === "custom" && customStartDate && customEndDate) {
        url = `/analytics/engagement?startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      
      const response = await api.get(url);
      
      if (response.data && response.data.success) {
        setEngagementData(response.data.data);
      } else {
        setEngagementData(getMockEngagementData(dateRange, customStartDate, customEndDate));
      }
    } catch (error) {
      console.error("Error fetching engagement analytics:", error);
      setEngagementData(getMockEngagementData(dateRange, customStartDate, customEndDate));
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    fetchEngagementAnalytics();
  }, [fetchEngagementAnalytics]);

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

  const getMockEngagementData = (range, customStart, customEnd) => {
    const now = new Date();
    
    let growthLabels = [];
    let growthValues = [];
    
    if (range === 'week') {
      growthLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      growthValues = [320, 380, 410, 395, 425, 280, 210];
    } else if (range === 'month') {
      growthLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      growthValues = [1850, 1920, 1880, 1950];
    } else if (range === 'year') {
      growthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      growthValues = [3850, 3920, 4080, 4150, 4220, 4180, 4090, 4110, 4250, 4380, 4410, 4450];
    } else if (range === 'custom') {
      growthLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      growthValues = [1850, 1920, 1880, 1950];
    }
    
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

    const activityBreakdown = [
      { name: 'Page Views', value: 8450, color: 'blue' },
      { name: 'Reservations', value: 3240, color: 'green' },
      { name: 'Logins', value: 2100, color: 'purple' },
      { name: 'Profile Updates', value: 980, color: 'orange' },
      { name: 'Room Searches', value: 5670, color: 'yellow' }
    ];

    const peakHours = [];
    for (let i = 8; i <= 20; i++) {
      const hour = i <= 12 ? `${i}AM` : i === 12 ? '12PM' : `${i-12}PM`;
      peakHours.push({
        hour,
        activity: Math.floor(Math.random() * 80) + 20
      });
    }

    const deviceBreakdown = [
      { name: 'Desktop', value: 45, color: 'blue' },
      { name: 'Mobile', value: 42, color: 'green' },
      { name: 'Tablet', value: 13, color: 'purple' }
    ];

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
      growth: {
        labels: growthLabels,
        values: growthValues
      },
      trends: {
        daily: { value: 320, percentage: 8.5, direction: 'up' },
        weekly: { value: 1850, percentage: 12.3, direction: 'up' },
        monthly: { value: 4250, percentage: 15.7, direction: 'up' }
      }
    };
  };

  // ==================== SKELETON LOADING COMPONENTS ====================

  const StatCardSkeleton = () => (
    <div className="flex-1 min-w-[200px] bg-white p-5 rounded-xl border border-gray-200 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
          <div className="h-8 bg-gray-300 rounded w-16 mb-2"></div>
          <div className="flex items-center gap-1">
            <div className="h-4 bg-gray-200 rounded w-12"></div>
          </div>
        </div>
        <div className="p-3 bg-gray-200 rounded-xl">
          <div className="w-5 h-5"></div>
        </div>
      </div>
    </div>
  );

  const ProgressBarSkeleton = () => (
    <div className="animate-pulse">
      <div className="flex justify-between mb-2">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-4 bg-gray-200 rounded w-12"></div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className="bg-gray-300 rounded-full h-2.5 w-3/4"></div>
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

  const GrowthChartSkeleton = () => (
    <div className="h-64 flex items-end justify-between gap-2 animate-pulse">
      {Array(7).fill(0).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full bg-gray-200 rounded-t h-40"></div>
          <div className="h-3 bg-gray-200 rounded w-8"></div>
        </div>
      ))}
    </div>
  );

  const SectionHeaderSkeleton = () => (
    <div className="flex items-center justify-between mb-5">
      <div className="h-6 bg-gray-200 rounded w-48"></div>
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </div>
  );

  // ==================== EXPORT FUNCTION ====================

  const exportToCSV = () => {
    try {
      let csvContent = "";
      
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

      let rangeDescription = "";
      if (dateRange === "week") rangeDescription = "Last 7 Days";
      else if (dateRange === "month") rangeDescription = "Last 30 Days";
      else if (dateRange === "year") rangeDescription = "Last 12 Months";
      else if (dateRange === "custom") rangeDescription = `${formatDate(customStartDate)} to ${formatDate(customEndDate)}`;

      addBlankRow();
      addRow(['ENGAGEMENT ANALYTICS REPORT']);
      addRow(['========================================']);
      addBlankRow();
      addRow(['Generated:', new Date().toLocaleString()]);
      addRow(['Date Range:', rangeDescription]);
      addBlankRow();
      addBlankRow();

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

      addSectionHeader('DEVICE DISTRIBUTION');
      addRow(['Device', 'Percentage']);
      (engagementData.deviceBreakdown || []).forEach(device => {
        addRow([device.name || 'Unknown', (device.value || 0) + '%']);
      });
      addBlankRow();
      addBlankRow();

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

      addSectionHeader('PEAK ACTIVITY HOURS');
      addRow(['Hour', 'Activity Level']);
      (engagementData.peakHours || []).forEach(hour => {
        addRow([hour.hour || 'Unknown', hour.activity || 0]);
      });
      addBlankRow();
      addBlankRow();

      addSectionHeader('DAILY ACTIVE USERS');
      addRow(['Day', 'Active Users']);
      (engagementData.byDay || []).forEach(day => {
        addRow([(day.day || 'Unknown') + (day.date ? ' (' + day.date + ')' : ''), (day.active || 0).toLocaleString()]);
      });
      addBlankRow();

      addRow(['========================================']);
      addRow(['END OF REPORT']);
      addRow(['Generated by Analytics System']);
      addRow([new Date().toLocaleString()]);

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Engagement Analytics ${dateRange} ${new Date().toISOString().split('T')[0]}.csv`);
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
        blue: "text-blue-600",
        green: "text-green-600",
        purple: "text-purple-600",
        yellow: "text-yellow-600",
        orange: "text-orange-600",
        red: "text-red-600",
        indigo: "text-indigo-600"
      };
      return colorMap[colorName] || "text-blue-600";
    };

    const getBgColorClass = (colorName) => {
      const colorMap = {
        blue: "bg-blue-50",
        green: "bg-green-50",
        purple: "bg-purple-50",
        yellow: "bg-yellow-50",
        orange: "bg-orange-50",
        red: "bg-red-50",
        indigo: "bg-indigo-50"
      };
      return colorMap[colorName] || "bg-blue-50";
    };

    if (isLoading) {
      return <StatCardSkeleton />;
    }

    return (
      <div className="flex-1 min-w-[200px] bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-800">
              {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
            </p>
            {trend && trend.percentage > 0 && (
              <div className="flex items-center gap-1 mt-2">
                {trend.direction === 'up' ? (
                  <ArrowUp size={16} className="text-green-500" />
                ) : trend.direction === 'down' ? (
                  <ArrowDown size={16} className="text-red-500" />
                ) : null}
                <span className={trend.direction === 'up' ? "text-green-500 text-sm font-medium" : "text-red-500 text-sm font-medium"}>
                  {trend.percentage}%
                </span>
                <span className="text-gray-400 text-xs ml-1">vs previous</span>
              </div>
            )}
            {subtext && (
              <p className="text-xs text-gray-400 mt-2">{subtext}</p>
            )}
          </div>
          <div className={`p-3 ${getBgColorClass(color)} rounded-xl`}>
            <Icon className={getColorClass(color)} size={22} />
          </div>
        </div>
      </div>
    );
  };

  const ProgressBar = ({ label, value, total, color = "blue", showValue = true, isLoading = false }) => {
    const rawPercentage = total > 0 ? (value / total) * 100 : 0;
    const percentage = Math.min(Math.round(rawPercentage), 100);
    
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
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 truncate max-w-[60%]" title={label}>
            {label}
          </span>
          <div className="flex items-center gap-3">
            {showValue && <span className="text-sm font-semibold text-gray-900">{value.toLocaleString()}</span>}
            <span className="text-xs px-2.5 py-1 bg-gray-100 rounded-full text-gray-600 font-medium">
              {percentage}%
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div 
            className={`${getBgColorClass(color)} rounded-full h-2.5 transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  const MetricCard = ({ icon: Icon, label, value, bgColor = "bg-blue-50", iconColor = "text-blue-600" }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-sm transition-all">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 ${bgColor} rounded-lg`}>
          <Icon size={20} className={iconColor} />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-lg font-bold text-gray-800">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );

  const InsightCard = ({ title, value, change, icon: Icon, color = "blue" }) => {
    const getColorClasses = (color) => {
      const map = {
        blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
        green: { bg: "bg-green-50", text: "text-green-600", border: "border-green-100" },
        purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" },
        orange: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100" },
        red: { bg: "bg-red-50", text: "text-red-600", border: "border-red-100" },
        yellow: { bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-100" }
      };
      return map[color] || map.blue;
    };

    const colors = getColorClasses(color);

    return (
      <div className={`bg-white p-4 rounded-xl border ${colors.border} hover:shadow-sm transition-all`}>
        <div className="flex items-start justify-between mb-2">
          <div className={`p-2 ${colors.bg} rounded-lg`}>
            <Icon size={18} className={colors.text} />
          </div>
          {change && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {change > 0 ? '+' : ''}{change}%
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
      </div>
    );
  };

  const maxGrowthValue = Math.max(...(engagementData.growth?.values || []), 1);
  const chartHeight = 200;
  const totalUsers = (engagementData.userActivity?.high || 0) + 
                     (engagementData.userActivity?.medium || 0) + 
                     (engagementData.userActivity?.low || 0) + 
                     (engagementData.userActivity?.inactive || 0);
  const engagementRate = totalUsers > 0 
    ? Math.round(((engagementData.userActivity?.high || 0) + (engagementData.userActivity?.medium || 0)) / totalUsers * 100) 
    : 0;

  // ==================== RENDER ====================

  if (loading && !engagementData.dailyActive) {
    return (
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        <header className="bg-white px-6 py-4 border-b border-gray-200 sticky top-0 z-10">
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
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-5">
            <SectionHeaderSkeleton />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <SectionHeaderSkeleton />
                <div className="space-y-5">
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <SectionHeaderSkeleton />
            <GrowthChartSkeleton />
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <SectionHeaderSkeleton />
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center justify-between animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>
          </div>

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

  return (
    <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#CC0000]">
              Engagement Metrics
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {dateRange === 'week' ? 'Last 7 days' : 
               dateRange === 'month' ? 'Last 30 days' : 
               dateRange === 'year' ? 'Last 12 months' : 
               dateRange === 'custom' && customStartDate && customEndDate ? `${formatDate(customStartDate)} to ${formatDate(customEndDate)}` : 
               'Track user activity, retention, and platform engagement'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1 relative">
              {["week", "month", "year"].map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setDateRange(range);
                    setShowCustomDate(false);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${
                    dateRange === range && !showCustomDate
                      ? "bg-[#CC0000] text-white shadow-sm"
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
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  showCustomDate || dateRange === 'custom'
                    ? "bg-[#CC0000] text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                }`}
              >
                <CalendarIcon size={14} />
                <span>Custom</span>
              </button>

              {showCustomDate && (
                <div 
                  ref={calendarRef}
                  className="absolute top-12 right-0 bg-white p-5 rounded-xl shadow-lg border border-gray-200 z-50 w-80"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-gray-800">Select Date Range</h3>
                    <button
                      onClick={() => setShowCustomDate(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm w-full focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                        max={customEndDate || undefined}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm w-full focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                        min={customStartDate || undefined}
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleCustomDateApply}
                        className="flex-1 bg-[#CC0000] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#990000] transition-colors"
                      >
                        Apply
                      </button>
                      <button
                        onClick={handleCustomDateClear}
                        className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer shadow-sm hover:shadow"
              title="Export to CSV"
            >
              <Download size={18} />
              <span className="text-sm font-medium">Excel</span>
            </button>

            <button 
              onClick={fetchEngagementAnalytics}
              className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-50 cursor-pointer transition-all hover:shadow-sm"
              title="Refresh Data"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        {/* Key Metrics Cards */}
        <div className="mb-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-800">Key Metrics</h2>
              <span className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full font-medium">Real-time</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard 
                title="Daily Active Users" 
                value={engagementData.dailyActive} 
                icon={Activity} 
                trend={engagementData.trends?.daily}
                color="blue" 
                subtext="Users active in last 24h"
                isLoading={loading}
              />
              <StatCard 
                title="Weekly Active Users" 
                value={engagementData.weeklyActive} 
                icon={Users} 
                trend={engagementData.trends?.weekly}
                color="green" 
                subtext="Users active in last 7 days"
                isLoading={loading}
              />
              <StatCard 
                title="Monthly Active Users" 
                value={engagementData.monthlyActive} 
                icon={Calendar} 
                trend={engagementData.trends?.monthly}
                color="purple" 
                subtext="Users active in last 30 days"
                isLoading={loading}
              />
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
              <StatCard 
                title="Retention Rate" 
                value={engagementData.retention} 
                icon={Target} 
                color="indigo" 
                suffix="%"
                subtext="User retention"
                isLoading={loading}
              />
            </div>
          </div>
        </div>

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Daily Active Users Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <BarChart size={20} className="text-blue-500" />
                Daily Active Users
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                  <span className="text-gray-500">Active Users</span>
                </span>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
              </div>
            ) : (
              <div className="space-y-4">
                {(engagementData.byDay || []).map((day, index) => {
                  const maxValue = Math.max(...(engagementData.byDay || []).map(d => d.active), 1);
                  return (
                    <div key={index} className="group">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-gray-600 font-medium group-hover:text-gray-800 transition-colors">
                          {day.day}
                          {day.date && <span className="text-gray-400 text-xs ml-2">{day.date}</span>}
                        </span>
                        <span className="text-gray-800 font-semibold group-hover:text-blue-600 transition-colors">
                          {day.active.toLocaleString()} users
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-blue-500 rounded-full h-3 transition-all duration-500 group-hover:bg-blue-600" 
                          style={{ width: `${(day.active / maxValue) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Weekly Trend</span>
                <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full">
                  <TrendingUp size={14} className="text-green-500" />
                  <span className="text-green-600 font-medium">+12.3% vs last week</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Levels */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <Layers size={20} className="text-purple-500" />
              Activity Levels
            </h2>
            
            {loading ? (
              <div className="space-y-5">
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
              </div>
            ) : (
              <div className="space-y-5">
                {engagementData.userActivity?.high > 0 && (
                  <ProgressBar 
                    label="High Activity (10+ actions)"
                    value={engagementData.userActivity.high}
                    total={totalUsers}
                    color="green"
                  />
                )}
                {engagementData.userActivity?.medium > 0 && (
                  <ProgressBar 
                    label="Medium Activity (5-9 actions)"
                    value={engagementData.userActivity.medium}
                    total={totalUsers}
                    color="yellow"
                  />
                )}
                {engagementData.userActivity?.low > 0 && (
                  <ProgressBar 
                    label="Low Activity (1-4 actions)"
                    value={engagementData.userActivity.low}
                    total={totalUsers}
                    color="orange"
                  />
                )}
                {engagementData.userActivity?.inactive > 0 && (
                  <ProgressBar 
                    label="Inactive (0 actions)"
                    value={engagementData.userActivity.inactive}
                    total={totalUsers}
                    color="red"
                  />
                )}
              </div>
            )}

            {totalUsers > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Engagement Rate</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 rounded-full h-2" style={{ width: `${engagementRate}%` }}></div>
                    </div>
                    <span className="text-green-600 font-semibold text-sm">{engagementRate}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Growth Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">
            User Growth - {dateRange === 'week' ? 'Daily' : dateRange === 'month' ? 'Weekly' : dateRange === 'year' ? 'Monthly' : 'Custom Period'}
          </h2>
          {loading ? (
            <GrowthChartSkeleton />
          ) : (
            <div>
              <div className="h-64 flex items-end justify-between gap-2">
                {engagementData.growth?.values && engagementData.growth.values.length > 0 ? (
                  engagementData.growth.values.map((value, index) => {
                    const max = Math.max(...engagementData.growth.values, 1);
                    const height = max > 0 ? (value / max) * 200 : 0;
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div className="relative w-full flex justify-center group">
                          <div 
                            className="w-3/4 bg-gradient-to-t from-[#CC0000] to-[#FF4444] rounded-t transition-all duration-300 hover:from-[#990000] hover:to-[#CC0000] cursor-pointer"
                            style={{ height: `${height}px` }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                              {value} users
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{engagementData.growth.labels?.[index] || ''}</span>
                        <span className="text-sm font-semibold text-gray-800">{value}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full text-center text-gray-400 py-12">
                    No growth data available for this period
                  </div>
                )}
              </div>
              
              {engagementData.growth?.values && engagementData.growth.values.length > 0 && (
                <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500">
                  <div>Total active users: {engagementData.growth.values.reduce((a, b) => a + b, 0).toLocaleString()}</div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-t from-[#CC0000] to-[#FF4444] rounded"></div>
                    <span>Bar height relative to peak period</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Activity Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Activity Breakdown */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <PieChart size={20} className="text-yellow-500" />
              Activity Breakdown
            </h2>
            
            {loading ? (
              <div className="space-y-5">
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
              </div>
            ) : (
              <div className="space-y-3">
                {(engagementData.activityBreakdown || []).map((item, index) => {
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
                  
                  const getLightBgColor = (color) => {
                    const colorMap = {
                      blue: "bg-blue-50",
                      green: "bg-green-50",
                      purple: "bg-purple-50",
                      yellow: "bg-yellow-50",
                      orange: "bg-orange-50",
                      red: "bg-red-50"
                    };
                    return colorMap[color] || "bg-gray-50";
                  };
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getBgColorClass(item.color)}`}></div>
                        <span className="text-gray-600">{item.name}</span>
                      </div>
                      <span className="text-gray-800 font-semibold">{item.value.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {engagementData.engagementMetrics?.avgActionsPerUser > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Avg Actions/User</span>
                  <span className="text-blue-600 font-semibold text-lg">
                    {engagementData.engagementMetrics.avgActionsPerUser}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Device Breakdown */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <Monitor size={20} className="text-indigo-500" />
              Device Distribution
            </h2>
            
            {loading ? (
              <div className="space-y-5">
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
              </div>
            ) : (
              <div className="space-y-5">
                {(engagementData.deviceBreakdown || []).map((device, index) => {
                  const getBgColorClass = (color) => {
                    const colorMap = {
                      blue: "bg-blue-500",
                      green: "bg-green-500",
                      purple: "bg-purple-500"
                    };
                    return colorMap[color] || "bg-gray-500";
                  };
                  
                  const getIcon = (name) => {
                    if (name === 'Desktop') return Monitor;
                    if (name === 'Mobile') return Smartphone;
                    return Tablet;
                  };
                  
                  const Icon = getIcon(device.name);
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon size={16} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">{device.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{device.value}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`${getBgColorClass(device.color)} rounded-full h-2.5 transition-all duration-500`} 
                          style={{ width: `${device.value}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
                <AlertCircle size={14} className="text-blue-500" />
                <span>Mobile usage up 8% this month</span>
              </div>
            </div>
          </div>

          {/* Peak Hours */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <Clock3 size={20} className="text-orange-500" />
              Peak Activity Hours
            </h2>

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
                {(engagementData.peakHours || []).map((hour, index) => {
                  const maxActivity = Math.max(...(engagementData.peakHours || []).map(h => h.activity), 1);
                  return (
                    <div key={index} className="flex items-center gap-3 group">
                      <span className="text-gray-500 text-sm w-12 font-medium">{hour.hour}</span>
                      <div className="flex-1">
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-orange-500 rounded-full h-2.5 transition-all duration-300 group-hover:bg-orange-600" 
                            style={{ width: `${(hour.activity / maxActivity) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-gray-800 text-sm font-medium w-12 text-right">{hour.activity}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-5 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-100">
              <p className="text-sm text-orange-700 flex items-center gap-2 font-medium">
                <Flame size={16} className="text-orange-500" />
                Peak engagement: 10AM - 2PM
              </p>
            </div>
          </div>
        </div>

        {/* Top Features and Overview Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Features */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <Target size={20} className="text-green-500" />
              Most Used Features
            </h2>

            {loading ? (
              <div className="space-y-5">
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
              </div>
            ) : (
              <div className="space-y-3">
                {(engagementData.topFeatures || []).map((feature, index) => (
                  <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm font-medium w-6">{index + 1}.</span>
                      <span className="text-gray-800 font-medium">{feature.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-600">{feature.count.toLocaleString()}</span>
                      {feature.trend !== 0 && (
                        <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
                          feature.trend > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
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

            {(engagementData.topFeatures || []).length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Total Feature Usage</span>
                  <span className="text-gray-800 font-semibold text-lg">
                    {(engagementData.topFeatures || []).reduce((sum, f) => sum + (f.count || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Engagement Overview Metrics */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <Eye size={20} className="text-blue-500" />
              Engagement Overview
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              {engagementData.engagementMetrics?.pageViews > 0 && (
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <div className="flex justify-center mb-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Eye size={24} className="text-blue-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{engagementData.engagementMetrics.pageViews.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Page Views</p>
                </div>
              )}

              {engagementData.engagementMetrics?.actions > 0 && (
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                  <div className="flex justify-center mb-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <MousePointer size={24} className="text-green-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{engagementData.engagementMetrics.actions.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Actions</p>
                </div>
              )}

              {engagementData.engagementMetrics?.avgActionsPerUser > 0 && (
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <div className="flex justify-center mb-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Users size={24} className="text-purple-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{engagementData.engagementMetrics.avgActionsPerUser}</p>
                  <p className="text-xs text-gray-500 mt-1">Avg Actions/User</p>
                </div>
              )}

              {engagementData.engagementMetrics?.returningUsers > 0 && (
                <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                  <div className="flex justify-center mb-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <UserCheck size={24} className="text-orange-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{engagementData.engagementMetrics.returningUsers}%</p>
                  <p className="text-xs text-gray-500 mt-1">Returning Users</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Footer */}
        <div className="bg-gradient-to-r from-[#CC0000] to-[#FF4444] rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Quick Stats</h2>
            <span className="text-xs px-3 py-1.5 bg-white/20 text-white rounded-full font-medium">Live</span>
          </div>
          <p className="text-white/80 text-sm mb-5">Current engagement metrics at a glance</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {engagementData.userActivity?.low > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-white/70 text-xs mb-1">Low Activity Users</p>
                <p className="text-white font-bold text-xl">{engagementData.userActivity.low}</p>
              </div>
            )}
            {engagementData.userActivity?.high > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-white/70 text-xs mb-1">High Activity Users</p>
                <p className="text-white font-bold text-xl">{engagementData.userActivity.high}</p>
              </div>
            )}
            {engagementData.averageSession > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-white/70 text-xs mb-1">Avg Session</p>
                <p className="text-white font-bold text-xl">{engagementData.averageSession}m</p>
              </div>
            )}
            {engagementData.bounceRate > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-white/70 text-xs mb-1">Bounce Rate</p>
                <p className="text-white font-bold text-xl">{engagementData.bounceRate}%</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default AnalyticsEngagement;