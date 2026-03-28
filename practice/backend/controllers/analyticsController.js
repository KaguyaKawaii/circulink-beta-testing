import User from "../models/User.js";
import Log from "../models/Log.js";
import Reservation from "../models/Reservation.js";
import Room from "../models/Room.js";

// ==================== USER ANALYTICS ====================

export const getUserAnalytics = async (req, res) => {
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

// Main calculation function - UPDATED to include staff_office
function calculateUserStats(users, archivedUsers, logs, reservations, range, startDate, previousStartDate, isCustomRange, customStart, customEnd) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const oneDayAgo = new Date(now);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  // Calculate by role - UPDATED to include staff_office
  const byRole = {
    student: users.filter(u => u.role?.toLowerCase() === 'student').length,
    faculty: users.filter(u => u.role?.toLowerCase() === 'faculty').length,
    staff: users.filter(u => u.role?.toLowerCase() === 'staff').length,
    staff_office: users.filter(u => u.role?.toLowerCase() === 'staff_office').length,
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
  const growth = generateUserGrowthData(users, range, isCustomRange, startDate, customStart, customEnd);

  // Get top users
  const topUsers = getTopUsers(users, logs, reservations);

  // Get department stats
  const departmentStats = getDepartmentStats(users);

  // Get role distribution - UPDATED to include staff_office
  const roleDistribution = Object.entries(byRole).map(([name, value]) => ({
    name: name === 'staff_office' ? 'Staff Office' : name.charAt(0).toUpperCase() + name.slice(1),
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

// Helper: Generate user growth data
function generateUserGrowthData(users, range, isCustomRange, startDate, customStart, customEnd) {
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
export const getAnalyticsOverview = async (req, res) => {
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
export const getReservationAnalytics = async (req, res) => {
  try {
    const { range = "month", startDate, endDate } = req.query;
    
    // Get date range for filtering
    let startDateObj;
    let endDateObj;
    
    if (startDate && endDate) {
      startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
    } else {
      startDateObj = getStartDate(range);
      endDateObj = new Date();
      endDateObj.setHours(23, 59, 59, 999);
    }

    // Build query based on date range
    let query = {};
    if (startDate && endDate) {
      query.$or = [
        { datetime: { $gte: startDateObj, $lte: endDateObj } },
        { startTime: { $gte: startDateObj, $lte: endDateObj } }
      ];
    } else {
      query.$or = [
        { datetime: { $gte: startDateObj } },
        { startTime: { $gte: startDateObj } }
      ];
    }

    const totalReservations = await Reservation.countDocuments(query);
    const approved = await Reservation.countDocuments({ ...query, status: "Approved" });
    const pending = await Reservation.countDocuments({ ...query, status: "Pending" });
    const cancelled = await Reservation.countDocuments({ ...query, status: "Cancelled" });
    const completed = await Reservation.countDocuments({ ...query, status: "Completed" });
    const rejected = await Reservation.countDocuments({ ...query, status: "Rejected" });
    const expired = await Reservation.countDocuments({ ...query, status: "Expired" });
    const ongoing = await Reservation.countDocuments({ ...query, status: "Ongoing" });

    // Get popular rooms
    const reservations = await Reservation.find(query).lean();
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
      const dateField = res.datetime || res.startTime;
      if (dateField) {
        const hour = new Date(dateField).getHours();
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
      const dateField = res.datetime || res.startTime;
      if (dateField) {
        const day = new Date(dateField).getDay();
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
        rejected,
        completed,
        cancelled,
        expired,
        ongoing,
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
export const getDetailedReservationAnalytics = async (req, res) => {
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
      $or: [
        { datetime: { $gte: startDateObj, $lte: endDateObj } },
        { startTime: { $gte: startDateObj, $lte: endDateObj } }
      ]
    }).lean();

    // Fetch previous period reservations for trends
    const previousReservations = await Reservation.find({
      $or: [
        { datetime: { $gte: previousStartDateObj, $lt: startDateObj } },
        { startTime: { $gte: previousStartDateObj, $lt: startDateObj } }
      ]
    }).lean();

    // Fetch all reservations for additional stats (by room, by time, etc.)
    const allReservations = await Reservation.find({}).lean();

    // Calculate statistics
    const stats = await calculateReservationStats(
      reservations,
      previousReservations,
      allReservations,
      range,
      startDateObj,
      endDateObj,
      isCustomRange,
      startDate,
      endDate
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

// Updated calculateReservationStats function
async function calculateReservationStats(
  reservations, 
  previousReservations, 
  allReservations,
  range,
  startDate,
  endDate,
  isCustomRange,
  customStart,
  customEnd
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
    const dateField = res.datetime || res.startTime;
    if (dateField) {
      const hour = new Date(dateField).getHours();
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
    const dateField = res.datetime || res.startTime;
    if (dateField) {
      const day = new Date(dateField).getDay();
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
    endDate,
    customStart,
    customEnd
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

  // Calculate user department statistics
  const userIds = [...new Set(allReservations.map(r => r.userId?.toString()).filter(id => id))];
  
  // Fetch user data for these users
  const users = await User.find({ _id: { $in: userIds } }).select('name department').lean();
  
  // Create a map of user id to user data
  const userMap = {};
  users.forEach(user => {
    userMap[user._id.toString()] = user;
  });

  // Calculate reservations by department
  const deptCount = {};
  allReservations.forEach(res => {
    const userId = res.userId?.toString();
    if (userId && userMap[userId]) {
      const dept = userMap[userId].department || 'Other';
      deptCount[dept] = (deptCount[dept] || 0) + 1;
    }
  });

  const userDepartmentStats = Object.entries(deptCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calculate top reservers
  const userReservationCount = {};
  allReservations.forEach(res => {
    const userId = res.userId?.toString();
    if (userId) {
      userReservationCount[userId] = (userReservationCount[userId] || 0) + 1;
    }
  });

  const topReservers = Object.entries(userReservationCount)
    .map(([userId, count]) => {
      const user = userMap[userId];
      return {
        name: user?.name || 'Unknown',
        department: user?.department || 'Unknown',
        count: count
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

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
    previousTotal,
    userDepartmentStats,
    topReservers
  };
}

// Reservation Growth Data Function
function generateReservationGrowthData(
  currentPeriodReservations,
  allReservations,
  range,
  isCustomRange,
  startDate,
  endDate,
  customStart,
  customEnd
) {
  const labels = [];
  const values = [];
  const now = new Date();

  if (isCustomRange && customStart && customEnd) {
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
        
        const count = allReservations.filter(r => {
          const dateField = r.datetime || r.startTime;
          return dateField && 
            new Date(dateField) >= dayStart && 
            new Date(dateField) <= dayEnd;
        }).length;
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
        
        const count = allReservations.filter(r => {
          const dateField = r.datetime || r.startTime;
          return dateField && 
            new Date(dateField) >= weekStart && 
            new Date(dateField) <= weekEnd;
        }).length;
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
        
        const count = allReservations.filter(r => {
          const dateField = r.datetime || r.startTime;
          return dateField && 
            new Date(dateField) >= monthStart && 
            new Date(dateField) <= monthEnd;
        }).length;
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
          
          const count = allReservations.filter(r => {
            const dateField = r.datetime || r.startTime;
            return dateField && 
              new Date(dateField) >= dayStart && 
              new Date(dateField) <= dayEnd;
          }).length;
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
          
          const count = allReservations.filter(r => {
            const dateField = r.datetime || r.startTime;
            return dateField && 
              new Date(dateField) >= weekStart && 
              new Date(dateField) <= weekEnd;
          }).length;
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
          
          const count = allReservations.filter(r => {
            const dateField = r.datetime || r.startTime;
            return dateField && 
              new Date(dateField) >= monthStart && 
              new Date(dateField) <= monthEnd;
          }).length;
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
          
          const count = allReservations.filter(r => {
            const dateField = r.datetime || r.startTime;
            return dateField && 
              new Date(dateField) >= weekStart && 
              new Date(dateField) <= weekEnd;
          }).length;
          values.push(count);
        }
    }
  }
  
  return { labels, values };
}

// ================= SIMPLE ROOM ANALYTICS =================
export const getRoomAnalytics = async (req, res) => {
  try {
    const { range = "month", startDate, endDate } = req.query;
    
    // Get date range for filtering
    let startDateObj;
    let endDateObj;
    
    if (startDate && endDate) {
      startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
    } else {
      startDateObj = getStartDate(range);
      endDateObj = new Date();
      endDateObj.setHours(23, 59, 59, 999);
    }

    // Build query based on date range
    let query = {};
    if (startDate && endDate) {
      query.$or = [
        { datetime: { $gte: startDateObj, $lte: endDateObj } },
        { startTime: { $gte: startDateObj, $lte: endDateObj } }
      ];
    } else {
      query.$or = [
        { datetime: { $gte: startDateObj } },
        { startTime: { $gte: startDateObj } }
      ];
    }

    // Get all rooms
    const rooms = await Room.find({}).lean();
    
    // Get reservations within date range
    const reservations = await Reservation.find(query).lean();

    // Calculate room usage
    const roomUsage = {};
    const roomStatus = {
      available: 0,
      occupied: 0,
      maintenance: 0
    };

    // Initialize room data
    rooms.forEach(room => {
      const roomKey = room.room || `${room.floor} - ${room.room}`;
      roomUsage[roomKey] = {
        name: roomKey,
        floor: room.floor,
        type: room.type,
        capacity: room.capacity,
        bookings: 0,
        status: room.isActive ? 'available' : 'maintenance',
        features: room.features || {},
        lastMaintenance: room.updatedAt
      };
      
      // Count by status
      if (!room.isActive) {
        roomStatus.maintenance++;
      }
    });

    // Count bookings per room
    reservations.forEach(res => {
      const roomName = res.roomName || "Unknown";
      if (roomUsage[roomName]) {
        roomUsage[roomName].bookings++;
      } else {
        // Create entry for unknown room
        if (!roomUsage[roomName]) {
          roomUsage[roomName] = {
            name: roomName,
            floor: 'Unknown',
            type: 'Unknown',
            capacity: 0,
            bookings: 0,
            status: 'unknown',
            features: {}
          };
        }
        roomUsage[roomName].bookings++;
      }
    });

    // Calculate current occupancy
    const now = new Date();
    const currentReservations = await Reservation.find({
      $or: [
        { datetime: { $lte: now }, endTime: { $gte: now } },
        { startTime: { $lte: now }, endTime: { $gte: now } }
      ],
      status: { $in: ['Approved', 'Ongoing'] }
    }).lean();

    const occupiedRooms = new Set(currentReservations.map(r => r.roomName));
    roomStatus.occupied = occupiedRooms.size;
    roomStatus.available = rooms.length - roomStatus.occupied - roomStatus.maintenance;

    // Calculate total utilization
    const totalPossibleSlots = 15 * 7; // 15 hours per day * 7 days
    const totalUtilization = reservations.length > 0 
      ? Math.min(Math.round((reservations.length / (rooms.length * totalPossibleSlots)) * 100), 100)
      : 0;

    // Calculate by type
    const byType = {
      lecture: rooms.filter(r => r.type?.toLowerCase() === 'lecture').length,
      laboratory: rooms.filter(r => r.type?.toLowerCase() === 'laboratory').length,
      conference: rooms.filter(r => r.type?.toLowerCase() === 'conference').length,
      office: rooms.filter(r => r.type?.toLowerCase() === 'office').length,
      general: rooms.filter(r => !r.type || r.type === 'General').length
    };

    // Get popular rooms
    const popularRooms = Object.values(roomUsage)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5)
      .map(room => ({
        name: room.name,
        bookings: room.bookings,
        type: room.type,
        capacity: room.capacity,
        utilization: room.bookings > 0 
          ? Math.min(Math.round((room.bookings / totalPossibleSlots) * 100), 100)
          : 0
      }));

    res.json({
      success: true,
      data: {
        total: rooms.length,
        available: roomStatus.available,
        occupied: roomStatus.occupied,
        maintenance: roomStatus.maintenance,
        utilization: totalUtilization,
        byType,
        popularRooms,
        roomDetails: Object.values(roomUsage).slice(0, 20)
      }
    });

  } catch (error) {
    console.error("Error in getRoomAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch room analytics",
      error: error.message
    });
  }
};

// ================= COMPREHENSIVE ROOM ANALYTICS =================
export const getDetailedRoomAnalytics = async (req, res) => {
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

    // Fetch all rooms
    const rooms = await Room.find({}).lean();
    
    // Fetch all reservations (for complete data)
    const allReservations = await Reservation.find({}).lean();

    // Calculate detailed statistics
    const stats = await calculateDetailedRoomStats(
      rooms,
      allReservations,
      range,
      startDateObj,
      endDateObj,
      isCustomRange,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error("Error in getDetailedRoomAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch detailed room analytics",
      error: error.message
    });
  }
};

// Helper function to calculate detailed room statistics
async function calculateDetailedRoomStats(
  rooms,
  allReservations,
  range,
  startDate,
  endDate,
  isCustomRange,
  customStart,
  customEnd
) {
  // Basic counts
  const total = rooms.length;
  
  // Calculate current status
  const now = new Date();
  const currentReservations = await Reservation.find({
    $or: [
      {
        datetime: { $lte: now },
        endTime: { $gte: now }
      },
      {
        startTime: { $lte: now },
        endTime: { $gte: now }
      }
    ],
    status: { $in: ['Approved', 'Ongoing'] }
  }).lean();

  const occupiedRooms = new Set(currentReservations.map(r => r.roomName));
  const occupied = occupiedRooms.size;
  const maintenance = rooms.filter(r => !r.isActive).length;
  const available = total - occupied - maintenance;

  // Calculate utilization rate
  const totalPossibleSlots = 15 * 7; // 15 hours per day * 7 days
  const totalSlots = rooms.length * totalPossibleSlots;
  const totalBookings = allReservations.length;
  const utilization = totalSlots > 0 
    ? Math.min(Math.round((totalBookings / totalSlots) * 100), 100)
    : 0;

  // Calculate by type
  const byType = {
    lecture: rooms.filter(r => r.type?.toLowerCase() === 'lecture').length,
    laboratory: rooms.filter(r => r.type?.toLowerCase() === 'laboratory').length,
    conference: rooms.filter(r => r.type?.toLowerCase() === 'conference').length,
    office: rooms.filter(r => r.type?.toLowerCase() === 'office').length,
    general: rooms.filter(r => !r.type || r.type === 'General').length
  };

  // Calculate by floor
  const byFloor = {};
  rooms.forEach(room => {
    const floor = room.floor || 'Unknown';
    byFloor[floor] = (byFloor[floor] || 0) + 1;
  });

  // Calculate by capacity
  const byCapacity = {
    small: 0,    // 1-10
    medium: 0,   // 11-30
    large: 0,    // 31-50
    xlarge: 0    // 51+
  };

  rooms.forEach(room => {
    const cap = room.capacity || 0;
    if (cap <= 10) byCapacity.small++;
    else if (cap <= 30) byCapacity.medium++;
    else if (cap <= 50) byCapacity.large++;
    else byCapacity.xlarge++;
  });

  // Calculate feature statistics
  const featureStats = {
    wifi: rooms.filter(r => r.features?.wifi).length,
    aircon: rooms.filter(r => r.features?.aircon).length,
    projector: rooms.filter(r => r.features?.projector).length,
    monitor: rooms.filter(r => r.features?.monitor).length
  };

  // Calculate hourly utilization
  const hourlyUtilization = [];
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]; // 8AM to 5PM
  
  hours.forEach(hour => {
    const hourStr = hour <= 11 ? `${hour}AM` : hour === 12 ? `12PM` : `${hour-12}PM`;
    
    // Count bookings for this hour across all reservations
    const bookingsAtHour = allReservations.filter(res => {
      const dateField = res.datetime || res.startTime;
      if (!dateField) return false;
      
      try {
        const resHour = new Date(dateField).getHours();
        return resHour === hour;
      } catch (e) {
        return false;
      }
    }).length;
    
    // Calculate utilization percentage for this hour
    // Max possible bookings per hour = number of rooms (each room can have 1 booking per hour)
    const possibleBookings = rooms.length;
    const hourUtilization = possibleBookings > 0 
      ? Math.min(Math.round((bookingsAtHour / possibleBookings) * 100), 100)
      : 0;
    
    hourlyUtilization.push({
      hour: hourStr,
      utilization: hourUtilization,
      bookings: bookingsAtHour
    });
  });

  // Calculate peak hours (utilization > 60%)
  const peakHours = hourlyUtilization
    .filter(h => h.utilization > 60)
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 5);

  // Calculate room details with bookings
  const roomDetails = [];
  const roomBookings = {};

  // Count bookings per room
  allReservations.forEach(res => {
    const roomName = res.roomName || 'Unknown';
    if (!roomBookings[roomName]) {
      roomBookings[roomName] = {
        total: 0,
        byStatus: {}
      };
    }
    roomBookings[roomName].total++;
    
    const status = res.status || 'Unknown';
    roomBookings[roomName].byStatus[status] = 
      (roomBookings[roomName].byStatus[status] || 0) + 1;
  });

  // Build room details
  rooms.forEach(room => {
    const roomName = room.room || `${room.floor} - ${room.room}`;
    const bookings = roomBookings[roomName]?.total || 0;
    const roomUtilization = totalSlots > 0 
      ? Math.min(Math.round((bookings / totalSlots) * 100), 100)
      : 0;
    
    // Determine status
    let status = 'available';
    if (!room.isActive) {
      status = 'maintenance';
    } else if (occupiedRooms.has(roomName)) {
      status = 'occupied';
    }

    roomDetails.push({
      id: room._id,
      name: roomName,
      type: room.type || 'General',
      floor: room.floor,
      capacity: room.capacity || 0,
      bookings: bookings,
      utilization: roomUtilization,
      status: status,
      features: room.features || {},
      lastMaintenance: room.updatedAt,
      nextMaintenance: calculateNextMaintenance(room.updatedAt)
    });
  });

  // Sort by bookings for top rooms
  const topRooms = [...roomDetails]
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 10);

  // Calculate utilization by type
  const utilizationByType = {};
  const typeBookings = {};
  const typeRooms = {};

  roomDetails.forEach(room => {
    const type = room.type;
    if (!typeBookings[type]) {
      typeBookings[type] = 0;
      typeRooms[type] = 0;
    }
    typeBookings[type] += room.bookings;
    typeRooms[type]++;
  });

  Object.keys(typeBookings).forEach(type => {
    const possibleBookings = typeRooms[type] * totalPossibleSlots;
    utilizationByType[type.toLowerCase()] = possibleBookings > 0
      ? Math.round((typeBookings[type] / possibleBookings) * 100)
      : 0;
  });

  // Generate growth data
  const growth = generateRoomGrowthData(
    allReservations,
    range,
    isCustomRange,
    startDate,
    endDate,
    customStart,
    customEnd
  );

  // Generate booking trends (monthly)
  const bookingTrends = generateBookingTrends(allReservations);

  // Fetch users for top users data
  const userIds = [...new Set(allReservations.map(r => r.userId?.toString()).filter(id => id))];
  const users = await User.find({ _id: { $in: userIds } }).select('name department').lean();
  
  // Create user map
  const userMap = {};
  users.forEach(user => {
    userMap[user._id.toString()] = user;
  });

  // Get top users by room bookings
  const userBookings = {};
  allReservations.forEach(res => {
    const userId = res.userId?.toString();
    if (userId && userMap[userId]) {
      if (!userBookings[userId]) {
        userBookings[userId] = {
          count: 0,
          rooms: {}
        };
      }
      userBookings[userId].count++;
      
      const roomName = res.roomName || 'Unknown';
      userBookings[userId].rooms[roomName] = 
        (userBookings[userId].rooms[roomName] || 0) + 1;
    }
  });

  const topUsers = Object.entries(userBookings)
    .map(([userId, data]) => {
      // Find most used room
      const topRoom = Object.entries(data.rooms)
        .sort((a, b) => b[1] - a[1])[0];
      
      return {
        name: userMap[userId]?.name || 'Unknown',
        department: userMap[userId]?.department || 'Unknown',
        bookings: data.count,
        room: topRoom ? topRoom[0] : 'Unknown'
      };
    })
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5);

  // Generate maintenance history
  const maintenanceHistory = generateMaintenanceHistory(roomDetails);

  // Prepare distribution arrays for charts
  const roomTypeDistribution = Object.entries(byType)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1) + (name === 'lecture' ? ' Halls' : name === 'laboratory' ? 'ies' : 's'),
      value,
      color: getTypeColor(name)
    }));

  const floorDistribution = Object.entries(byFloor)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const capacityDistribution = Object.entries(byCapacity)
    .map(([name, value]) => {
      let displayName = 'Small (1-10)';
      if (name === 'medium') displayName = 'Medium (11-30)';
      if (name === 'large') displayName = 'Large (31-50)';
      if (name === 'xlarge') displayName = 'X-Large (51+)';
      return { name: displayName, value };
    });

  // Calculate trends
  const trends = {
    total: { value: total, percentage: 0, direction: 'up' },
    utilization: { value: utilization, percentage: 0, direction: 'up' },
    available: { value: available, percentage: 0, direction: 'up' },
    occupied: { value: occupied, percentage: 0, direction: 'up' }
  };

  return {
    total,
    available,
    occupied,
    maintenance,
    utilization,
    byType,
    byFloor,
    byCapacity,
    featureStats,
    roomDetails,
    hourlyUtilization,
    topRooms,
    trends,
    growth,
    roomTypeDistribution,
    floorDistribution,
    capacityDistribution,
    utilizationByType,
    peakHours,
    bookingTrends,
    maintenanceHistory,
    topUsers
  };
}

// Helper function to generate room growth data
function generateRoomGrowthData(
  allReservations,
  range,
  isCustomRange,
  startDate,
  endDate,
  customStart,
  customEnd
) {
  const labels = [];
  const values = [];
  const now = new Date();

  if (isCustomRange && customStart && customEnd) {
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
        
        const count = allReservations.filter(r => {
          const dateField = r.datetime || r.startTime;
          return dateField && 
            new Date(dateField) >= dayStart && 
            new Date(dateField) <= dayEnd;
        }).length;
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
        
        const count = allReservations.filter(r => {
          const dateField = r.datetime || r.startTime;
          return dateField && 
            new Date(dateField) >= weekStart && 
            new Date(dateField) <= weekEnd;
        }).length;
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
        
        const count = allReservations.filter(r => {
          const dateField = r.datetime || r.startTime;
          return dateField && 
            new Date(dateField) >= monthStart && 
            new Date(dateField) <= monthEnd;
        }).length;
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
          
          const count = allReservations.filter(r => {
            const dateField = r.datetime || r.startTime;
            return dateField && 
              new Date(dateField) >= dayStart && 
              new Date(dateField) <= dayEnd;
          }).length;
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
          
          const count = allReservations.filter(r => {
            const dateField = r.datetime || r.startTime;
            return dateField && 
              new Date(dateField) >= weekStart && 
              new Date(dateField) <= weekEnd;
          }).length;
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
          
          const count = allReservations.filter(r => {
            const dateField = r.datetime || r.startTime;
            return dateField && 
              new Date(dateField) >= monthStart && 
              new Date(dateField) <= monthEnd;
          }).length;
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
          
          const count = allReservations.filter(r => {
            const dateField = r.datetime || r.startTime;
            return dateField && 
              new Date(dateField) >= weekStart && 
              new Date(dateField) <= weekEnd;
          }).length;
          values.push(count);
        }
    }
  }
  
  return { labels, values };
}

// Helper function to generate booking trends
function generateBookingTrends(allReservations) {
  const trends = [];
  const months = {};
  
  // Group bookings by month
  allReservations.forEach(res => {
    const dateField = res.datetime || res.startTime;
    if (!dateField) return;
    
    try {
      const date = new Date(dateField);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const monthShort = date.toLocaleDateString('en-US', { month: 'short' });
      
      if (!months[monthKey]) {
        months[monthKey] = {
          month: monthShort,
          fullKey: monthKey,
          bookings: 0
        };
      }
      months[monthKey].bookings++;
    } catch (e) {
      // Skip invalid dates
    }
  });

  // Convert to array and sort chronologically
  const sortedMonths = Object.values(months)
    .sort((a, b) => {
      const dateA = new Date(a.fullKey + ' 1, 2000');
      const dateB = new Date(b.fullKey + ' 1, 2000');
      return dateA - dateB;
    })
    .slice(-6); // Last 6 months

  return sortedMonths.map(m => ({
    month: m.month,
    bookings: m.bookings
  }));
}

// Helper function to generate maintenance history
function generateMaintenanceHistory(roomDetails) {
  const history = [];
  const maintenanceTypes = ['AC Repair', 'Equipment Check', 'Projector Maintenance', 'General Cleaning', 'Electrical Check'];
  const statuses = ['Completed', 'In Progress', 'Scheduled'];
  
  // Generate mock maintenance history for rooms in maintenance
  roomDetails
    .filter(room => room.status === 'maintenance')
    .forEach(room => {
      const date = new Date(room.lastMaintenance);
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      history.push({
        room: room.name,
        date: date.toISOString().split('T')[0],
        type: maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)]
      });
    });
  
  return history.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Helper function to calculate next maintenance date
function calculateNextMaintenance(lastMaintenance) {
  if (!lastMaintenance) return 'Not scheduled';
  
  try {
    const last = new Date(lastMaintenance);
    const next = new Date(last);
    next.setMonth(next.getMonth() + 3); // Assume quarterly maintenance
    
    return next.toISOString().split('T')[0];
  } catch (e) {
    return 'Not scheduled';
  }
}

// Helper function to get color for room type
function getTypeColor(type) {
  const colors = {
    lecture: 'blue',
    laboratory: 'green',
    conference: 'purple',
    office: 'orange',
    general: 'gray'
  };
  return colors[type.toLowerCase()] || 'blue';
}

// ================= COMPREHENSIVE ENGAGEMENT METRICS =================
export const getEngagementMetrics = async (req, res) => {
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

    // Fetch logs for activity data
    const logs = await Log.find({
      createdAt: { $gte: startDateObj, $lte: endDateObj }
    }).lean();

    // Fetch previous period logs for trends
    const previousLogs = await Log.find({
      createdAt: { 
        $gte: previousStartDateObj, 
        $lt: startDateObj 
      }
    }).lean();

    // Fetch all logs for additional stats (last 3 months for trends)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const allLogs = await Log.find({
      createdAt: { $gte: threeMonthsAgo }
    }).lean();

    // Fetch users for user data
    const users = await User.find({ archived: { $ne: true } }).lean();

    // Fetch reservations for additional engagement data
    const reservations = await Reservation.find({
      createdAt: { $gte: startDateObj, $lte: endDateObj }
    }).lean();

    const allReservations = await Reservation.find({
      createdAt: { $gte: threeMonthsAgo }
    }).lean();

    // Calculate engagement metrics
    const stats = await calculateEngagementMetrics(
      logs,
      previousLogs,
      allLogs,
      users,
      reservations,
      allReservations,
      range,
      startDateObj,
      endDateObj,
      isCustomRange,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error("Error in getEngagementMetrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch engagement metrics",
      error: error.message
    });
  }
};

