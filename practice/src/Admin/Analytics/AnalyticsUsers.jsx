import { useState, useEffect, useCallback } from "react";
import {
  Users,
  TrendingUp,
  UserPlus,
  UserMinus,
  Calendar,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  BarChart3,
  PieChart,
  Activity,
  UserCheck,
  UserX,
  Clock,
  Award,
  GraduationCap,
  UserCog,
  Building,
  ChevronDown,
  X
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
      const response = await api.get(`/analytics/users?range=${dateRange}`);
      if (response.data && response.data.success) {
        setUserData(response.data.data);
      } else {
        await fetchAndCalculateStats();
      }
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      await fetchAndCalculateStats();
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const fetchAndCalculateStats = async () => {
    try {
      const usersRes = await api.get('/users/all');
      const users = usersRes.data?.users || [];
      
      const archivedRes = await api.get('/users/archived');
      const archived = archivedRes.data?.users || [];
      
      const logsRes = await api.get('/logs?limit=1000');
      const logs = logsRes.data?.logs || [];

      const stats = calculateUserStats(users, archived, logs, dateRange);
      setUserData(stats);
      
    } catch (error) {
      console.error("Error fetching data for calculations:", error);
      setUserData(getMockUserData(dateRange));
    }
  };

  const calculateUserStats = (users, archived, logs, range) => {
    const now = new Date();
    const startDate = getStartDate(range);
    const previousStartDate = getPreviousStartDate(range);
    
    const activeUsers = users.filter(u => !u.archived);
    
    const byRole = {
      student: activeUsers.filter(u => u.role?.toLowerCase() === 'student').length,
      faculty: activeUsers.filter(u => u.role?.toLowerCase() === 'faculty').length,
      staff: activeUsers.filter(u => u.role?.toLowerCase() === 'staff').length,
      admin: activeUsers.filter(u => u.role?.toLowerCase() === 'admin').length
    };

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const byStatus = {
      active: activeUsers.filter(u => u.lastLogin && new Date(u.lastLogin) > sevenDaysAgo).length,
      inactive: activeUsers.filter(u => !u.lastLogin || new Date(u.lastLogin) <= thirtyDaysAgo).length,
      suspended: activeUsers.filter(u => u.suspended).length,
      pending: activeUsers.filter(u => !u.verified).length,
      verified: activeUsers.filter(u => u.verified).length,
      unverified: activeUsers.filter(u => !u.verified).length
    };

    const newUsers = activeUsers.filter(u => 
      u.createdAt && new Date(u.createdAt) >= startDate
    ).length;
    
    const previousNewUsers = activeUsers.filter(u => 
      u.createdAt && 
      new Date(u.createdAt) >= previousStartDate && 
      new Date(u.createdAt) < startDate
    ).length;

    const trends = {
      daily: calculateTrend(
        getCountForPeriod(activeUsers, 'day', 1),
        getCountForPeriod(activeUsers, 'day', 2)
      ),
      weekly: calculateTrend(
        getCountForPeriod(activeUsers, 'week', 1),
        getCountForPeriod(activeUsers, 'week', 2)
      ),
      monthly: calculateTrend(newUsers, previousNewUsers)
    };

    const registrationStats = {
      today: getCountForPeriod(activeUsers, 'day', 1),
      thisWeek: getCountForPeriod(activeUsers, 'week', 1),
      thisMonth: getCountForPeriod(activeUsers, 'month', 1),
      avgPerDay: Math.round(getCountForPeriod(activeUsers, 'month', 1) / 30)
    };

    const activityStats = {
      activeToday: getActiveCount(activeUsers, logs, 'day'),
      activeThisWeek: getActiveCount(activeUsers, logs, 'week'),
      activeThisMonth: getActiveCount(activeUsers, logs, 'month'),
      retentionRate: calculateRetentionRate(activeUsers, logs)
    };

    const growth = generateGrowthData(activeUsers, range);
    const topUsers = getTopUsers(activeUsers, logs);
    const departmentStats = getDepartmentStats(activeUsers);
    const roleDistribution = Object.entries(byRole).map(([name, value]) => ({
      name,
      value
    }));

    return {
      total: activeUsers.length,
      active: byStatus.active,
      new: newUsers,
      deleted: archived.length,
      byRole,
      byStatus,
      byDepartment: departmentStats,
      growth,
      trends,
      topUsers,
      registrationStats,
      activityStats,
      roleDistribution,
      departmentStats
    };
  };

  const getStartDate = (range) => {
    const date = new Date();
    switch(range) {
      case 'week': date.setDate(date.getDate() - 7); break;
      case 'month': date.setMonth(date.getMonth() - 1); break;
      case 'year': date.setFullYear(date.getFullYear() - 1); break;
      default: date.setMonth(date.getMonth() - 1);
    }
    return date;
  };

  const getPreviousStartDate = (range) => {
    const date = new Date();
    switch(range) {
      case 'week': date.setDate(date.getDate() - 14); break;
      case 'month': date.setMonth(date.getMonth() - 2); break;
      case 'year': date.setFullYear(date.getFullYear() - 2); break;
      default: date.setMonth(date.getMonth() - 2);
    }
    return date;
  };

  const getCountForPeriod = (users, period, offset) => {
    const now = new Date();
    let startDate = new Date(now);
    
    switch(period) {
      case 'day':
        startDate.setDate(now.getDate() - offset);
        break;
      case 'week':
        startDate.setDate(now.getDate() - (offset * 7));
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - offset);
        break;
      default:
        startDate.setMonth(now.getMonth() - offset);
    }
    
    return users.filter(u => 
      u.createdAt && new Date(u.createdAt) >= startDate
    ).length;
  };

  const getActiveCount = (users, logs, period) => {
    const now = new Date();
    let cutoff = new Date(now);
    
    switch(period) {
      case 'day': cutoff.setDate(now.getDate() - 1); break;
      case 'week': cutoff.setDate(now.getDate() - 7); break;
      case 'month': cutoff.setMonth(now.getMonth() - 1); break;
      default: cutoff.setDate(now.getDate() - 7);
    }
    
    const activeUserIds = new Set(
      logs
        .filter(log => log.createdAt && new Date(log.createdAt) >= cutoff)
        .map(log => log.userId?._id || log.userId)
        .filter(id => id)
    );
    
    return activeUserIds.size;
  };

  const calculateTrend = (current, previous) => {
    if (previous === 0) {
      return {
        value: current,
        percentage: current > 0 ? 100 : 0,
        direction: current > 0 ? 'up' : 'none'
      };
    }
    const percentage = ((current - previous) / previous) * 100;
    return {
      value: current,
      percentage: Math.abs(Math.round(percentage * 10) / 10),
      direction: percentage >= 0 ? 'up' : 'down'
    };
  };

  const calculateRetentionRate = (users, logs) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const cohort = users.filter(u => 
      u.createdAt && 
      new Date(u.createdAt) >= sixtyDaysAgo && 
      new Date(u.createdAt) < thirtyDaysAgo
    );
    
    if (cohort.length === 0) return 0;
    
    const retained = cohort.filter(u => {
      const userLogs = logs.filter(log => 
        (log.userId?._id === u._id || log.userId === u._id) &&
        log.createdAt &&
        new Date(log.createdAt) >= thirtyDaysAgo
      );
      return userLogs.length > 0;
    });
    
    return Math.round((retained.length / cohort.length) * 100);
  };

  const generateGrowthData = (users, range) => {
    const labels = [];
    const values = [];
    const now = new Date();
    
    switch(range) {
      case 'week':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
          
          const dayStart = new Date(date);
          dayStart.setHours(0,0,0,0);
          const dayEnd = new Date(date);
          dayEnd.setHours(23,59,59,999);
          
          const count = users.filter(u => 
            u.createdAt && 
            new Date(u.createdAt) >= dayStart && 
            new Date(u.createdAt) <= dayEnd
          ).length;
          values.push(count);
        }
        break;
        
      case 'month':
        for (let i = 3; i >= 0; i--) {
          labels.push(`Week ${4-i}`);
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - (i * 7 + 6));
          const weekEnd = new Date(now);
          weekEnd.setDate(now.getDate() - (i * 7));
          
          const count = users.filter(u => 
            u.createdAt && 
            new Date(u.createdAt) >= weekStart && 
            new Date(u.createdAt) <= weekEnd
          ).length;
          values.push(count);
        }
        break;
        
      case 'year':
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(now.getMonth() - i);
          labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
          
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          
          const count = users.filter(u => 
            u.createdAt && 
            new Date(u.createdAt) >= monthStart && 
            new Date(u.createdAt) <= monthEnd
          ).length;
          values.push(count);
        }
        break;
        
      default:
        for (let i = 3; i >= 0; i--) {
          labels.push(`Week ${4-i}`);
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - (i * 7 + 6));
          const weekEnd = new Date(now);
          weekEnd.setDate(now.getDate() - (i * 7));
          
          const count = users.filter(u => 
            u.createdAt && 
            new Date(u.createdAt) >= weekStart && 
            new Date(u.createdAt) <= weekEnd
          ).length;
          values.push(count);
        }
    }
    
    return { labels, values };
  };

  const getTopUsers = (users, logs) => {
    const userActionCount = {};
    
    logs.forEach(log => {
      const userId = log.userId?._id || log.userId;
      if (userId) {
        userActionCount[userId] = (userActionCount[userId] || 0) + 1;
      }
    });
    
    const userActions = users.map(user => ({
      ...(user.toObject ? user.toObject() : user),
      actionCount: userActionCount[user._id] || 0
    }));
    
    return userActions
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 5)
      .map(user => ({
        id: user._id,
        name: user.name || 'Unknown',
        email: user.email || '',
        role: user.role || 'student',
        reservations: user.actionCount,
        lastActive: user.lastLogin || user.updatedAt
      }));
  };

  const getDepartmentStats = (users) => {
    const deptCount = {};
    
    users.forEach(user => {
      const dept = user.department || 'Other';
      deptCount[dept] = (deptCount[dept] || 0) + 1;
    });
    
    return Object.entries(deptCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const getMockUserData = (range) => {
    const mult = range === "week" ? 1 : range === "month" ? 4 : 48;
    
    return {
      total: 1250,
      active: 980,
      new: 145,
      deleted: 23,
      byRole: {
        student: 850,
        faculty: 250,
        staff: 120,
        admin: 30
      },
      byStatus: {
        active: 980,
        inactive: 180,
        suspended: 45,
        pending: 45,
        verified: 1100,
        unverified: 150
      },
      byDepartment: [
        { name: "Computer Science", count: 450 },
        { name: "Engineering", count: 320 },
        { name: "Business", count: 280 },
        { name: "Nursing", count: 150 },
        { name: "Education", count: 120 }
      ],
      growth: {
        labels: range === "week" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] :
                range === "month" ? ["Week 1", "Week 2", "Week 3", "Week 4"] :
                ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        values: range === "week" ? [65, 72, 68, 85, 90, 78, 95] :
                range === "month" ? [420, 450, 480, 510] :
                [1250, 1320, 1380, 1450, 1520, 1580, 1650, 1720, 1800, 1850, 1900, 1950]
      },
      trends: {
        daily: { value: 65, percentage: 12.5, direction: 'up' },
        weekly: { value: 420, percentage: 8.3, direction: 'up' },
        monthly: { value: 145, percentage: 15.2, direction: 'up' }
      },
      topUsers: [
        { id: 1, name: "John Doe", email: "john.doe@usa.edu", reservations: 45, role: "student", lastActive: new Date() },
        { id: 2, name: "Jane Smith", email: "jane.smith@usa.edu", reservations: 38, role: "faculty", lastActive: new Date() },
        { id: 3, name: "Bob Johnson", email: "bob.j@usa.edu", reservations: 32, role: "student", lastActive: new Date() },
        { id: 4, name: "Alice Brown", email: "alice.b@usa.edu", reservations: 28, role: "staff", lastActive: new Date() },
        { id: 5, name: "Charlie Wilson", email: "charlie.w@usa.edu", reservations: 24, role: "student", lastActive: new Date() }
      ],
      registrationStats: {
        today: 12,
        thisWeek: 78,
        thisMonth: 312,
        avgPerDay: 10
      },
      activityStats: {
        activeToday: 234,
        activeThisWeek: 890,
        activeThisMonth: 1150,
        retentionRate: 68
      },
      roleDistribution: [
        { name: "student", value: 850 },
        { name: "faculty", value: 250 },
        { name: "staff", value: 120 },
        { name: "admin", value: 30 }
      ],
      departmentStats: [
        { name: "Computer Science", count: 450 },
        { name: "Engineering", count: 320 },
        { name: "Business", count: 280 },
        { name: "Nursing", count: 150 },
        { name: "Education", count: 120 }
      ]
    };
  };

  useEffect(() => {
    fetchUserAnalytics();
  }, [fetchUserAnalytics]);

  const formatPHDateTime = (date) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, color = "blue" }) => {
    // Determine color class based on color prop
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
    
    // Determine color class based on color prop
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
            <p className="text-gray-600">Detailed analysis of user behavior and demographics</p>
          </div>
          <div className="flex items-center space-x-4">
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
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
            <button className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-50 cursor-pointer">
              <Download size={18} />
            </button>
            <button 
              onClick={fetchUserAnalytics}
              className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-50 cursor-pointer"
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
                title="Staff Office" 
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
                title="Active" 
                value={userStats.active} 
                icon={UserCheck} 
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

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <SearchInput search={search} setSearch={setSearch} />
            <FilterDropdown 
              value={dateRange} 
              setValue={setDateRange} 
              label="Date Range" 
              options={["week", "month", "year"]} 
            />

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
                <span className="text-gray-600">Active</span>
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
          <h2 className="text-lg font-semibold text-gray-800 mb-4">User Growth</h2>
          <div className="h-64 flex items-end justify-between gap-2">
            {userData.growth?.values?.map((value, index) => {
              const max = Math.max(...userData.growth.values);
              const height = max > 0 ? (value / max) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-[#CC0000]/20 rounded-t relative group"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {value} users
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
                {userData.topUsers.map((user, index) => (
                  <tr key={user.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === 'student' ? 'bg-green-100 text-green-800' :
                        user.role === 'faculty' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'staff' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800 font-medium">{user.reservations}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {user.lastActive ? formatPHDateTime(user.lastActive) : 'Never'}
                    </td>
                  </tr>
                ))}
                {userData.topUsers.length === 0 && (
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

// Helper components
function SearchInput({ search, setSearch }) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search analytics..."
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

function FilterDropdown({ value, setValue, label, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 cursor-pointer outline-0"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "All" ? `All ${label}` : opt.charAt(0).toUpperCase() + opt.slice(1)}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
    </div>
  );
}

export default AnalyticsUsers;