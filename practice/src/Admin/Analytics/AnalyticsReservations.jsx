// AnalyticsReservations.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import {
  CalendarCheck,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Users,
  Calendar,
  X,
  MapPin,
  AlertCircle,
  Building,
  TrendingUp,
  BarChart3,
  PieChart,
  Award,
  UserCheck,
  DoorOpen,
  CalendarDays,
  LayoutGrid,
  Flame,
  Clock3,
  Activity
} from "lucide-react";
import api from "../../utils/api";

function AnalyticsReservations({ setView, admin }) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [reservationData, setReservationData] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    cancelled: 0,
    expired: 0,
    ongoing: 0,
    byRoom: [],
    byDayOfWeek: {
      mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0
    },
    popularRooms: [],
    trends: {
      total: { value: 0, percentage: 0, direction: 'up' },
      pending: { value: 0, percentage: 0, direction: 'up' },
      approved: { value: 0, percentage: 0, direction: 'up' },
      completed: { value: 0, percentage: 0, direction: 'up' },
      cancelled: { value: 0, percentage: 0, direction: 'up' }
    },
    growth: {
      labels: [],
      values: []
    },
    floorDistribution: [],
    avgGroupSize: 0,
    totalParticipants: 0,
    previousTotal: 0,
    userDepartmentStats: [],
    topReservers: []
  });

  const calendarRef = useRef(null);

  const fetchReservationAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/analytics/reservations/detailed?range=${dateRange}`;
      
      if (dateRange === "custom" && customStartDate && customEndDate) {
        url = `/analytics/reservations/detailed?startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      
      const response = await api.get(url);
      
      if (response.data && response.data.success) {
        setReservationData(response.data.data);
      } else {
        await fetchSimpleAnalytics();
      }
    } catch (error) {
      console.error("Error fetching detailed analytics:", error);
      await fetchSimpleAnalytics();
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate]);

  const fetchSimpleAnalytics = async () => {
    try {
      let url = `/analytics/reservations?range=${dateRange}`;
      if (dateRange === "custom" && customStartDate && customEndDate) {
        url = `/analytics/reservations?startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      
      const response = await api.get(url);
      if (response.data && response.data.success) {
        setReservationData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching simple analytics:", error);
    }
  };

  useEffect(() => {
    fetchReservationAnalytics();
  }, [fetchReservationAnalytics]);

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

  const formatDateTime = (date) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return "Invalid date";
    }
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

  const DayChartSkeleton = () => (
    <div className="flex justify-between gap-4 animate-pulse h-64 items-end">
      {Array(7).fill(0).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center">
          <div className="w-full bg-gray-200 rounded-t" style={{ height: `${Math.random() * 150 + 50}px` }}></div>
          <div className="h-3 bg-gray-200 rounded w-16 mt-2"></div>
          <div className="h-3 bg-gray-200 rounded w-8 mt-1"></div>
        </div>
      ))}
    </div>
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

  // ==================== CSV EXPORT FUNCTION ====================

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
      addRow(['RESERVATION ANALYTICS REPORT']);
      addRow(['========================================']);
      addBlankRow();
      addRow(['Generated:', new Date().toLocaleString()]);
      addRow(['Date Range:', rangeDescription]);
      addBlankRow();
      addBlankRow();

      addSectionHeader('KEY METRICS');
      addRow(['Metric', 'Value', 'Change %', 'Trend']);
      addRow([
        'TOTAL RESERVATIONS', 
        (reservationData.total || 0).toLocaleString(),
        `${reservationData.trends?.total?.percentage || 0}%`,
        reservationData.trends?.total?.direction === 'up' ? 'Increasing' : 'Decreasing'
      ]);
      addRow([
        'COMPLETED', 
        (reservationData.completed || 0).toLocaleString(),
        `${reservationData.trends?.completed?.percentage || 0}%`,
        reservationData.trends?.completed?.direction === 'up' ? 'Increasing' : 'Decreasing'
      ]);
      addRow([
        'PENDING', 
        (reservationData.pending || 0).toLocaleString(),
        `${reservationData.trends?.pending?.percentage || 0}%`,
        reservationData.trends?.pending?.direction === 'up' ? 'Increasing' : 'Decreasing'
      ]);
      addRow([
        'CANCELLED', 
        (reservationData.cancelled || 0).toLocaleString(),
        `${reservationData.trends?.cancelled?.percentage || 0}%`,
        reservationData.trends?.cancelled?.direction === 'up' ? 'Increasing' : 'Decreasing'
      ]);
      addBlankRow();
      addBlankRow();

      addSectionHeader('RESERVATION STATUS BREAKDOWN');
      addRow(['Status', 'Count', 'Percentage']);
      
      const total = reservationData.total || 1;
      const statuses = [
        { label: 'Pending', value: reservationData.pending || 0 },
        { label: 'Approved', value: reservationData.approved || 0 },
        { label: 'Completed', value: reservationData.completed || 0 },
        { label: 'Rejected', value: reservationData.rejected || 0 },
        { label: 'Cancelled', value: reservationData.cancelled || 0 },
        { label: 'Expired', value: reservationData.expired || 0 },
        { label: 'Ongoing', value: reservationData.ongoing || 0 }
      ];

      statuses.forEach(status => {
        const percentage = Math.min(Math.round((status.value / total) * 100), 100);
        addRow([status.label, status.value.toLocaleString(), percentage + '%']);
      });
      addBlankRow();
      addBlankRow();

      addSectionHeader('DAY OF WEEK DISTRIBUTION');
      addRow(['Day', 'Reservations', 'Percentage']);
      
      const dayNames = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
      const totalDays = Object.values(reservationData.byDayOfWeek || {}).reduce((a, b) => a + b, 0) || 1;
      
      Object.entries(reservationData.byDayOfWeek || {}).forEach(([day, count]) => {
        const percentage = Math.min(Math.round((count / totalDays) * 100), 100);
        addRow([dayNames[day] || day, count.toLocaleString(), percentage + '%']);
      });
      addBlankRow();
      addBlankRow();

      addSectionHeader('FLOOR DISTRIBUTION');
      addRow(['Floor', 'Reservations', 'Percentage']);
      
      (reservationData.floorDistribution || []).forEach(floor => {
        const percentage = Math.min(Math.round((floor.value / total) * 100), 100);
        addRow([floor.name || 'Unknown', floor.value.toLocaleString(), percentage + '%']);
      });
      addBlankRow();
      addBlankRow();

      addSectionHeader('TOP RESERVERS');
      addRow(['Rank', 'Name', 'Department', 'Reservations', 'Percentage']);
      
      (reservationData.topReservers || []).slice(0, 10).forEach((user, index) => {
        const percentage = Math.min(Math.round((user.count / total) * 100), 100);
        addRow([
          '#' + (index + 1),
          user.name || 'Unknown',
          user.department || 'N/A',
          user.count.toLocaleString(),
          percentage + '%'
        ]);
      });
      addBlankRow();
      addBlankRow();

      addSectionHeader('POPULAR ROOMS');
      addRow(['Room', 'Bookings', 'Approved', 'Completed', 'Utilization']);
      
      (reservationData.popularRooms || []).forEach(room => {
        addRow([
          room.name,
          room.bookings.toLocaleString(),
          (room.approved || 0).toLocaleString(),
          (room.completed || 0).toLocaleString(),
          Math.min(room.utilization, 100) + '%'
        ]);
      });
      addBlankRow();
      addBlankRow();

      addRow(['========================================']);
      addRow(['END OF REPORT']);
      addRow(['Generated by Analytics System']);
      addRow([new Date().toLocaleString()]);

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Reservation Analytics ${dateRange} ${new Date().toISOString().split('T')[0]}.csv`);
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

  const StatCard = ({ title, value, icon: Icon, trend, color = "blue", isLoading = false, subtext }) => {
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
              {typeof value === 'number' ? value.toLocaleString() : value}
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

  const StatusBadge = ({ status }) => {
    const statusConfig = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
      approved: { bg: "bg-blue-100", text: "text-blue-700", label: "Approved" },
      completed: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
      rejected: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
      cancelled: { bg: "bg-gray-100", text: "text-gray-700", label: "Cancelled" },
      expired: { bg: "bg-orange-100", text: "text-orange-700", label: "Expired" },
      ongoing: { bg: "bg-purple-100", text: "text-purple-700", label: "Ongoing" }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

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

  const totalReservations = reservationData.total || 0;
  const totalDays = Object.values(reservationData.byDayOfWeek || {}).reduce((a, b) => a + b, 0) || 1;
  const maxDayValue = Math.max(...Object.values(reservationData.byDayOfWeek || {}), 1);
  const chartHeight = 250;

  // ==================== RENDER ====================

  if (loading && !reservationData.total) {
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
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
            <DayChartSkeleton />
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <SectionHeaderSkeleton />
            <GrowthChartSkeleton />
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <SectionHeaderSkeleton />
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
            </div>
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
              Reservation Analytics
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {dateRange === 'week' ? 'Last 7 days' : 
               dateRange === 'month' ? 'Last 30 days' : 
               dateRange === 'year' ? 'Last 12 months' : 
               dateRange === 'custom' && customStartDate && customEndDate ? `${formatDate(customStartDate)} to ${formatDate(customEndDate)}` : 
               'Track booking patterns, trends, and room utilization'}
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
                <Calendar size={14} />
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
              onClick={fetchReservationAnalytics}
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
        {/* Key Metrics Section */}
        <div className="mb-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-800">Key Metrics</h2>
              <span className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full font-medium">Real-time</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                title="Total Reservations" 
                value={reservationData.total} 
                icon={CalendarCheck} 
                trend={reservationData.trends?.total}
                color="blue" 
                isLoading={loading}
              />
              <StatCard 
                title="Completed" 
                value={reservationData.completed} 
                icon={CheckCircle} 
                trend={reservationData.trends?.completed}
                color="green" 
                isLoading={loading}
              />
              <StatCard 
                title="Pending" 
                value={reservationData.pending} 
                icon={Clock} 
                trend={reservationData.trends?.pending}
                color="yellow" 
                isLoading={loading}
              />
              <StatCard 
                title="Cancelled" 
                value={reservationData.cancelled} 
                icon={XCircle} 
                trend={reservationData.trends?.cancelled}
                color="red" 
                isLoading={loading}
              />
            </div>
          </div>
        </div>

        {/* Status Statistics Section */}
        <div className="mb-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-5">Reservation Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard 
                title="Approved" 
                value={reservationData.approved} 
                icon={CheckCircle} 
                color="green" 
                isLoading={loading}
              />
              <StatCard 
                title="Rejected" 
                value={reservationData.rejected} 
                icon={XCircle} 
                color="red" 
                isLoading={loading}
              />
              <StatCard 
                title="Expired" 
                value={reservationData.expired} 
                icon={AlertCircle} 
                color="orange" 
                isLoading={loading}
              />
              <StatCard 
                title="Ongoing" 
                value={reservationData.ongoing} 
                icon={Activity} 
                color="purple" 
                isLoading={loading}
              />
              <StatCard 
                title="Avg Group Size" 
                value={reservationData.avgGroupSize || 0} 
                icon={Users} 
                color="indigo" 
                isLoading={loading}
              />
            </div>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Reservation Status Breakdown */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <PieChart size={20} className="text-purple-500" />
              Status Breakdown
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
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Pending</span>
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-600 font-bold">{(reservationData.pending || 0).toLocaleString()}</span>
                    <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-600 rounded-full">
                      {Math.min(Math.round(((reservationData.pending || 0) / totalReservations) * 100), 100)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Approved</span>
                  <div className="flex items-center gap-3">
                    <span className="text-green-600 font-bold">{(reservationData.approved || 0).toLocaleString()}</span>
                    <span className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded-full">
                      {Math.min(Math.round(((reservationData.approved || 0) / totalReservations) * 100), 100)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Rejected</span>
                  <div className="flex items-center gap-3">
                    <span className="text-red-600 font-bold">{(reservationData.rejected || 0).toLocaleString()}</span>
                    <span className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-full">
                      {Math.min(Math.round(((reservationData.rejected || 0) / totalReservations) * 100), 100)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Completed</span>
                  <div className="flex items-center gap-3">
                    <span className="text-blue-600 font-bold">{(reservationData.completed || 0).toLocaleString()}</span>
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                      {Math.min(Math.round(((reservationData.completed || 0) / totalReservations) * 100), 100)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Cancelled</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 font-bold">{(reservationData.cancelled || 0).toLocaleString()}</span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                      {Math.min(Math.round(((reservationData.cancelled || 0) / totalReservations) * 100), 100)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Expired</span>
                  <div className="flex items-center gap-3">
                    <span className="text-orange-600 font-bold">{(reservationData.expired || 0).toLocaleString()}</span>
                    <span className="text-xs px-2 py-1 bg-orange-50 text-orange-600 rounded-full">
                      {Math.min(Math.round(((reservationData.expired || 0) / totalReservations) * 100), 100)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600 font-medium">Ongoing</span>
                  <div className="flex items-center gap-3">
                    <span className="text-purple-600 font-bold">{(reservationData.ongoing || 0).toLocaleString()}</span>
                    <span className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-full">
                      {Math.min(Math.round(((reservationData.ongoing || 0) / totalReservations) * 100), 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Department Reservation Statistics */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <Building size={20} className="text-blue-500" />
              Reservations by Department
            </h2>
            {loading ? (
              <div className="space-y-5">
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
              </div>
            ) : (
              reservationData.userDepartmentStats && reservationData.userDepartmentStats.length > 0 ? (
                <div className="space-y-4">
                  {reservationData.userDepartmentStats.slice(0, 5).map((dept, idx) => (
                    <ProgressBar 
                      key={idx}
                      label={dept.name || 'Unknown'} 
                      value={dept.count || 0} 
                      total={reservationData.total || 1} 
                      color={idx === 0 ? "blue" : idx === 1 ? "green" : idx === 2 ? "purple" : "orange"}
                    />
                  ))}
                  {reservationData.userDepartmentStats.length > 5 && (
                    <div className="text-center text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                      +{reservationData.userDepartmentStats.length - 5} more departments
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">No department data available</p>
              )
            )}
          </div>

          {/* Floor Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <LayoutGrid size={20} className="text-indigo-500" />
              Floor Distribution
            </h2>
            {loading ? (
              <div className="space-y-5">
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
              </div>
            ) : (
              reservationData.floorDistribution && reservationData.floorDistribution.length > 0 ? (
                <div className="space-y-4">
                  {reservationData.floorDistribution.slice(0, 5).map((floor, idx) => (
                    <ProgressBar 
                      key={idx}
                      label={floor.name || `Floor ${idx + 1}`} 
                      value={floor.value || 0} 
                      total={reservationData.total || 1} 
                      color={idx === 0 ? "blue" : idx === 1 ? "green" : idx === 2 ? "purple" : "orange"}
                    />
                  ))}
                  {reservationData.floorDistribution.length > 5 && (
                    <div className="text-center text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                      +{reservationData.floorDistribution.length - 5} more floors
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">No floor distribution data available</p>
              )
            )}
          </div>
        </div>

        {/* Day of Week Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <CalendarDays size={20} className="text-green-500" />
            Reservations by Day of Week
          </h2>
          {loading ? (
            <DayChartSkeleton />
          ) : (
            <div>
              <div className="flex justify-between gap-4 items-end" style={{ height: `${chartHeight}px` }}>
                {Object.entries(reservationData.byDayOfWeek || {}).map(([day, count]) => {
                  const dayNames = {
                    mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
                    thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
                  };
                  
                  const barHeight = maxDayValue > 0 ? (count / maxDayValue) * (chartHeight - 40) : 0;
                  
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center">
                      <div className="relative w-full group mb-3">
                        <div className="flex justify-center">
                          <div 
                            className="w-3/4 bg-gradient-to-t from-[#CC0000] to-[#FF4444] rounded-t transition-all duration-300 hover:from-[#990000] hover:to-[#CC0000] cursor-pointer"
                            style={{ height: `${barHeight}px` }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                              {count} reservations ({maxDayValue > 0 ? Math.min(Math.round((count / maxDayValue) * 100), 100) : 0}% of peak)
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <span className="text-xs text-gray-500 font-medium text-center">{dayNames[day] || day}</span>
                      <span className="text-sm font-bold text-gray-800 mt-1">{count}</span>
                      
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                        <div 
                          className="bg-[#CC0000] rounded-full h-1.5"
                          style={{ width: `${Math.min((count / totalDays) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500">
                <div>Total: {totalDays.toLocaleString()} reservations</div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-[#CC0000] rounded"></div>
                    <span>Bar height relative to peak day ({maxDayValue} reservations)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Growth Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <TrendingUp size={20} className="text-orange-500" />
            Reservation Growth - {dateRange === 'week' ? 'Daily' : dateRange === 'month' ? 'Weekly' : dateRange === 'year' ? 'Monthly' : 'Custom Period'}
          </h2>
          {loading ? (
            <GrowthChartSkeleton />
          ) : (
            <div>
              <div className="h-64 flex items-end justify-between gap-2">
                {reservationData.growth?.values && reservationData.growth.values.length > 0 ? (
                  reservationData.growth.values.map((value, index) => {
                    const max = Math.max(...reservationData.growth.values, 1);
                    const height = max > 0 ? (value / max) * 200 : 0;
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div className="relative w-full flex justify-center group">
                          <div 
                            className="w-3/4 bg-gradient-to-t from-[#CC0000] to-[#FF4444] rounded-t transition-all duration-300 hover:from-[#990000] hover:to-[#CC0000] cursor-pointer"
                            style={{ height: `${height}px` }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                              {value} reservations
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{reservationData.growth.labels?.[index] || ''}</span>
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
              
              {reservationData.growth?.values && reservationData.growth.values.length > 0 && (
                <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500">
                  <div>Total growth: {reservationData.growth.values.reduce((a, b) => a + b, 0).toLocaleString()} reservations</div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-t from-[#CC0000] to-[#FF4444] rounded"></div>
                    <span>Bar height relative to peak period</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Popular Rooms */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <DoorOpen size={20} className="text-purple-500" />
            Most Popular Rooms
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Room</th>
                  <th className="px-6 py-3 text-left font-medium">Total Bookings</th>
                  <th className="px-6 py-3 text-left font-medium">Approved</th>
                  <th className="px-6 py-3 text-left font-medium">Completed</th>
                  <th className="px-6 py-3 text-left font-medium">Utilization Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <>
                    <TableRowSkeleton cols={5} />
                    <TableRowSkeleton cols={5} />
                    <TableRowSkeleton cols={5} />
                    <TableRowSkeleton cols={5} />
                    <TableRowSkeleton cols={5} />
                  </>
                ) : (
                  reservationData.popularRooms && reservationData.popularRooms.length > 0 ? (
                    reservationData.popularRooms.map((room, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{room.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-semibold text-gray-900">{room.bookings.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-green-600 font-medium">{(room.approved || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-blue-600 font-medium">{(room.completed || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-green-500 rounded-full h-2 transition-all duration-300"
                                style={{ width: `${Math.min(room.utilization, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700">{Math.min(room.utilization, 100)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <DoorOpen size={24} className="text-gray-300" />
                          <p>No popular rooms data available</p>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Reservers by Department */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <Award size={20} className="text-yellow-500" />
            Top Reservers by Department
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Rank</th>
                  <th className="px-6 py-3 text-left font-medium">Name</th>
                  <th className="px-6 py-3 text-left font-medium">Department</th>
                  <th className="px-6 py-3 text-left font-medium">Reservations</th>
                  <th className="px-6 py-3 text-left font-medium">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <>
                    <TableRowSkeleton cols={5} />
                    <TableRowSkeleton cols={5} />
                    <TableRowSkeleton cols={5} />
                    <TableRowSkeleton cols={5} />
                    <TableRowSkeleton cols={5} />
                  </>
                ) : (
                  reservationData.topReservers && reservationData.topReservers.length > 0 ? (
                    reservationData.topReservers.map((user, index) => {
                      const rawPercentage = totalReservations > 0 ? (user.count / totalReservations) * 100 : 0;
                      const percentage = Math.min(Math.round(rawPercentage), 100);
                      
                      const rankColors = [
                        "bg-yellow-100 text-yellow-800 border border-yellow-200",
                        "bg-gray-100 text-gray-800 border border-gray-200",
                        "bg-orange-100 text-orange-800 border border-orange-200"
                      ];
                      
                      const rankColor = index < 3 ? rankColors[index] : "bg-blue-50 text-blue-800 border border-blue-200";
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${rankColor}`}>
                              #{index + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{user.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                              {user.department || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-semibold text-gray-900">{user.count.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="bg-blue-500 rounded-full h-2 transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-700 min-w-[45px]">
                                {percentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <Users size={24} className="text-gray-300" />
                          <p>No top reserver data available for this period</p>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
          
          {reservationData.topReservers && reservationData.topReservers.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
              <div>Showing top {Math.min(reservationData.topReservers.length, 10)} reservers</div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full"></span>
                  <span>Top 3</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                  <span>Progress bar</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Room Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <BarChart3 size={20} className="text-indigo-500" />
            Room Details
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Room</th>
                  <th className="px-6 py-3 text-left font-medium">Total</th>
                  <th className="px-6 py-3 text-left font-medium">Approved</th>
                  <th className="px-6 py-3 text-left font-medium">Pending</th>
                  <th className="px-6 py-3 text-left font-medium">Completed</th>
                  <th className="px-6 py-3 text-left font-medium">Cancelled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <>
                    <TableRowSkeleton cols={6} />
                    <TableRowSkeleton cols={6} />
                    <TableRowSkeleton cols={6} />
                  </>
                ) : (
                  reservationData.byRoom && reservationData.byRoom.length > 0 ? (
                    reservationData.byRoom.slice(0, 10).map((room, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{room.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-semibold text-gray-900">{room.count}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-green-600 font-medium">{room.approved || 0}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-yellow-600 font-medium">{room.pending || 0}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-blue-600 font-medium">{room.completed || 0}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-red-600 font-medium">{room.cancelled || 0}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No room data available
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
          
          {reservationData.byRoom && reservationData.byRoom.length > 10 && (
            <div className="mt-4 text-xs text-gray-500 text-center">
              Showing 10 of {reservationData.byRoom.length} rooms
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default AnalyticsReservations;