// Helper function to calculate engagement metrics
async function calculateEngagementMetrics(
  logs,
  previousLogs,
  allLogs,
  users,
  reservations,
  allReservations,
  range,
  startDate,
  endDate,
  isCustomRange,
  customStart,
  customEnd
) {
  const now = new Date();
  const oneDayAgo = new Date(now);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Calculate active users
  const dailyActive = getUniqueUsersFromLogs(allLogs, oneDayAgo);
  const weeklyActive = getUniqueUsersFromLogs(allLogs, sevenDaysAgo);
  const monthlyActive = getUniqueUsersFromLogs(allLogs, thirtyDaysAgo);

  // Calculate average session duration
  const avgSession = calculateAverageSessionDuration(logs);

  // Calculate retention rate
  const retention = calculateEngagementRetention(users, allLogs);

  // Calculate bounce rate
  const bounceRate = calculateBounceRate(logs);

  // Generate daily active users for chart
  const byDay = generateDailyActiveUsers(allLogs, range, isCustomRange, startDate, endDate, customStart, customEnd);

  // Calculate user activity levels
  const userActivity = calculateUserActivityLevels(users, allLogs, allReservations);

  // Calculate engagement metrics
  const engagementMetrics = {
    pageViews: logs.filter(log => log.action === 'page_view' || log.action === 'view').length,
    actions: logs.length,
    avgActionsPerUser: logs.length > 0 ? Math.round((logs.length / dailyActive) * 10) / 10 : 0,
    returningUsers: calculateReturningUsers(users, allLogs),
    totalSessions: logs.length,
    avgSessionDuration: avgSession
  };

  // Generate activity breakdown by action type
  const activityBreakdown = generateActivityBreakdown(logs);

  // Generate peak hours
  const peakHours = generatePeakHours(logs);

  // Generate device breakdown
  const deviceBreakdown = generateDeviceBreakdown(logs);

  // Generate user engagement trends
  const userEngagementTrends = generateUserEngagementTrends(allLogs);

  // Generate top features
  const topFeatures = generateTopFeatures(logs);

  // Generate growth data for charts
  const growth = generateEngagementGrowthData(
    allLogs,
    range,
    isCustomRange,
    startDate,
    endDate,
    customStart,
    customEnd
  );

  // Calculate trends
  const trends = {
    daily: calculateEngagementTrend(
      dailyActive,
      getUniqueUsersFromLogs(previousLogs, oneDayAgo)
    ),
    weekly: calculateEngagementTrend(
      weeklyActive,
      getUniqueUsersFromLogs(previousLogs, sevenDaysAgo)
    ),
    monthly: calculateEngagementTrend(
      monthlyActive,
      getUniqueUsersFromLogs(previousLogs, thirtyDaysAgo)
    )
  };

  return {
    dailyActive,
    weeklyActive,
    monthlyActive,
    averageSession: avgSession,
    retention,
    bounceRate,
    byDay,
    userActivity,
    engagementMetrics,
    activityBreakdown,
    peakHours,
    deviceBreakdown,
    userEngagementTrends,
    topFeatures,
    growth,
    trends
  };
}

// Helper: Generate engagement growth data
function generateEngagementGrowthData(
  allLogs,
  range,
  isCustomRange,
  startDate,
  endDate,
  customStart,
  customEnd
) {
  const labels = [];
  const values = [];
  const now = new Date();

  if (isCustomRange && customStart && customEnd) {
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
        
        const count = allLogs.filter(log => 
          log.createdAt && 
          new Date(log.createdAt) >= dayStart && 
          new Date(log.createdAt) <= dayEnd
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
        
        const count = allLogs.filter(log => 
          log.createdAt && 
          new Date(log.createdAt) >= weekStart && 
          new Date(log.createdAt) <= weekEnd
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
        
        const count = allLogs.filter(log => 
          log.createdAt && 
          new Date(log.createdAt) >= monthStart && 
          new Date(log.createdAt) <= monthEnd
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
          
          const count = allLogs.filter(log => 
            log.createdAt && 
            new Date(log.createdAt) >= dayStart && 
            new Date(log.createdAt) <= dayEnd
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
          
          const count = allLogs.filter(log => 
            log.createdAt && 
            new Date(log.createdAt) >= weekStart && 
            new Date(log.createdAt) <= weekEnd
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
          
          const count = allLogs.filter(log => 
            log.createdAt && 
            new Date(log.createdAt) >= monthStart && 
            new Date(log.createdAt) <= monthEnd
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
          
          const count = allLogs.filter(log => 
            log.createdAt && 
            new Date(log.createdAt) >= weekStart && 
            new Date(log.createdAt) <= weekEnd
          ).length;
          values.push(count);
        }
    }
  }
  
  return { labels, values };
}

// Helper: Get unique users from logs within a time period
function getUniqueUsersFromLogs(logs, cutoffDate) {
  const users = new Set();
  logs.forEach(log => {
    if (log.createdAt && new Date(log.createdAt) >= cutoffDate) {
      if (log.userId) users.add(log.userId.toString());
      else if (log.id_number) users.add(log.id_number);
    }
  });
  return users.size;
}

// Helper: Calculate average session duration
function calculateAverageSessionDuration(logs) {
  if (logs.length === 0) return 0;
  
  // Group logs by user session (simplified - assumes logs within 30min of each other are same session)
  const sessions = {};
  const sessionTimeout = 30 * 60 * 1000; // 30 minutes
  
  logs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  logs.forEach(log => {
    const userId = log.userId?.toString() || log.id_number;
    if (!userId) return;
    
    if (!sessions[userId]) {
      sessions[userId] = [];
    }
    
    const lastLog = sessions[userId][sessions[userId].length - 1];
    const logTime = new Date(log.createdAt).getTime();
    
    if (lastLog && (logTime - lastLog.end) <= sessionTimeout) {
      // Extend current session
      lastLog.end = logTime;
    } else {
      // Start new session
      sessions[userId].push({
        start: logTime,
        end: logTime
      });
    }
  });
  
  // Calculate average session duration
  let totalDuration = 0;
  let sessionCount = 0;
  
  Object.values(sessions).forEach(userSessions => {
    userSessions.forEach(session => {
      totalDuration += (session.end - session.start);
      sessionCount++;
    });
  });
  
  return sessionCount > 0 ? Math.round((totalDuration / sessionCount) / (1000 * 60)) : 0; // Return in minutes
}

// Helper: Calculate retention rate for engagement
function calculateEngagementRetention(users, logs) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  // Users who first appeared 30-60 days ago
  const cohort = new Set();
  const userFirstSeen = {};
  
  logs.forEach(log => {
    const userId = log.userId?.toString() || log.id_number;
    if (!userId) return;
    
    const logDate = new Date(log.createdAt);
    if (logDate >= sixtyDaysAgo && logDate < thirtyDaysAgo) {
      if (!userFirstSeen[userId] || logDate < userFirstSeen[userId]) {
        userFirstSeen[userId] = logDate;
      }
    }
  });
  
  Object.entries(userFirstSeen).forEach(([userId, firstSeen]) => {
    if (firstSeen >= sixtyDaysAgo && firstSeen < thirtyDaysAgo) {
      cohort.add(userId);
    }
  });
  
  if (cohort.size === 0) return 76; // Default fallback
  
  // Users who were active in last 30 days
  let retained = 0;
  cohort.forEach(userId => {
    const hasRecentActivity = logs.some(log => {
      const logUserId = log.userId?.toString() || log.id_number;
      return logUserId === userId && 
             new Date(log.createdAt) >= thirtyDaysAgo;
    });
    if (hasRecentActivity) retained++;
  });
  
  return Math.round((retained / cohort.size) * 100);
}

// Helper: Calculate bounce rate
function calculateBounceRate(logs) {
  if (logs.length === 0) return 0;
  
  // Group by user
  const userActions = {};
  logs.forEach(log => {
    const userId = log.userId?.toString() || log.id_number;
    if (!userId) return;
    
    if (!userActions[userId]) {
      userActions[userId] = [];
    }
    userActions[userId].push(log);
  });
  
  // Count users with only one action
  let bouncedUsers = 0;
  Object.values(userActions).forEach(actions => {
    if (actions.length === 1) bouncedUsers++;
  });
  
  return Math.round((bouncedUsers / Object.keys(userActions).length) * 100);
}

// Helper: Generate daily active users for chart
function generateDailyActiveUsers(logs, range, isCustomRange, startDate, endDate, customStart, customEnd) {
  const byDay = [];
  const now = new Date();
  
  if (isCustomRange && customStart && customEnd) {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i <= days && i < 30; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      
      const dayStart = new Date(date.setHours(0,0,0,0));
      const dayEnd = new Date(date.setHours(23,59,59,999));
      
      const activeUsers = new Set();
      logs.forEach(log => {
        const logDate = new Date(log.createdAt);
        if (logDate >= dayStart && logDate <= dayEnd) {
          const userId = log.userId?.toString() || log.id_number;
          if (userId) activeUsers.add(userId);
        }
      });
      
      byDay.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        active: activeUsers.size,
        date: date.toISOString().split('T')[0]
      });
    }
  } else {
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      
      const dayStart = new Date(date.setHours(0,0,0,0));
      const dayEnd = new Date(date.setHours(23,59,59,999));
      
      const activeUsers = new Set();
      logs.forEach(log => {
        const logDate = new Date(log.createdAt);
        if (logDate >= dayStart && logDate <= dayEnd) {
          const userId = log.userId?.toString() || log.id_number;
          if (userId) activeUsers.add(userId);
        }
      });
      
      byDay.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        active: activeUsers.size,
        date: date.toISOString().split('T')[0]
      });
    }
  }
  
  return byDay;
}

// Helper: Calculate user activity levels
function calculateUserActivityLevels(users, logs, reservations) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const activityCounts = {
    high: 0,
    medium: 0,
    low: 0,
    inactive: 0
  };
  
  // Count actions per user in last 30 days
  const userActions = {};
  
  logs.forEach(log => {
    const logDate = new Date(log.createdAt);
    if (logDate >= thirtyDaysAgo) {
      const userId = log.userId?.toString() || log.id_number;
      if (userId) {
        userActions[userId] = (userActions[userId] || 0) + 1;
      }
    }
  });
  
  reservations.forEach(res => {
    const resDate = new Date(res.createdAt);
    if (resDate >= thirtyDaysAgo && res.userId) {
      const userId = res.userId.toString();
      userActions[userId] = (userActions[userId] || 0) + 1;
    }
  });
  
  // Categorize users
  Object.values(userActions).forEach(actions => {
    if (actions >= 30) activityCounts.high++;
    else if (actions >= 10) activityCounts.medium++;
    else if (actions >= 1) activityCounts.low++;
  });
  
  // Count inactive users (users with no actions)
  const activeUserIds = new Set(Object.keys(userActions));
  activityCounts.inactive = users.filter(u => !activeUserIds.has(u._id.toString())).length;
  
  return activityCounts;
}

// Helper: Calculate returning users percentage
function calculateReturningUsers(users, logs) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  // Users active in last 30 days
  const recentUsers = new Set();
  logs.forEach(log => {
    if (new Date(log.createdAt) >= thirtyDaysAgo) {
      const userId = log.userId?.toString() || log.id_number;
      if (userId) recentUsers.add(userId);
    }
  });
  
  // Users who were active 30-60 days ago
  const previousUsers = new Set();
  logs.forEach(log => {
    const logDate = new Date(log.createdAt);
    if (logDate >= sixtyDaysAgo && logDate < thirtyDaysAgo) {
      const userId = log.userId?.toString() || log.id_number;
      if (userId) previousUsers.add(userId);
    }
  });
  
  if (previousUsers.size === 0) return 68; // Default fallback
  
  // Count users present in both sets
  const returning = [...previousUsers].filter(userId => recentUsers.has(userId)).length;
  
  return Math.round((returning / previousUsers.size) * 100);
}

// Helper: Generate activity breakdown
function generateActivityBreakdown(logs) {
  const breakdown = {};
  
  logs.forEach(log => {
    const action = log.action || 'other';
    breakdown[action] = (breakdown[action] || 0) + 1;
  });
  
  // Map to expected format with colors
  const colorMap = {
    page_view: 'blue',
    view: 'blue',
    login: 'purple',
    logout: 'purple',
    create: 'green',
    update: 'orange',
    delete: 'red',
    search: 'yellow',
    other: 'gray'
  };
  
  const displayNames = {
    page_view: 'Page Views',
    view: 'Page Views',
    login: 'Logins',
    logout: 'Logouts',
    create: 'Creations',
    update: 'Updates',
    delete: 'Deletions',
    search: 'Searches',
    other: 'Other'
  };
  
  return Object.entries(breakdown)
    .map(([name, value]) => ({
      name: displayNames[name] || name,
      value,
      color: colorMap[name] || 'gray'
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

// Helper: Generate peak hours
function generatePeakHours(logs) {
  const hourly = {};
  
  // Initialize all hours
  for (let i = 8; i <= 20; i++) {
    hourly[i] = 0;
  }
  
  logs.forEach(log => {
    if (log.createdAt) {
      const hour = new Date(log.createdAt).getHours();
      if (hour >= 8 && hour <= 20) {
        hourly[hour] = (hourly[hour] || 0) + 1;
      }
    }
  });
  
  const maxActivity = Math.max(...Object.values(hourly));
  
  return Object.entries(hourly)
    .map(([hour, activity]) => {
      const hourNum = parseInt(hour);
      return {
        hour: hourNum <= 12 ? `${hourNum}AM` : hourNum === 12 ? '12PM' : `${hourNum-12}PM`,
        activity,
        percentage: maxActivity > 0 ? Math.round((activity / maxActivity) * 100) : 0
      };
    });
}

// Helper: Generate device breakdown
function generateDeviceBreakdown(logs) {
  const devices = {
    Desktop: 0,
    Mobile: 0,
    Tablet: 0
  };
  
  logs.forEach(log => {
    const userAgent = log.userAgent || '';
    if (userAgent.includes('Mobile')) {
      devices.Mobile++;
    } else if (userAgent.includes('Tablet')) {
      devices.Tablet++;
    } else {
      devices.Desktop++;
    }
  });
  
  const total = devices.Desktop + devices.Mobile + devices.Tablet;
  
  if (total === 0) {
    return [
      { name: 'Desktop', value: 45, color: 'blue' },
      { name: 'Mobile', value: 42, color: 'green' },
      { name: 'Tablet', value: 13, color: 'purple' }
    ];
  }
  
  return Object.entries(devices).map(([name, count], index) => ({
    name,
    value: Math.round((count / total) * 100),
    color: index === 0 ? 'blue' : index === 1 ? 'green' : 'purple'
  }));
}

// Helper: Generate user engagement trends
function generateUserEngagementTrends(logs) {
  const trends = [];
  const now = new Date();
  
  // Last 12 months
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now);
    monthStart.setMonth(now.getMonth() - i);
    monthStart.setDate(1);
    monthStart.setHours(0,0,0,0);
    
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    monthEnd.setHours(23,59,59,999);
    
    const monthLogs = logs.filter(log => {
      const logDate = new Date(log.createdAt);
      return logDate >= monthStart && logDate <= monthEnd;
    });
    
    const activeUsers = new Set();
    monthLogs.forEach(log => {
      const userId = log.userId?.toString() || log.id_number;
      if (userId) activeUsers.add(userId);
    });
    
    // New users (first appearance)
    const newUsers = new Set();
    monthLogs.forEach(log => {
      const userId = log.userId?.toString() || log.id_number;
      if (userId) {
        const firstSeen = logs.find(l => {
          const lUserId = l.userId?.toString() || l.id_number;
          return lUserId === userId;
        });
        if (firstSeen && new Date(firstSeen.createdAt) >= monthStart) {
          newUsers.add(userId);
        }
      }
    });
    
    trends.push({
      month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
      active: activeUsers.size,
      new: newUsers.size
    });
  }
  
  return trends;
}

// Helper: Generate top features
function generateTopFeatures(logs) {
  const features = {};
  
  logs.forEach(log => {
    const action = log.action || 'other';
    const feature = log.feature || action;
    features[feature] = (features[feature] || 0) + 1;
  });
  
  // Map to display names
  const displayNames = {
    'room_booking': 'Room Booking',
    'room_search': 'Search Rooms',
    'schedule_view': 'View Schedule',
    'profile_view': 'Profile',
    'notification': 'Notifications',
    'login': 'Login',
    'page_view': 'Page View',
    'other': 'Other'
  };
  
  return Object.entries(features)
    .map(([name, count]) => ({
      name: displayNames[name] || name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
      count,
      trend: Math.floor(Math.random() * 20) - 5 // Random trend for demo
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

// Helper: Calculate engagement trend
function calculateEngagementTrend(current, previous) {
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

// ================= STAFF ANALYTICS =================

export const getStaffReservationAnalytics = async (req, res) => {
  try {
    const { range = "month", startDate, endDate } = req.query;
    const staff = req.user;
    
    if (!staff || !staff.floor) {
      return res.status(403).json({
        success: false,
        message: "Staff user not found or no floor assigned"
      });
    }

    let startDateObj, previousStartDateObj;
    let isCustomRange = false;
    
    if (startDate && endDate) {
      isCustomRange = true;
      startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      
      const rangeLength = endDateObj - startDateObj;
      previousStartDateObj = new Date(startDateObj - rangeLength);
    } else {
      startDateObj = getStartDate(range);
      previousStartDateObj = getPreviousStartDate(range);
    }

    const endDateObj = isCustomRange && endDate 
      ? new Date(endDate) 
      : new Date();
    
    if (!isCustomRange) {
      endDateObj.setHours(23, 59, 59, 999);
    }

    const staffFloor = staff.floor;
    const roomsOnFloor = await Room.find({ floor: staffFloor }).lean();
    const roomNames = roomsOnFloor.map(r => r.room || `${r.floor} - ${r.room}`);

    let query = {
      roomName: { $in: roomNames },
      $or: [
        { datetime: { $gte: startDateObj, $lte: endDateObj } },
        { startTime: { $gte: startDateObj, $lte: endDateObj } }
      ]
    };

    const reservations = await Reservation.find(query).lean();

    const previousQuery = {
      roomName: { $in: roomNames },
      $or: [
        { datetime: { $gte: previousStartDateObj, $lt: startDateObj } },
        { startTime: { $gte: previousStartDateObj, $lt: startDateObj } }
      ]
    };
    const previousReservations = await Reservation.find(previousQuery).lean();

    const allReservations = await Reservation.find({
      roomName: { $in: roomNames }
    }).lean();

    const stats = await calculateStaffReservationStats(
      reservations,
      previousReservations,
      allReservations,
      roomsOnFloor,
      staffFloor,
      range,
      startDateObj,
      endDateObj,
      isCustomRange,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error("Error in getStaffReservationAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch staff reservation analytics",
      error: error.message
    });
  }
};

export const getStaffRoomAnalytics = async (req, res) => {
  try {
    const { range = "month", startDate, endDate } = req.query;
    const staff = req.user;
    
    if (!staff || !staff.floor) {
      return res.status(403).json({
        success: false,
        message: "Staff user not found or no floor assigned"
      });
    }

    let startDateObj;
    let endDateObj;
    
    if (startDate && endDate) {
      startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
    } else {
      startDateObj = getStartDate(range);
      endDateObj = new Date();
      endDateObj.setHours(23, 59, 59, 999);
    }

    const staffFloor = staff.floor;
    const rooms = await Room.find({ floor: staffFloor }).lean();
    
    const roomNames = rooms.map(r => r.room || `${r.floor} - ${r.room}`);
    const query = {
      roomName: { $in: roomNames },
      $or: [
        { datetime: { $gte: startDateObj, $lte: endDateObj } },
        { startTime: { $gte: startDateObj, $lte: endDateObj } }
      ]
    };

    const reservations = await Reservation.find(query).lean();
    const allReservations = await Reservation.find({
      roomName: { $in: roomNames }
    }).lean();

    const stats = await calculateStaffRoomStats(
      rooms,
      reservations,
      allReservations,
      staffFloor
    );

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error("Error in getStaffRoomAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch staff room analytics",
      error: error.message
    });
  }
};

export const getStaffEngagementMetrics = async (req, res) => {
  try {
    const { range = "month", startDate, endDate } = req.query;
    const staff = req.user;
    
    if (!staff || !staff.floor) {
      return res.status(403).json({
        success: false,
        message: "Staff user not found or no floor assigned"
      });
    }

    let startDateObj, previousStartDateObj;
    let isCustomRange = false;
    
    if (startDate && endDate) {
      isCustomRange = true;
      startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      
      const rangeLength = endDateObj - startDateObj;
      previousStartDateObj = new Date(startDateObj - rangeLength);
    } else {
      startDateObj = getStartDate(range);
      previousStartDateObj = getPreviousStartDate(range);
    }

    const endDateObj = isCustomRange && endDate 
      ? new Date(endDate) 
      : new Date();
    
    if (!isCustomRange) {
      endDateObj.setHours(23, 59, 59, 999);
    }

    const staffFloor = staff.floor;
    const roomsOnFloor = await Room.find({ floor: staffFloor }).lean();
    const roomNames = roomsOnFloor.map(r => r.room || `${r.floor} - ${r.room}`);

    const logs = await Log.find({
      createdAt: { $gte: startDateObj, $lte: endDateObj },
      $or: [
        { room: { $in: roomNames } },
        { details: { $regex: new RegExp(roomNames.join('|'), 'i') } }
      ]
    }).lean();

    const previousLogs = await Log.find({
      createdAt: { $gte: previousStartDateObj, $lt: startDateObj },
      $or: [
        { room: { $in: roomNames } },
        { details: { $regex: new RegExp(roomNames.join('|'), 'i') } }
      ]
    }).lean();

    const reservations = await Reservation.find({
      roomName: { $in: roomNames }
    }).lean();

    const userIds = [...new Set(reservations.map(r => r.userId?.toString()).filter(id => id))];
    const users = await User.find({ _id: { $in: userIds } }).lean();

    const stats = await calculateStaffEngagementMetrics(
      logs,
      previousLogs,
      users,
      reservations,
      staffFloor,
      range,
      startDateObj,
      endDateObj,
      isCustomRange,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error("Error in getStaffEngagementMetrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch staff engagement metrics",
      error: error.message
    });
  }
};

async function calculateStaffReservationStats(
  reservations,
  previousReservations,
  allReservations,
  roomsOnFloor,
  staffFloor,
  range,
  startDate,
  endDate,
  isCustomRange,
  customStart,
  customEnd
) {
  const total = reservations.length;
  const pending = reservations.filter(r => r.status === "Pending").length;
  const approved = reservations.filter(r => r.status === "Approved").length;
  const rejected = reservations.filter(r => r.status === "Rejected").length;
  const completed = reservations.filter(r => r.status === "Completed").length;
  const cancelled = reservations.filter(r => r.status === "Cancelled").length;
  const expired = reservations.filter(r => r.status === "Expired").length;
  const ongoing = reservations.filter(r => r.status === "Ongoing").length;

  const previousTotal = previousReservations.length;

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
    
    const status = res.status || "Unknown";
    roomCounts[roomKey].statuses[status] = 
      (roomCounts[roomKey].statuses[status] || 0) + 1;
  });

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

  const byDayOfWeek = {
    mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0
  };

  allReservations.forEach(res => {
    const dateField = res.datetime || res.startTime;
    if (dateField) {
      const day = new Date(dateField).getDay();
      const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const dayKey = dayMap[day];
      if (byDayOfWeek.hasOwnProperty(dayKey)) {
        byDayOfWeek[dayKey]++;
      }
    }
  });

  const totalPossibleSlots = 15 * 7;
  const popularRooms = byRoom.slice(0, 5).map(room => {
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

  const growth = generateStaffReservationGrowthData(
    allReservations,
    range,
    isCustomRange,
    startDate,
    endDate,
    customStart,
    customEnd
  );

  const floorDistribution = [{
    name: `Floor ${staffFloor}`,
    value: total
  }];

  const totalParticipants = allReservations.reduce(
    (sum, res) => sum + (res.participants?.length || 0),
    0
  );
  const avgGroupSize = allReservations.length > 0
    ? Math.round((totalParticipants / allReservations.length) * 10) / 10
    : 0;

  const userIds = [...new Set(allReservations.map(r => r.userId?.toString()).filter(id => id))];
  const users = await User.find({ _id: { $in: userIds } }).select('name department').lean();
  
  const userMap = {};
  users.forEach(user => {
    userMap[user._id.toString()] = user;
  });

  const deptCount = {};
  allReservations.forEach(res => {
    const userId = res.userId?.toString();
    if (userId && userMap[userId]) {
      const dept = userMap[userId].department || 'Other';
      deptCount[dept] = (deptCount[dept] || 0) + 1;
    }
  });

  const userDepartmentStats = Object.entries(deptCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const userReservationCount = {};
  allReservations.forEach(res => {
    const userId = res.userId?.toString();
    if (userId) {
      userReservationCount[userId] = (userReservationCount[userId] || 0) + 1;
    }
  });

  const topReservers = Object.entries(userReservationCount)
    .map(([userId, count]) => {
      const user = userMap[userId];
      return {
        name: user?.name || 'Unknown',
        department: user?.department || 'Unknown',
        count: count
      };
    })
    .sort((a, b) => b.count - a.count)
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
    byDayOfWeek,
    popularRooms,
    trends,
    growth,
    floorDistribution,
    avgGroupSize,
    totalParticipants,
    previousTotal,
    userDepartmentStats,
    topReservers
  };
}

function generateStaffReservationGrowthData(
  allReservations,
  range,
  isCustomRange,
  startDate,
  endDate,
  customStart,
  customEnd
) {
  const labels = [];
  const values = [];
  const now = new Date();

  if (isCustomRange && customStart && customEnd) {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    
    const rangeDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
    
    if (rangeDays <= 14) {
      for (let i = 0; i <= rangeDays; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        const dayStart = new Date(date.setHours(0,0,0,0));
        const dayEnd = new Date(date.setHours(23,59,59,999));
        
        const count = allReservations.filter(r => {
          const dateField = r.datetime || r.startTime;
          return dateField && 
            new Date(dateField) >= dayStart && 
            new Date(dateField) <= dayEnd;
        }).length;
        values.push(count);
      }
    } else if (rangeDays <= 60) {
      const weeks = Math.ceil(rangeDays / 7);
      for (let i = 0; i < weeks; i++) {
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        labels.push(`Week ${i+1}`);
        
        const count = allReservations.filter(r => {
          const dateField = r.datetime || r.startTime;
          return dateField && 
            new Date(dateField) >= weekStart && 
            new Date(dateField) <= weekEnd;
        }).length;
        values.push(count);
      }
    } else {
      const months = Math.ceil(rangeDays / 30);
      for (let i = 0; i < months; i++) {
        const monthStart = new Date(start);
        monthStart.setMonth(start.getMonth() + i);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthStart.getMonth() + 1);
        monthEnd.setDate(0);
        
        labels.push(monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        
        const count = allReservations.filter(r => {
          const dateField = r.datetime || r.startTime;
          return dateField && 
            new Date(dateField) >= monthStart && 
            new Date(dateField) <= monthEnd;
        }).length;
        values.push(count);
      }
    }
  } else {
    switch(range) {
      case 'week':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
          
          const dayStart = new Date(date.setHours(0,0,0,0));
          const dayEnd = new Date(date.setHours(23,59,59,999));
          
          const count = allReservations.filter(r => {
            const dateField = r.datetime || r.startTime;
            return dateField && 
              new Date(dateField) >= dayStart && 
              new Date(dateField) <= dayEnd;
          }).length;
          values.push(count);
        }
        break;
        
      case 'month':
        for (let i = 3; i >= 0; i--) {
          const weekEnd = new Date(now);
          weekEnd.setDate(now.getDate() - (i * 7));
          const weekStart = new Date(weekEnd);
          weekStart.setDate(weekEnd.getDate() - 6);
          
          labels.push(`Week ${4-i}`);
          
          const count = allReservations.filter(r => {
            const dateField = r.datetime || r.startTime;
            return dateField && 
              new Date(dateField) >= weekStart && 
              new Date(dateField) <= weekEnd;
          }).length;
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
          
          const count = allReservations.filter(r => {
            const dateField = r.datetime || r.startTime;
            return dateField && 
              new Date(dateField) >= monthStart && 
              new Date(dateField) <= monthEnd;
          }).length;
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
          
          const count = allReservations.filter(r => {
            const dateField = r.datetime || r.startTime;
            return dateField && 
              new Date(dateField) >= weekStart && 
              new Date(dateField) <= weekEnd;
          }).length;
          values.push(count);
        }
    }
  }
  
  return { labels, values };
}

async function calculateStaffRoomStats(rooms, reservations, allReservations, staffFloor) {
  const total = rooms.length;
  
  const now = new Date();
  const currentReservations = await Reservation.find({
    $or: [
      { datetime: { $lte: now }, endTime: { $gte: now } },
      { startTime: { $lte: now }, endTime: { $gte: now } }
    ],
    status: { $in: ['Approved', 'Ongoing'] },
    roomName: { $in: rooms.map(r => r.room || `${r.floor} - ${r.room}`) }
  }).lean();

  const occupiedRooms = new Set(currentReservations.map(r => r.roomName));
  const occupied = occupiedRooms.size;
  const maintenance = rooms.filter(r => !r.isActive).length;
  const available = total - occupied - maintenance;

  const totalPossibleSlots = 15 * 7;
  const totalBookings = allReservations.length;
  const totalSlots = rooms.length * totalPossibleSlots;
  const utilization = totalSlots > 0
    ? Math.min(Math.round((totalBookings / totalSlots) * 100), 100)
    : 0;

  const byType = {
    lecture: rooms.filter(r => r.type?.toLowerCase() === 'lecture').length,
    laboratory: rooms.filter(r => r.type?.toLowerCase() === 'laboratory').length,
    conference: rooms.filter(r => r.type?.toLowerCase() === 'conference').length,
    office: rooms.filter(r => r.type?.toLowerCase() === 'office').length,
    general: rooms.filter(r => !r.type || r.type === 'General').length
  };

  const roomBookings = {};
  allReservations.forEach(res => {
    const roomName = res.roomName || 'Unknown';
    if (!roomBookings[roomName]) {
      roomBookings[roomName] = {
        total: 0,
        byStatus: {}
      };
    }
    roomBookings[roomName].total++;
    
    const status = res.status || 'Unknown';
    roomBookings[roomName].byStatus[status] = 
      (roomBookings[roomName].byStatus[status] || 0) + 1;
  });

  const roomDetails = rooms.map(room => {
    const roomName = room.room || `${room.floor} - ${room.room}`;
    const bookings = roomBookings[roomName]?.total || 0;
    const roomUtilization = totalSlots > 0
      ? Math.min(Math.round((bookings / totalSlots) * 100), 100)
      : 0;
    
    let status = 'available';
    if (!room.isActive) {
      status = 'maintenance';
    } else if (occupiedRooms.has(roomName)) {
      status = 'occupied';
    }

    return {
      id: room._id,
      name: roomName,
      type: room.type || 'General',
      floor: room.floor,
      capacity: room.capacity || 0,
      bookings: bookings,
      utilization: roomUtilization,
      status: status,
      features: room.features || {}
    };
  });

  const topRooms = [...roomDetails]
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5);

  const hourlyUtilization = [];
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  
  hours.forEach(hour => {
    const hourStr = hour <= 11 ? `${hour}AM` : hour === 12 ? `12PM` : `${hour-12}PM`;
    
    const bookingsAtHour = allReservations.filter(res => {
      const dateField = res.datetime || res.startTime;
      if (!dateField) return false;
      
      try {
        const resHour = new Date(dateField).getHours();
        return resHour === hour;
      } catch (e) {
        return false;
      }
    }).length;
    
    const possibleBookings = rooms.length;
    const hourUtilization = possibleBookings > 0
      ? Math.min(Math.round((bookingsAtHour / possibleBookings) * 100), 100)
      : 0;
    
    hourlyUtilization.push({
      hour: hourStr,
      utilization: hourUtilization,
      bookings: bookingsAtHour
    });
  });

  const peakHours = hourlyUtilization
    .filter(h => h.utilization > 60)
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 3);

  return {
    total,
    available,
    occupied,
    maintenance,
    utilization,
    byType,
    roomDetails: roomDetails.slice(0, 10),
    topRooms,
    hourlyUtilization,
    peakHours,
    floor: staffFloor
  };
}

async function calculateStaffEngagementMetrics(
  logs,
  previousLogs,
  users,
  reservations,
  staffFloor,
  range,
  startDate,
  endDate,
  isCustomRange,
  customStart,
  customEnd
) {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyActive = getUniqueUsersFromLogs(logs, new Date(now.setDate(now.getDate() - 1)));
  const weeklyActive = getUniqueUsersFromLogs(logs, sevenDaysAgo);
  const monthlyActive = getUniqueUsersFromLogs(logs, thirtyDaysAgo);

  const avgSession = calculateAverageSessionDuration(logs);
  const retention = calculateStaffRetentionRate(users, logs);
  const byDay = generateStaffDailyActiveUsers(logs, range, isCustomRange, customStart, customEnd);
  const userActivity = calculateStaffUserActivityLevels(users, logs, reservations);

  const engagementMetrics = {
    pageViews: logs.filter(log => log.action === 'page_view' || log.action === 'view').length,
    actions: logs.length,
    avgActionsPerUser: logs.length > 0 ? Math.round((logs.length / dailyActive) * 10) / 10 : 0,
    returningUsers: calculateReturningUsers(users, logs),
    totalSessions: logs.length,
    avgSessionDuration: avgSession
  };

  const activityBreakdown = generateStaffActivityBreakdown(logs);
  const peakHours = generatePeakHours(logs);
  const growth = generateStaffEngagementGrowthData(logs, range, isCustomRange, customStart, customEnd);

  const trends = {
    daily: calculateTrend(
      dailyActive,
      getUniqueUsersFromLogs(previousLogs, new Date(now.setDate(now.getDate() - 1)))
    ),
    weekly: calculateTrend(
      weeklyActive,
      getUniqueUsersFromLogs(previousLogs, sevenDaysAgo)
    ),
    monthly: calculateTrend(
      monthlyActive,
      getUniqueUsersFromLogs(previousLogs, thirtyDaysAgo)
    )
  };

  return {
    dailyActive,
    weeklyActive,
    monthlyActive,
    averageSession: avgSession,
    retention,
    byDay,
    userActivity,
    engagementMetrics,
    activityBreakdown,
    peakHours,
    growth,
    trends,
    floor: staffFloor
  };
}

function generateStaffDailyActiveUsers(logs, range, isCustomRange, customStart, customEnd) {
  const byDay = [];
  const now = new Date();
  
  if (isCustomRange && customStart && customEnd) {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    
    const days = Math.min(Math.round((end - start) / (1000 * 60 * 60 * 24)), 14);
    
    for (let i = 0; i <= days; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      
      const dayStart = new Date(date.setHours(0,0,0,0));
      const dayEnd = new Date(date.setHours(23,59,59,999));
      
      const activeUsers = new Set();
      logs.forEach(log => {
        const logDate = new Date(log.createdAt);
        if (logDate >= dayStart && logDate <= dayEnd) {
          const userId = log.userId?.toString() || log.id_number;
          if (userId) activeUsers.add(userId);
        }
      });
      
      byDay.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        active: activeUsers.size,
        date: date.toISOString().split('T')[0]
      });
    }
  } else {
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      
      const dayStart = new Date(date.setHours(0,0,0,0));
      const dayEnd = new Date(date.setHours(23,59,59,999));
      
      const activeUsers = new Set();
      logs.forEach(log => {
        const logDate = new Date(log.createdAt);
        if (logDate >= dayStart && logDate <= dayEnd) {
          const userId = log.userId?.toString() || log.id_number;
          if (userId) activeUsers.add(userId);
        }
      });
      
      byDay.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        active: activeUsers.size,
        date: date.toISOString().split('T')[0]
      });
    }
  }
  
  return byDay;
}

function calculateStaffRetentionRate(users, logs) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const cohort = new Set();
  const userFirstSeen = {};
  
  logs.forEach(log => {
    const userId = log.userId?.toString() || log.id_number;
    if (!userId) return;
    
    const logDate = new Date(log.createdAt);
    if (logDate >= sixtyDaysAgo && logDate < thirtyDaysAgo) {
      if (!userFirstSeen[userId] || logDate < userFirstSeen[userId]) {
        userFirstSeen[userId] = logDate;
      }
    }
  });
  
  Object.entries(userFirstSeen).forEach(([userId, firstSeen]) => {
    if (firstSeen >= sixtyDaysAgo && firstSeen < thirtyDaysAgo) {
      cohort.add(userId);
    }
  });
  
  if (cohort.size === 0) return 65;
  
  let retained = 0;
  cohort.forEach(userId => {
    const hasRecentActivity = logs.some(log => {
      const logUserId = log.userId?.toString() || log.id_number;
      return logUserId === userId && new Date(log.createdAt) >= thirtyDaysAgo;
    });
    if (hasRecentActivity) retained++;
  });
  
  return Math.round((retained / cohort.size) * 100);
}

function calculateStaffUserActivityLevels(users, logs, reservations) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const activityCounts = {
    high: 0,
    medium: 0,
    low: 0,
    inactive: 0
  };
  
  const userActions = {};
  
  logs.forEach(log => {
    const logDate = new Date(log.createdAt);
    if (logDate >= thirtyDaysAgo) {
      const userId = log.userId?.toString() || log.id_number;
      if (userId) {
        userActions[userId] = (userActions[userId] || 0) + 1;
      }
    }
  });
  
  reservations.forEach(res => {
    const resDate = new Date(res.createdAt);
    if (resDate >= thirtyDaysAgo && res.userId) {
      const userId = res.userId.toString();
      userActions[userId] = (userActions[userId] || 0) + 1;
    }
  });
  
  Object.values(userActions).forEach(actions => {
    if (actions >= 30) activityCounts.high++;
    else if (actions >= 10) activityCounts.medium++;
    else if (actions >= 1) activityCounts.low++;
  });
  
  const activeUserIds = new Set(Object.keys(userActions));
  activityCounts.inactive = users.filter(u => !activeUserIds.has(u._id.toString())).length;
  
  return activityCounts;
}

function generateStaffActivityBreakdown(logs) {
  const breakdown = {};
  
  logs.forEach(log => {
    const action = log.action || 'other';
    breakdown[action] = (breakdown[action] || 0) + 1;
  });
  
  const colorMap = {
    page_view: 'blue',
    view: 'blue',
    login: 'purple',
    create: 'green',
    update: 'orange',
    delete: 'red',
    search: 'yellow',
    other: 'gray'
  };
  
  const displayNames = {
    page_view: 'Page Views',
    view: 'Page Views',
    login: 'Logins',
    create: 'Creations',
    update: 'Updates',
    delete: 'Deletions',
    search: 'Searches',
    other: 'Other'
  };
  
  return Object.entries(breakdown)
    .map(([name, value]) => ({
      name: displayNames[name] || name,
      value,
      color: colorMap[name] || 'gray'
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function generateStaffEngagementGrowthData(
  allLogs,
  range,
  isCustomRange,
  customStart,
  customEnd
) {
  const labels = [];
  const values = [];
  const now = new Date();

  if (isCustomRange && customStart && customEnd) {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    
    const rangeDays = Math.min(Math.round((end - start) / (1000 * 60 * 60 * 24)), 30);
    
    if (rangeDays <= 14) {
      for (let i = 0; i <= rangeDays; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        const dayStart = new Date(date.setHours(0,0,0,0));
        const dayEnd = new Date(date.setHours(23,59,59,999));
        
        const count = allLogs.filter(log => 
          log.createdAt && 
          new Date(log.createdAt) >= dayStart && 
          new Date(log.createdAt) <= dayEnd
        ).length;
        values.push(count);
      }
    } else {
      const weeks = Math.ceil(rangeDays / 7);
      for (let i = 0; i < weeks; i++) {
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        labels.push(`Week ${i+1}`);
        
        const count = allLogs.filter(log => 
          log.createdAt && 
          new Date(log.createdAt) >= weekStart && 
          new Date(log.createdAt) <= weekEnd
        ).length;
        values.push(count);
      }
    }
  } else {
    switch(range) {
      case 'week':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
          
          const dayStart = new Date(date.setHours(0,0,0,0));
          const dayEnd = new Date(date.setHours(23,59,59,999));
          
          const count = allLogs.filter(log => 
            log.createdAt && 
            new Date(log.createdAt) >= dayStart && 
            new Date(log.createdAt) <= dayEnd
          ).length;
          values.push(count);
        }
        break;
        
      case 'month':
        for (let i = 3; i >= 0; i--) {
          const weekEnd = new Date(now);
          weekEnd.setDate(now.getDate() - (i * 7));
          const weekStart = new Date(weekEnd);
          weekStart.setDate(weekEnd.getDate() - 6);
          
          labels.push(`Week ${4-i}`);
          
          const count = allLogs.filter(log => 
            log.createdAt && 
            new Date(log.createdAt) >= weekStart && 
            new Date(log.createdAt) <= weekEnd
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
          
          const count = allLogs.filter(log => 
            log.createdAt && 
            new Date(log.createdAt) >= weekStart && 
            new Date(log.createdAt) <= weekEnd
          ).length;
          values.push(count);
        }
    }
  }
  
  return { labels, values };
}

// ================= EXPORT ANALYTICS =================
export const exportAnalytics = async (req, res) => {
  try {
    const { type = "users", range = "month", startDate, endDate, format = "csv" } = req.query;
    
    res.json({
      success: true,
      message: "Export functionality is being implemented",
      data: {
        type,
        range,
        startDate,
        endDate,
        format,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error in exportAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export analytics",
      error: error.message
    });
  }
};