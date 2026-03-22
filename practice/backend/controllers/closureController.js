// controllers/closureController.js
import mongoose from "mongoose";
import Closure from "../models/Closure.js";
import Reservation from "../models/Reservation.js";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import notificationService from "../services/notificationService.js";
import sendEmail from "../utils/sendEmail.js";
import logAction from "../utils/logAction.js";
import generateReservationEmail from "../utils/generateReservationEmail.js";

/* ------------------------------------------------
   ✅ CREATE CLOSURE WITH CONFLICT DETECTION
------------------------------------------------ */
// In closureController.js, update the createClosure function

export const createClosure = async (req, res) => {
  try {
    const {
      title,
      reason,
      date,
      startTime,
      endTime,
      affectedRooms,
      affectedAllRooms,
      location
    } = req.body;

    // Remove the admin requirement - use a default admin or system user
    // If you have a system admin user, you can fetch it, or use a default value
    let admin = null;
    
    // Try to find a system admin user if needed
    try {
      const Admin = mongoose.model("Admin");
      admin = await Admin.findOne({ role: "admin" });
    } catch (err) {
      console.log("No admin found, using default values");
    }

    console.log("=".repeat(50));
    console.log("📝 CREATING CLOSURE");
    console.log("=".repeat(50));
    console.log("Request body:", req.body);

    // Validate required fields
    const missingFields = [];
    if (!title) missingFields.push("title");
    if (!reason) missingFields.push("reason");
    if (!date) missingFields.push("date");
    if (!startTime) missingFields.push("startTime");
    if (!endTime) missingFields.push("endTime");
    if (!affectedAllRooms && (!affectedRooms || affectedRooms.length === 0)) 
      missingFields.push("affectedRooms");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`
      });
    }

    // Validate time range
    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: "End time must be after start time"
      });
    }

    // Check for overlapping active closures
    const overlappingClosures = await Closure.find({
      date,
      status: "Active",
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    });

    if (overlappingClosures.length > 0) {
      return res.status(400).json({
        success: false,
        message: "There is already an active closure during this time period",
        overlappingClosures: overlappingClosures.map(c => ({
          title: c.title,
          time: `${c.startTime} - ${c.endTime}`,
          rooms: c.affectedAllRooms ? "All Rooms" : c.affectedRooms.join(", ")
        }))
      });
    }

    // Find conflicting reservations
    const conflictQuery = {
      date: date,
      status: { $in: ["Pending", "Approved", "Ongoing"] }
    };

    // Build room filter
    if (!affectedAllRooms && affectedRooms && affectedRooms.length > 0) {
      conflictQuery.roomName = { $in: affectedRooms };
    }

    const conflictingReservations = await Reservation.find(conflictQuery)
      .populate("userId", "name email id_number");

    // Filter by time overlap
    const affectedReservations = [];
    const startTimeMinutes = timeToMinutes(startTime);
    const endTimeMinutes = timeToMinutes(endTime);

    for (const reservation of conflictingReservations) {
      const resStartTime = reservation.time || 
        new Date(reservation.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const resEndTime = new Date(reservation.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      
      const resStartMinutes = timeToMinutes(resStartTime);
      const resEndMinutes = timeToMinutes(resEndTime);

      const overlap = (resStartMinutes < endTimeMinutes && resEndMinutes > startTimeMinutes);
      
      if (overlap) {
        affectedReservations.push({
          reservationId: reservation._id,
          userId: reservation.userId._id,
          roomName: reservation.roomName,
          date: reservation.date,
          startTime: resStartTime,
          endTime: resEndTime,
          reservationData: reservation
        });
      }
    }

    console.log(`Found ${affectedReservations.length} conflicting reservations`);

    // Create the closure - use admin._id if exists, otherwise use null
    const closure = await Closure.create({
      title,
      reason,
      date,
      startTime,
      endTime,
      affectedRooms: affectedAllRooms ? [] : affectedRooms,
      affectedAllRooms: affectedAllRooms || false,
      location: location || (affectedAllRooms ? "All Floors" : "Custom"),
      createdBy: admin?._id || null,
      createdByAdminName: admin?.name || "System Admin",
      affectedReservations: affectedReservations.map(r => ({
        reservationId: r.reservationId,
        userId: r.userId,
        roomName: r.roomName,
        date: r.date,
        startTime: r.startTime,
        endTime: r.endTime
      }))
    });

    // Process each conflicting reservation
    const processedReservations = [];
    const failedReservations = [];

    for (const conflict of affectedReservations) {
      try {
        const reservation = conflict.reservationData;
        
        const updatedReservation = await Reservation.findByIdAndUpdate(
          reservation._id,
          {
            status: "Cancelled_Admin",
            cancellationReason: `Cancelled due to facility closure: ${title} - ${reason}`,
            cancelledBy: "Admin",
            cancelledAt: new Date()
          },
          { new: true }
        ).populate("userId");

        if (updatedReservation) {
          processedReservations.push(updatedReservation);
          
          // Create notification for user (skip if notification service not available)
          try {
            if (typeof notificationService.createNotification === 'function') {
              await notificationService.createNotification(
                {
                  userId: reservation.userId._id,
                  reservationId: reservation._id,
                  type: "reservation",
                  status: "cancelled_admin",
                  targetRole: "user",
                  roomName: reservation.roomName,
                  date: reservation.date,
                  startTime: conflict.startTime,
                  endTime: conflict.endTime,
                  message: `Your reservation for ${reservation.roomName} on ${reservation.date} has been cancelled due to a facility closure: ${title}. Reason: ${reason}`
                },
                req.app.get("io")
              );
            }
          } catch (notifError) {
            console.warn("Notification error:", notifError.message);
          }

          // Send email notification
          try {
            if (reservation.userId.email) {
              await sendEmail({
                to: reservation.userId.email,
                subject: "Reservation Cancelled Due to Facility Closure",
                html: generateReservationEmail({
                  status: "Cancelled_Admin",
                  toName: reservation.userId.name,
                  reservation: updatedReservation,
                  formattedDate: reservation.date,
                  time: `${conflict.startTime} - ${conflict.endTime}`,
                  participants: reservation.participants,
                  extraNote: `Your reservation was cancelled due to a facility closure: ${title}. Reason: ${reason}`
                })
              });
            }
          } catch (emailError) {
            console.warn("⚠️ Failed to send cancellation email:", emailError.message);
          }

          // Log the action (skip if logAction not available)
          try {
            await logAction(
              reservation.userId._id,
              reservation.userId.id_number,
              reservation.userId.name,
              "Reservation Cancelled (Admin Closure)",
              `Reservation for ${reservation.roomName} on ${reservation.date} cancelled due to closure: ${title}`,
              req.headers['user-agent'] || ''
            );
          } catch (logError) {
            console.warn("Log error:", logError.message);
          }
        }
      } catch (err) {
        console.error(`❌ Failed to process reservation ${conflict.reservationId}:`, err);
        failedReservations.push({
          reservationId: conflict.reservationId,
          error: err.message
        });
      }
    }

    // Log closure creation (skip if logAction not available)
    try {
      await logAction(
        admin?._id || null,
        "ADMIN",
        admin?.name || "System Admin",
        "Closure Created",
        `Created facility closure: ${title} on ${date} from ${startTime} to ${endTime}. Affected ${processedReservations.length} reservations.`,
        req.headers['user-agent'] || ''
      );
    } catch (logError) {
      console.warn("Log error:", logError.message);
    }

    // Notify staff about the closure
    const io = req.app.get("io");
    if (io) {
      io.emit("closure-created", {
        closure: {
          _id: closure._id,
          title,
          date,
          startTime,
          endTime,
          affectedAllRooms,
          affectedRooms: affectedRooms || []
        },
        affectedCount: processedReservations.length
      });
    }

    console.log("=".repeat(50));
    console.log("✅ CLOSURE CREATED SUCCESSFULLY");
    console.log(`Affected: ${processedReservations.length} reservations`);
    console.log("=".repeat(50));

    res.status(201).json({
      success: true,
      message: `Closure created successfully. ${processedReservations.length} reservations were automatically cancelled.`,
      closure,
      affectedReservations: processedReservations,
      failedReservations: failedReservations.length > 0 ? failedReservations : undefined
    });

  } catch (err) {
    console.error("❌ Error creating closure:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({
      success: false,
      message: "Failed to create closure",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
/* ------------------------------------------------
   ✅ GET ALL CLOSURES (WITH FILTERS)
------------------------------------------------ */
export const getClosures = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = "Active",
      dateFrom,
      dateTo,
      search
    } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = dateFrom;
      if (dateTo) query.date.$lte = dateTo;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } },
        { createdByAdminName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = await Closure.countDocuments(query);

    const closures = await Closure.find(query)
      .populate("createdBy", "name email")
      .sort({ date: -1, startTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      closures,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (err) {
    console.error("Error fetching closures:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch closures",
      error: err.message
    });
  }
};

/* ------------------------------------------------
   ✅ GET SINGLE CLOSURE BY ID
------------------------------------------------ */
export const getClosureById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid closure ID format"
      });
    }

    const closure = await Closure.findById(id)
      .populate("createdBy", "name email")
      .populate("affectedReservations.reservationId", "roomName date datetime endDatetime status");

    if (!closure) {
      return res.status(404).json({
        success: false,
        message: "Closure not found"
      });
    }

    res.json({
      success: true,
      closure
    });

  } catch (err) {
    console.error("Error fetching closure:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch closure",
      error: err.message
    });
  }
};

/* ------------------------------------------------
   ✅ UPDATE CLOSURE
------------------------------------------------ */
export const updateClosure = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      reason,
      date,
      startTime,
      endTime,
      affectedRooms,
      affectedAllRooms,
      location,
      status
    } = req.body;

    const admin = req.admin;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid closure ID format"
      });
    }

    const closure = await Closure.findById(id);
    
    if (!closure) {
      return res.status(404).json({
        success: false,
        message: "Closure not found"
      });
    }

    // Store old data for logging
    const oldData = {
      title: closure.title,
      date: closure.date,
      startTime: closure.startTime,
      endTime: closure.endTime
    };

    // Update fields
    if (title) closure.title = title;
    if (reason) closure.reason = reason;
    if (date) closure.date = date;
    if (startTime) closure.startTime = startTime;
    if (endTime) closure.endTime = endTime;
    if (affectedRooms) closure.affectedRooms = affectedRooms;
    if (affectedAllRooms !== undefined) closure.affectedAllRooms = affectedAllRooms;
    if (location) closure.location = location;
    if (status) closure.status = status;

    await closure.save();

    // Log the update
    await logAction(
      admin._id,
      admin.id_number || "ADMIN",
      admin.name,
      "Closure Updated",
      `Updated closure: ${oldData.title} (${oldData.date}) to ${closure.title} (${closure.date})`,
      req.headers['user-agent'] || ''
    );

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("closure-updated", {
        closureId: closure._id,
        updatedData: closure
      });
    }

    res.json({
      success: true,
      message: "Closure updated successfully",
      closure
    });

  } catch (err) {
    console.error("Error updating closure:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update closure",
      error: err.message
    });
  }
};

/* ------------------------------------------------
   ✅ DELETE CLOSURE (WITH OPTION TO RESTORE RESERVATIONS)
------------------------------------------------ */
export const deleteClosure = async (req, res) => {
  try {
    const { id } = req.params;
    const { restoreReservations } = req.body; // Optional: restore affected reservations
    const admin = req.admin;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid closure ID format"
      });
    }

    const closure = await Closure.findById(id);
    
    if (!closure) {
      return res.status(404).json({
        success: false,
        message: "Closure not found"
      });
    }

    // Store affected reservations for potential restoration
    const affectedReservationIds = closure.affectedReservations.map(r => r.reservationId);

    // If restoreReservations is true, attempt to restore cancelled reservations
    const restoredReservations = [];
    if (restoreReservations && affectedReservationIds.length > 0) {
      for (const reservationId of affectedReservationIds) {
        try {
          const reservation = await Reservation.findById(reservationId);
          if (reservation && reservation.status === "Cancelled_Admin") {
            // Check if the original time slot is still available
            const conflictExists = await Reservation.findOne({
              _id: { $ne: reservation._id },
              roomName: reservation.roomName,
              location: reservation.location,
              date: reservation.date,
              status: { $in: ["Approved", "Ongoing", "Pending"] },
              datetime: { $lt: reservation.endDatetime },
              endDatetime: { $gt: reservation.datetime }
            });

            if (!conflictExists) {
              // Restore the reservation
              reservation.status = "Approved";
              reservation.cancellationReason = undefined;
              reservation.cancelledBy = undefined;
              reservation.cancelledAt = undefined;
              await reservation.save();

              restoredReservations.push(reservation);

              // Notify user about restoration
              await notificationService.createNotification(
                {
                  userId: reservation.userId,
                  reservationId: reservation._id,
                  type: "reservation",
                  status: "restored",
                  targetRole: "user",
                  roomName: reservation.roomName,
                  date: reservation.date,
                  message: `Your reservation for ${reservation.roomName} on ${reservation.date} has been restored after the cancellation of a facility closure.`
                },
                req.app.get("io")
              );
            }
          }
        } catch (err) {
          console.warn(`⚠️ Failed to restore reservation ${reservationId}:`, err.message);
        }
      }
    }

    // Delete the closure
    await Closure.findByIdAndDelete(id);

    // Log the deletion
    await logAction(
      admin._id,
      admin.id_number || "ADMIN",
      admin.name,
      "Closure Deleted",
      `Deleted closure: ${closure.title} on ${closure.date}. Restored ${restoredReservations.length} reservations.`,
      req.headers['user-agent'] || ''
    );

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("closure-deleted", {
        closureId: closure._id,
        restoredCount: restoredReservations.length
      });
    }

    res.json({
      success: true,
      message: `Closure deleted successfully. ${restoredReservations.length} reservations were restored.`,
      restoredReservations: restoredReservations.length > 0 ? restoredReservations : undefined
    });

  } catch (err) {
    console.error("Error deleting closure:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete closure",
      error: err.message
    });
  }
};

/* ------------------------------------------------
   ✅ CHECK IF A TIME SLOT IS CLOSED
------------------------------------------------ */
export const checkSlotClosed = async (req, res) => {
  try {
    const { date, time, roomName } = req.query;

    if (!date || !time || !roomName) {
      return res.status(400).json({
        success: false,
        message: "Date, time, and roomName are required"
      });
    }

    const query = {
      date: date,
      status: "Active",
      startTime: { $lte: time },
      endTime: { $gt: time },
      $or: [
        { affectedAllRooms: true },
        { affectedRooms: roomName }
      ]
    };

    const activeClosure = await Closure.findOne(query);

    res.json({
      success: true,
      isClosed: !!activeClosure,
      closure: activeClosure ? {
        title: activeClosure.title,
        reason: activeClosure.reason,
        startTime: activeClosure.startTime,
        endTime: activeClosure.endTime
      } : null
    });

  } catch (err) {
    console.error("Error checking slot closure:", err);
    res.status(500).json({
      success: false,
      message: "Failed to check slot availability",
      error: err.message
    });
  }
};

/* ------------------------------------------------
   ✅ GET AVAILABILITY WITH CLOSURES (Enhanced)
------------------------------------------------ */
export const getAvailabilityWithClosures = async (req, res) => {
  try {
    const { date, userId } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required"
      });
    }

    // Get all rooms
    const Room = mongoose.model("Room");
    const rooms = await Room.find({}).sort({ floor: 1, room: 1 });

    // Get all reservations for this date
    const reservations = await Reservation.find({
      date,
      status: { $in: ["Pending", "Approved", "Ongoing"] }
    });

    // Get all closures for this date
    const closures = await Closure.find({
      date,
      status: "Active"
    });

    // Build availability data
    const availability = rooms.map((room) => {
      const roomReservations = reservations.filter(
        r => r.location === room.floor && r.roomName === room.room
      );

      // Check if room is closed during any time slot
      const roomClosures = closures.filter(c => 
        c.affectedAllRooms || c.affectedRooms.includes(room.room)
      );

      const occupied = roomReservations.map((r) => ({
        start: r.datetime,
        end: r.endDatetime,
        mine: r.userId.toString() === userId,
        status: r.status
      }));

      const closedTimeSlots = roomClosures.map((c) => ({
        start: `${date}T${c.startTime}:00`,
        end: `${date}T${c.endTime}:00`,
        reason: c.title,
        closureId: c._id
      }));

      return {
        floor: room.floor,
        room: room.room,
        occupied,
        closedTimeSlots,
        isActive: room.isActive,
        hasClosures: roomClosures.length > 0
      };
    });

    res.json({
      success: true,
      availability,
      closures: closures.map(c => ({
        id: c._id,
        title: c.title,
        reason: c.reason,
        startTime: c.startTime,
        endTime: c.endTime,
        affectedAllRooms: c.affectedAllRooms,
        affectedRooms: c.affectedRooms
      }))
    });

  } catch (err) {
    console.error("Error fetching availability with closures:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch availability",
      error: err.message
    });
  }
};

/* ------------------------------------------------
   ✅ GET UPCOMING CLOSURES FOR USER DASHBOARD
------------------------------------------------ */
export const getUpcomingClosures = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    
    const closures = await Closure.find({
      date: { $gte: today },
      status: "Active"
    }).sort({ date: 1, startTime: 1 }).limit(10);

    res.json({
      success: true,
      closures
    });

  } catch (err) {
    console.error("Error fetching upcoming closures:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch upcoming closures",
      error: err.message
    });
  }
};

/* ------------------------------------------------
   ✅ HELPER: Convert time string to minutes
------------------------------------------------ */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}