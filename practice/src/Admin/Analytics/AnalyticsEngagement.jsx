// AnalyticsEngagement.jsx
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
  Zap,
  UserCheck,
  UserX,
  MousePointer,
  Eye,
  BarChart,
  PieChart,
  Layers,
  Award,
  AlertCircle
} from "lucide-react";
import api from "../../utils/api";

function AnalyticsEngagement({ setView, admin }) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: ""
  });
  const [showCustomPicker, setShowCustomPicker] = useState(false);
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
    }
  });

  useEffect(() => {
    fetchEngagementAnalytics();
  }, [dateRange]);

  const fetchEngagementAnalytics = async () => {
    setLoading(true);
    try {
      let url = `/analytics/engagement?range=${dateRange}`;
      
      // Add custom date range if selected
      if (dateRange === 'custom' && customDateRange.start && customDateRange.end) {
        url += `&startDate=${customDateRange.start}&endDate=${customDateRange.end}`;
      }
      
      const response = await api.get(url);
      
      if (response.data.success) {
        setEngagementData(response.data.data);
      } else {
        // Fallback to mock data if API fails
        setEngagementData(getMockEngagementData(dateRange));
      }
    } catch (error) {
      console.error("Error fetching engagement analytics:", error);
      // Use mock data as fallback
      setEngagementData(getMockEngagementData(dateRange));
    } finally {
      setLoading(false);
    }
  };

  const handleCustomRangeApply = () => {
    if (customDateRange.start && customDateRange.end) {
      setDateRange('custom');
      setShowCustomPicker(false);
      fetchEngagementAnalytics();
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(engagementData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `engagement-analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getMockEngagementData = (range) => {
    const now = new Date();
    const days = range === 'week' ? 7 : range === 'month' ? 30 : 365;
    
    // Generate daily active users for the period
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

    // Generate activity breakdown by action type
    const activityBreakdown = [
      { name: 'Page Views', value: 8450, color: 'blue' },
      { name: 'Reservations', value: 3240, color: 'green' },
      { name: 'Logins', value: 2100, color: 'purple' },
      { name: 'Profile Updates', value: 980, color: 'orange' },
      { name: 'Room Searches', value: 5670, color: 'yellow' }
    ];

    // Generate peak hours
    const peakHours = [];
    for (let i = 8; i <= 20; i++) {
      const hour = i <= 12 ? `${i}AM` : i === 12 ? '12PM' : `${i-12}PM`;
      peakHours.push({
        hour,
        activity: Math.floor(Math.random() * 80) + 20
      });
    }

    // Generate device breakdown
    const deviceBreakdown = [
      { name: 'Desktop', value: 45, color: 'blue' },
      { name: 'Mobile', value: 42, color: 'green' },
      { name: 'Tablet', value: 13, color: 'purple' }
    ];

    // Generate user engagement trends
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

    // Generate top features
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
      trends: {
        daily: { value: 320, percentage: 8.5, direction: 'up' },
        weekly: { value: 1850, percentage: 12.3, direction: 'up' },
        monthly: { value: 4250, percentage: 15.7, direction: 'up' }
      }
    };
  };

  const StatCard = ({ title, value, icon: Icon, change, color = "blue", suffix = "", subtext }) => (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              {change.direction === 'up' ? (
                <ArrowUp size={16} className="text-green-500" />
              ) : change.direction === 'down' ? (
                <ArrowDown size={16} className="text-red-500" />
              ) : null}
              <span className={change.direction === 'up' ? "text-green-500" : "text-red-500"}>
                {change.percentage}%
              </span>
              <span className="text-gray-500 text-xs ml-1">vs previous period</span>
            </div>
          )}
          {subtext && (
            <p className="text-xs text-gray-500 mt-2">{subtext}</p>
          )}
        </div>
        <div className={`p-3 bg-${color}-500/10 rounded-lg`}>
          <Icon size={24} className={`text-${color}-500`} />
        </div>
      </div>
    </div>
  );

  const ProgressBar = ({ label, value, max, color = "blue", showValue = true }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        {showValue && <span className="text-white font-medium">{value}</span>}
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className={`bg-${color}-500 rounded-full h-2 transition-all duration-500`} 
          style={{ width: `${(value / max) * 100}%` }}
        ></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pl-[250px]">
        <div className="p-8 flex flex-col items-center justify-center h-screen">
          <RefreshCw size={40} className="animate-spin text-red-500 mb-4" />
          <p className="text-gray-400">Loading engagement metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pl-[250px]">
      <div className="p-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Engagement Metrics</h1>
            <p className="text-gray-400">Track user activity, retention, and platform engagement</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Selector */}
            <div className="flex bg-[#1a1a1a] rounded-lg p-1 border border-gray-800">
              {["week", "month", "year"].map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setDateRange(range);
                    setShowCustomPicker(false);
                  }}
                  className={`px-4 py-2 text-sm rounded-md transition-all cursor-pointer ${
                    dateRange === range && !showCustomPicker
                      ? "bg-red-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
              <button
                onClick={() => setShowCustomPicker(!showCustomPicker)}
                className={`px-4 py-2 text-sm rounded-md transition-all cursor-pointer ${
                  showCustomPicker || dateRange === 'custom'
                    ? "bg-red-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom Date Picker */}
            {showCustomPicker && (
              <div className="flex items-center gap-2 bg-[#1a1a1a] p-2 rounded-lg border border-gray-800">
                <input
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-[#222] text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-red-500"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-[#222] text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-red-500"
                />
                <button
                  onClick={handleCustomRangeApply}
                  disabled={!customDateRange.start || !customDateRange.end}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            )}

            <button 
              onClick={exportData}
              className="p-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-gray-400 hover:text-white transition-all"
              title="Export data"
            >
              <Download size={18} />
            </button>
            
            <button 
              onClick={fetchEngagementAnalytics}
              className="p-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-gray-400 hover:text-white transition-all"
              title="Refresh data"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Daily Active Users" 
            value={engagementData.dailyActive} 
            icon={Activity} 
            change={engagementData.trends.daily}
            color="blue" 
            subtext="Users active in last 24h"
          />
          <StatCard 
            title="Weekly Active Users" 
            value={engagementData.weeklyActive} 
            icon={Users} 
            change={engagementData.trends.weekly}
            color="green" 
            subtext="Users active in last 7 days"
          />
          <StatCard 
            title="Monthly Active Users" 
            value={engagementData.monthlyActive} 
            icon={Calendar} 
            change={engagementData.trends.monthly}
            color="purple" 
            subtext="Users active in last 30 days"
          />
          <StatCard 
            title="Avg. Session Duration" 
            value={engagementData.averageSession} 
            icon={Clock} 
            change={{ direction: 'up', percentage: 5.2 }}
            color="orange" 
            suffix="m"
            subtext="Time spent per session"
          />
        </div>

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* User Retention Card */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <UserCheck size={20} className="text-green-500" />
              User Retention
            </h2>
            
            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-green-500 mb-2">
                {engagementData.retention}%
              </div>
              <p className="text-gray-400 text-sm">of users return within 30 days</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-[#222] rounded-lg">
                <span className="text-gray-300">Returning Users</span>
                <span className="text-green-500 font-semibold">
                  {engagementData.engagementMetrics.returningUsers}%
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-[#222] rounded-lg">
                <span className="text-gray-300">Bounce Rate</span>
                <span className="text-red-500 font-semibold">
                  {engagementData.bounceRate}%
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-[#222] rounded-lg">
                <span className="text-gray-300">Total Sessions</span>
                <span className="text-blue-500 font-semibold">
                  {engagementData.engagementMetrics.totalSessions.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Daily Active Users Chart */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart size={20} className="text-blue-500" />
                Daily Active Users
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  <span className="text-gray-400">Active Users</span>
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {engagementData.byDay.map((day, index) => {
                const maxValue = Math.max(...engagementData.byDay.map(d => d.active));
                return (
                  <div key={index} className="group">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300 group-hover:text-white transition-colors">
                        {day.day}
                        {day.date && <span className="text-gray-500 text-xs ml-2">{day.date}</span>}
                      </span>
                      <span className="text-white font-medium group-hover:text-blue-500 transition-colors">
                        {day.active.toLocaleString()} users
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-blue-500 rounded-full h-2.5 transition-all duration-500 group-hover:bg-blue-400" 
                        style={{ width: `${(day.active / maxValue) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trend Indicator */}
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Weekly Trend</span>
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-500" />
                  <span className="text-green-500">+12.3% vs last week</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Activity Levels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Layers size={20} className="text-purple-500" />
              Activity Levels
            </h2>
            
            <div className="space-y-4">
              <ProgressBar 
                label="High Activity (10+ actions/day)"
                value={engagementData.userActivity.high}
                max={2000}
                color="green"
              />
              <ProgressBar 
                label="Medium Activity (5-9 actions/day)"
                value={engagementData.userActivity.medium}
                max={2000}
                color="yellow"
              />
              <ProgressBar 
                label="Low Activity (1-4 actions/day)"
                value={engagementData.userActivity.low}
                max={2000}
                color="orange"
              />
              <ProgressBar 
                label="Inactive (0 actions/day)"
                value={engagementData.userActivity.inactive}
                max={2000}
                color="red"
              />
            </div>

            {/* Summary */}
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Engagement Rate</span>
                <span className="text-green-500 font-semibold">
                  {Math.round((engagementData.userActivity.high + engagementData.userActivity.medium) / 
                    (engagementData.userActivity.high + engagementData.userActivity.medium + 
                     engagementData.userActivity.low + engagementData.userActivity.inactive) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Activity Breakdown */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PieChart size={20} className="text-yellow-500" />
              Activity Breakdown
            </h2>
            
            <div className="space-y-3">
              {engagementData.activityBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-[#222] rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-${item.color}-500`}></div>
                    <span className="text-gray-300">{item.name}</span>
                  </div>
                  <span className="text-white font-medium">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Avg Actions/User</span>
                <span className="text-blue-500 font-semibold">
                  {engagementData.engagementMetrics.avgActionsPerUser}
                </span>
              </div>
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Award size={20} className="text-indigo-500" />
              Device Distribution
            </h2>
            
            <div className="space-y-4">
              {engagementData.deviceBreakdown.map((device, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{device.name}</span>
                    <span className="text-white font-medium">{device.value}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`bg-${device.color}-500 rounded-full h-2`} 
                      style={{ width: `${device.value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <AlertCircle size={14} />
                <span>Mobile usage up 8% this month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Peak Hours and Top Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Peak Hours */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock size={20} className="text-orange-500" />
              Peak Activity Hours
            </h2>

            <div className="space-y-2">
              {engagementData.peakHours.map((hour, index) => {
                const maxActivity = Math.max(...engagementData.peakHours.map(h => h.activity));
                return (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm w-12">{hour.hour}</span>
                    <div className="flex-1">
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-orange-500 rounded-full h-2" 
                          style={{ width: `${(hour.activity / maxActivity) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-white text-sm w-12 text-right">{hour.activity}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 bg-[#222] rounded-lg">
              <p className="text-sm text-yellow-500 flex items-center gap-2">
                <Zap size={16} />
                Peak engagement: 10AM - 2PM
              </p>
            </div>
          </div>

          {/* Top Features */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Target size={20} className="text-green-500" />
              Most Used Features
            </h2>

            <div className="space-y-3">
              {engagementData.topFeatures.map((feature, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-[#222] rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{index + 1}.</span>
                    <span className="text-white">{feature.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-300">{feature.count.toLocaleString()}</span>
                    <div className={`flex items-center gap-1 text-sm ${
                      feature.trend > 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {feature.trend > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                      <span>{Math.abs(feature.trend)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Total Feature Usage</span>
                <span className="text-white font-semibold">
                  {engagementData.topFeatures.reduce((sum, f) => sum + f.count, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Overview Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800 text-center">
            <Eye size={24} className="text-blue-500 mx-auto mb-3" />
            <p className="text-2xl font-bold text-white">{engagementData.engagementMetrics.pageViews.toLocaleString()}</p>
            <p className="text-sm text-gray-400">Page Views</p>
          </div>

          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800 text-center">
            <MousePointer size={24} className="text-green-500 mx-auto mb-3" />
            <p className="text-2xl font-bold text-white">{engagementData.engagementMetrics.actions.toLocaleString()}</p>
            <p className="text-sm text-gray-400">Total Actions</p>
          </div>

          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800 text-center">
            <Users size={24} className="text-purple-500 mx-auto mb-3" />
            <p className="text-2xl font-bold text-white">{engagementData.engagementMetrics.avgActionsPerUser}</p>
            <p className="text-sm text-gray-400">Avg Actions/User</p>
          </div>

          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800 text-center">
            <UserCheck size={24} className="text-orange-500 mx-auto mb-3" />
            <p className="text-2xl font-bold text-white">{engagementData.engagementMetrics.returningUsers}%</p>
            <p className="text-sm text-gray-400">Returning Users</p>
          </div>
        </div>

        {/* Engagement Insights */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Engagement Insights</h2>
          <p className="text-red-100 mb-4">Based on your current metrics, here are some recommendations:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <Zap size={20} className="text-yellow-300 mb-2" />
              <h3 className="text-white font-medium mb-1">Peak Hours Optimization</h3>
              <p className="text-red-100 text-sm">
                Highest engagement between 10AM - 2PM. Schedule important announcements and features during this time for maximum visibility.
              </p>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <Target size={20} className="text-yellow-300 mb-2" />
              <h3 className="text-white font-medium mb-1">Retention Opportunity</h3>
              <p className="text-red-100 text-sm">
                {100 - engagementData.retention}% of users don't return. Send personalized re-engagement emails to inactive users and highlight new features.
              </p>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <TrendingUp size={20} className="text-yellow-300 mb-2" />
              <h3 className="text-white font-medium mb-1">Mobile Experience</h3>
              <p className="text-red-100 text-sm">
                {engagementData.deviceBreakdown.find(d => d.name === 'Mobile')?.value || 42}% of users access via mobile. Ensure mobile experience is fully optimized.
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-red-500/30">
            <div>
              <p className="text-red-200 text-xs">Low Activity Users</p>
              <p className="text-white font-semibold">{engagementData.userActivity.low}</p>
            </div>
            <div>
              <p className="text-red-200 text-xs">High Activity Users</p>
              <p className="text-white font-semibold">{engagementData.userActivity.high}</p>
            </div>
            <div>
              <p className="text-red-200 text-xs">Avg Session</p>
              <p className="text-white font-semibold">{engagementData.averageSession}m</p>
            </div>
            <div>
              <p className="text-red-200 text-xs">Bounce Rate</p>
              <p className="text-white font-semibold">{engagementData.bounceRate}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsEngagement;