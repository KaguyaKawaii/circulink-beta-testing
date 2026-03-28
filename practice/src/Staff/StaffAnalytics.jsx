// Staff/StaffAnalytics.jsx
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
  AlertCircle,
  TrendingUp,
  BarChart3,
  PieChart,
  DoorOpen,
  CalendarDays,
  LayoutGrid,
  Activity
} from "lucide-react";
import api from "../utils/api";

function StaffAnalytics({ setView, staff }) {
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
    if (!staff?._id || !staff?.floor) {
      console.log("Staff data missing:", staff);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let url = `/analytics/staff/reservations?staffId=${staff._id}&staffFloor=${staff.floor}&range=${dateRange}`;
      
      if (dateRange === "custom" && customStartDate && customEndDate) {
        url = `/analytics/staff/reservations?staffId=${staff._id}&staffFloor=${staff.floor}&startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      
      console.log("Fetching staff analytics:", url);
      const response = await api.get(url);
      
      if (response.data && response.data.success) {
        setReservationData(response.data.data);
      } else {
        console.error("API response error:", response.data);
      }
    } catch (error) {
      console.error("Error fetching staff reservation analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate, staff?._id, staff?.floor]);

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
      addRow(['STAFF RESERVATION ANALYTICS REPORT']);
      addRow(['========================================']);
      addBlankRow();
      addRow(['Generated by:', staff?.name || 'Staff User']);
      addRow(['Floor:', staff?.floor || 'Unknown']);
      addRow(['Generated on:', new Date().toLocaleString()]);
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

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Staff_Reservation_Analytics_${staff?.floor}_${new Date().toISOString().split('T')[0]}.csv`);
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
      return (
        <div className="flex-1 min-w-[200px] bg-white p-5 rounded-xl border border-gray-200 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-300 rounded w-16 mb-2"></div>
            </div>
            <div className="p-3 bg-gray-200 rounded-xl">
              <div className="w-5 h-5"></div>
            </div>
          </div>
        </div>
      );
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
          </div>
          <div className={`p-3 ${getBgColorClass(color)} rounded-xl`}>
            <Icon className={getColorClass(color)} size={22} />
          </div>
        </div>
      </div>
    );
  };

  const totalReservations = reservationData.total || 0;
  const totalDays = Object.values(reservationData.byDayOfWeek || {}).reduce((a, b) => a + b, 0) || 1;
  const maxDayValue = Math.max(...Object.values(reservationData.byDayOfWeek || {}), 1);
  const chartHeight = 250;

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
            </div>
          </div>
        </header>
        <div className="p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading analytics data...</p>
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
              Reservation Analytics - Floor {staff?.floor || 'Unknown'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {dateRange === 'week' ? 'Last 7 days' : 
               dateRange === 'month' ? 'Last 30 days' : 
               dateRange === 'year' ? 'Last 12 months' : 
               dateRange === 'custom' && customStartDate && customEndDate ? `${formatDate(customStartDate)} to ${formatDate(customEndDate)}` : 
               'Track booking patterns and room utilization on your floor'}
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
                  {range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'Year'}
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
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm w-full focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
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
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer shadow-sm"
            >
              <Download size={18} />
              <span className="text-sm font-medium">Export</span>
            </button>

            <button 
              onClick={fetchReservationAnalytics}
              className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-50 cursor-pointer transition-all"
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
              <span className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                Floor {staff?.floor}
              </span>
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

        {/* Day of Week Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <CalendarDays size={20} className="text-green-500" />
            Reservations by Day of Week
          </h2>
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
                        className="w-3/4 bg-gradient-to-t from-[#CC0000] to-[#FF4444] rounded-t transition-all duration-300"
                        style={{ height: `${barHeight}px` }}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                          {count} reservations
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 font-medium text-center">{dayNames[day] || day}</span>
                  <span className="text-sm font-bold text-gray-800 mt-1">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Popular Rooms */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <DoorOpen size={20} className="text-purple-500" />
            Most Popular Rooms on Floor {staff?.floor}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Room</th>
                  <th className="px-6 py-3 text-left font-medium">Total Bookings</th>
                  <th className="px-6 py-3 text-left font-medium">Approved</th>
                  <th className="px-6 py-3 text-left font-medium">Completed</th>
                  <th className="px-6 py-3 text-left font-medium">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reservationData.popularRooms && reservationData.popularRooms.length > 0 ? (
                  reservationData.popularRooms.map((room, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{room.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold">{room.bookings.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-green-600">{room.approved || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-blue-600">{room.completed || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-green-500 rounded-full h-2"
                              style={{ width: `${Math.min(room.utilization, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{Math.min(room.utilization, 100)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No popular rooms data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

export default StaffAnalytics;