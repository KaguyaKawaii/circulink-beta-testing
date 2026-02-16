const User = require("../models/User");
const Log = require("../models/Log");
const Reservation = require("../models/Reservation");

// @desc    Get user analytics
// @route   GET /api/analytics/users
// @access  Public
exports.getUserAnalytics = async (req, res) => {
  try {
    const { range = "month" } = req.query;
    
    // Get date ranges
    const now = new Date();
    const startDate = getStartDate(range);
    const previousStartDate = getPreviousStartDate(range);
    
    // Fetch all users (non-archived)
    const users = await User.find({ archived: { $ne: true } })
      .select('-password')
      .lean();
    
    // Fetch archived users
    const archivedUsers = await User.find({ archived: true })
      .select('-password')
      .lean();
    
    // Fetch logs for activity data (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const logs = await Log.find({
      createdAt: { $gte: threeMonthsAgo }
    }).lean();
    
    // Fetch reservations for activity data (last 3 months)
    const reservations = await Reservation.find({
      createdAt: { $gte: threeMonthsAgo }
    }).lean();

    // Calculate statistics
    const stats = calculateUserStats(users, archivedUsers, logs, reservations, range, startDate, previousStartDate);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error("Error in getUserAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user analytics",
      error: error.message
    });
  }
};

// Helper function to get start date based on range
function getStartDate(range) {
  const date = new Date();
  switch(range) {
    case 'week':
      date.setDate(date.getDate() - 7);
      break;
    case 'month':
      date.setMonth(date.getMonth() - 1);
      break;
    case 'year':
      date.setFullYear(date.getFullYear() - 1);
      break;
    default:
      date.setMonth(date.getMonth() - 1);
  }
  return date;
}

// Helper function to get previous period start date
function getPreviousStartDate(range) {
  const date = new Date();
  switch(range) {
    case 'week':
      date.setDate(date.getDate() - 14);
      break;
    case 'month':
      date.setMonth(date.getMonth() - 2);
      break;
    case 'year':
      date.setFullYear(date.getFullYear() - 2);
      break;
    default:
      date.setMonth(date.getMonth() - 2);
  }
  return date;
}

// Main calculation function
function calculateUserStats(users, archivedUsers, logs, reservations, range, startDate, previousStartDate) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const oneDayAgo = new Date(now);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  // Calculate by role
  const byRole = {
    student: users.filter(u => u.role?.toLowerCase() === 'student').length,
    faculty: users.filter(u => u.role?.toLowerCase() === 'faculty').length,
    staff: users.filter(u => u.role?.toLowerCase() === 'staff').length,
    admin: users.filter(u => u.role?.toLowerCase() === 'admin').length
  };

  // Calculate by status - UPDATED to work with your Log schema
  const activeUsers = users.filter(u => {
    const userLogs = logs.filter(log => 
      log.userId?.toString() === u._id.toString() || log.id_number === u.id_number
    );
    // Check if any log in the last 7 days
    const hasRecentActivity = userLogs.some(log => 
      log.createdAt && new Date(log.createdAt) > sevenDaysAgo
    );
    return hasRecentActivity;
  });

  const inactiveUsers = users.filter(u => {
    const userLogs = logs.filter(log => 
      log.userId?.toString() === u._id.toString() || log.id_number === u.id_number
    );
    if (userLogs.length === 0) return true;
    // Check if all logs are older than 30 days
    const hasRecentActivity = userLogs.some(log => 
      log.createdAt && new Date(log.createdAt) > thirtyDaysAgo
    );
    return !hasRecentActivity;
  });

  const byStatus = {
    active: activeUsers.length,
    inactive: inactiveUsers.length,
    suspended: users.filter(u => u.suspended).length,
    pending: users.filter(u => !u.verified).length,
    verified: users.filter(u => u.verified).length,
    unverified: users.filter(u => !u.verified).length
  };

  // Calculate new users
  const newUsers = users.filter(u => 
    u.createdAt && new Date(u.createdAt) >= startDate
  ).length;
  
  const previousNewUsers = users.filter(u => 
    u.createdAt && 
    new Date(u.createdAt) >= previousStartDate && 
    new Date(u.createdAt) < startDate
  ).length;

  // Calculate trends
  const trends = {
    daily: calculateTrend(
      getCountForPeriod(users, 'day', 1),
      getCountForPeriod(users, 'day', 2)
    ),
    weekly: calculateTrend(
      getCountForPeriod(users, 'week', 1),
      getCountForPeriod(users, 'week', 2)
    ),
    monthly: calculateTrend(newUsers, previousNewUsers)
  };

  // Calculate registration stats
  const registrationStats = {
    today: getCountForPeriod(users, 'day', 1),
    thisWeek: getCountForPeriod(users, 'week', 1),
    thisMonth: getCountForPeriod(users, 'month', 1),
    avgPerDay: Math.round(getCountForPeriod(users, 'month', 1) / 30) || 0
  };

  // Calculate activity stats - UPDATED to work with your Log schema
  const activityStats = {
    activeToday: getActiveCount(users, logs, reservations, 'day'),
    activeThisWeek: getActiveCount(users, logs, reservations, 'week'),
    activeThisMonth: getActiveCount(users, logs, reservations, 'month'),
    retentionRate: calculateRetentionRate(users, logs)
  };

  // Generate growth data
  const growth = generateGrowthData(users, range);

  // Get top users - UPDATED to work with your Log schema
  const topUsers = getTopUsers(users, logs, reservations);

  // Get department stats
  const departmentStats = getDepartmentStats(users);

  // Get role distribution
  const roleDistribution = Object.entries(byRole).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  return {
    total: users.length,
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

// Helper: Get count for period
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

// Helper: Get active count - UPDATED to work with your Log schema
function getActiveCount(users, logs, reservations, period) {
  const now = new Date();
  let cutoff = new Date();
  
  switch(period) {
    case 'day':
      cutoff.setDate(now.getDate() - 1);
      break;
    case 'week':
      cutoff.setDate(now.getDate() - 7);
      break;
    case 'month':
      cutoff.setMonth(now.getMonth() - 1);
      break;
    default:
      cutoff.setDate(now.getDate() - 7);
  }
  
  // Get active users from logs
  const activeFromLogs = new Set(
    logs
      .filter(log => log.createdAt && new Date(log.createdAt) >= cutoff)
      .map(log => log.userId?.toString() || log.id_number)
      .filter(id => id)
  );
  
  // Get active users from reservations
  const activeFromReservations = new Set(
    reservations
      .filter(res => res.createdAt && new Date(res.createdAt) >= cutoff)
      .map(res => res.userId?.toString())
      .filter(id => id)
  );
  
  // Combine both sets
  return new Set([...activeFromLogs, ...activeFromReservations]).size;
}

// Helper: Calculate trend
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

// Helper: Calculate retention rate - UPDATED to work with your Log schema
function calculateRetentionRate(users, logs) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sixtyDaysAgo = new Date(now);
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
    const userLogs = logs.filter(log => 
      (log.userId?.toString() === u._id.toString() || log.id_number === u.id_number) &&
      log.createdAt && new Date(log.createdAt) >= thirtyDaysAgo
    );
    return userLogs.length > 0;
  });
  
  return Math.round((retained.length / cohort.length) * 100);
}

// Helper: Generate growth data
function generateGrowthData(users, range) {
  const labels = [];
  const values = [];
  const now = new Date();
  
  switch(range) {
    case 'week':
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
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
      // Group by weeks
      for (let i = 3; i >= 0; i--) {
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() - (i * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekEnd.getDate() - 6);
        
        labels.push(`Week ${4-i}`);
        
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
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() - (i * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekEnd.getDate() - 6);
        
        labels.push(`Week ${4-i}`);
        
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

// Helper: Get top users - UPDATED to work with your Log schema
function getTopUsers(users, logs, reservations) {
  // Count user actions
  const userActionCount = {};
  
  // Count from logs
  logs.forEach(log => {
    const userId = log.userId?.toString();
    const idNumber = log.id_number;
    
    if (userId) {
      userActionCount[userId] = (userActionCount[userId] || 0) + 1;
    } else if (idNumber) {
      // Find user by id_number
      const user = users.find(u => u.id_number === idNumber);
      if (user) {
        userActionCount[user._id.toString()] = (userActionCount[user._id.toString()] || 0) + 1;
      }
    }
  });
  
  // Count from reservations
  reservations.forEach(res => {
    const userId = res.userId?.toString();
    if (userId) {
      userActionCount[userId] = (userActionCount[userId] || 0) + 1;
    }
  });
  
  // Map users with action counts
  const usersWithActions = users.map(user => ({
    id: user._id,
    name: user.name || 'Unknown',
    email: user.email || '',
    role: user.role || 'student',
    reservations: userActionCount[user._id.toString()] || 0,
    lastActive: user.lastLogin || user.updatedAt
  }));
  
  // Sort and return top 5
  return usersWithActions
    .sort((a, b) => b.reservations - a.reservations)
    .slice(0, 5);
}

// Helper: Get department stats
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

// ================= OVERVIEW ANALYTICS =================
exports.getAnalyticsOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ archived: { $ne: true } });
    const totalReservations = await Reservation.countDocuments();
    const totalLogs = await Log.countDocuments();

    res.json({
      success: true,
      data: {
        totalUsers,
        totalReservations,
        totalActivityLogs: totalLogs
      }
    });
  } catch (error) {
    console.error("Error in getAnalyticsOverview:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch overview analytics"
    });
  }
};

// ================= RESERVATION ANALYTICS =================
exports.getReservationAnalytics = async (req, res) => {
  try {
    const totalReservations = await Reservation.countDocuments();
    const approved = await Reservation.countDocuments({ status: "Approved" });
    const pending = await Reservation.countDocuments({ status: "Pending" });
    const cancelled = await Reservation.countDocuments({ status: "Cancelled" });

    res.json({
      success: true,
      data: {
        totalReservations,
        approved,
        pending,
        cancelled
      }
    });
  } catch (error) {
    console.error("Error in getReservationAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reservation analytics"
    });
  }
};

// ================= ROOM ANALYTICS =================
exports.getRoomAnalytics = async (req, res) => {
  try {
    const reservations = await Reservation.find().lean();

    const roomUsage = {};

    reservations.forEach(res => {
      const room = res.roomName || "Unknown";
      roomUsage[room] = (roomUsage[room] || 0) + 1;
    });

    res.json({
      success: true,
      data: roomUsage
    });
  } catch (error) {
    console.error("Error in getRoomAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch room analytics"
    });
  }
};

// ================= ENGAGEMENT METRICS =================
exports.getEngagementMetrics = async (req, res) => {
  try {
    const totalLogs = await Log.countDocuments();

    res.json({
      success: true,
      data: {
        totalLogs
      }
    });
  } catch (error) {
    console.error("Error in getEngagementMetrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch engagement metrics"
    });
  }
};

// ================= EXPORT ANALYTICS =================
exports.exportAnalytics = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Export feature coming soon"
    });
  } catch (error) {
    console.error("Error in exportAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export analytics"
    });
  }
};
