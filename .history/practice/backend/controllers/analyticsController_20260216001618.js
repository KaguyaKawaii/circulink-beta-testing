// controllers/analyticsController.js
const User = require("../models/User");
const Reservation = require("../models/Reservation");
const Room = require("../models/Room");
const Log = require("../models/Log");
const mongoose = require("mongoose");

// Get analytics overview data
exports.getAnalyticsOverview = async (req, res) => {
  try {
    const { range = "month" } = req.query;
    
    // Calculate date ranges - FIXED: Create new Date objects to avoid mutation
    const now = new Date();
    let startDate, previousStartDate;
    
    // Create fresh date objects for each calculation
    const currentDate = new Date();
    
    switch(range) {
      case "week":
        startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - 7);
        
        previousStartDate = new Date(currentDate);
        previousStartDate.setDate(previousStartDate.getDate() - 14);
        break;
      case "month":
        startDate = new Date(currentDate);
        startDate.setMonth(startDate.getMonth() - 1);
        
        previousStartDate = new Date(currentDate);
        previousStartDate.setMonth(previousStartDate.getMonth() - 2);
        break;
      case "year":
        startDate = new Date(currentDate);
        startDate.setFullYear(startDate.getFullYear() - 1);
        
        previousStartDate = new Date(currentDate);
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 2);
        break;
      default:
        startDate = new Date(currentDate);
        startDate.setMonth(startDate.getMonth() - 1);
        
        previousStartDate = new Date(currentDate);
        previousStartDate.setMonth(previousStartDate.getMonth() - 2);
    }

    // Reset start of day for accurate comparisons
    startDate.setHours(0, 0, 0, 0);
    previousStartDate.setHours(0, 0, 0, 0);
    
    // Fetch all data in parallel
    const [
      totalUsers,
      activeUsers,
      newUsers,
      usersByRole,
      previousPeriodUsers,
      reservationStats,
      previousReservationStats,
      roomStats,
      mostBookedRooms,
      engagementStats
    ] = await Promise.all([
      // Total users
      User.countDocuments(),
      
      // Active users (logged in within last 7 days)
      User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      
      // New users in period
      User.countDocuments({ createdAt: { $gte: startDate } }),
      
      // Users by role
      User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } }
      ]),
      
      // Previous period users for trend
      User.countDocuments({ 
        createdAt: { 
          $gte: previousStartDate, 
          $lt: startDate 
        } 
      }),
      
      // Reservation statistics for current period
      Reservation.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] } },
          ongoing: { $sum: { $cond: [{ $eq: ["$status", "Ongoing"] }, 1, 0] } },
          expired: { $sum: { $cond: [{ $eq: ["$status", "Expired"] }, 1, 0] } }
        }}
      ]),
      
      // Previous period reservations for trend
      Reservation.countDocuments({ 
        createdAt: { 
          $gte: previousStartDate, 
          $lt: startDate 
        } 
      }),
      
      // Room statistics
      Room.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          available: { $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] } },
          occupied: { $sum: { $cond: [{ $eq: ["$status", "occupied"] }, 1, 0] } },
          maintenance: { $sum: { $cond: [{ $eq: ["$status", "maintenance"] }, 1, 0] } }
        }}
      ]),
      
      // Most booked rooms
      Reservation.aggregate([
        { $match: { status: { $in: ["Completed", "Approved", "Ongoing"] } } },
        { $group: {
          _id: { roomName: "$roomName", location: "$location" },
          count: { $sum: 1 }
        }},
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: {
          name: "$_id.roomName",
          floor: "$_id.location",
          bookings: "$count",
          _id: 0
        }}
      ]),
      
      // Engagement stats - FIXED: Properly handle the Promise.all
      Promise.all([
        User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
        User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
        Promise.resolve(0) // Session duration default
      ])
    ]);

    // Calculate current occupied rooms
    const currentOccupied = await Reservation.countDocuments({
      status: "Ongoing",
      endDatetime: { $gte: new Date() }
    });

    // Format users by role
    const roleCounts = {
      student: 0,
      faculty: 0,
      staff: 0,
      admin: 0
    };
    
    usersByRole.forEach(role => {
      if (role._id === "Student") roleCounts.student = role.count;
      else if (role._id === "Faculty") roleCounts.faculty = role.count;
      else if (role._id === "Staff") roleCounts.staff = role.count;
      else if (role._id === "Admin") roleCounts.admin = role.count;
    });

    // Calculate trends - FIXED: Handle empty results
    const currentReservations = reservationStats[0]?.total || 0;
    const userTrend = calculateTrend(newUsers, previousPeriodUsers);
    const reservationTrend = calculateTrend(
      currentReservations,
      previousReservationStats
    );

    // Calculate room utilization percentage
    const totalRooms = roomStats[0]?.total || 0;
    const utilizationRate = totalRooms > 0 
      ? Math.round((currentOccupied / totalRooms) * 100) 
      : 0;

    // FIXED: Properly extract engagement stats
    const [dailyActive, weeklyActive, monthlyActive, avgSession] = engagementStats;

    // Prepare response
    const analyticsData = {
      users: {
        total: totalUsers,
        active: activeUsers,
        new: newUsers,
        byRole: roleCounts,
        trend: userTrend
      },
      reservations: {
        total: currentReservations,
        pending: reservationStats[0]?.pending || 0,
        approved: reservationStats[0]?.approved || 0,
        rejected: reservationStats[0]?.rejected || 0,
        completed: reservationStats[0]?.completed || 0,
        cancelled: reservationStats[0]?.cancelled || 0,
        ongoing: reservationStats[0]?.ongoing || 0,
        expired: reservationStats[0]?.expired || 0,
        byRoom: mostBookedRooms,
        trend: reservationTrend
      },
      rooms: {
        total: totalRooms,
        available: roomStats[0]?.available || 0,
        occupied: currentOccupied,
        maintenance: roomStats[0]?.maintenance || 0,
        utilization: utilizationRate,
        mostBooked: mostBookedRooms
      },
      engagement: {
        dailyActive: dailyActive || 0,
        weeklyActive: weeklyActive || 0,
        monthlyActive: monthlyActive || 0,
        averageSession: avgSession || 0,
        retention: await calculateRetentionRate()
      },
      recentActivity: await getRecentActivity()
    };

    res.json(analyticsData);
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ 
      message: "Failed to fetch analytics data", 
      error: error.message 
    });
  }
};

// Get detailed user analytics
exports.getUserAnalytics = async (req, res) => {
  try {
    const { range = "month" } = req.query;
    
    const userGrowth = await getUserGrowthData(range);
    const userActivity = await getUserActivityData(range);
    const userRetention = await calculateRetentionRate();
    const topUsers = await getTopActiveUsers();

    res.json({
      growth: userGrowth,
      activity: userActivity,
      retention: userRetention,
      topUsers
    });
  } catch (error) {
    console.error("User analytics error:", error);
    res.status(500).json({ message: "Failed to fetch user analytics" });
  }
};

// Get detailed reservation analytics
exports.getReservationAnalytics = async (req, res) => {
  try {
    const { range = "month" } = req.query;
    
    const [
      reservationTrends,
      peakHours,
      popularRooms,
      approvalRate,
      cancellationRate
    ] = await Promise.all([
      getReservationTrends(range),
      getPeakHours(),
      getPopularRooms(),
      calculateApprovalRate(),
      calculateCancellationRate()
    ]);

    res.json({
      trends: reservationTrends,
      peakHours,
      popularRooms,
      approvalRate,
      cancellationRate
    });
  } catch (error) {
    console.error("Reservation analytics error:", error);
    res.status(500).json({ message: "Failed to fetch reservation analytics" });
  }
};

// Get detailed room analytics
exports.getRoomAnalytics = async (req, res) => {
  try {
    const { range = "month" } = req.query;
    
    const [
      roomUtilization,
      floorStats,
      roomPerformance
    ] = await Promise.all([
      getRoomUtilization(range),
      getFloorStatistics(),
      getRoomPerformance()
    ]);

    res.json({
      utilization: roomUtilization,
      floorStats,
      performance: roomPerformance
    });
  } catch (error) {
    console.error("Room analytics error:", error);
    res.status(500).json({ message: "Failed to fetch room analytics" });
  }
};

// Get engagement metrics
exports.getEngagementMetrics = async (req, res) => {
  try {
    const { range = "month" } = req.query;
    
    const [
      activeUsers,
      sessionData,
      featureUsage,
      retentionData
    ] = await Promise.all([
      getActiveUsersData(range),
      getSessionData(range),
      getFeatureUsage(),
      getRetentionData()
    ]);

    res.json({
      activeUsers,
      sessions: sessionData,
      features: featureUsage,
      retention: retentionData
    });
  } catch (error) {
    console.error("Engagement metrics error:", error);
    res.status(500).json({ message: "Failed to fetch engagement metrics" });
  }
};

// Export analytics data
exports.exportAnalytics = async (req, res) => {
  try {
    const { format = "json", range = "month" } = req.query;
    
    // Create mock response objects for internal calls
    const mockRes = {
      json: (data) => data,
      status: () => ({ json: () => {} })
    };
    
    // Gather all analytics data
    const overview = await exports.getAnalyticsOverview({ query: { range } }, mockRes);
    const users = await exports.getUserAnalytics({ query: { range } }, mockRes);
    const reservations = await exports.getReservationAnalytics({ query: { range } }, mockRes);
    const rooms = await exports.getRoomAnalytics({ query: { range } }, mockRes);
    
    const analyticsData = { overview, users, reservations, rooms };
    
    if (format === "csv") {
      // Convert to CSV
      const csv = convertToCSV(analyticsData);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=analytics.csv");
      return res.send(csv);
    } else {
      // Return as JSON
      res.json(analyticsData);
    }
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ message: "Failed to export analytics data" });
  }
};

// Helper functions
function calculateTrend(current, previous) {
  if (previous === 0) {
    return { 
      percentage: current > 0 ? 100 : 0, 
      direction: current > 0 ? "up" : "none" 
    };
  }
  const percentage = ((current - previous) / previous) * 100;
  return {
    percentage: Math.abs(Math.round(percentage * 10) / 10),
    direction: percentage >= 0 ? "up" : "down"
  };
}

async function calculateRetentionRate() {
  // Calculate retention rate (users who returned within 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  
  const [newUsers, returningUsers] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
    User.countDocuments({
      createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
      lastLogin: { $gte: thirtyDaysAgo }
    })
  ]);

  return newUsers ? Math.round((returningUsers / newUsers) * 100) : 0;
}

async function getRecentActivity(limit = 10) {
  try {
    const logs = await Log.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "name email");
    
    return logs.map(log => ({
      id: log._id,
      action: log.action,
      details: log.details || "",
      user: log.userName || log.userId?.name || "System",
      timestamp: log.createdAt,
      type: log.action?.toLowerCase().includes("reservation") ? "reservation" : 
            log.action?.toLowerCase().includes("user") ? "user" : "system"
    }));
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return [];
  }
}

async function getUserGrowthData(range) {
  const now = new Date();
  let startDate;
  
  switch(range) {
    case "week":
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "year":
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }
  
  const groupBy = range === "week" ? { $dayOfMonth: "$createdAt" } : 
                 range === "month" ? { $week: "$createdAt" } : 
                 { $month: "$createdAt" };
  
  return await User.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    { $group: {
      _id: groupBy,
      count: { $sum: 1 }
    }},
    { $sort: { _id: 1 } }
  ]);
}

async function getUserActivityData(range) {
  const now = new Date();
  let startDate;
  
  switch(range) {
    case "week":
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "year":
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }
  
  // Get login activity from logs
  const loginLogs = await Log.countDocuments({ 
    action: { $regex: /login/i },
    createdAt: { $gte: startDate }
  });
  
  return {
    totalLogins: loginLogs,
  };
}

async function getTopActiveUsers(limit = 10) {
  const users = await User.find()
    .sort({ lastLogin: -1 })
    .limit(limit)
    .select("name email role lastLogin");
  
  return users;
}

async function getReservationTrends(range) {
  const now = new Date();
  let startDate;
  
  switch(range) {
    case "week":
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "year":
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }
  
  const groupBy = range === "week" ? { $dayOfMonth: "$datetime" } : 
                 range === "month" ? { $week: "$datetime" } : 
                 { $month: "$datetime" };
  
  return await Reservation.aggregate([
    { $match: { 
      datetime: { $gte: startDate },
      status: { $in: ["Completed", "Approved", "Ongoing"] }
    }},
    { $group: {
      _id: groupBy,
      count: { $sum: 1 }
    }},
    { $sort: { _id: 1 } }
  ]);
}

async function getPeakHours() {
  const peakHours = await Reservation.aggregate([
    { $match: { status: { $in: ["Completed", "Approved", "Ongoing"] } } },
    { $group: {
      _id: { $hour: "$datetime" },
      count: { $sum: 1 }
    }},
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);
  
  return peakHours;
}

async function getPopularRooms() {
  return await Reservation.aggregate([
    { $match: { status: { $in: ["Completed", "Approved", "Ongoing"] } } },
    { $group: {
      _id: { roomName: "$roomName", location: "$location" },
      count: { $sum: 1 }
    }},
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
}

async function calculateApprovalRate() {
  const stats = await Reservation.aggregate([
    { $group: {
      _id: null,
      total: { $sum: 1 },
      approved: { $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] } }
    }}
  ]);
  
  return stats[0] ? Math.round((stats[0].approved / stats[0].total) * 100) : 0;
}

async function calculateCancellationRate() {
  const stats = await Reservation.aggregate([
    { $group: {
      _id: null,
      total: { $sum: 1 },
      cancelled: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] } }
    }}
  ]);
  
  return stats[0] ? Math.round((stats[0].cancelled / stats[0].total) * 100) : 0;
}

async function getRoomUtilization(range) {
  const now = new Date();
  let startDate;
  
  switch(range) {
    case "week":
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "year":
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }
  
  // Get daily utilization for the period
  const utilization = await Reservation.aggregate([
    { $match: { 
      datetime: { $gte: startDate },
      status: { $in: ["Completed", "Approved", "Ongoing"] }
    }},
    { $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$datetime" } },
      count: { $sum: 1 }
    }},
    { $sort: { _id: 1 } }
  ]);
  
  return utilization;
}

async function getFloorStatistics() {
  const floorStats = await Reservation.aggregate([
    { $match: { status: { $in: ["Completed", "Approved", "Ongoing"] } } },
    { $group: {
      _id: "$location",
      bookings: { $sum: 1 },
      rooms: { $addToSet: "$roomName" }
    }},
    { $project: {
      floor: "$_id",
      bookings: 1,
      uniqueRooms: { $size: "$rooms" }
    }}
  ]);
  
  return floorStats;
}

async function getRoomPerformance() {
  return await Reservation.aggregate([
    { $match: { status: { $in: ["Completed", "Approved", "Ongoing"] } } },
    { $group: {
      _id: { roomName: "$roomName", location: "$location" },
      totalBookings: { $sum: 1 },
      lastBooked: { $max: "$datetime" }
    }},
    { $sort: { totalBookings: -1 } }
  ]);
}

async function getActiveUsersData(range) {
  const days = range === "week" ? 7 : range === "month" ? 30 : 365;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return await User.aggregate([
    { $match: { lastLogin: { $gte: startDate } } },
    { $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$lastLogin" } },
      count: { $sum: 1 }
    }},
    { $sort: { _id: 1 } }
  ]);
}

async function getSessionData(range) {
  // You might need to calculate this differently based on your log data
  return [];
}

async function getFeatureUsage() {
  // Get counts of different actions from logs
  const featureUsage = await Log.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
    { $group: {
      _id: "$action",
      count: { $sum: 1 }
    }},
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  return featureUsage;
}

async function getRetentionData() {
  // Calculate retention cohorts
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const cohorts = await User.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    { $group: {
      _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
      total: { $sum: 1 },
      retained: { 
        $sum: { 
          $cond: [{ $gte: ["$lastLogin", thirtyDaysAgo] }, 1, 0] 
        }
      }
    }},
    { $sort: { _id: 1 } }
  ]);
  
  return cohorts;
}

function convertToCSV(data) {
  // Simple CSV conversion
  const rows = [];
  
  const flatten = (obj, prefix = "") => {
    return Object.keys(obj).reduce((acc, k) => {
      const pre = prefix.length ? prefix + "." : "";
      if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
        Object.assign(acc, flatten(obj[k], pre + k));
      } else if (Array.isArray(obj[k])) {
        acc[pre + k] = JSON.stringify(obj[k]);
      } else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});
  };
  
  try {
    const flat = flatten(data);
    rows.push(Object.keys(flat).join(","));
    rows.push(Object.values(flat).map(v => `"${v}"`).join(","));
  } catch (error) {
    console.error("CSV conversion error:", error);
    rows.push("Error converting data to CSV");
  }
  
  return rows.join("\n");
}