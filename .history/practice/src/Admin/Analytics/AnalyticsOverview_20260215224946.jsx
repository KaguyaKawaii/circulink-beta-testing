import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  CalendarCheck,
  DoorOpen,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Activity,
  PieChart,
} from "lucide-react";
import api from "../../utils/api";

function AnalyticsOverview({ setView, admin }) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month"); // week, month, year
  const [analyticsData, setAnalyticsData] = useState({
    users: {
      total: 0,
      active: 0,
      new: 0,
      byRole: { student: 0, faculty: 0, staff: 0 },
      trend: { percentage: 0, direction: "up" }
    },
    reservations: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      cancelled: 0,
      byRoom: [],
      trend: { percentage: 0, direction: "up" }
    },
    rooms: {
      total: 0,
      available: 0,
      occupied: 0,
      maintenance: 0,
      utilization: 0,
      mostBooked: []
    },
    engagement: {
      dailyActive: 0,
      weeklyActive: 0,
      monthlyActive: 0,
      averageSession: 0,
      retention: 0
    }
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // In a real implementation, you would fetch from your API
      // const response = await api.get(`/api/admin/analytics?range=${dateRange}`);
      // setAnalyticsData(response.data);
      
      // For now, using mock data
      setTimeout(() => {
        setAnalyticsData(getMockAnalyticsData(dateRange));
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setLoading(false);
    }
  };

  const getMockAnalyticsData = (range) => {
    // Mock data based on date range
    const multipliers = {
      week: 1,
      month: 4,
      year: 48
    };
    
    const mult = multipliers[range] || 4;
    
    return {
      users: {
        total: 1250 * mult,
        active: 890 * mult,
        new: 145 * mult,
        byRole: { 
          student: Math.floor(850 * mult), 
          faculty: Math.floor(250 * mult), 
          staff: Math.floor(150 * mult) 
        },
        trend: { percentage: 12.5, direction: "up" }
      },
      reservations: {
        total: 3420 * mult,
        pending: 45 * mult,
        approved: 210 * mult,
        rejected: 28 * mult,
        completed: 3120 * mult,
        cancelled: 17 * mult,
        byRoom: [
          { name: "Room 101", count: 450 },
          { name: "Room 102", count: 380 },
          { name: "Room 103", count: 520 },
          { name: "Room 201", count: 290 },
          { name: "Room 202", count: 410 }
        ],
        trend: { percentage: 8.3, direction: "up" }
      },
      rooms: {
        total: 25,
        available: 12,
        occupied: 8,
        maintenance: 3,
        utilization: 68,
        mostBooked: [
          { name: "Room 103", bookings: 520 },
          { name: "Room 101", bookings: 450 },
          { name: "Room 202", bookings: 410 },
          { name: "Room 102", bookings: 380 }
        ]
      },
      engagement: {
        dailyActive: 320,
        weeklyActive: 1850,
        monthlyActive: 4250,
        averageSession: 24, // minutes
        retention: 76 // percentage
      }
    };
  };

  const handleExportData = () => {
    // Implement export functionality
    console.log("Exporting analytics data...");
  };

  const StatCard = ({ title, value, icon: Icon, trend, color = "blue", subtext }) => (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.direction === "up" ? (
                <ArrowUp size={16} className="text-green-500" />
              ) : (
                <ArrowDown size={16} className="text-red-500" />
              )}
              <span className={`text-sm ${trend.direction === "up" ? "text-green-500" : "text-red-500"}`}>
                {trend.percentage}%
              </span>
              <span className="text-xs text-gray-500 ml-1">vs last period</span>
            </div>
          )}
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 bg-${color}-500/10 rounded-lg`}>
          <Icon size={24} className={`text-${color}-500`} />
        </div>
      </div>
    </div>
  );

  const ProgressBar = ({ label, value, max, color = "blue" }) => {
    const percentage = (value / max) * 100;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-300">{label}</span>
          <span className="text-gray-400">{value}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`bg-${color}-500 rounded-full h-2 transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pl-[250px]">
        <div className="p-8">
          <div className="flex items-center justify-center h-[80vh]">
            <div className="text-center">
              <RefreshCw size={40} className="animate-spin text-red-500 mx-auto mb-4" />
              <p className="text-gray-400">Loading analytics data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pl-[250px]">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Analytics Overview</h1>
            <p className="text-gray-400">Comprehensive insights and metrics for your platform</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Date Range Selector */}
            <div className="flex bg-[#1a1a1a] rounded-lg p-1 border border-gray-800">
              {["week", "month", "year"].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 text-sm rounded-md transition-all cursor-pointer ${
                    dateRange === range
                      ? "bg-red-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={handleExportData}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-gray-300 hover:bg-gray-800 transition-all cursor-pointer"
            >
              <Download size={18} />
              <span>Export</span>
            </button>
            <button
              onClick={fetchAnalyticsData}
              className="p-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all cursor-pointer"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Quick Navigation to Specific Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setView("analyticsUsers")}
            className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 hover:from-blue-700 hover:to-blue-800 transition-all cursor-pointer text-left"
          >
            <Users size={24} className="text-white mb-3" />
            <h3 className="text-lg font-semibold text-white">User Analytics</h3>
            <p className="text-blue-100 text-sm mt-1">View user growth, roles, and activity</p>
          </button>
          <button
            onClick={() => setView("analyticsReservations")}
            className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 hover:from-green-700 hover:to-green-800 transition-all cursor-pointer text-left"
          >
            <CalendarCheck size={24} className="text-white mb-3" />
            <h3 className="text-lg font-semibold text-white">Reservation Analytics</h3>
            <p className="text-green-100 text-sm mt-1">Track booking patterns and trends</p>
          </button>
          <button
            onClick={() => setView("analyticsRooms")}
            className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 hover:from-purple-700 hover:to-purple-800 transition-all cursor-pointer text-left"
          >
            <DoorOpen size={24} className="text-white mb-3" />
            <h3 className="text-lg font-semibold text-white">Room Analytics</h3>
            <p className="text-purple-100 text-sm mt-1">Monitor room utilization and popularity</p>
          </button>
          <button
            onClick={() => setView("analyticsEngagement")}
            className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-6 hover:from-orange-700 hover:to-orange-800 transition-all cursor-pointer text-left"
          >
            <Activity size={24} className="text-white mb-3" />
            <h3 className="text-lg font-semibold text-white">Engagement Metrics</h3>
            <p className="text-orange-100 text-sm mt-1">Analyze user engagement and retention</p>
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={analyticsData.users.total}
            icon={Users}
            trend={analyticsData.users.trend}
            color="blue"
            subtext={`${analyticsData.users.active} active users`}
          />
          <StatCard
            title="Total Reservations"
            value={analyticsData.reservations.total}
            icon={CalendarCheck}
            trend={analyticsData.reservations.trend}
            color="green"
            subtext={`${analyticsData.reservations.completed} completed`}
          />
          <StatCard
            title="Room Utilization"
            value={`${analyticsData.rooms.utilization}%`}
            icon={DoorOpen}
            color="purple"
            subtext={`${analyticsData.rooms.occupied} of ${analyticsData.rooms.total} rooms occupied`}
          />
          <StatCard
            title="Active Today"
            value={analyticsData.engagement.dailyActive}
            icon={Activity}
            color="orange"
            subtext={`${analyticsData.engagement.weeklyActive} this week`}
          />
        </div>

        {/* Charts and Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* User Distribution */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4">User Distribution</h2>
            <div className="space-y-4">
              <ProgressBar 
                label="Students" 
                value={analyticsData.users.byRole.student} 
                max={analyticsData.users.total}
                color="blue"
              />
              <ProgressBar 
                label="Faculty" 
                value={analyticsData.users.byRole.faculty} 
                max={analyticsData.users.total}
                color="green"
              />
              <ProgressBar 
                label="Staff" 
                value={analyticsData.users.byRole.staff} 
                max={analyticsData.users.total}
                color="purple"
              />
            </div>
            <div className="mt-6 pt-6 border-t border-gray-800">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">{analyticsData.users.byRole.student}</p>
                  <p className="text-xs text-gray-500">Students</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{analyticsData.users.byRole.faculty}</p>
                  <p className="text-xs text-gray-500">Faculty</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{analyticsData.users.byRole.staff}</p>
                  <p className="text-xs text-gray-500">Staff</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reservation Status */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Reservation Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Pending</span>
                <span className="text-yellow-500 font-semibold">{analyticsData.reservations.pending}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Approved</span>
                <span className="text-green-500 font-semibold">{analyticsData.reservations.approved}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Rejected</span>
                <span className="text-red-500 font-semibold">{analyticsData.reservations.rejected}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Completed</span>
                <span className="text-blue-500 font-semibold">{analyticsData.reservations.completed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Cancelled</span>
                <span className="text-gray-500 font-semibold">{analyticsData.reservations.cancelled}</span>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-800">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Completion Rate</span>
                <span className="text-white font-semibold">
                  {Math.round((analyticsData.reservations.completed / analyticsData.reservations.total) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Room Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Most Booked Rooms */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Most Booked Rooms</h2>
            <div className="space-y-3">
              {analyticsData.rooms.mostBooked.map((room, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                    <span className="text-gray-300">{room.name}</span>
                  </div>
                  <span className="text-white font-semibold">{room.bookings} bookings</span>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Engagement Metrics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#222] p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Daily Active</p>
                <p className="text-xl font-bold text-white">{analyticsData.engagement.dailyActive}</p>
              </div>
              <div className="bg-[#222] p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Weekly Active</p>
                <p className="text-xl font-bold text-white">{analyticsData.engagement.weeklyActive}</p>
              </div>
              <div className="bg-[#222] p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Monthly Active</p>
                <p className="text-xl font-bold text-white">{analyticsData.engagement.monthlyActive}</p>
              </div>
              <div className="bg-[#222] p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Avg. Session</p>
                <p className="text-xl font-bold text-white">{analyticsData.engagement.averageSession}m</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">User Retention</span>
                <span className="text-green-500 font-semibold">{analyticsData.engagement.retention}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Preview */}
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <button 
              onClick={() => setView("adminLogs")}
              className="text-sm text-red-500 hover:text-red-400 cursor-pointer"
            >
              View All Logs →
            </button>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-center gap-3 p-3 bg-[#222] rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">
                    New reservation created for Room 101 by John Doe
                  </p>
                  <p className="text-xs text-gray-500">2 minutes ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsOverview;