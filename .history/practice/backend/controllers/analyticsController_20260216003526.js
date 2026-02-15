// controllers/analyticsController.js
const User = require("../models/User");
const Reservation = require("../models/Reservation");
const Room = require("../models/Room");
const Log = require("../models/Log");
const mongoose = require("mongoose");

// ================== USER ANALYTICS ==================
// GET /analytics/users?range=week|month|year
exports.getUserAnalytics = async (req, res) => {
  try {
    const { range = "month" } = req.query;
    
    // Fetch all users (excluding passwords)
    const users = await User.find().select('-password').lean();
    
    // Fetch archived users
    const archivedUsers = await User.find({ archived: true }).lean();
    
    // Fetch logs for activity data (last 1000)
    const logs = await Log.find()
      .sort({ createdAt: -1 })
      .limit(1000)
      .populate('userId', 'name email')
      .lean();

    // Calculate statistics
    const stats = calculateUserStats(users, archivedUsers, logs, range);

    res.json({
      success: true,
      data: stats,
      message: "User analytics fetched successfully"
    });
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user analytics",
      error: error.message
    });
  }
};

// ================== ANALYTICS OVERVIEW ==================
exports.getAnalyticsOverview = async (req, res) => {
  try {
    const { range = "month" } = req.query;
    
    // Calculate date ranges
    const now = new Date();
    let startDate, previousStartDate;
    
    switch(range) {
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        previousStartDate = new Date(now.setDate(now.getDate() - 14));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        previousStartDate = new Date(now.setMonth(now.getMonth() - 2));
        break;
      case "year":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        previousStartDate = new Date(now.setFullYear(now.getFullYear() - 2));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        previousStartDate = new Date(now.setMonth(now.getMonth() - 2));
    }

    // Fetch all data in parallel
    const [
      totalUsers,
      activeUsers,
      newUsers,
      usersByRole,
      previousPeriodUsers,
      totalReservations,
      pendingReservations,
      approvedReservations,
      completedReservations,
      totalRooms,
      availableRooms
    ] = await Promise.all([
      User.countDocuments({ archived: { $ne: true } }),
      User.countDocuments({ 
        lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
      }),
      User.countDocuments({ createdAt: { $gte: startDate } }),
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      User.countDocuments({ createdAt: { $gte: previousStartDate, $lt: startDate } }),
      Reservation.countDocuments({ createdAt: { $gte: startDate } }),
      Reservation.countDocuments({ status: "Pending", createdAt: { $gte: startDate } }),
      Reservation.countDocuments({ status: "Approved", createdAt: { $gte: startDate } }),
      Reservation.countDocuments({ status: "Completed", createdAt: { $gte: startDate } }),
      Room.countDocuments(),
      Room.countDocuments({ status: "available" })
    ]);

    // Calculate trends
    const userTrend = calculateTrend(newUsers, previousPeriodUsers);

    // Format response
    const overviewData = {
      users: {
        total: totalUsers,
        active: activeUsers,
        new: newUsers,
        byRole: usersByRole.reduce((acc, item) => {
          acc[item._id?.toLowerCase() || 'other'] = item.count;
          return acc;
        }, {}),
        trend: userTrend
      },
      reservations: {
        total: totalReservations,
        pending: pendingReservations,
        approved: approvedReservations,
        completed: completedReservations
      },
      rooms: {
        total: totalRooms,
        available: availableRooms,
        occupied: totalRooms - availableRooms
      }
    };

    res.json(overviewData);
  } catch (error) {
    console.error("Analytics overview error:", error);
    res.status(500).json({ 
      message: "Failed to fetch analytics data", 
      error: error.message 
    });
  }
};

// ================== HELPER FUNCTIONS ==================

function calculateUserStats(users, archivedUsers, logs, range) {
  const now = new Date();
  const startDate = getStartDate(range);
  const previousStartDate = getPreviousStartDate(range);
  
  // Filter active users (non-archived)
  const activeUsers = users.filter(u => !u.archived);
  
  // Calculate by role
  const byRole = {
    student: activeUsers.filter(u => u.role?.toLowerCase() === 'student').length,
    faculty: activeUsers.filter(u => u.role?.toLowerCase() === 'faculty').length,
    staff: activeUsers.filter(u => u.role?.toLowerCase() === 'staff').length,
    admin: activeUsers.filter(u => u.role?.toLowerCase() === 'admin').length
  };

  // Calculate date ranges for status
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  // Calculate by status
  const byStatus = {
    active: activeUsers.filter(u => u.lastLogin && new Date(u.lastLogin) > sevenDaysAgo).length,
    inactive: activeUsers.filter(u => !u.lastLogin || new Date(u.lastLogin) <= thirtyDaysAgo).length,
    suspended: activeUsers.filter(u => u.suspended).length,
    pending: activeUsers.filter(u => !u.verified).length,
    verified: activeUsers.filter(u => u.verified).length,
    unverified: activeUsers.filter(u => !u.verified).length
  };

  // Calculate new users
  const newUsers = activeUsers.filter(u => 
    u.createdAt && new Date(u.createdAt) >= startDate
  ).length;
  
  const previousNewUsers = activeUsers.filter(u => 
    u.createdAt && 
    new Date(u.createdAt) >= previousStartDate && 
    new Date(u.createdAt) < startDate
  ).length;

  // Calculate trends
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

  // Registration stats
  const registrationStats = {
    today: getCountForPeriod(activeUsers, 'day', 1),
    thisWeek: getCountForPeriod(activeUsers, 'week', 1),
    thisMonth: getCountForPeriod(activeUsers, 'month', 1),
    avgPerDay: Math.round(getCountForPeriod(activeUsers, 'month', 1) / 30) || 0
  };

  // Activity stats
  const activityStats = {
    activeToday: getActiveCount(activeUsers, logs, 'day'),
    activeThisWeek: getActiveCount(activeUsers, logs, 'week'),
    activeThisMonth: getActiveCount(activeUsers, logs, 'month'),
    retentionRate: calculateRetentionRate(activeUsers, logs)
  };

  // Growth data for chart
  const growth = generateGrowthData(activeUsers, range);

  // Top users by activity
  const topUsers = getTopUsers(activeUsers, logs);

  // Department stats
  const departmentStats = getDepartmentStats(activeUsers);

  // Role distribution for pie chart
  const roleDistribution = Object.entries(byRole).map(([name, value]) => ({
    name,
    value
  }));

  return {
    total: activeUsers.length,
    active: byStatus.active,
    new: newUsers,
    deleted: archivedUsers.length,
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
}

function getStartDate(range) {
  const date = new Date();
  switch(range) {
    case 'week': date.setDate(date.getDate() - 7); break;
    case 'month': date.setMonth(date.getMonth() - 1); break;
    case 'year': date.setFullYear(date.getFullYear() - 1); break;
    default: date.setMonth(date.getMonth() - 1);
  }
  return date;
}

function getPreviousStartDate(range) {
  const date = new Date();
  switch(range) {
    case 'week': date.setDate(date.getDate() - 14); break;
    case 'month': date.setMonth(date.getMonth() - 2); break;
    case 'year': date.setFullYear(date.getFullYear() - 2); break;
    default: date.setMonth(date.getMonth() - 2);
  }
  return date;
}

function getCountForPeriod(users, period, offset) {
  const now = new Date();
  let startDate = new Date();
  
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
}

function getActiveCount(users, logs, period) {
  const now = new Date();
  let cutoff = new Date();
  
  switch(period) {
    case 'day': cutoff.setDate(now.getDate() - 1); break;
    case 'week': cutoff.setDate(now.getDate() - 7); break;
    case 'month': cutoff.setMonth(now.getMonth() - 1); break;
    default: cutoff.setDate(now.getDate() - 7);
  }
  
  // Get unique users from logs within period
  const activeUserIds = new Set();
  logs.forEach(log => {
    if (new Date(log.createdAt) >= cutoff) {
      const userId = log.userId?._id || log.userId;
      if (userId) {
        activeUserIds.add(userId.toString());
      }
    }
  });
  
  return activeUserIds.size;
}

function calculateTrend(current, previous) {
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
}

function calculateRetentionRate(users, logs) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  // Users who joined 30-60 days ago
  const cohort = users.filter(u => 
    u.createdAt && 
    new Date(u.createdAt) >= sixtyDaysAgo && 
    new Date(u.createdAt) < thirtyDaysAgo
  );
  
  if (cohort.length === 0) return 0;
  
  // Users who were active in last 30 days
  const retained = cohort.filter(u => {
    const userLogs = logs.filter(log => {
      const userId = log.userId?._id || log.userId;
      return userId?.toString() === u._id.toString() && 
             new Date(log.createdAt) >= thirtyDaysAgo;
    });
    return userLogs.length > 0;
  });
  
  return Math.round((retained.length / cohort.length) * 100);
}

