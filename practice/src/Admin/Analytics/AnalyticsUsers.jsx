import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Search,
  Activity,
  UserCheck,
  UserX,
  Award,
  GraduationCap,
  UserCog,
  Building,
  ChevronDown,
  X,
  Calendar,
  Clock,
  TrendingUp
} from "lucide-react";
import api from "../../utils/api";

function AnalyticsUsers({ setView, admin }) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [search, setSearch] = useState("");
  const [userData, setUserData] = useState({
    total: 0,
    active: 0,
    new: 0,
    deleted: 0,
    byRole: {
      student: 0,
      faculty: 0,
      staff: 0,
      admin: 0
    },
    byStatus: {
      active: 0,
      inactive: 0,
      suspended: 0,
      pending: 0,
      verified: 0,
      unverified: 0
    },
    byDepartment: [],
    growth: {
      labels: [],
      values: []
    },
    trends: {
      daily: { value: 0, percentage: 0, direction: 'up' },
      weekly: { value: 0, percentage: 0, direction: 'up' },
      monthly: { value: 0, percentage: 0, direction: 'up' }
    },
    topUsers: [],
    registrationStats: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      avgPerDay: 0
    },
    activityStats: {
      activeToday: 0,
      activeThisWeek: 0,
      activeThisMonth: 0,
      retentionRate: 0
    },
    roleDistribution: [],
    departmentStats: []
  });

  const fetchUserAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch real data from your backend API
      const response = await api.get(`/analytics/users?range=${dateRange}`);
      
      if (response.data && response.data.success) {
        setUserData(response.data.data);
        console.log("Analytics data loaded for range:", dateRange);
      } else {
        console.error("API returned unsuccessful response:", response.data);
        // Fallback to empty data
        setUserData(prev => ({...prev}));
      }
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      // Show error state but don't crash
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchUserAnalytics();
  }, [fetchUserAnalytics]);

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

  const StatCard = ({ title, value, icon: Icon, trend, color = "blue" }) => {
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

    return (
      <div className="flex-1 min-w-[200px] bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">
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
          <div className="p-2">
            <Icon className={getColorClass(color)} size={20} />
          </div>
        </div>
      </div>
    );
  };

  const ProgressBar = ({ label, value, total, color = "blue", showValue = true }) => {
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

    return (
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 capitalize">{label}</span>
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

  const userStats = {
    total: userData.total,
    students: userData.byRole.student,
    faculty: userData.byRole.faculty,
    staff: userData.byRole.staff,
    staffOffice: userData.byRole.admin,
    verified: userData.byStatus.verified,
    unverified: userData.byStatus.unverified,
    suspended: userData.byStatus.suspended,
    active: userData.byStatus.active,
  };

  if (loading) {
    return (
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-screen">
          <RefreshCw size={40} className="animate-spin text-[#CC0000]" />
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
              User Analytics
            </h1>
            <p className="text-gray-600">
              {dateRange === 'week' ? 'Last 7 days' : 
               dateRange === 'month' ? 'Last 30 days' : 
               'Last 12 months'} - Real-time user data from database
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Date Range Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {["week", "month", "year"].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 text-sm rounded-md transition-all cursor-pointer ${
                    dateRange === range
                      ? "bg-[#CC0000] text-white"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  {range === 'week' ? 'Week' : 
                   range === 'month' ? 'Month' : 
                   'Year'}
                </button>
              ))}
            </div>
            <button className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-50 cursor-pointer">
              <Download size={18} />
            </button>
            <button 
              onClick={fetchUserAnalytics}
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
        {/* User Statistics Cards */}
        <div className="flex flex-col gap-4 mb-6 w-full">
          {/* Role Statistics Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">User Roles</h2>
            <div className="flex flex-wrap gap-4">
              <StatCard 
                title="Total Users" 
                value={userStats.total} 
                icon={Users} 
                trend={userData.trends?.monthly}
                color="blue" 
              />
              <StatCard 
                title="Students" 
                value={userStats.students} 
                icon={GraduationCap} 
                color="green" 
              />
              <StatCard 
                title="Faculty" 
                value={userStats.faculty} 
                icon={UserCog} 
                color="purple" 
              />
              <StatCard 
                title="Staff" 
                value={userStats.staff} 
                icon={UserCheck} 
                color="yellow" 
              />
              <StatCard 
                title="Admin" 
                value={userStats.staffOffice} 
                icon={Building} 
                color="indigo" 
              />
            </div>
          </div>

          {/* Status Statistics Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Account Status</h2>
            <div className="flex flex-wrap gap-4">
              <StatCard 
                title="Verified" 
                value={userStats.verified} 
                icon={UserCheck} 
                color="green" 
              />
              <StatCard 
                title="Unverified" 
                value={userStats.unverified} 
                icon={UserX} 
                color="red" 
              />
              <StatCard 
                title="Suspended" 
                value={userStats.suspended} 
                icon={UserX} 
                color="orange" 
              />
              <StatCard 
                title="Active (7d)" 
                value={userStats.active} 
                icon={Activity} 
                color="blue" 
              />
              <StatCard 
                title="Retention Rate" 
                value={`${userData.activityStats?.retentionRate || 0}%`} 
                icon={Award} 
                color="yellow" 
              />
            </div>
          </div>
        </div>

        {/* Search and Refresh */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <SearchInput search={search} setSearch={setSearch} />
            
            <button
              onClick={() => {
                setSearch("");
                fetchUserAnalytics();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* By Role */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Users by Role</h2>
            <div className="space-y-4">
              <ProgressBar 
                label="Students" 
                value={userData.byRole.student} 
                total={userData.total} 
                color="blue"
              />
              <ProgressBar 
                label="Faculty" 
                value={userData.byRole.faculty} 
                total={userData.total} 
                color="green"
              />
              <ProgressBar 
                label="Staff" 
                value={userData.byRole.staff} 
                total={userData.total} 
                color="purple"
              />
              <ProgressBar 
                label="Admin" 
                value={userData.byRole.admin} 
                total={userData.total} 
                color="orange"
              />
            </div>
          </div>

          {/* By Status */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Users by Status</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active (7d)</span>
                <span className="text-green-600 font-semibold">{userData.byStatus.active.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Inactive</span>
                <span className="text-yellow-600 font-semibold">{userData.byStatus.inactive.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Suspended</span>
                <span className="text-red-600 font-semibold">{userData.byStatus.suspended.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Verified</span>
                <span className="text-blue-600 font-semibold">{userData.byStatus.verified.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Unverified</span>
                <span className="text-orange-600 font-semibold">{userData.byStatus.unverified.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Top Departments */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Top Departments</h2>
            <div className="space-y-4">
              {userData.departmentStats?.slice(0, 5).map((dept, idx) => (
                <ProgressBar 
                  key={idx}
                  label={dept.name} 
                  value={dept.count} 
                  total={userData.total} 
                  color={idx === 0 ? "blue" : idx === 1 ? "green" : idx === 2 ? "purple" : "orange"}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Growth Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            User Growth - {dateRange === 'week' ? 'Daily' : dateRange === 'month' ? 'Weekly' : 'Monthly'}
          </h2>
          <div className="h-64 flex items-end justify-between gap-2">
            {userData.growth?.values?.map((value, index) => {
              const max = Math.max(...userData.growth.values, 1);
              const height = max > 0 ? (value / max) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-[#CC0000]/20 rounded-t relative group"
                    style={{ height: `${height}%`, minHeight: '4px' }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {value} new users
                    </div>
                  </div>
                  <span className="text-xs text-gray-600">{userData.growth.labels?.[index]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Registration Stats */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Registration Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 font-medium mb-1">Today</p>
              <p className="text-2xl font-bold text-gray-800">{userData.registrationStats?.today || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 font-medium mb-1">This Week</p>
              <p className="text-2xl font-bold text-gray-800">{userData.registrationStats?.thisWeek || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 font-medium mb-1">This Month</p>
              <p className="text-2xl font-bold text-gray-800">{userData.registrationStats?.thisMonth || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 font-medium mb-1">Avg. Per Day</p>
              <p className="text-2xl font-bold text-gray-800">{userData.registrationStats?.avgPerDay || 0}</p>
            </div>
          </div>
        </div>

        {/* Most Active Users */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Most Active Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">User</th>
                  <th className="px-6 py-3 text-left font-medium">Email</th>
                  <th className="px-6 py-3 text-left font-medium">Role</th>
                  <th className="px-6 py-3 text-left font-medium">Actions</th>
                  <th className="px-6 py-3 text-left font-medium">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {userData.topUsers?.map((user, index) => (
                  <tr key={user.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role?.toLowerCase() === 'student' ? 'bg-green-100 text-green-800' :
                        user.role?.toLowerCase() === 'faculty' ? 'bg-purple-100 text-purple-800' :
                        user.role?.toLowerCase() === 'staff' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800 font-medium">{user.reservations}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {user.lastActive ? formatDateTime(user.lastActive) : 'Never'}
                    </td>
                  </tr>
                ))}
                {(!userData.topUsers || userData.topUsers.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No user activity data available
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

// SearchInput component
function SearchInput({ search, setSearch }) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search users..."
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-0"
      />
      {search && (
        <button
          onClick={() => setSearch("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export default AnalyticsUsers;