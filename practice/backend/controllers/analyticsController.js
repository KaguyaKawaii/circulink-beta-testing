// controllers/analyticsController.js
const User = require("../models/User");
const Reservation = require("../models/Reservation");
const Room = require("../models/Room");
const AdminLog = require("../models/AdminLog");
const mongoose = require("mongoose");

// Get analytics overview data
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

    // Reset dates for calculations
    now.setDate(now.getDate() + (range === "week" ? 7 : 0));
    now.setMonth(now.getMonth() + (range === "month" ? 1 : 0));
    now.setFullYear(now.getFullYear() + (range === "year" ? 1 : 0));

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
      
      // Engagement stats
      Promise.all([
        // Daily active (last 24h)
        User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
        // Weekly active (last 7 days)
        User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        // Monthly active (last 30 days)
        User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
        // Average session duration (from logs)
        AdminLog.aggregate([
          { $match: { action: { $regex: /login/i } } },
          { $group: { _id: null, avgDuration: { $avg: "$duration" } } }
        ])
      ])
    ]);

    // Calculate room utilization
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

    // Calculate trends
    const userTrend = calculateTrend(newUsers, previousPeriodUsers);
    const reservationTrend = calculateTrend(
      reservationStats[0]?.total || 0,
      previousReservationStats
    );

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
        total: reservationStats[0]?.total || 0,
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
        total: roomStats[0]?.total || 0,
        available: roomStats[0]?.available || 0,
        occupied: currentOccupied,
        maintenance: roomStats[0]?.maintenance || 0,
        utilization: roomStats[0]?.total ? Math.round((currentOccupied / roomStats[0]?.total) * 100) : 0,
        mostBooked: mostBookedRooms
      },
      engagement: {
        dailyActive: engagementStats[0] || 0,
        weeklyActive: engagementStats[1] || 0,
        monthlyActive: engagementStats[2] || 0,
        averageSession: Math.round(engagementStats[3][0]?.avgDuration || 0),
        retention: calculateRetentionRate()
      },
      recentActivity: await getRecentActivity()
    };

    res.json(analyticsData);
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ message: "Failed to fetch analytics data", error: error.message });
  }
};

// Get detailed user analytics
exports.getUserAnalytics = async (req, res) => {
  try {
    const { range = "month" } = req.query;
    
    const userGrowth = await getUserGrowthData(range);
    const userActivity = await getUserActivityData(range);
    const userRetention = await calculateUserRetention();
    const topUsers = await getTopActiveUsers();

    res.json({
      growth: userGrowth,
      activity: userActivity,
      retention: userRetention,
      topUsers
    });
  } catch (error) {
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
    res.status(500).json({ message: "Failed to fetch engagement metrics" });
  }
};

// Export analytics data
exports.exportAnalytics = async (req, res) => {
  try {
    const { format = "json", range = "month" } = req.query;
    
    // Gather all analytics data
    const analyticsData = await gatherAllAnalyticsData(range);
    
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
    res.status(500).json({ message: "Failed to export analytics data" });
  }
};

// Helper functions
function calculateTrend(current, previous) {
  if (previous === 0) return { percentage: 100, direction: "up" };
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
  const logs = await AdminLog.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("userId", "name email");
  
  return logs.map(log => ({
    id: log._id,
    action: log.action,
    details: log.details,
    user: log.userId?.name || "System",
    timestamp: log.createdAt,
    type: log.action.includes("Reservation") ? "reservation" : 
          log.action.includes("User") ? "user" : "system"
  }));
}

async function getUserGrowthData(range) {
  const groupBy = range === "week" ? "$day" : range === "month" ? "$week" : "$month";
  // Implementation for user growth over time
  return [];
}

async function getUserActivityData(range) {
  // Implementation for user activity metrics
  return {};
}

async function getTopActiveUsers(limit = 10) {
  const users = await User.find()
    .sort({ lastLogin: -1 })
    .limit(limit)
    .select("name email role lastLogin");
  
  return users;
}

async function getReservationTrends(range) {
  // Implementation for reservation trends
  return [];
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
  // Implementation for room utilization over time
  return [];
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
  // Implementation for room performance metrics
  return [];
}

async function getActiveUsersData(range) {
  // Implementation for active users data
  return {};
}

async function getSessionData(range) {
  // Implementation for session data
  return {};
}

async function getFeatureUsage() {
  // Implementation for feature usage metrics
  return {};
}

async function getRetentionData() {
  // Implementation for retention data
  return {};
}

async function gatherAllAnalyticsData(range) {
  // Gather all analytics data for export
  const overview = await exports.getAnalyticsOverview({ query: { range } }, { json: () => {} });
  const users = await exports.getUserAnalytics({ query: { range } }, { json: () => {} });
  const reservations = await exports.getReservationAnalytics({ query: { range } }, { json: () => {} });
  const rooms = await exports.getRoomAnalytics({ query: { range } }, { json: () => {} });
  
  return { overview, users, reservations, rooms };
}

function convertToCSV(data) {
  // Simple CSV conversion
  const rows = [];
  const flatten = (obj, prefix = "") => {
    return Object.keys(obj).reduce((acc, k) => {
      const pre = prefix.length ? prefix + "." : "";
      if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
        Object.assign(acc, flatten(obj[k], pre + k));
      } else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});
  };
  
  const flat = flatten(data);
  rows.push(Object.keys(flat).join(","));
  rows.push(Object.values(flat).join(","));
  
  return rows.join("\n");
}