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

// Helper: Convert time string to minutes
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper: Check if a closure has expired
function isClosureExpired(closure) {
  const now = new Date();
  const closureDate = new Date(closure.date);
  const [endHours, endMinutes] = closure.endTime.split(":").map(Number);
  closureDate.setHours(endHours, endMinutes, 0, 0);
  
  return now > closureDate;
}

/* ------------------------------------------------
   ✅ UPDATE CLOSURE STATUSES (REAL-TIME AUTO-END)
------------------------------------------------ */
export const updateClosureStatuses = async (req, res) => {
  try {
    console.log("🔄 Updating closure statuses...");
    
    // Find all active closures
    const activeClosures = await Closure.find({ status: "Active" });
    
    let updatedCount = 0;
    const expiredClosures = [];
    
    for (const closure of activeClosures) {
      if (isClosureExpired(closure)) {
        // Update status to Expired
        closure.status = "Expired";
        closure.endedAt = new Date();
        await closure.save();
        updatedCount++;
        expiredClosures.push(closure);
        
        console.log(`✅ Closure "${closure.title}" has expired automatically`);
        
        // Optional: Send notifications about closure ending
        try {
          // Notify admins that closure has ended
          const admins = await Admin.find({});
          for (const admin of admins) {
            if (admin.email) {
              await sendEmail({
                to: admin.email,
                subject: `Closure Ended: ${closure.title}`,
                html: `
                  <h2>Closure Has Ended</h2>
                  <p>The facility closure "${closure.title}" has ended automatically.</p>
                  <ul>
                    <li><strong>Date:</strong> ${closure.date}</li>
                    <li><strong>Time:</strong> ${closure.startTime} - ${closure.endTime}</li>
                    <li><strong>Reason:</strong> ${closure.reason}</li>
                  </ul>
                  <p>No action is required.</p>
                `
              });
            }
          }
        } catch (emailError) {
          console.warn("⚠️ Failed to send closure ended email:", emailError.message);
        }
      }
    }
    
    if (updatedCount > 0) {
      console.log(`📊 Updated ${updatedCount} closures to Expired status`);
    } else {
      console.log("📊 No closures needed updating");
    }
    
    if (res) {
      res.json({
        success: true,
        message: `Updated ${updatedCount} closures to expired status`,
        updatedCount,
        expiredClosures: expiredClosures.map(c => ({ id: c._id, title: c.title }))
      });
    }
    
    return { updatedCount, expiredClosures };
    
  } catch (err) {
    console.error("❌ Error updating closure statuses:", err);
    if (res) {
      res.status(500).json({
        success: false,
        message: "Failed to update closure statuses",
        error: err.message
      });
    }
    throw err;
  }
};

/* ------------------------------------------------
   ✅ PREVIEW CLOSURE CONFLICTS
------------------------------------------------ */
export const previewClosureConflicts = async (req, res) => {
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

    console.log("📝 Previewing closure conflicts:", { date, startTime, endTime, affectedAllRooms, affectedRoomsCount: affectedRooms?.length });

    // Validate required fields
    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Date, startTime, and endTime are required"
      });
    }

    // Validate time range
    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: "End time must be after start time"
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
    const affectedReservationsList = [];
    const startTimeMinutes = timeToMinutes(startTime);
    const endTimeMinutes = timeToMinutes(endTime);

    for (const reservation of conflictingReservations) {
      // Get start and end times from reservation
      let resStartTime, resEndTime;
      
      if (reservation.datetime && reservation.endDatetime) {
        resStartTime = new Date(reservation.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        resEndTime = new Date(reservation.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      } else if (reservation.time && reservation.endTime) {
        resStartTime = reservation.time;
        resEndTime = reservation.endTime;
      } else {
        continue; // Skip if no time data
      }
      
      const resStartMinutes = timeToMinutes(resStartTime);
      const resEndMinutes = timeToMinutes(resEndTime);

      const overlap = (resStartMinutes < endTimeMinutes && resEndMinutes > startTimeMinutes);
      
      if (overlap) {
        affectedReservationsList.push({
          reservationId: reservation._id,
          userName: reservation.userId?.name || "Unknown User",
          roomName: reservation.roomName,
          date: reservation.date,
          startTime: resStartTime,
          endTime: resEndTime,
          status: reservation.status
        });
      }
    }

    console.log(`Found ${affectedReservationsList.length} conflicting reservations`);

    res.json({
      success: true,
      affectedCount: affectedReservationsList.length,
      reservations: affectedReservationsList
    });

  } catch (err) {
    console.error("❌ Error previewing conflicts:", err);
    res.status(500).json({
      success: false,
      message: "Failed to preview conflicts",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/* ------------------------------------------------
   ✅ CREATE CLOSURE WITH CONFLICT DETECTION
------------------------------------------------ */
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

    // Validate rooms selection
    if (!affectedAllRooms && (!affectedRooms || affectedRooms.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one room or choose 'All Rooms'"
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
    const affectedReservationsList = [];
    const startTimeMinutes = timeToMinutes(startTime);
    const endTimeMinutes = timeToMinutes(endTime);

    for (const reservation of conflictingReservations) {
      // Get start and end times from reservation
      let resStartTime, resEndTime;
      
      if (reservation.datetime && reservation.endDatetime) {
        resStartTime = new Date(reservation.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        resEndTime = new Date(reservation.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      } else if (reservation.time && reservation.endTime) {
        resStartTime = reservation.time;
        resEndTime = reservation.endTime;
      } else {
        continue;
      }
      
      const resStartMinutes = timeToMinutes(resStartTime);
      const resEndMinutes = timeToMinutes(resEndTime);

      const overlap = (resStartMinutes < endTimeMinutes && resEndMinutes > startTimeMinutes);
      
      if (overlap) {
        affectedReservationsList.push({
          reservationId: reservation._id,
          userId: reservation.userId?._id,
          user: reservation.userId,
          roomName: reservation.roomName,
          date: reservation.date,
          startTime: resStartTime,
          endTime: resEndTime,
          reservationData: reservation
        });
      }
    }

    console.log(`Found ${affectedReservationsList.length} conflicting reservations`);

    // Try to find an admin user
    let admin = null;
    if (req.admin) {
      admin = req.admin;
    } else {
      try {
        admin = await Admin.findOne({});
      } catch (err) {
        console.log("No admin found, creating default admin reference");
        admin = { _id: null, name: "System Admin" };
      }
    }

    // Create the closure
    const closureData = {
      title,
      reason,
      date,
      startTime,
      endTime,
      affectedRooms: affectedAllRooms ? [] : (affectedRooms || []),
      affectedAllRooms: affectedAllRooms || false,
      location: location || (affectedAllRooms ? "All Floors" : "Custom"),
      createdBy: admin?._id || new mongoose.Types.ObjectId(),
      createdByAdminName: admin?.name || "System Admin",
      affectedReservations: affectedReservationsList.map(r => ({
        reservationId: r.reservationId,
        userId: r.userId,
        roomName: r.roomName,
        date: r.date,
        startTime: r.startTime,
        endTime: r.endTime
      })),
      status: "Active"
    };

    const closure = await Closure.create(closureData);

    // Process each conflicting reservation
    const processedReservations = [];
    const failedReservations = [];

    for (const conflict of affectedReservationsList) {
      try {
        const reservation = conflict.reservationData;
        
        const updatedReservation = await Reservation.findByIdAndUpdate(
          reservation._id,
          {
            status: "Cancelled",
            cancellationReason: `Cancelled due to facility closure: ${title} - ${reason}`,
            cancelledBy: "Admin",
            cancelledAt: new Date()
          },
          { new: true }
        ).populate("userId");

        if (updatedReservation) {
          processedReservations.push(updatedReservation);
          
          // Send email notification if user has email
          try {
            if (updatedReservation.userId?.email) {
              await sendEmail({
                to: updatedReservation.userId.email,
                subject: "Reservation Cancelled Due to Facility Closure",
                html: `
                  <h2>Reservation Cancelled</h2>
                  <p>Dear ${updatedReservation.userId.name || "User"},</p>
                  <p>Your reservation has been cancelled due to a facility closure:</p>
                  <ul>
                    <li><strong>Room:</strong> ${updatedReservation.roomName}</li>
                    <li><strong>Date:</strong> ${updatedReservation.date}</li>
                    <li><strong>Time:</strong> ${conflict.startTime} - ${conflict.endTime}</li>
                    <li><strong>Closure:</strong> ${title}</li>
                    <li><strong>Reason:</strong> ${reason}</li>
                  </ul>
                  <p>We apologize for any inconvenience.</p>
                `
              });
            }
          } catch (emailError) {
            console.warn("⚠️ Failed to send cancellation email:", emailError.message);
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
      status = "All",
      search
    } = req.query;

    const query = {};

    // Handle status filter
    if (status && status !== "All") {
      query.status = status;
    }

    // Handle search
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

    // Auto-update statuses before returning
    await updateClosureStatuses({}, {});

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
   ✅ DELETE CLOSURE
------------------------------------------------ */
export const deleteClosure = async (req, res) => {
  try {
    const { id } = req.params;
    const { restoreReservations } = req.body;

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

    // If restoreReservations is true, attempt to restore cancelled reservations
    const restoredReservations = [];
    if (restoreReservations && closure.affectedReservations?.length > 0) {
      for (const affected of closure.affectedReservations) {
        try {
          const reservation = await Reservation.findById(affected.reservationId);
          if (reservation && reservation.status === "Cancelled") {
            // Check if the original time slot is still available
            const conflictExists = await Reservation.findOne({
              _id: { $ne: reservation._id },
              roomName: reservation.roomName,
              date: reservation.date,
              status: { $in: ["Approved", "Ongoing", "Pending"] },
              datetime: { $lt: reservation.endDatetime },
              endDatetime: { $gt: reservation.datetime }
            });

            if (!conflictExists) {
              reservation.status = "Pending";
              reservation.cancellationReason = undefined;
              reservation.cancelledBy = undefined;
              reservation.cancelledAt = undefined;
              await reservation.save();
              restoredReservations.push(reservation);
            }
          }
        } catch (err) {
          console.warn(`⚠️ Failed to restore reservation ${affected.reservationId}:`, err.message);
        }
      }
    }

    // Delete the closure
    await Closure.findByIdAndDelete(id);

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
   ✅ BULK DELETE CLOSURES
------------------------------------------------ */
export const bulkDeleteClosures = async (req, res) => {
  try {
    const { closureIds, restoreReservations } = req.body;

    if (!closureIds || !Array.isArray(closureIds) || closureIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of closure IDs to delete"
      });
    }

    let deletedCount = 0;
    const restoredReservations = [];

    for (const id of closureIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.warn(`⚠️ Invalid closure ID: ${id}`);
        continue;
      }

      const closure = await Closure.findById(id);
      if (!closure) continue;

      // Restore reservations if requested
      if (restoreReservations && closure.affectedReservations?.length > 0) {
        for (const affected of closure.affectedReservations) {
          try {
            const reservation = await Reservation.findById(affected.reservationId);
            if (reservation && reservation.status === "Cancelled") {
              // Check if the original time slot is still available
              const conflictExists = await Reservation.findOne({
                _id: { $ne: reservation._id },
                roomName: reservation.roomName,
                date: reservation.date,
                status: { $in: ["Approved", "Ongoing", "Pending"] },
                datetime: { $lt: reservation.endDatetime },
                endDatetime: { $gt: reservation.datetime }
              });

              if (!conflictExists) {
                reservation.status = "Pending";
                reservation.cancellationReason = undefined;
                reservation.cancelledBy = undefined;
                reservation.cancelledAt = undefined;
                await reservation.save();
                restoredReservations.push(reservation);
              }
            }
          } catch (err) {
            console.warn(`⚠️ Failed to restore reservation ${affected.reservationId}:`, err.message);
          }
        }
      }

      await Closure.findByIdAndDelete(id);
      deletedCount++;
    }

    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} closures. ${restoredReservations.length} reservations were restored.`,
      count: deletedCount,
      restoredReservations: restoredReservations.length > 0 ? restoredReservations : undefined
    });

  } catch (err) {
    console.error("Error bulk deleting closures:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete closures",
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

    // Update statuses first to ensure accuracy
    await updateClosureStatuses({}, {});

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
   ✅ GET AVAILABILITY WITH CLOSURES
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

    // Update statuses first
    await updateClosureStatuses({}, {});

    // Get all rooms
    const Room = mongoose.model("Room");
    const rooms = await Room.find({}).sort({ floor: 1, room: 1 });

    // Get all reservations for this date
    const reservations = await Reservation.find({
      date,
      status: { $in: ["Pending", "Approved", "Ongoing"] }
    });

    // Get all active closures for this date
    const closures = await Closure.find({
      date,
      status: "Active"
    });

    // Build availability data
    const availability = rooms.map((room) => {
      const roomReservations = reservations.filter(
        r => r.location === room.floor && r.roomName === room.room
      );

      const roomClosures = closures.filter(c => 
        c.affectedAllRooms || c.affectedRooms.includes(room.room)
      );

      const occupied = roomReservations.map((r) => ({
        start: r.datetime,
        end: r.endDatetime,
        mine: userId && r.userId.toString() === userId,
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
    
    // Update statuses first
    await updateClosureStatuses({}, {});
    
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