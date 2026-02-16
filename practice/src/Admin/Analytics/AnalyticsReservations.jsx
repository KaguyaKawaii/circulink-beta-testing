// AnalyticsReservations.jsx

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CalendarCheck,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  BarChart3,
  PieChart,
  Users,
  Calendar,
  X,
  MapPin,
  Target
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
    byTimeOfDay: {
      morning: 0,
      afternoon: 0,
      evening: 0
    },
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
    previousTotal: 0
  });

  const calendarRef = useRef(null);

  const fetchReservationAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/analytics/reservations/detailed?range=${dateRange}`;
      
      // Add custom date parameters if custom range is selected
      if (dateRange === "custom" && customStartDate && customEndDate) {
        url = `/analytics/reservations/detailed?startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      
      console.log("Fetching analytics from:", url);
      const response = await api.get(url);
      
      if (response.data && response.data.success) {
        setReservationData(response.data.data);
        console.log("Reservation analytics data loaded:", response.data.data);
      } else {
        console.error("API returned unsuccessful response:", response.data);
        // Fallback to simple endpoint if detailed fails
        await fetchSimpleAnalytics();
      }
    } catch (error) {
      console.error("Error fetching detailed analytics:", error);
      // Fallback to simple endpoint
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
        console.log("Simple analytics loaded:", response.data.data);
      }
    } catch (error) {
      console.error("Error fetching simple analytics:", error);
    }
  };

  useEffect(() => {
    fetchReservationAnalytics();
  }, [fetchReservationAnalytics]);

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

  // CSV Export Function
  const exportToCSV = () => {
    try {
      // Create CSV content
      let csvContent = "";
      
      // Helper to add a row
      const addRow = (cells) => {
        csvContent += cells.join(',') + '\n';
      };

      // Helper to escape CSV fields
      const escapeField = (field) => {
        if (field === null || field === undefined) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      };

      // Get date range description
      let rangeDescription = "";
      if (dateRange === "week") rangeDescription = "Last 7 days";
      else if (dateRange === "month") rangeDescription = "Last 30 days";
      else if (dateRange === "year") rangeDescription = "Last 12 months";
      else if (dateRange === "custom") rangeDescription = `${formatDate(customStartDate)} to ${formatDate(customEndDate)}`;

      // 1. Summary Section
      addRow(['RESERVATION ANALYTICS REPORT', `Generated: ${new Date().toLocaleString()}`]);
      addRow(['Date Range', rangeDescription]);
      addRow([]);
      
      // 2. Key Metrics
      addRow(['KEY METRICS']);
      addRow(['Metric', 'Value', 'Change', 'Direction']);
      addRow([
        'Total Reservations', 
        reservationData.total || 0,
        `${reservationData.trends?.total?.percentage || 0}%`,
        reservationData.trends?.total?.direction || 'none'
      ]);
      addRow([
        'Pending', 
        reservationData.pending || 0,
        `${reservationData.trends?.pending?.percentage || 0}%`,
        reservationData.trends?.pending?.direction || 'none'
      ]);
      addRow([
        'Approved', 
        reservationData.approved || 0,
        `${reservationData.trends?.approved?.percentage || 0}%`,
        reservationData.trends?.approved?.direction || 'none'
      ]);
      addRow([
        'Completed', 
        reservationData.completed || 0,
        `${reservationData.trends?.completed?.percentage || 0}%`,
        reservationData.trends?.completed?.direction || 'none'
      ]);
      addRow([
        'Cancelled', 
        reservationData.cancelled || 0,
        `${reservationData.trends?.cancelled?.percentage || 0}%`,
        reservationData.trends?.cancelled?.direction || 'none'
      ]);
      addRow(['Rejected', reservationData.rejected || 0, '', '']);
      addRow(['Expired', reservationData.expired || 0, '', '']);
      addRow(['Ongoing', reservationData.ongoing || 0, '', '']);
      addRow([]);
      
      // 3. Reservation Status Breakdown
      addRow(['RESERVATION STATUS BREAKDOWN']);
      addRow(['Status', 'Count', 'Percentage']);
      const total = reservationData.total || 1;
      addRow(['Pending', reservationData.pending || 0, `${Math.round((reservationData.pending / total) * 100)}%`]);
      addRow(['Approved', reservationData.approved || 0, `${Math.round((reservationData.approved / total) * 100)}%`]);
      addRow(['Completed', reservationData.completed || 0, `${Math.round((reservationData.completed / total) * 100)}%`]);
      addRow(['Cancelled', reservationData.cancelled || 0, `${Math.round((reservationData.cancelled / total) * 100)}%`]);
      addRow(['Rejected', reservationData.rejected || 0, `${Math.round((reservationData.rejected / total) * 100)}%`]);
      addRow(['Expired', reservationData.expired || 0, `${Math.round((reservationData.expired / total) * 100)}%`]);
      addRow(['Ongoing', reservationData.ongoing || 0, `${Math.round((reservationData.ongoing / total) * 100)}%`]);
      addRow([]);
      
      // 4. Peak Hours
      addRow(['PEAK HOURS']);
      addRow(['Time Slot', 'Number of Reservations', 'Percentage']);
      const totalTime = (reservationData.byTimeOfDay?.morning || 0) + 
                       (reservationData.byTimeOfDay?.afternoon || 0) + 
                       (reservationData.byTimeOfDay?.evening || 0) || 1;
      addRow(['Morning (8AM-12PM)', reservationData.byTimeOfDay?.morning || 0, `${Math.round((reservationData.byTimeOfDay.morning / totalTime) * 100)}%`]);
      addRow(['Afternoon (12PM-5PM)', reservationData.byTimeOfDay?.afternoon || 0, `${Math.round((reservationData.byTimeOfDay.afternoon / totalTime) * 100)}%`]);
      addRow(['Evening (5PM-9PM)', reservationData.byTimeOfDay?.evening || 0, `${Math.round((reservationData.byTimeOfDay.evening / totalTime) * 100)}%`]);
      addRow([]);
      
      // 5. Day of Week Distribution
      addRow(['DAY OF WEEK DISTRIBUTION']);
      addRow(['Day', 'Reservations', 'Percentage']);
      const totalDays = Object.values(reservationData.byDayOfWeek || {}).reduce((a, b) => a + b, 0) || 1;
      addRow(['Monday', reservationData.byDayOfWeek?.mon || 0, `${Math.round((reservationData.byDayOfWeek.mon / totalDays) * 100)}%`]);
      addRow(['Tuesday', reservationData.byDayOfWeek?.tue || 0, `${Math.round((reservationData.byDayOfWeek.tue / totalDays) * 100)}%`]);
      addRow(['Wednesday', reservationData.byDayOfWeek?.wed || 0, `${Math.round((reservationData.byDayOfWeek.wed / totalDays) * 100)}%`]);
      addRow(['Thursday', reservationData.byDayOfWeek?.thu || 0, `${Math.round((reservationData.byDayOfWeek.thu / totalDays) * 100)}%`]);
      addRow(['Friday', reservationData.byDayOfWeek?.fri || 0, `${Math.round((reservationData.byDayOfWeek.fri / totalDays) * 100)}%`]);
      addRow(['Saturday', reservationData.byDayOfWeek?.sat || 0, `${Math.round((reservationData.byDayOfWeek.sat / totalDays) * 100)}%`]);
      addRow(['Sunday', reservationData.byDayOfWeek?.sun || 0, `${Math.round((reservationData.byDayOfWeek.sun / totalDays) * 100)}%`]);
      addRow([]);
      
      // 6. Popular Rooms
      addRow(['MOST POPULAR ROOMS']);
      addRow(['Room', 'Total Bookings', 'Approved', 'Completed', 'Utilization']);
      if (reservationData.popularRooms && reservationData.popularRooms.length > 0) {
        reservationData.popularRooms.forEach(room => {
          addRow([
            room.name || 'Unknown',
            room.bookings || 0,
            room.approved || 0,
            room.completed || 0,
            `${room.utilization || 0}%`
          ]);
        });
      } else {
        addRow(['No popular rooms data available', '', '', '', '']);
      }
      addRow([]);
      
      // 7. Floor Distribution
      addRow(['FLOOR DISTRIBUTION']);
      addRow(['Floor', 'Reservations', 'Percentage']);
      if (reservationData.floorDistribution && reservationData.floorDistribution.length > 0) {
        reservationData.floorDistribution.forEach(floor => {
          addRow([
            floor.name || 'Unknown',
            floor.value || 0,
            `${Math.round((floor.value / total) * 100)}%`
          ]);
        });
      } else {
        addRow(['No floor distribution data', '', '']);
      }
      addRow([]);
      
      // 8. Additional Stats
      addRow(['ADDITIONAL STATISTICS']);
      addRow(['Average Group Size', reservationData.avgGroupSize || 0]);
      addRow(['Total Participants', reservationData.totalParticipants || 0]);
      addRow(['Previous Period Total', reservationData.previousTotal || 0]);
      
      // 9. Growth Data
      addRow([]);
      addRow(['RESERVATION GROWTH', `(${dateRange === 'week' ? 'Daily' : dateRange === 'month' ? 'Weekly' : 'Monthly'})`]);
      addRow(['Period', 'New Reservations']);
      if (reservationData.growth?.labels && reservationData.growth.labels.length > 0) {
        reservationData.growth.labels.forEach((label, index) => {
          addRow([label, reservationData.growth?.values?.[index] || 0]);
        });
      } else {
        addRow(['No growth data available', '']);
      }

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `reservation_analytics_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, color = "blue", isLoading = false }) => {
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

    if (isLoading) {
      return (
        <div className="flex-1 min-w-[200px] bg-[#1a1a1a] p-4 rounded-lg border border-gray-800 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-600 rounded w-16"></div>
            </div>
            <div className="p-2">
              <div className="w-5 h-5 bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 min-w-[200px] bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 font-medium">{title}</p>
            <p className="text-2xl font-bold text-white">
              {typeof value === 'number' ? value.toLocaleString() : value}
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
              </div>
            )}
          </div>
          <div className="p-2 bg-gray-800 rounded-lg">
            <Icon className={getColorClass(color)} size={20} />
          </div>
        </div>
      </div>
    );
  };

  const ProgressBarSkeleton = () => (
    <div className="animate-pulse">
      <div className="flex justify-between mb-1">
        <div className="h-4 bg-gray-700 rounded w-24"></div>
        <div className="h-4 bg-gray-700 rounded w-12"></div>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div className="bg-gray-600 rounded-full h-2 w-3/4"></div>
      </div>
    </div>
  );

  const TableRowSkeleton = ({ cols }) => (
    <tr className="animate-pulse">
      {Array(cols).fill(0).map((_, i) => (
        <td key={i} className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-700 rounded w-24"></div>
        </td>
      ))}
    </tr>
  );

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
          <span className="text-gray-400 capitalize">{label}</span>
          {showValue && <span className="text-white font-medium">{value.toLocaleString()}</span>}
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div 
            className={`${getBgColorClass(color)} rounded-full h-2 transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  if (loading && !reservationData.total) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pl-[250px]">
        <div className="p-8 flex items-center justify-center h-screen">
          <RefreshCw size={40} className="animate-spin text-red-500" />
        </div>
      </div>
    );
  }

  const totalReservations = reservationData.total || 0;
  const totalTimeSlots = (reservationData.byTimeOfDay?.morning || 0) + 
                        (reservationData.byTimeOfDay?.afternoon || 0) + 
                        (reservationData.byTimeOfDay?.evening || 0) || 1;
  const totalDays = Object.values(reservationData.byDayOfWeek || {}).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pl-[250px]">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Reservation Analytics</h1>
            <p className="text-gray-400">
              {dateRange === 'week' ? 'Last 7 days' : 
               dateRange === 'month' ? 'Last 30 days' : 
               dateRange === 'year' ? 'Last 12 months' : 
               dateRange === 'custom' && customStartDate && customEndDate ? `${formatDate(customStartDate)} to ${formatDate(customEndDate)}` : 
               'Track booking patterns, trends, and room utilization'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-[#1a1a1a] rounded-lg p-1 border border-gray-800 relative">
              {["week", "month", "year"].map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setDateRange(range);
                    setShowCustomDate(false);
                  }}
                  className={`px-4 py-2 text-sm rounded-md transition-all cursor-pointer ${
                    dateRange === range && !showCustomDate
                      ? "bg-red-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
              
              {/* Custom Date Button */}
              <button
                onClick={() => setShowCustomDate(!showCustomDate)}
                className={`px-4 py-2 text-sm rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  showCustomDate || dateRange === 'custom'
                    ? "bg-red-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Calendar size={14} />
                <span>Custom</span>
              </button>

              {/* Custom Date Range Picker */}
              {showCustomDate && (
                <div 
                  ref={calendarRef}
                  className="absolute top-12 right-0 bg-[#1a1a1a] p-4 rounded-lg shadow-lg border border-gray-800 z-50 w-72"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-white">Select Date Range</h3>
                    <button
                      onClick={() => setShowCustomDate(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-white"
                        max={customEndDate || undefined}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-white"
                        min={customStartDate || undefined}
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleCustomDateApply}
                        className="flex-1 bg-red-600 text-white text-sm py-2 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Apply
                      </button>
                      <button
                        onClick={handleCustomDateClear}
                        className="flex-1 bg-gray-700 text-white text-sm py-2 rounded-lg hover:bg-gray-600 transition-colors"
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
              onClick={fetchReservationAnalytics}
              className="p-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
            <p className="text-sm text-gray-400 mb-1">Approved</p>
            <p className="text-xl font-bold text-white">{reservationData.approved?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
            <p className="text-sm text-gray-400 mb-1">Rejected</p>
            <p className="text-xl font-bold text-white">{reservationData.rejected?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
            <p className="text-sm text-gray-400 mb-1">Expired</p>
            <p className="text-xl font-bold text-white">{reservationData.expired?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
            <p className="text-sm text-gray-400 mb-1">Ongoing</p>
            <p className="text-xl font-bold text-white">{reservationData.ongoing?.toLocaleString() || 0}</p>
          </div>
        </div>

        {/* Reservation Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4">Reservation Status Breakdown</h2>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">{reservationData.pending}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                  {reservationData.trends?.pending?.percentage > 0 && (
                    <div className="flex items-center justify-center gap-1 text-xs mt-1">
                      {reservationData.trends.pending.direction === 'up' ? (
                        <ArrowUp size={12} className="text-green-500" />
                      ) : (
                        <ArrowDown size={12} className="text-red-500" />
                      )}
                      <span className={reservationData.trends.pending.direction === 'up' ? "text-green-500" : "text-red-500"}>
                        {reservationData.trends.pending.percentage}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{reservationData.approved}</div>
                  <div className="text-xs text-gray-500">Approved</div>
                  {reservationData.trends?.approved?.percentage > 0 && (
                    <div className="flex items-center justify-center gap-1 text-xs mt-1">
                      {reservationData.trends.approved.direction === 'up' ? (
                        <ArrowUp size={12} className="text-green-500" />
                      ) : (
                        <ArrowDown size={12} className="text-red-500" />
                      )}
                      <span className={reservationData.trends.approved.direction === 'up' ? "text-green-500" : "text-red-500"}>
                        {reservationData.trends.approved.percentage}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">{reservationData.rejected}</div>
                  <div className="text-xs text-gray-500">Rejected</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{reservationData.completed}</div>
                  <div className="text-xs text-gray-500">Completed</div>
                  {reservationData.trends?.completed?.percentage > 0 && (
                    <div className="flex items-center justify-center gap-1 text-xs mt-1">
                      {reservationData.trends.completed.direction === 'up' ? (
                        <ArrowUp size={12} className="text-green-500" />
                      ) : (
                        <ArrowDown size={12} className="text-red-500" />
                      )}
                      <span className={reservationData.trends.completed.direction === 'up' ? "text-green-500" : "text-red-500"}>
                        {reservationData.trends.completed.percentage}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-500">{reservationData.cancelled}</div>
                  <div className="text-xs text-gray-500">Cancelled</div>
                  {reservationData.trends?.cancelled?.percentage > 0 && (
                    <div className="flex items-center justify-center gap-1 text-xs mt-1">
                      {reservationData.trends.cancelled.direction === 'up' ? (
                        <ArrowUp size={12} className="text-green-500" />
                      ) : (
                        <ArrowDown size={12} className="text-red-500" />
                      )}
                      <span className={reservationData.trends.cancelled.direction === 'up' ? "text-green-500" : "text-red-500"}>
                        {reservationData.trends.cancelled.percentage}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Average Group Size</h2>
            {loading ? (
              <div className="h-32 flex items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-red-500" />
              </div>
            ) : (
              <div className="text-center">
                <div className="text-5xl font-bold text-red-500 mb-2">{reservationData.avgGroupSize || 0}</div>
                <p className="text-gray-400">people per reservation</p>
                <div className="mt-4 text-sm text-gray-500">
                  Total Participants: {reservationData.totalParticipants?.toLocaleString() || 0}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Day of Week Distribution */}
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Reservations by Day of Week</h2>
          {loading ? (
            <div className="grid grid-cols-7 gap-2">
              {Array(7).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-32 bg-gray-800 rounded-t mb-2"></div>
                  <div className="h-4 bg-gray-800 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {Object.entries(reservationData.byDayOfWeek || {}).map(([day, count], index) => {
                const dayNames = {
                  mon: 'Monday',
                  tue: 'Tuesday',
                  wed: 'Wednesday',
                  thu: 'Thursday',
                  fri: 'Friday',
                  sat: 'Saturday',
                  sun: 'Sunday'
                };
                const percentage = (count / totalDays) * 100;
                const height = Math.max(percentage, 4);
                
                return (
                  <div key={day} className="flex flex-col items-center">
                    <div className="w-full bg-gray-800 rounded-t relative group mb-2" style={{ height: `${height * 2}px` }}>
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-gray-700">
                        {count} reservations
                      </div>
                      <div 
                        className="bg-red-500 rounded-t w-full absolute bottom-0"
                        style={{ height: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{dayNames[day]?.substring(0, 3) || day}</span>
                    <span className="text-sm text-white font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Growth Chart */}
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            Reservation Growth - {dateRange === 'week' ? 'Daily' : dateRange === 'month' ? 'Weekly' : dateRange === 'year' ? 'Monthly' : 'Custom Period'}
          </h2>
          {loading ? (
            <div className="h-64 flex items-end justify-between gap-2 animate-pulse">
              {Array(7).fill(0).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-gray-800 rounded-t h-32"></div>
                  <div className="h-3 bg-gray-800 rounded w-8"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-end justify-between gap-2">
              {reservationData.growth?.values && reservationData.growth.values.length > 0 ? (
                reservationData.growth.values.map((value, index) => {
                  const max = Math.max(...reservationData.growth.values, 1);
                  const height = max > 0 ? (value / max) * 100 : 0;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-red-500/20 rounded-t relative group"
                        style={{ height: `${height}%`, minHeight: '4px' }}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-gray-700">
                          {value} reservations
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{reservationData.growth.labels?.[index] || ''}</span>
                    </div>
                  );
                })
              ) : (
                <div className="w-full text-center text-gray-500 py-12">
                  No growth data available for this period
                </div>
              )}
            </div>
          )}
        </div>

        {/* Popular Rooms */}
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Most Popular Rooms</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Room</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Total Bookings</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Approved</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Completed</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Utilization Rate</th>
                </tr>
              </thead>
              <tbody>
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
                      <tr key={index} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                        <td className="py-3 text-white font-medium">{room.name}</td>
                        <td className="py-3 text-white">{room.bookings}</td>
                        <td className="py-3 text-green-500">{room.approved || 0}</td>
                        <td className="py-3 text-blue-500">{room.completed || 0}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-green-500 rounded-full h-2" 
                                style={{ width: `${room.utilization}%` }}
                              ></div>
                            </div>
                            <span className="text-gray-400 text-sm">{room.utilization}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No room data available
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Floor Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Reservations by Floor</h2>
            {loading ? (
              <div className="space-y-4">
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
              </div>
            ) : (
              <div className="space-y-4">
                {reservationData.floorDistribution && reservationData.floorDistribution.length > 0 ? (
                  reservationData.floorDistribution.slice(0, 5).map((floor, index) => (
                    <ProgressBar 
                      key={index}
                      label={floor.name} 
                      value={floor.value} 
                      total={reservationData.total || 1} 
                      color={index === 0 ? "blue" : index === 1 ? "green" : index === 2 ? "purple" : "orange"}
                    />
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No floor distribution data available</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Room Table */}
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">Room Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Room</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Total</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Approved</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Pending</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Completed</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Cancelled</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>
                    <TableRowSkeleton cols={6} />
                    <TableRowSkeleton cols={6} />
                    <TableRowSkeleton cols={6} />
                  </>
                ) : (
                  reservationData.byRoom && reservationData.byRoom.length > 0 ? (
                    reservationData.byRoom.map((room, index) => (
                      <tr key={index} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                        <td className="py-3 text-white font-medium">{room.name}</td>
                        <td className="py-3 text-white">{room.count}</td>
                        <td className="py-3 text-green-500">{room.approved || 0}</td>
                        <td className="py-3 text-yellow-500">{room.pending || 0}</td>
                        <td className="py-3 text-blue-500">{room.completed || 0}</td>
                        <td className="py-3 text-red-500">{room.cancelled || 0}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No room data available
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsReservations;