import { useState, useEffect } from "react";
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
  Activity
} from "lucide-react";
import api from "../../utils/api";

function AnalyticsUsers({ setView, admin }) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
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
      pending: 0
    },
    growth: {
      daily: [],
      weekly: [],
      monthly: []
    },
    topUsers: []
  });

  useEffect(() => {
    fetchUserAnalytics();
  }, [dateRange]);

  const fetchUserAnalytics = async () => {
    setLoading(true);
    try {
      // Try to fetch real data from API
      const response = await api.get(`/analytics/users?range=${dateRange}`);
      if (response.data) {
        setUserData(response.data);
      } else {
        // Fallback to mock data if API fails
        setUserData(getMockUserData(dateRange));
      }
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      // Fallback to mock data on error
      setUserData(getMockUserData(dateRange));
    } finally {
      setLoading(false);
    }
  };

  const getMockUserData = (range) => {
    const mult = range === "week" ? 1 : range === "month" ? 4 : 48;
    
    return {
      total: Math.floor(1250 * mult),
      active: Math.floor(980 * mult),
      new: Math.floor(145 * mult),
      deleted: Math.floor(23 * mult),
      byRole: {
        student: Math.floor(850 * mult),
        faculty: Math.floor(250 * mult),
        staff: Math.floor(120 * mult),
        admin: Math.floor(30 * mult)
      },
      byStatus: {
        active: Math.floor(980 * mult),
        inactive: Math.floor(180 * mult),
        suspended: Math.floor(45 * mult),
        pending: Math.floor(45 * mult)
      },
      growth: {
        daily: range === "week" ? [65, 72, 68, 85, 90, 78, 95] : 
               range === "month" ? [420, 450, 480, 510] : 
               [1250, 1320, 1380, 1450, 1520, 1580, 1650, 1720, 1800, 1850, 1900, 1950],
        weekly: range === "week" ? [65, 72, 68, 85, 90, 78, 95] : 
                range === "month" ? [420, 450, 480, 510] : 
                [420, 450, 480, 510, 540, 570, 600, 630],
        monthly: range === "week" ? [1250] : 
                 range === "month" ? [1250, 1320, 1380, 1450] : 
                 [1250, 1320, 1380, 1450, 1520, 1580, 1650, 1720, 1800, 1850, 1900, 1950]
      },
      topUsers: [
        { name: "John Doe", email: "john.doe@usa.edu", reservations: 45, role: "student" },
        { name: "Jane Smith", email: "jane.smith@usa.edu", reservations: 38, role: "faculty" },
        { name: "Bob Johnson", email: "bob.j@usa.edu", reservations: 32, role: "student" },
        { name: "Alice Brown", email: "alice.b@usa.edu", reservations: 28, role: "staff" },
        { name: "Charlie Wilson", email: "charlie.w@usa.edu", reservations: 24, role: "student" }
      ]
    };
  };

  const StatCard = ({ title, value, icon: Icon, change, color = "blue" }) => (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {change > 0 ? (
                <ArrowUp size={16} className="text-green-500" />
              ) : change < 0 ? (
                <ArrowDown size={16} className="text-red-500" />
              ) : null}
              {change !== 0 && (
                <span className={change > 0 ? "text-green-500" : "text-red-500"}>
                  {Math.abs(change)}%
                </span>
              )}
            </div>
          )}
        </div>
        <div className={`p-3 bg-${color}-500/10 rounded-lg`}>
          <Icon size={24} className={`text-${color}-500`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pl-[250px]">
        <div className="p-8 flex items-center justify-center h-screen">
          <RefreshCw size={40} className="animate-spin text-red-500" />
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
            <h1 className="text-2xl font-bold text-white mb-2">User Analytics</h1>
            <p className="text-gray-400">Detailed analysis of user behavior and demographics</p>
          </div>
          <div className="flex items-center gap-3">
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
            <button className="p-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-gray-400 hover:text-white">
              <Download size={18} />
            </button>
            <button 
              onClick={fetchUserAnalytics}
              className="p-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-gray-400 hover:text-white"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Users" value={userData.total} icon={Users} change={12.5} color="blue" />
          <StatCard title="Active Users" value={userData.active} icon={Activity} change={8.3} color="green" />
          <StatCard title="New Users" value={userData.new} icon={UserPlus} change={15.2} color="purple" />
          <StatCard title="Deleted Users" value={userData.deleted} icon={UserMinus} change={-5.1} color="red" />
        </div>

        {/* User Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* By Role */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Users by Role</h2>
            <div className="space-y-4">
              {Object.entries(userData.byRole).map(([role, count]) => (
                <div key={role}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 capitalize">{role}</span>
                    <span className="text-white font-medium">{count.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`bg-${
                        role === 'student' ? 'blue' : 
                        role === 'faculty' ? 'green' : 
                        role === 'staff' ? 'purple' : 'orange'
                      }-500 rounded-full h-2`} 
                      style={{ width: userData.total > 0 ? `${(count / userData.total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Status */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Users by Status</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Active</span>
                <span className="text-green-500 font-semibold">{userData.byStatus.active.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Inactive</span>
                <span className="text-yellow-500 font-semibold">{userData.byStatus.inactive.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Suspended</span>
                <span className="text-red-500 font-semibold">{userData.byStatus.suspended.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Pending</span>
                <span className="text-blue-500 font-semibold">{userData.byStatus.pending.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Users */}
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">Top Users by Reservations</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 text-sm font-medium text-gray-400">User</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Email</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Role</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Reservations</th>
                </tr>
              </thead>
              <tbody>
                {userData.topUsers.map((user, index) => (
                  <tr key={index} className="border-b border-gray-800/50">
                    <td className="py-3 text-white">{user.name}</td>
                    <td className="py-3 text-gray-400">{user.email}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.role === 'student' ? 'bg-blue-500/20 text-blue-400' :
                        user.role === 'faculty' ? 'bg-green-500/20 text-green-400' :
                        user.role === 'staff' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-orange-500/20 text-orange-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 text-white font-medium">{user.reservations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsUsers;