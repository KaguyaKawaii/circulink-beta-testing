// controllers/analyticsController.js

const User = require("../models/User");
const Log = require("../models/Log");
const Reservation = require("../models/Reservation");

// @desc    Get user analytics
// @route   GET /api/analytics/users
// @access  Public
exports.getUserAnalytics = async (req, res) => {
  try {
    const { range = "month", startDate, endDate } = req.query;
    
    // Get date ranges
    let startDateObj, previousStartDateObj;
    let isCustomRange = false;
    
    if (startDate && endDate) {
      // Custom date range
      isCustomRange = true;
      startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      
      // For custom range, we need to calculate previous period of same length
      const rangeLength = endDateObj - startDateObj;
      previousStartDateObj = new Date(startDateObj - rangeLength);
      
      console.log(`Custom range: ${startDateObj} to ${endDateObj}`);
    } else {
      // Predefined ranges
      startDateObj = getStartDate(range);
      previousStartDateObj = getPreviousStartDate(range);
    }
    
    // Fetch all users (non-archived)
    const users = await User.find({ archived: { $ne: true } })
      .select('-password')
      .lean();
    
    // Fetch archived users
    const archivedUsers = await User.find({ archived: true })
      .select('-password')
      .lean();
    
    // Fetch logs for activity data - adjust based on range
    let logsQuery = {};
    if (isCustomRange) {
      // For custom range, get logs within that range plus some buffer for calculations
      const bufferStart = new Date(previousStartDateObj);
      logsQuery = {
        createdAt: { $gte: bufferStart }
      };
    } else {
      // For predefined ranges, get last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      logsQuery = {
        createdAt: { $gte: threeMonthsAgo }
      };
    }
    
    const logs = await Log.find(logsQuery).lean();
    
    // Fetch reservations similarly
    let reservationsQuery = {};
    if (isCustomRange) {
      const bufferStart = new Date(previousStartDateObj);
      reservationsQuery = {
        createdAt: { $gte: bufferStart }
      };
    } else {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      reservationsQuery = {
        createdAt: { $gte: threeMonthsAgo }
      };
    }
    
    const reservations = await Reservation.find(reservationsQuery).lean();

    // Calculate statistics
    const stats = calculateUserStats(
      users, 
      archivedUsers, 
      logs, 
      reservations, 
      range, 
      startDateObj, 
      previousStartDateObj,
      isCustomRange,
      startDate,
      endDate
    );

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

// Main calculation function - UPDATED to handle custom ranges
function calculateUserStats(users, archivedUsers, logs, reservations, range, startDate, previousStartDate, isCustomRange, customStart, customEnd) {
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

  // Calculate by status
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

  // Calculate new users based on date range
  let newUsers = 0;
  let previousNewUsers = 0;
  
  if (isCustomRange && customStart && customEnd) {
    // For custom range, count users created between start and end
    const endDateObj = new Date(customEnd);
    endDateObj.setHours(23, 59, 59, 999);
    
    newUsers = users.filter(u => 
      u.createdAt && 
      new Date(u.createdAt) >= startDate && 
      new Date(u.createdAt) <= endDateObj
    ).length;
    
    // Previous period of same length
    const rangeLength = endDateObj - startDate;
    const prevPeriodStart = new Date(startDate - rangeLength);
    const prevPeriodEnd = new Date(startDate - 1);
    
    previousNewUsers = users.filter(u => 
      u.createdAt && 
      new Date(u.createdAt) >= prevPeriodStart && 
      new Date(u.createdAt) <= prevPeriodEnd
    ).length;
  } else {
    // Predefined ranges
    newUsers = users.filter(u => 
      u.createdAt && new Date(u.createdAt) >= startDate
    ).length;
    
    previousNewUsers = users.filter(u => 
      u.createdAt && 
      new Date(u.createdAt) >= previousStartDate && 
      new Date(u.createdAt) < startDate
    ).length;
  }

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

  // Calculate activity stats
  const activityStats = {
    activeToday: getActiveCount(users, logs, reservations, 'day'),
    activeThisWeek: getActiveCount(users, logs, reservations, 'week'),
    activeThisMonth: getActiveCount(users, logs, reservations, 'month'),
    retentionRate: calculateRetentionRate(users, logs)
  };

  // Generate growth data - UPDATED for custom ranges
  const growth = generateGrowthData(users, range, isCustomRange, startDate, customStart, customEnd);

  // Get top users
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

// Helper: Get active count
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

// Helper: Calculate retention rate
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

// Helper: Generate growth data - UPDATED for custom ranges
function generateGrowthData(users, range, isCustomRange, startDate, customStart, customEnd) {
  const labels = [];
  const values = [];
  const now = new Date();
  
  if (isCustomRange && customStart && customEnd) {
    // For custom range, create appropriate intervals based on range length
    const start = new Date(customStart);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    
    const rangeDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
    
    if (rangeDays <= 14) {
      // Less than 2 weeks: show daily
      for (let i = 0; i <= rangeDays; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        const dayStart = new Date(date.setHours(0,0,0,0));
        const dayEnd = new Date(date.setHours(23,59,59,999));
        
        const count = users.filter(u => 
          u.createdAt && 
          new Date(u.createdAt) >= dayStart && 
          new Date(u.createdAt) <= dayEnd
        ).length;
        values.push(count);
      }
    } else if (rangeDays <= 60) {
      // 2 weeks to 2 months: show weekly
      const weeks = Math.ceil(rangeDays / 7);
      for (let i = 0; i < weeks; i++) {
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        labels.push(`Week ${i+1}`);
        
        const count = users.filter(u => 
          u.createdAt && 
          new Date(u.createdAt) >= weekStart && 
          new Date(u.createdAt) <= weekEnd
        ).length;
        values.push(count);
      }
    } else {
      // More than 2 months: show monthly
      const months = Math.ceil(rangeDays / 30);
      for (let i = 0; i < months; i++) {
        const monthStart = new Date(start);
        monthStart.setMonth(start.getMonth() + i);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthStart.getMonth() + 1);
        monthEnd.setDate(0);
        
        labels.push(monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        
        const count = users.filter(u => 
          u.createdAt && 
          new Date(u.createdAt) >= monthStart && 
          new Date(u.createdAt) <= monthEnd
        ).length;
        values.push(count);
      }
    }
  } else {
    // Predefined ranges (week, month, year)
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
  }
  
  return { labels, values };
}

// Helper: Get top users
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

// ================= SIMPLE RESERVATION ANALYTICS =================
// This version returns just the 4 metrics for the simple dashboard
exports.getReservationAnalytics = async (req, res) => {
  try {
    const totalReservations = await Reservation.countDocuments();
    const approved = await Reservation.countDocuments({ status: "Approved" });
    const pending = await Reservation.countDocuments({ status: "Pending" });
    const cancelled = await Reservation.countDocuments({ status: "Cancelled" });
    const completed = await Reservation.countDocuments({ status: "Completed" });

    // Get popular rooms
    const reservations = await Reservation.find().lean();
    const roomCounts = {};
    
    reservations.forEach(res => {
      const roomName = res.roomName || "Unknown";
      roomCounts[roomName] = (roomCounts[roomName] || 0) + 1;
    });

    // Calculate by time of day
    const byTimeOfDay = {
      morning: 0,   // 6AM - 11:59AM
      afternoon: 0, // 12PM - 4:59PM
      evening: 0    // 5PM - 9PM
    };

    reservations.forEach(res => {
      if (res.datetime) {
        const hour = new Date(res.datetime).getHours();
        if (hour >= 6 && hour < 12) {
          byTimeOfDay.morning++;
        } else if (hour >= 12 && hour < 17) {
          byTimeOfDay.afternoon++;
        } else if (hour >= 17 && hour < 22) {
          byTimeOfDay.evening++;
        }
      }
    });

    // Calculate by day of week
    const byDayOfWeek = {
      mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0
    };

    reservations.forEach(res => {
      if (res.datetime) {
        const day = new Date(res.datetime).getDay();
        const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayKey = dayMap[day];
        if (byDayOfWeek.hasOwnProperty(dayKey)) {
          byDayOfWeek[dayKey]++;
        }
      }
    });

    const popularRooms = Object.entries(roomCounts)
      .map(([name, count]) => ({ 
        name, 
        bookings: count, 
        utilization: Math.min(Math.round((count / 105) * 100), 100) 
      }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        total: totalReservations,
        pending,
        approved,
        rejected: 0,
        completed,
        cancelled,
        byTimeOfDay,
        byDayOfWeek,
        popularRooms
      }
    });
  } catch (error) {
    console.error("Error in getReservationAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reservation analytics",
      error: error.message
    });
  }
};

// ================= COMPREHENSIVE RESERVATION ANALYTICS =================
// This version returns detailed analytics with trends and growth data
exports.getDetailedReservationAnalytics = async (req, res) => {
  try {
    const { range = "month", startDate, endDate } = req.query;
    
    // Get date ranges
    let startDateObj, previousStartDateObj;
    let isCustomRange = false;
    
    if (startDate && endDate) {
      // Custom date range
      isCustomRange = true;
      startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      
      // For custom range, calculate previous period of same length
      const rangeLength = endDateObj - startDateObj;
      previousStartDateObj = new Date(startDateObj - rangeLength);
      
      console.log(`Custom range: ${startDateObj} to ${endDateObj}`);
    } else {
      // Predefined ranges
      startDateObj = getStartDate(range);
      previousStartDateObj = getPreviousStartDate(range);
    }

    // Get end date for current period
    const endDateObj = isCustomRange && endDate 
      ? new Date(endDate) 
      : new Date();
    
    if (!isCustomRange) {
      endDateObj.setHours(23, 59, 59, 999);
    }

    // Fetch all reservations in the main period
    const reservations = await Reservation.find({
      createdAt: { $gte: startDateObj, $lte: endDateObj }
    }).lean();

    // Fetch previous period reservations for trends
    const previousReservations = await Reservation.find({
      createdAt: { 
        $gte: previousStartDateObj, 
        $lt: startDateObj 
      }
    }).lean();

    // Fetch all reservations for additional stats (by room, by time, etc.)
    const allReservations = await Reservation.find({}).lean();

    // Calculate statistics
    const stats = calculateReservationStats(
      reservations,
      previousReservations,
      allReservations,
      range,
      startDateObj,
      endDateObj,
      isCustomRange
    );

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error("Error in getDetailedReservationAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch detailed reservation analytics",
      error: error.message
    });
  }
};

// Helper function to calculate reservation statistics
function calculateReservationStats(
  reservations, 
  previousReservations, 
  allReservations,
  range,
  startDate,
  endDate,
  isCustomRange
) {
  // Basic counts
  const total = reservations.length;
  const pending = reservations.filter(r => r.status === "Pending").length;
  const approved = reservations.filter(r => r.status === "Approved").length;
  const rejected = reservations.filter(r => r.status === "Rejected").length;
  const completed = reservations.filter(r => r.status === "Completed").length;
  const cancelled = reservations.filter(r => r.status === "Cancelled").length;
  const expired = reservations.filter(r => r.status === "Expired").length;
  const ongoing = reservations.filter(r => r.status === "Ongoing").length;

  // Previous period totals
  const previousTotal = previousReservations.length;

  // Calculate trends
  const trends = {
    total: calculateTrend(total, previousTotal),
    pending: calculateTrend(
      pending, 
      previousReservations.filter(r => r.status === "Pending").length
    ),
    approved: calculateTrend(
      approved, 
      previousReservations.filter(r => r.status === "Approved").length
    ),
    completed: calculateTrend(
      completed, 
      previousReservations.filter(r => r.status === "Completed").length
    ),
    cancelled: calculateTrend(
      cancelled, 
      previousReservations.filter(r => r.status === "Cancelled").length
    )
  };

  // Calculate by room (using all reservations for better data)
  const roomCounts = {};
  allReservations.forEach(res => {
    const roomKey = res.roomName || "Unknown";
    if (!roomCounts[roomKey]) {
      roomCounts[roomKey] = {
        name: roomKey,
        count: 0,
        statuses: {}
      };
    }
    roomCounts[roomKey].count++;
    
    // Track status counts per room
    const status = res.status || "Unknown";
    roomCounts[roomKey].statuses[status] = 
      (roomCounts[roomKey].statuses[status] || 0) + 1;
  });

  // Convert to array and sort
  const byRoom = Object.values(roomCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(room => ({
      name: room.name,
      count: room.count,
      approved: room.statuses.Approved || 0,
      pending: room.statuses.Pending || 0,
      completed: room.statuses.Completed || 0,
      cancelled: room.statuses.Cancelled || 0
    }));

  // Calculate by time of day
  const byTimeOfDay = {
    morning: 0,   // 6AM - 11:59AM
    afternoon: 0, // 12PM - 4:59PM
    evening: 0    // 5PM - 9PM
  };

  allReservations.forEach(res => {
    if (res.datetime) {
      const hour = new Date(res.datetime).getHours();
      if (hour >= 6 && hour < 12) {
        byTimeOfDay.morning++;
      } else if (hour >= 12 && hour < 17) {
        byTimeOfDay.afternoon++;
      } else if (hour >= 17 && hour < 22) {
        byTimeOfDay.evening++;
      }
    }
  });

  // Calculate by day of week
  const byDayOfWeek = {
    mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0
  };

  allReservations.forEach(res => {
    if (res.datetime) {
      const day = new Date(res.datetime).getDay();
      // Convert to our format (0 = Sunday, 1 = Monday, etc.)
      const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const dayKey = dayMap[day];
      if (byDayOfWeek.hasOwnProperty(dayKey)) {
        byDayOfWeek[dayKey]++;
      }
    }
  });

  // Calculate popular rooms with utilization rates
  const popularRooms = byRoom.slice(0, 5).map(room => {
    // Calculate utilization rate based on available time slots
    // Assuming 15 hours per day (6AM-9PM) * 7 days = 105 possible slots per week
    const totalPossibleSlots = 15 * 7;
    const utilization = Math.min(
      Math.round((room.count / totalPossibleSlots) * 100),
      100
    );
    
    return {
      name: room.name,
      bookings: room.count,
      approved: room.approved,
      completed: room.completed,
      utilization: utilization
    };
  });

  // Generate growth data based on range
  const growth = generateReservationGrowthData(
    reservations, 
    allReservations,
    range, 
    isCustomRange, 
    startDate, 
    endDate
  );

  // Calculate by location/floor
  const byFloor = {};
  allReservations.forEach(res => {
    const floor = res.location || "Unknown";
    byFloor[floor] = (byFloor[floor] || 0) + 1;
  });

  const floorDistribution = Object.entries(byFloor)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Calculate average group size
  const totalParticipants = allReservations.reduce(
    (sum, res) => sum + (res.participants?.length || 0), 
    0
  );
  const avgGroupSize = allReservations.length > 0 
    ? Math.round((totalParticipants / allReservations.length) * 10) / 10
    : 0;

  // Calculate by purpose
  const byPurpose = {};
  allReservations.forEach(res => {
    const purpose = res.purpose || "Other";
    byPurpose[purpose] = (byPurpose[purpose] || 0) + 1;
  });

  const purposeDistribution = Object.entries(byPurpose)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    total,
    pending,
    approved,
    rejected,
    completed,
    cancelled,
    expired,
    ongoing,
    byRoom,
    byTimeOfDay,
    byDayOfWeek,
    popularRooms,
    trends,
    growth,
    floorDistribution,
    avgGroupSize,
    purposeDistribution,
    totalParticipants,
    previousTotal
  };
}

// Helper function to generate reservation growth data
function generateReservationGrowthData(
  currentPeriodReservations,
  allReservations,
  range,
  isCustomRange,
  startDate,
  endDate
) {
  const labels = [];
  const values = [];
  const now = new Date();

  if (isCustomRange && startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const rangeDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
    
    if (rangeDays <= 14) {
      // Less than 2 weeks: show daily
      for (let i = 0; i <= rangeDays; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        const dayStart = new Date(date.setHours(0,0,0,0));
        const dayEnd = new Date(date.setHours(23,59,59,999));
        
        const count = currentPeriodReservations.filter(r => 
          r.datetime && 
          new Date(r.datetime) >= dayStart && 
          new Date(r.datetime) <= dayEnd
        ).length;
        values.push(count);
      }
    } else if (rangeDays <= 60) {
      // 2 weeks to 2 months: show weekly
      const weeks = Math.ceil(rangeDays / 7);
      for (let i = 0; i < weeks; i++) {
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        labels.push(`Week ${i+1}`);
        
        const count = currentPeriodReservations.filter(r => 
          r.datetime && 
          new Date(r.datetime) >= weekStart && 
          new Date(r.datetime) <= weekEnd
        ).length;
        values.push(count);
      }
    } else {
      // More than 2 months: show monthly
      const months = Math.ceil(rangeDays / 30);
      for (let i = 0; i < months; i++) {
        const monthStart = new Date(start);
        monthStart.setMonth(start.getMonth() + i);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthStart.getMonth() + 1);
        monthEnd.setDate(0);
        
        labels.push(monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        
        const count = currentPeriodReservations.filter(r => 
          r.datetime && 
          new Date(r.datetime) >= monthStart && 
          new Date(r.datetime) <= monthEnd
        ).length;
        values.push(count);
      }
    }
  } else {
    // Predefined ranges
    switch(range) {
      case 'week':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
          
          const dayStart = new Date(date.setHours(0,0,0,0));
          const dayEnd = new Date(date.setHours(23,59,59,999));
          
          const count = allReservations.filter(r => 
            r.datetime && 
            new Date(r.datetime) >= dayStart && 
            new Date(r.datetime) <= dayEnd
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
          
          const count = allReservations.filter(r => 
            r.datetime && 
            new Date(r.datetime) >= weekStart && 
            new Date(r.datetime) <= weekEnd
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
          
          const count = allReservations.filter(r => 
            r.datetime && 
            new Date(r.datetime) >= monthStart && 
            new Date(r.datetime) <= monthEnd
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
          
          const count = allReservations.filter(r => 
            r.datetime && 
            new Date(r.datetime) >= weekStart && 
            new Date(r.datetime) <= weekEnd
          ).length;
          values.push(count);
        }
    }
  }
  
  return { labels, values };
}

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