// AnalyticsUsers.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Activity,
  UserCheck,
  UserX,
  Award,
  GraduationCap,
  UserCog,
  Building,
  Calendar,
  X,
  TrendingUp,
  PieChart,
  BarChart3,
  Clock,
  Mail,
  Phone,
  MapPin,
  Shield,
  UserPlus,
  UserMinus,
  UsersRound,
  School,
  Briefcase,
  BadgeCheck,
  Ban
} from "lucide-react";
import api from "../../utils/api";

function AnalyticsUsers({ setView, admin }) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [userData, setUserData] = useState({
    total: 0,
    active: 0,
    new: 0,
    deleted: 0,
    byRole: {
      student: 0,
      faculty: 0,
      staff: 0,
      staff_office: 0,
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

  const calendarRef = useRef(null);

  const fetchUserAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/analytics/users?range=${dateRange}`;
      
      if (dateRange === "custom" && customStartDate && customEndDate) {
        url = `/analytics/users?startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      
      const response = await api.get(url);
      
      if (response.data && response.data.success) {
        setUserData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching user analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    fetchUserAnalytics();
  }, [fetchUserAnalytics]);

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
  };

  // CSV Export Function
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
      if (dateRange === "week") rangeDescription = "Last 7 days";
      else if (dateRange === "month") rangeDescription = "Last 30 days";
      else if (dateRange === "year") rangeDescription = "Last 12 months";
      else if (dateRange === "custom") rangeDescription = `${formatDate(customStartDate)} to ${formatDate(customEndDate)}`;

      addBlankRow();
      addRow(['USER ANALYTICS REPORT']);
      addRow(['========================================']);
      addBlankRow();
      addRow(['Generated:', new Date().toLocaleString()]);
      addRow(['Date Range:', rangeDescription]);
      addBlankRow();
      addBlankRow();

      addSectionHeader('KEY METRICS');
      addRow(['Metric', 'Value']);
      addRow(['Total Users', userData.total || 0]);
      addRow(['Active Users (7 days)', userData.active || 0]);
      addRow(['New Users', userData.new || 0]);
      addRow(['Retention Rate', `${userData.activityStats?.retentionRate || 0}%`]);
      addBlankRow();
      addBlankRow();

      addSectionHeader('REGISTRATION STATISTICS');
      addRow(['Period', 'Count']);
      addRow(['Today', userData.registrationStats?.today || 0]);
      addRow(['This Week', userData.registrationStats?.thisWeek || 0]);
      addRow(['This Month', userData.registrationStats?.thisMonth || 0]);
      addRow(['Average Per Day', userData.registrationStats?.avgPerDay || 0]);
      addBlankRow();
      addBlankRow();

      addSectionHeader('USERS BY ROLE');
      addRow(['Role', 'Count', 'Percentage']);
      addRow(['Students', userData.byRole?.student || 0, `${userData.total ? Math.round((userData.byRole.student / userData.total) * 100) : 0}%`]);
      addRow(['Faculty', userData.byRole?.faculty || 0, `${userData.total ? Math.round((userData.byRole.faculty / userData.total) * 100) : 0}%`]);
      addRow(['Staff', userData.byRole?.staff || 0, `${userData.total ? Math.round((userData.byRole.staff / userData.total) * 100) : 0}%`]);
      addRow(['Staff Office', userData.byRole?.staff_office || 0, `${userData.total ? Math.round((userData.byRole.staff_office / userData.total) * 100) : 0}%`]);
      addBlankRow();
      addBlankRow();

      addSectionHeader('USERS BY STATUS');
      addRow(['Status', 'Count']);
      addRow(['Active (7 days)', userData.byStatus?.active || 0]);
      addRow(['Inactive', userData.byStatus?.inactive || 0]);
      addRow(['Suspended', userData.byStatus?.suspended || 0]);
      addRow(['Verified', userData.byStatus?.verified || 0]);
      addRow(['Unverified', userData.byStatus?.unverified || 0]);
      addBlankRow();
      addBlankRow();

      addSectionHeader('TOP DEPARTMENTS');
      addRow(['Department', 'User Count', 'Percentage']);
      if (userData.departmentStats && userData.departmentStats.length > 0) {
        userData.departmentStats.forEach(dept => {
          addRow([
            dept.name || 'Unknown',
            dept.count || 0,
            `${userData.total ? Math.round((dept.count / userData.total) * 100) : 0}%`
          ]);
        });
      }
      addBlankRow();
      addBlankRow();

      addSectionHeader('USER GROWTH');
      addRow(['Period', 'New Users']);
      if (userData.growth?.labels && userData.growth.labels.length > 0) {
        userData.growth.labels.forEach((label, index) => {
          addRow([label, userData.growth?.values?.[index] || 0]);
        });
      }
      addBlankRow();
      addBlankRow();

      addSectionHeader('MOST ACTIVE USERS');
      addRow(['Name', 'Email', 'Role', 'Actions']);
      if (userData.topUsers && userData.topUsers.length > 0) {
        userData.topUsers.forEach(user => {
          addRow([
            user.name || 'Unknown',
            user.email || '',
            user.role || 'Unknown',
            user.reservations || 0
          ]);
        });
      }
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
      link.setAttribute('download', `User Analytics ${dateRange} ${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  // ==================== SKELETON LOADING COMPONENTS ====================

  const StatCardSkeleton = () => (
    <div className="flex-1 min-w-[200px] bg-white p-5 rounded-xl border border-gray-200 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
          <div className="h-8 bg-gray-300 rounded w-16"></div>
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

  const TableRowSkeleton = ({ cols = 4 }) => (
    <tr className="animate-pulse">
      {Array(cols).fill(0).map((_, i) => (
        <td key={i} className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </td>
      ))}
    </tr>
  );

  const SectionHeaderSkeleton = () => (
    <div className="flex items-center justify-between mb-5">
      <div className="h-6 bg-gray-200 rounded w-48"></div>
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </div>
  );

  // ==================== COMPONENTS ====================

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

  const RoleBadge = ({ role }) => {
    const roleConfig = {
      student: { bg: "bg-green-100", text: "text-green-700", icon: GraduationCap, label: "Student" },
      faculty: { bg: "bg-purple-100", text: "text-purple-700", icon: UserCog, label: "Faculty" },
      staff: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Briefcase, label: "Staff" },
      staff_office: { bg: "bg-indigo-100", text: "text-indigo-700", icon: Building, label: "Staff Office" },
      admin: { bg: "bg-red-100", text: "text-red-700", icon: Shield, label: "Admin" }
    };

    const config = roleConfig[role] || roleConfig.student;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon size={12} />
        <span>{config.label}</span>
      </span>
    );
  };

  const StatusBadge = ({ status }) => {
    const statusConfig = {
      active: { bg: "bg-green-100", text: "text-green-700", icon: UserCheck, label: "Active" },
      inactive: { bg: "bg-gray-100", text: "text-gray-700", icon: UserMinus, label: "Inactive" },
      suspended: { bg: "bg-red-100", text: "text-red-700", icon: Ban, label: "Suspended" },
      pending: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock, label: "Pending" },
      verified: { bg: "bg-blue-100", text: "text-blue-700", icon: BadgeCheck, label: "Verified" },
      unverified: { bg: "bg-orange-100", text: "text-orange-700", icon: UserX, label: "Unverified" }
    };

    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon size={12} />
        <span>{config.label}</span>
      </span>
    );
  };

  const InsightCard = ({ title, value, icon: Icon, color = "blue", trend }) => {
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
          {trend && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
      </div>
    );
  };

  const userStats = {
    total: userData.total || 0,
    students: userData.byRole?.student || 0,
    faculty: userData.byRole?.faculty || 0,
    staff: userData.byRole?.staff || 0,
    staffOffice: userData.byRole?.staff_office || 0,
    verified: userData.byStatus?.verified || 0,
    unverified: userData.byStatus?.unverified || 0,
    suspended: userData.byStatus?.suspended || 0,
    active: userData.byStatus?.active || 0,
  };

  // ==================== RENDER ====================

  if (loading && !userData.total) {
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
                  <ProgressBarSkeleton />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
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
              User Analytics
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {dateRange === 'week' ? 'Last 7 days' : 
               dateRange === 'month' ? 'Last 30 days' : 
               dateRange === 'year' ? 'Last 12 months' : 
               dateRange === 'custom' && customStartDate && customEndDate ? `${formatDate(customStartDate)} to ${formatDate(customEndDate)}` : 
               'Real-time user data from database'}
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
              onClick={fetchUserAnalytics}
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
        {/* User Roles Statistics */}
        <div className="mb-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-800">User Roles</h2>
              <span className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full font-medium">Live</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard 
                title="Total Users" 
                value={userStats.total} 
                icon={UsersRound} 
                trend={userData.trends?.monthly}
                color="blue" 
                isLoading={loading}
              />
              <StatCard 
                title="Students" 
                value={userStats.students} 
                icon={GraduationCap} 
                color="green" 
                isLoading={loading}
              />
              <StatCard 
                title="Faculty" 
                value={userStats.faculty} 
                icon={UserCog} 
                color="purple" 
                isLoading={loading}
              />
              <StatCard 
                title="Staff" 
                value={userStats.staff} 
                icon={Briefcase} 
                color="yellow" 
                isLoading={loading}
              />
              <StatCard 
                title="Staff Office" 
                value={userStats.staffOffice} 
                icon={Building} 
                color="indigo" 
                isLoading={loading}
              />
            </div>
          </div>
        </div>

        {/* Account Status Statistics */}
        <div className="mb-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-5">Account Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard 
                title="Verified" 
                value={userStats.verified} 
                icon={BadgeCheck} 
                color="green" 
                isLoading={loading}
              />
              <StatCard 
                title="Unverified" 
                value={userStats.unverified} 
                icon={UserX} 
                color="red" 
                isLoading={loading}
              />
              <StatCard 
                title="Suspended" 
                value={userStats.suspended} 
                icon={Ban} 
                color="orange" 
                isLoading={loading}
              />
              <StatCard 
                title="Active (7d)" 
                value={userStats.active} 
                icon={Activity} 
                color="blue" 
                isLoading={loading}
              />
              <StatCard 
                title="Retention Rate" 
                value={`${userData.activityStats?.retentionRate || 0}%`} 
                icon={Award} 
                color="yellow" 
                isLoading={loading}
              />
            </div>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Users by Role */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <PieChart size={20} className="text-blue-500" />
              Users by Role
            </h2>
            <div className="space-y-4">
              <ProgressBar 
                label="Students" 
                value={userData.byRole?.student || 0} 
                total={userData.total || 1} 
                color="blue"
                isLoading={loading}
              />
              <ProgressBar 
                label="Faculty" 
                value={userData.byRole?.faculty || 0} 
                total={userData.total || 1} 
                color="green"
                isLoading={loading}
              />
              <ProgressBar 
                label="Staff" 
                value={userData.byRole?.staff || 0} 
                total={userData.total || 1} 
                color="purple"
                isLoading={loading}
              />
              <ProgressBar 
                label="Staff Office" 
                value={userData.byRole?.staff_office || 0} 
                total={userData.total || 1} 
                color="indigo"
                isLoading={loading}
              />
            </div>
          </div>

          {/* Users by Status */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <BarChart3 size={20} className="text-purple-500" />
              Users by Status
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
                  <span className="text-gray-600 font-medium">Active (7 days)</span>
                  <div className="flex items-center gap-3">
                    <span className="text-green-600 font-bold">{(userData.byStatus?.active || 0).toLocaleString()}</span>
                    <span className="text-xs px-2.5 py-1 bg-green-50 text-green-600 rounded-full">
                      {Math.min(Math.round(((userData.byStatus?.active || 0) / (userData.total || 1)) * 100), 100)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Inactive</span>
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-600 font-bold">{(userData.byStatus?.inactive || 0).toLocaleString()}</span>
                    <span className="text-xs px-2.5 py-1 bg-yellow-50 text-yellow-600 rounded-full">
                      {Math.min(Math.round(((userData.byStatus?.inactive || 0) / (userData.total || 1)) * 100), 100)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Suspended</span>
                  <div className="flex items-center gap-3">
                    <span className="text-red-600 font-bold">{(userData.byStatus?.suspended || 0).toLocaleString()}</span>
                    <span className="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded-full">
                      {Math.min(Math.round(((userData.byStatus?.suspended || 0) / (userData.total || 1)) * 100), 100)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Verified</span>
                  <div className="flex items-center gap-3">
                    <span className="text-blue-600 font-bold">{(userData.byStatus?.verified || 0).toLocaleString()}</span>
                    <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full">
                      {Math.min(Math.round(((userData.byStatus?.verified || 0) / (userData.total || 1)) * 100), 100)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600 font-medium">Unverified</span>
                  <div className="flex items-center gap-3">
                    <span className="text-orange-600 font-bold">{(userData.byStatus?.unverified || 0).toLocaleString()}</span>
                    <span className="text-xs px-2.5 py-1 bg-orange-50 text-orange-600 rounded-full">
                      {Math.min(Math.round(((userData.byStatus?.unverified || 0) / (userData.total || 1)) * 100), 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Top Departments */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <Building size={20} className="text-orange-500" />
              Top Departments
            </h2>
            <div className="space-y-4">
              {loading ? (
                <>
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                </>
              ) : (
                userData.departmentStats && userData.departmentStats.length > 0 ? (
                  userData.departmentStats.slice(0, 5).map((dept, idx) => (
                    <ProgressBar 
                      key={idx}
                      label={dept.name || 'Unknown'} 
                      value={dept.count || 0} 
                      total={userData.total || 1} 
                      color={idx === 0 ? "blue" : idx === 1 ? "green" : idx === 2 ? "purple" : "orange"}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Building size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-400">No department data available</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Registration & Activity Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <InsightCard 
            title="New Users Today"
            value={userData.registrationStats?.today || 0}
            icon={UserPlus}
            color="green"
            trend={8}
          />
          <InsightCard 
            title="This Week"
            value={userData.registrationStats?.thisWeek || 0}
            icon={Calendar}
            color="blue"
            trend={12}
          />
          <InsightCard 
            title="This Month"
            value={userData.registrationStats?.thisMonth || 0}
            icon={TrendingUp}
            color="purple"
            trend={5}
          />
          <InsightCard 
            title="Avg Per Day"
            value={userData.registrationStats?.avgPerDay || 0}
            icon={Clock}
            color="orange"
          />
        </div>

        {/* Growth Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <TrendingUp size={20} className="text-[#CC0000]" />
            User Growth - {dateRange === 'week' ? 'Daily' : dateRange === 'month' ? 'Weekly' : dateRange === 'year' ? 'Monthly' : 'Custom Period'}
          </h2>
          {loading ? (
            <div className="h-64 flex items-end justify-between gap-2 animate-pulse">
              {Array(7).fill(0).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-gray-200 rounded-t h-40"></div>
                  <div className="h-3 bg-gray-200 rounded w-8"></div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div className="h-64 flex items-end justify-between gap-2">
                {userData.growth?.values && userData.growth.values.length > 0 ? (
                  userData.growth.values.map((value, index) => {
                    const max = Math.max(...userData.growth.values, 1);
                    const height = max > 0 ? (value / max) * 200 : 0;
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div className="relative w-full flex justify-center group">
                          <div 
                            className="w-3/4 bg-gradient-to-t from-[#CC0000] to-[#FF4444] rounded-t transition-all duration-300 hover:from-[#990000] hover:to-[#CC0000] cursor-pointer"
                            style={{ height: `${height}px` }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                              {value} new users
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{userData.growth.labels?.[index] || ''}</span>
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
              
              {userData.growth?.values && userData.growth.values.length > 0 && (
                <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500">
                  <div>Total new users: {userData.growth.values.reduce((a, b) => a + b, 0).toLocaleString()}</div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-t from-[#CC0000] to-[#FF4444] rounded"></div>
                    <span>Bar height relative to peak period</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Most Active Users */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <Award size={20} className="text-yellow-500" />
            Most Active Users
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Rank</th>
                  <th className="px-6 py-3 text-left font-medium">User</th>
                  <th className="px-6 py-3 text-left font-medium">Email</th>
                  <th className="px-6 py-3 text-left font-medium">Role</th>
                  <th className="px-6 py-3 text-left font-medium">Actions</th>
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
                  userData.topUsers && userData.topUsers.length > 0 ? (
                    userData.topUsers.map((user, index) => {
                      const rankColors = [
                        "bg-yellow-100 text-yellow-800 border border-yellow-200",
                        "bg-gray-100 text-gray-800 border border-gray-200",
                        "bg-orange-100 text-orange-800 border border-orange-200"
                      ];
                      
                      const rankColor = index < 3 ? rankColors[index] : "bg-blue-50 text-blue-800 border border-blue-200";
                      
                      return (
                        <tr key={user.id || index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${rankColor}`}>
                              #{index + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{user.name || 'Unknown'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.email || ''}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <RoleBadge role={user.role?.toLowerCase()} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-semibold text-gray-900">{user.reservations || 0}</span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <Users size={32} className="text-gray-300" />
                          <p>No user activity data available</p>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
          
          {userData.topUsers && userData.topUsers.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
              <div>Showing top {Math.min(userData.topUsers.length, 10)} users by activity</div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full"></span>
                  <span>Top 3</span>
                </span>
                                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                  <span>Top performers</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Department Distribution Summary */}
        {userData.departmentStats && userData.departmentStats.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Department Summary</h2>
              <span className="text-xs px-3 py-1.5 bg-white/20 text-white rounded-full font-medium">Distribution</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {userData.departmentStats.slice(0, 4).map((dept, idx) => {
                const percentage = Math.round((dept.count / userData.total) * 100);
                const colors = [
                  { bg: "bg-blue-500", light: "bg-blue-400" },
                  { bg: "bg-green-500", light: "bg-green-400" },
                  { bg: "bg-purple-500", light: "bg-purple-400" },
                  { bg: "bg-orange-500", light: "bg-orange-400" }
                ];
                
                return (
                  <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/80 text-sm">{dept.name}</p>
                      <span className="text-white font-bold">{dept.count}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`${colors[idx % 4].bg} rounded-full h-2 transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-white/60 text-xs mt-2">{percentage}% of total users</p>
                  </div>
                );
              })}
            </div>
            
            {userData.departmentStats.length > 4 && (
              <p className="text-white/60 text-xs text-center mt-4">
                +{userData.departmentStats.length - 4} more departments
              </p>
            )}
          </div>
        )}

        {/* Quick Stats Footer */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active Today</p>
                <p className="text-lg font-bold text-gray-800">{userData.activityStats?.activeToday || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active This Week</p>
                <p className="text-lg font-bold text-gray-800">{userData.activityStats?.activeThisWeek || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active This Month</p>
                <p className="text-lg font-bold text-gray-800">{userData.activityStats?.activeThisMonth || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Award size={18} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Retention Rate</p>
                <p className="text-lg font-bold text-gray-800">{userData.activityStats?.retentionRate || 0}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trends Summary */}
        {(userData.trends?.daily?.percentage > 0 || userData.trends?.weekly?.percentage > 0 || userData.trends?.monthly?.percentage > 0) && (
          <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Trends Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Daily Trend</p>
                  <p className="text-xl font-bold text-gray-800">{userData.trends?.daily?.value || 0}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                  userData.trends?.daily?.direction === 'up' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {userData.trends?.daily?.direction === 'up' ? (
                    <ArrowUp size={16} className="text-green-600" />
                  ) : (
                    <ArrowDown size={16} className="text-red-600" />
                  )}
                  <span className={userData.trends?.daily?.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
                    {userData.trends?.daily?.percentage}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Weekly Trend</p>
                  <p className="text-xl font-bold text-gray-800">{userData.trends?.weekly?.value || 0}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                  userData.trends?.weekly?.direction === 'up' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {userData.trends?.weekly?.direction === 'up' ? (
                    <ArrowUp size={16} className="text-green-600" />
                  ) : (
                    <ArrowDown size={16} className="text-red-600" />
                  )}
                  <span className={userData.trends?.weekly?.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
                    {userData.trends?.weekly?.percentage}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Monthly Trend</p>
                  <p className="text-xl font-bold text-gray-800">{userData.trends?.monthly?.value || 0}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                  userData.trends?.monthly?.direction === 'up' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {userData.trends?.monthly?.direction === 'up' ? (
                    <ArrowUp size={16} className="text-green-600" />
                  ) : (
                    <ArrowDown size={16} className="text-red-600" />
                  )}
                  <span className={userData.trends?.monthly?.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
                    {userData.trends?.monthly?.percentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default AnalyticsUsers;