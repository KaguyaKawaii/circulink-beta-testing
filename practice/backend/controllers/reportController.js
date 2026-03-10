import Report from "../models/Report.js";
import ArchivedReport from "../models/ArchivedReport.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import logAction from "../utils/logAction.js";

/* ------------------------------------------------
   ✅ Get all active reports
------------------------------------------------ */
export const getReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("assignedTo", "name email floor")
      .populate("assignedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: "Error fetching reports", error });
  }
};

/* ------------------------------------------------
   ✅ Get report by ID
------------------------------------------------ */
export const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate(
      "userId",
      "name email"
    );
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    res.status(200).json(report);
  } catch (err) {
    console.error("❌ Error fetching report by ID:", err);
    res.status(500).json({
      message: "Failed to fetch report",
      error: err.message,
    });
  }
};

/* ------------------------------------------------
   ✅ Get archived reports
------------------------------------------------ */
export const getArchivedReports = async (req, res) => {
  try {
    const archived = await ArchivedReport.find()
      .populate("userId")
      .sort({ archivedAt: -1 });
    res.status(200).json(archived);
  } catch (err) {
    console.error("❌ Error fetching archived reports:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ------------------------------------------------
   ✅ Create Report + Notify Admin ONLY - FIXED
------------------------------------------------ */
export const createReport = async (req, res) => {
  try {
    let { reportedBy, userId, category, details, floor, room } = req.body;

    // ✅ Clean & validate input
    reportedBy = reportedBy?.trim();
    category = category?.trim();
    details = details?.trim();
    floor = floor?.trim();
    room = room?.trim();

    if (!reportedBy || !userId || !category || !details || !floor || !room) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // 1️⃣ Create report
    const newReport = await Report.create({
      reportedBy,
      userId,
      category,
      details,
      floor,
      room,
      status: "Pending",
      assignedTo: null,
    });

    // 2️⃣ Log report creation
    await logAction(
      userId,
      "Report Creator",
      reportedBy,
      "Report Created",
      `${reportedBy} created a ${category} report for ${floor} - ${room}`
    );

    // 3️⃣ ✅ FIX: Create admin notification using targetRole
    const notification = await Notification.create({
      // Don't set userId - this makes it available to all admins
      reportId: newReport._id,
      message: `New ${category} report submitted for ${floor} - ${room} by ${reportedBy}`,
      type: "report",
      status: "New",
      targetRole: "admin", // ✅ This makes it visible only to admins
      isRead: false,
      dismissed: false,
    });

    // 4️⃣ Emit to admin room via socket.io
    const io = req.app.get("io");
    if (io) {
      const populatedNotification = await notification.populate("reportId", "category floor room");
      io.to("admin-room").emit("notification", populatedNotification);
    }

    res.status(201).json({
      message: "Report submitted successfully",
      report: newReport,
      notification,
    });
  } catch (err) {
    console.error("❌ Error creating report:", err);
    res.status(500).json({
      message: "Failed to submit report",
      error: err.message,
    });
  }
};

/* ------------------------------------------------
   ✅ Start Report (Staff begins work) - NO USER NOTIFICATION
------------------------------------------------ */
export const startReport = async (req, res) => {
  try {
    const { startedBy } = req.body;

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Get staff info for logging
    let staffName = "Staff";
    let staffIdNumber = "N/A";
    
    if (startedBy) {
      const staff = await User.findById(startedBy);
      if (staff) {
        staffName = staff.name;
        staffIdNumber = staff.id_number || "N/A";
      }
    }

    // ✅ Update report status to "In Progress"
    const previousStatus = report.status;
    report.status = "In Progress";
    report.updatedAt = new Date();

    await report.save();

    // ✅ Log report start with staff name (NO USER NOTIFICATION)
    await logAction(
      startedBy || null,
      staffIdNumber,
      staffName,
      "Report Started",
      `Report ${report._id} for ${report.floor} - ${report.room} started by ${staffName}. Status changed from ${previousStatus} to In Progress`
    );

    // ❌ REMOVED: User notification about work starting

    res.status(200).json({
      message: "Report started successfully",
      report,
    });
  } catch (err) {
    console.error("❌ Error starting report:", err);
    res.status(500).json({
      message: "Failed to start report",
      error: err.message,
    });
  }
};

/* ------------------------------------------------
   ✅ Resolve Report - NO USER NOTIFICATION
------------------------------------------------ */
export const resolveReport = async (req, res) => {
  try {
    const { actionTaken, resolvedBy } = req.body;

    if (!actionTaken || actionTaken.trim() === "") {
      return res.status(400).json({ message: "Action taken is required" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Get resolver info for logging
    let resolverName = "Admin";
    let resolverIdNumber = "N/A";
    
    if (resolvedBy) {
      const resolver = await User.findById(resolvedBy);
      if (resolver) {
        resolverName = resolver.name;
        resolverIdNumber = resolver.id_number || "N/A";
      }
    }

    // ✅ Update report status and action taken
    report.status = "Resolved";
    report.actionTaken = actionTaken.trim();
    report.resolvedAt = new Date();
    report.updatedAt = new Date();

    await report.save();

    // ✅ Log resolution with staff name (NO USER NOTIFICATION)
    await logAction(
      resolvedBy || null,
      resolverIdNumber,
      resolverName,
      "Report Resolved",
      `Report ${report._id} for ${report.floor} - ${report.room} resolved by ${resolverName}. Action: ${actionTaken}`
    );

    // ❌ REMOVED: User notification about resolution

    res.status(200).json({
      message: "Report resolved successfully",
      report,
    });
  } catch (err) {
    console.error("❌ Error resolving report:", err);
    res.status(500).json({
      message: "Failed to resolve report",
      error: err.message,
    });
  }
};

/* ------------------------------------------------
   ✅ Admin Updates Report Status / Action Taken
------------------------------------------------ */
export const updateReportStatus = async (req, res) => {
  try {
    const { status, updatedBy } = req.body;
    const allowedStatuses = ["Pending", "In Progress", "Resolved", "Archived"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });

    const previousStatus = report.status;
    report.status = status;
    report.updatedAt = new Date();
    
    const updatedReport = await report.save();

    // Get updater info for logging
    let updaterName = "Admin";
    let updaterIdNumber = "N/A";
    
    if (updatedBy) {
      const updater = await User.findById(updatedBy);
      if (updater) {
        updaterName = updater.name;
        updaterIdNumber = updater.id_number || "N/A";
      }
    }

    // ✅ Log status update
    await logAction(
      updatedBy || null,
      updaterIdNumber,
      updaterName,
      "Report Status Updated",
      `Report ${report._id} for ${report.floor} - ${report.room} status changed from ${previousStatus} to ${status} by ${updaterName}`
    );

    res.json(updatedReport);
  } catch (err) {
    console.error("Failed to update report status:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ------------------------------------------------
   ✅ Archive Report (Move to ArchivedReport collection) - FIXED
------------------------------------------------ */
export const archiveReport = async (req, res) => {
  try {
    const { archivedBy } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });

    // Get archiver info for logging
    let archiverName = "Admin";
    let archiverIdNumber = "N/A";
    
    if (archivedBy) {
      const archiver = await User.findById(archivedBy);
      if (archiver) {
        archiverName = archiver.name;
        archiverIdNumber = archiver.id_number || "N/A";
      }
    }

    // ✅ FIX: Create archived report entry
    await ArchivedReport.create({
      _id: report._id, // Keep same ID
      reportedBy: report.reportedBy,
      userId: report.userId,
      category: report.category,
      details: report.details,
      floor: report.floor,
      room: report.room,
      status: report.status,
      assignedTo: report.assignedTo,
      actionTaken: report.actionTaken,
      resolvedAt: report.resolvedAt,
      createdAt: report.createdAt,
      archivedAt: new Date(), // Add archive timestamp
      updatedAt: new Date()
    });

    // ✅ Delete from active reports
    await Report.findByIdAndDelete(req.params.id);

    // ✅ Log archiving
    await logAction(
      archivedBy || null,
      archiverIdNumber,
      archiverName,
      "Report Archived",
      `Report ${report._id} for ${report.floor} - ${report.room} archived by ${archiverName}`
    );

    res.json({
      success: true,
      message: "Report archived successfully",
    });
  } catch (err) {
    console.error("❌ Error archiving report:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ------------------------------------------------
   ✅ Restore Report (from Archived status) - FIXED
------------------------------------------------ */
export const restoreReport = async (req, res) => {
  try {
    const { restoredBy } = req.body;
    
    // ✅ FIX: Find the report in ArchivedReport collection
    const archivedReport = await ArchivedReport.findById(req.params.id);
    if (!archivedReport) return res.status(404).json({ error: "Archived report not found" });

    // Get restorer info for logging
    let restorerName = "Admin";
    let restorerIdNumber = "N/A";
    
    if (restoredBy) {
      const restorer = await User.findById(restoredBy);
      if (restorer) {
        restorerName = restorer.name;
        restorerIdNumber = restorer.id_number || "N/A";
      }
    }

    // ✅ Create a new active report from the archived data
    const restoredReport = await Report.create({
      reportedBy: archivedReport.reportedBy,
      userId: archivedReport.userId,
      category: archivedReport.category,
      details: archivedReport.details,
      floor: archivedReport.floor,
      room: archivedReport.room,
      status: "Pending", // Set back to pending
      assignedTo: null, // Reset assignment
      createdAt: new Date(), // New creation date
      updatedAt: new Date()
    });

    // ✅ Delete from archived collection
    await ArchivedReport.findByIdAndDelete(req.params.id);

    // ✅ Log restoration
    await logAction(
      restoredBy || null,
      restorerIdNumber,
      restorerName,
      "Report Restored",
      `Report ${archivedReport._id} for ${archivedReport.floor} - ${archivedReport.room} restored from archive by ${restorerName}`
    );

    res.json({
      message: "Report restored successfully",
      report: restoredReport,
    });
  } catch (err) {
    console.error("❌ Error restoring report:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ------------------------------------------------
   ✅ Bulk Restore Archived Reports
------------------------------------------------ */
export const bulkRestoreArchivedReports = async (req, res) => {
  try {
    const { archivedIds, restoredBy } = req.body;
    
    if (!archivedIds || !Array.isArray(archivedIds) || archivedIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "No archived report IDs provided" 
      });
    }

    // Get restorer info for logging
    let restorerName = "Admin";
    let restorerIdNumber = "N/A";
    
    if (restoredBy) {
      const restorer = await User.findById(restoredBy);
      if (restorer) {
        restorerName = restorer.name;
        restorerIdNumber = restorer.id_number || "N/A";
      }
    }

    // Find all archived reports
    const archivedReports = await ArchivedReport.find({
      _id: { $in: archivedIds }
    });

    if (archivedReports.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "No archived reports found" 
      });
    }

    // Create new active reports from archived data
    const restoredReports = await Promise.all(
      archivedReports.map(async (archivedReport) => {
        const restoredReport = await Report.create({
          reportedBy: archivedReport.reportedBy,
          userId: archivedReport.userId,
          category: archivedReport.category,
          details: archivedReport.details,
          floor: archivedReport.floor,
          room: archivedReport.room,
          status: "Pending",
          assignedTo: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return restoredReport;
      })
    );

    // Delete from archived collection
    await ArchivedReport.deleteMany({
      _id: { $in: archivedIds }
    });

    // Log bulk restoration
    await logAction(
      restoredBy || null,
      restorerIdNumber,
      restorerName,
      "Bulk Restore",
      `Bulk restored ${archivedReports.length} reports from archive by ${restorerName}`
    );

    res.json({
      success: true,
      message: `Successfully restored ${archivedReports.length} reports`,
      count: archivedReports.length,
      reports: restoredReports
    });
  } catch (err) {
    console.error("❌ Error bulk restoring reports:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

/* ------------------------------------------------
   ✅ Bulk Delete Archived Reports (Permanently)
------------------------------------------------ */
export const bulkDeleteArchivedReports = async (req, res) => {
  try {
    const { archivedIds, deletedBy } = req.body;
    
    if (!archivedIds || !Array.isArray(archivedIds) || archivedIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "No archived report IDs provided" 
      });
    }

    // Get deleter info for logging
    let deleterName = "Admin";
    let deleterIdNumber = "N/A";
    
    if (deletedBy) {
      const deleter = await User.findById(deletedBy);
      if (deleter) {
        deleterName = deleter.name;
        deleterIdNumber = deleter.id_number || "N/A";
      }
    }

    // Find reports for logging
    const reports = await ArchivedReport.find({
      _id: { $in: archivedIds }
    });

    // Delete from archived collection
    const result = await ArchivedReport.deleteMany({
      _id: { $in: archivedIds }
    });

    // Log bulk deletion
    await logAction(
      deletedBy || null,
      deleterIdNumber,
      deleterName,
      "Bulk Delete",
      `Bulk deleted ${result.deletedCount} archived reports by ${deleterName}`
    );

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} archived reports`,
      count: result.deletedCount
    });
  } catch (err) {
    console.error("❌ Error bulk deleting reports:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

/* ------------------------------------------------
   ✅ Delete Archived Report (Permanently delete) - FIXED
------------------------------------------------ */
export const deleteArchivedReport = async (req, res) => {
  try {
    const { deletedBy } = req.body;
    
    // ✅ FIX: Find the report in ArchivedReport collection
    const report = await ArchivedReport.findById(req.params.id);
    
    if (!report) return res.status(404).json({ message: "Archived report not found" });

    // Get deleter info for logging
    let deleterName = "Admin";
    let deleterIdNumber = "N/A";
    
    if (deletedBy) {
      const deleter = await User.findById(deletedBy);
      if (deleter) {
        deleterName = deleter.name;
        deleterIdNumber = deleter.id_number || "N/A";
      }
    }

    // ✅ Log before deletion
    await logAction(
      deletedBy || null,
      deleterIdNumber,
      deleterName,
      "Report Deleted",
      `Archived report ${report._id} for ${report.floor} - ${report.room} permanently deleted by ${deleterName}`
    );

    // ✅ FIX: Delete from ArchivedReport collection
    const deleted = await ArchivedReport.findByIdAndDelete(req.params.id);

    res.sendStatus(204);
  } catch (err) {
    console.error("❌ Error deleting archived report:", err);
    res.status(500).json({
      message: "Failed to delete archived report",
      error: err.message,
    });
  }
};

/* ------------------------------------------------
   ✅ Assign Report to Staff
------------------------------------------------ */
export const assignReport = async (req, res) => {
  try {
    const { staffId, assignedBy } = req.body;

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });

    // Get assigner and staff info for logging
    let assignerName = "Admin";
    let assignerIdNumber = "N/A";
    
    if (assignedBy) {
      const assigner = await User.findById(assignedBy);
      if (assigner) {
        assignerName = assigner.name;
        assignerIdNumber = assigner.id_number || "N/A";
      }
    }

    const staff = await User.findById(staffId);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    const staffName = staff.name;

    // ✅ Check if staff is already assigned to this report
    if (report.assignedTo && report.assignedTo.toString() === staffId) {
      return res.status(400).json({ 
        message: "This staff is already assigned to this report" 
      });
    }

    const previousAssignee = report.assignedTo ? await User.findById(report.assignedTo) : null;
    const previousAssigneeName = previousAssignee ? previousAssignee.name : "Unassigned";

    report.assignedTo = staffId;
    if (assignedBy) report.assignedBy = assignedBy;
    report.status = "Pending";
    report.updatedAt = new Date();

    await report.save();

    // ✅ Log assignment
    await logAction(
      assignedBy || null,
      assignerIdNumber,
      assignerName,
      "Report Assigned",
      `Report ${report._id} for ${report.floor} - ${report.room} reassigned from ${previousAssigneeName} to ${staffName} by ${assignerName}`
    );

    // ✅ Notify staff
    await Notification.create({
      userId: staffId,
      reportId: report._id,
      message: `A new ${report.category} report has been assigned to you (${report.floor} - ${report.room}).`,
      type: "report",
      status: "New",
      isRead: false,
      dismissed: false,
    });

    res.json({
      message: `Report assigned to ${staffName} successfully`,
      report,
    });
  } catch (err) {
    console.error("❌ Error assigning report:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ------------------------------------------------
   ✅ Get Reports by Staff
------------------------------------------------ */
export const getReportsByStaff = async (req, res) => {
  try {
    const staffId = req.params.staffId;
    const reports = await Report.find({ assignedTo: staffId })
      .sort({ createdAt: -1 })
      .populate("userId", "name email");
    res.json(reports);
  } catch (err) {
    console.error("❌ Error fetching staff reports:", err);
    res.status(500).json({ error: err.message });
  }
};