function generateGrowthData(users, range) {
  const labels = [];
  const values = [];
  const now = new Date();
  
  switch(range) {
    case 'week':
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(now.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        
        const dayStart = new Date(date.setHours(0,0,0,0));
        const dayEnd = new Date(date.setHours(23,59,59,999));
        
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
        const weekEnd = new Date();
        weekEnd.setDate(now.getDate() - (i * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekEnd.getDate() - 6);
        
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
        const date = new Date();
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
        const weekEnd = new Date();
        weekEnd.setDate(now.getDate() - (i * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekEnd.getDate() - 6);
        
        const count = users.filter(u => 
          u.createdAt && 
          new Date(u.createdAt) >= weekStart && 
          new Date(u.createdAt) <= weekEnd
        ).length;
        values.push(count);
      }
  }
  
  return { labels, values };
}

function getTopUsers(users, logs, limit = 5) {
  // Count user actions from logs
  const userActionCount = {};
  
  logs.forEach(log => {
    const userId = log.userId?._id || log.userId;
    if (userId) {
      const id = userId.toString();
      userActionCount[id] = (userActionCount[id] || 0) + 1;
    }
  });
  
  // Sort users by action count
  const usersWithActions = users.map(user => ({
    ...user,
    actionCount: userActionCount[user._id.toString()] || 0
  }));
  
  return usersWithActions
    .sort((a, b) => b.actionCount - a.actionCount)
    .slice(0, limit)
    .map(user => ({
      id: user._id,
      name: user.name || 'Unknown',
      email: user.email || '',
      role: user.role?.toLowerCase() || 'student',
      reservations: user.actionCount,
      lastActive: user.lastLogin || user.updatedAt
    }));
}

function getDepartmentStats(users) {
  const deptCount = {};
  
  users.forEach(user => {
    const dept = user.department || 'Other';
    deptCount[dept] = (deptCount[dept] || 0) + 1;
  });
  
  return Object.entries(deptCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

// ================== OTHER ANALYTICS ENDPOINTS ==================

exports.getReservationAnalytics = async (req, res) => {
  try {
    const { range = "month" } = req.query;
    
    // Implementation for reservation analytics
    const startDate = getStartDate(range);
    
    const reservations = await Reservation.find({ 
      createdAt: { $gte: startDate } 
    }).lean();
    
    // Calculate stats
    const byStatus = {
      pending: reservations.filter(r => r.status === 'Pending').length,
      approved: reservations.filter(r => r.status === 'Approved').length,
      rejected: reservations.filter(r => r.status === 'Rejected').length,
      completed: reservations.filter(r => r.status === 'Completed').length,
      cancelled: reservations.filter(r => r.status === 'Cancelled').length
    };
    
    // Get popular rooms
    const roomCounts = {};
    reservations.forEach(r => {
      const roomKey = `${r.roomName} (${r.location})`;
      roomCounts[roomKey] = (roomCounts[roomKey] || 0) + 1;
    });
    
    const popularRooms = Object.entries(roomCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    res.json({
      success: true,
      data: {
        total: reservations.length,
        byStatus,
        popularRooms,
        trends: generateReservationTrends(reservations, range)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRoomAnalytics = async (req, res) => {
  try {
    const rooms = await Room.find().lean();
    const reservations = await Reservation.find({ 
      status: { $in: ['Completed', 'Approved', 'Ongoing'] }
    }).lean();
    
    // Calculate room utilization
    const roomUtilization = rooms.map(room => {
      const roomReservations = reservations.filter(r => 
        r.roomName === room.name && r.location === room.location
      );
      return {
        name: room.name,
        location: room.location,
        totalBookings: roomReservations.length,
        status: room.status,
        utilization: roomReservations.length > 0 ? 'High' : 'Low'
      };
    });
    
    res.json({
      success: true,
      data: {
        total: rooms.length,
        byStatus: {
          available: rooms.filter(r => r.status === 'available').length,
          occupied: rooms.filter(r => r.status === 'occupied').length,
          maintenance: rooms.filter(r => r.status === 'maintenance').length
        },
        utilization: roomUtilization,
        popular: roomUtilization.sort((a, b) => b.totalBookings - a.totalBookings).slice(0, 5)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getEngagementMetrics = async (req, res) => {
  try {
    const { range = "month" } = req.query;
    const startDate = getStartDate(range);
    
    const logs = await Log.find({ createdAt: { $gte: startDate } }).lean();
    
    // Calculate metrics
    const uniqueUsers = new Set();
    const actionsByType = {};
    
    logs.forEach(log => {
      if (log.userId) uniqueUsers.add(log.userId.toString());
      const action = log.action || 'other';
      actionsByType[action] = (actionsByType[action] || 0) + 1;
    });
    
    res.json({
      success: true,
      data: {
        totalActions: logs.length,
        uniqueUsers: uniqueUsers.size,
        actionsByType,
        averagePerUser: uniqueUsers.size ? (logs.length / uniqueUsers.size).toFixed(1) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.exportAnalytics = async (req, res) => {
  try {
    const { format = "json", range = "month" } = req.query;
    
    // Gather all analytics data
    const users = await exports.getUserAnalytics({ query: { range } }, {
      json: (data) => data,
      status: () => ({ json: () => {} })
    });
    
    if (format === "csv") {
      // Convert to CSV
      const csv = convertToCSV(users);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=analytics.csv");
      return res.send(csv);
    } else {
      res.json(users);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper for generating trends
function generateReservationTrends(reservations, range) {
  const trends = [];
  const now = new Date();
  
  if (range === 'week') {
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      const count = reservations.filter(r => {
        const rDate = new Date(r.createdAt);
        return rDate.toDateString() === date.toDateString();
      }).length;
      
      trends.push({ label: dayStr, value: count });
    }
  } else if (range === 'month') {
    for (let i = 3; i >= 0; i--) {
      trends.push({ 
        label: `Week ${4-i}`, 
        value: Math.floor(Math.random() * 50) + 20 // Replace with actual calculation
      });
    }
  }
  
  return trends;
}

function convertToCSV(data) {
  const flatten = (obj, prefix = '') => {
    return Object.keys(obj).reduce((acc, k) => {
      const pre = prefix.length ? prefix + '.' : '';
      if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
        Object.assign(acc, flatten(obj[k], pre + k));
      } else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});
  };
  
  const flat = flatten(data);
  const headers = Object.keys(flat).join(',');
  const values = Object.values(flat).map(v => `"${v}"`).join(',');
  
  return `${headers}\n${values}`;
}