import { useState, useEffect } from "react";
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
  BarChart3,
  PieChart,
  UserCheck,
  UserX,
  Zap
} from "lucide-react";
import api from "../utils/api";

function AnalyticsEngagement({ setView, admin }) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
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
      returningUsers: 0
    }
  });

  useEffect(() => {
    fetchEngagementAnalytics();
  }, [dateRange]);

  const fetchEngagementAnalytics = async () => {
    setLoading(true);
    try {
      // Mock data
      setTimeout(() => {
        setEngagementData(getMockEngagementData(dateRange));
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error fetching engagement analytics:", error);
      setLoading(false);
    }
  };

  const getMockEngagementData = (range) => {
    const mult = range === "week" ? 1 : range === "month" ? 4 : 48;
    
    return {
      dailyActive: 320,
      weeklyActive: 1850,
      monthlyActive: 4250,
      averageSession: 24,
      retention: 76,
      bounceRate: 18,
      byDay: [
        { day: "Mon", active: 280 },
        { day: "Tue", active: 310 },
        { day: "Wed", active: 340 },
        { day: "Thu", active: 330 },
        { day: "Fri", active: 320 },
        { day: "Sat", active: 210 },
        { day: "Sun", active: 180 }
      ],
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
        returningUsers: 68
      }
    };
  };

  const StatCard = ({ title, value, icon: Icon, change, color = "blue", suffix = "" }) => (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}{suffix}</p>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              {change > 0 ? (
                <ArrowUp size={16} className="text-green-500" />
              ) : (
                <ArrowDown size={16} className="text-red-500" />
              )}
              <span className={change > 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(change)}%
              </span>
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
            <h1 className="text-2xl font-bold text-white mb-2">Engagement Metrics</h1>
            <p className="text-gray-400">Track user activity, retention, and platform engagement</p>
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
              onClick={fetchEngagementAnalytics}
              className="p-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-gray-400 hover:text-white"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Daily Active" value={engagementData.dailyActive} icon={Activity} change={8.5} color="blue" />
          <StatCard title="Weekly Active" value={engagementData.weeklyActive} icon={Users} change={12.3} color="green" />
          <StatCard title="Monthly Active" value={engagementData.monthlyActive} icon={Calendar} change={15.7} color="purple" />
          <StatCard title="Avg. Session" value={engagementData.averageSession} icon={Clock} change={5.2} color="orange" suffix="m" />
        </div>

        {/* Engagement Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Retention & Bounce */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">User Retention</h2>
            <div className="text-center">
              <div className="text-5xl font-bold text-green-500 mb-2">{engagementData.retention}%</div>
              <p className="text-gray-400 text-sm">of users return within 30 days</p>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-800">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Bounce Rate</span>
                <span className="text-red-500 font-semibold">{engagementData.bounceRate}%</span>
              </div>
            </div>
          </div>

          {/* Daily Active Users */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4">Daily Active Users</h2>
            <div className="space-y-3">
              {engagementData.byDay.map((day, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{day.day}</span>
                    <span className="text-white font-medium">{day.active} users</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 rounded-full h-2" 
                      style={{ width: `${(day.active / 400) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Activity Levels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">User Activity Levels</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">High Activity (10+ actions/day)</span>
                  <span className="text-green-500 font-medium">{engagementData.userActivity.high}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 rounded-full h-2" style={{ width: `${(engagementData.userActivity.high / 2000) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">Medium Activity (5-9 actions/day)</span>
                  <span className="text-yellow-500 font-medium">{engagementData.userActivity.medium}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-yellow-500 rounded-full h-2" style={{ width: `${(engagementData.userActivity.medium / 2000) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">Low Activity (1-4 actions/day)</span>
                  <span className="text-orange-500 font-medium">{engagementData.userActivity.low}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-orange-500 rounded-full h-2" style={{ width: `${(engagementData.userActivity.low / 2000) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">Inactive (0 actions/day)</span>
                  <span className="text-red-500 font-medium">{engagementData.userActivity.inactive}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-red-500 rounded-full h-2" style={{ width: `${(engagementData.userActivity.inactive / 2000) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Engagement Overview</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#222] p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Page Views</p>
                <p className="text-xl font-bold text-white">{engagementData.engagementMetrics.pageViews.toLocaleString()}</p>
              </div>
              <div className="bg-[#222] p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Total Actions</p>
                <p className="text-xl font-bold text-white">{engagementData.engagementMetrics.actions.toLocaleString()}</p>
              </div>
              <div className="bg-[#222] p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Avg Actions/User</p>
                <p className="text-xl font-bold text-white">{engagementData.engagementMetrics.avgActionsPerUser}</p>
              </div>
              <div className="bg-[#222] p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Returning Users</p>
                <p className="text-xl font-bold text-white">{engagementData.engagementMetrics.returningUsers}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Tips */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Engagement Insights</h2>
          <p className="text-red-100 mb-4">Based on your current metrics, here are some recommendations:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <Zap size={20} className="text-yellow-300 mb-2" />
              <h3 className="text-white font-medium mb-1">Peak Hours</h3>
              <p className="text-red-100 text-sm">Highest engagement between 10AM - 2PM. Consider scheduling announcements during this time.</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <Target size={20} className="text-yellow-300 mb-2" />
              <h3 className="text-white font-medium mb-1">Retention Opportunity</h3>
              <p className="text-red-100 text-sm">24% of users don't return. Send re-engagement emails to inactive users.</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <TrendingUp size={20} className="text-yellow-300 mb-2" />
              <h3 className="text-white font-medium mb-1">Mobile Optimization</h3>
              <p className="text-red-100 text-sm">65% of users access via mobile. Ensure mobile experience is optimized.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsEngagement;