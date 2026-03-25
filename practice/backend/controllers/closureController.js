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

// Helper: Check if a scheduled closure should be activated
function shouldActivateClosure(closure) {
  const now = new Date();
  const closureDate = new Date(closure.date);
  const [startHours, startMinutes] = closure.startTime.split(":").map(Number);
  closureDate.setHours(startHours, startMinutes, 0, 0);
  
  return now >= closureDate;
}

// Helper: Update expired closures (internal function, no req/res)
async function updateExpiredClosures() {
  try {
    console.log("🔄 Updating closure statuses...");
    
    const activeClosures = await Closure.find({ status: "Active" });
    
    let updatedCount = 0;
    const expiredClosures = [];
    
    for (const closure of activeClosures) {
      if (isClosureExpired(closure)) {
        closure.status = "Expired";
        closure.endedAt = new Date();
        closure.endedBy = "System";
        closure.endedReason = "Automatic expiration";
        await closure.save();
        updatedCount++;
        expiredClosures.push(closure);
        
        console.log(`✅ Closure "${closure.title}" has expired automatically`);
        
        try {
          const admins = await Admin.find({});
          for (const admin of admins) {
            if (admin.email) {
              sendEmail({
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
              }).catch(err => console.warn("Email send error:", err.message));
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
    
    return { updatedCount, expiredClosures };
    
  } catch (err) {
    console.error("❌ Error updating closure statuses:", err);
    return { updatedCount: 0, expiredClosures: [], error: err.message };
  }
}

// Helper: Auto-activate scheduled closures
async function activateScheduledClosures() {
  try {
    console.log("🔄 Checking for scheduled closures to activate...");
    
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    
    // Find all scheduled closures with date <= today
    const scheduledClosures = await Closure.find({ 
      status: "Scheduled",
      date: { $lte: today }
    });
    
    let activatedCount = 0;
    const activatedClosures = [];
    
    for (const closure of scheduledClosures) {
      if (shouldActivateClosure(closure)) {
        // Check for overlapping active closures
        const overlappingClosures = await Closure.find({
          _id: { $ne: closure._id },
          date: closure.date,
          status: "Active",
          $or: [
            {
              startTime: { $lt: closure.endTime },
              endTime: { $gt: closure.startTime }
            }
          ]
        });
        
        if (overlappingClosures.length > 0) {
          console.log(`⚠️ Cannot auto-activate "${closure.title}" - overlapping with active closure`);
          continue;
        }
        
        // Activate the closure
        closure.status = "Active";
        closure.activatedAt = new Date();
        closure.activatedBy = null;
        closure.activatedByName = "System (Auto)";
        await closure.save();
        
        activatedCount++;
        activatedClosures.push(closure);
        
        console.log(`✅ Closure "${closure.title}" activated automatically`);
        
        // Find and cancel conflicting reservations
        const conflictQuery = {
          date: closure.date,
          status: { $in: ["Pending", "Approved", "Ongoing"] }
        };
        
        if (!closure.affectedAllRooms && closure.affectedRooms?.length > 0) {
          conflictQuery.roomName = { $in: closure.affectedRooms };
        }
        
        const conflictingReservations = await Reservation.find(conflictQuery)
          .populate("userId", "name email id_number");
        
        const startTimeMinutes = timeToMinutes(closure.startTime);
        const endTimeMinutes = timeToMinutes(closure.endTime);
        const affectedList = [];
        
        for (const reservation of conflictingReservations) {
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
            affectedList.push(reservation);
            
            reservation.status = "Cancelled";
            reservation.cancellationReason = `Cancelled due to facility closure activation: ${closure.title} - ${closure.reason}`;
            reservation.cancelledBy = "System";
            reservation.cancelledAt = new Date();
            await reservation.save();
            
            try {
              if (reservation.userId?.email) {
                sendEmail({
                  to: reservation.userId.email,
                  subject: "Reservation Cancelled Due to Facility Closure",
                  html: `
                    <h2>Reservation Cancelled</h2>
                    <p>Dear ${reservation.userId.name || "User"},</p>
                    <p>Your reservation has been cancelled due to a facility closure:</p>
                    <ul>
                      <li><strong>Room:</strong> ${reservation.roomName}</li>
                      <li><strong>Date:</strong> ${reservation.date}</li>
                      <li><strong>Time:</strong> ${resStartTime} - ${resEndTime}</li>
                      <li><strong>Closure:</strong> ${closure.title}</li>
                      <li><strong>Reason:</strong> ${closure.reason}</li>
                    </ul>
                    <p>We apologize for any inconvenience.</p>
                  `
                }).catch(err => console.warn("Email send error:", err.message));
              }
            } catch (emailError) {
              console.warn("⚠️ Failed to send cancellation email:", emailError.message);
            }
          }
        }
        
        // Update affected reservations in closure
        closure.affectedReservations = affectedList.map(r => ({
          reservationId: r._id,
          userId: r.userId?._id,
          roomName: r.roomName,
          date: r.date,
          startTime: r.datetime ? new Date(r.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : r.time,
          endTime: r.endDatetime ? new Date(r.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : r.endTime,
          cancelledAt: new Date()
        }));
        
        await closure.save();
        
        console.log(`   Cancelled ${affectedList.length} reservations`);
      }
    }
    
    if (activatedCount > 0) {
      console.log(`📊 Activated ${activatedCount} scheduled closures`);
    }
    
    return { activatedCount, activatedClosures };
    
  } catch (err) {
    console.error("❌ Error activating scheduled closures:", err);
    return { activatedCount: 0, activatedClosures: [], error: err.message };
  }
}

/* ------------------------------------------------
   ✅ UPDATE CLOSURE STATUSES (API ENDPOINT)
------------------------------------------------ */
export const updateClosureStatuses = async (req, res) => {
  try {
    // Update expired closures
    const expiredResult = await updateExpiredClosures();
    // Activate scheduled closures
    const activatedResult = await activateScheduledClosures();
    
    res.json({
      success: true,
      message: `Updated ${expiredResult.updatedCount} closures to expired, activated ${activatedResult.activatedCount} scheduled closures`,
      updatedCount: expiredResult.updatedCount,
      activatedCount: activatedResult.activatedCount,
      expiredClosures: expiredResult.expiredClosures.map(c => ({ id: c._id, title: c.title })),
      activatedClosures: activatedResult.activatedClosures.map(c => ({ id: c._id, title: c.title }))
    });
    
  } catch (err) {
    console.error("❌ Error in updateClosureStatuses:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update closure statuses",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/* ------------------------------------------------
   ✅ ACTIVATE CLOSURE (MANUAL)
------------------------------------------------ */
export const activateClosure = async (req, res) => {
  try {
    const { id } = req.params;
    const { activateNow } = req.body;

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

    if (closure.status === "Active") {
      return res.status(400).json({
        success: false,
        message: "Closure is already active"
      });
    }

    if (closure.status === "Expired") {
      return res.status(400).json({
        success: false,
        message: "Cannot activate an expired closure. Please create a new one."
      });
    }

    const now = new Date();
    const closureDate = new Date(closure.date);
    const [startHours, startMinutes] = closure.startTime.split(":").map(Number);
    closureDate.setHours(startHours, startMinutes, 0, 0);

    if (!activateNow && now < closureDate) {
      closure.status = "Scheduled";
      closure.activatedAt = null;
      closure.activatedBy = null;
      await closure.save();
      
      return res.json({
        success: true,
        message: "Closure has been scheduled for activation at the specified date and time",
        closure
      });
    }

    // Check for overlapping active closures
    const overlappingClosures = await Closure.find({
      _id: { $ne: id },
      date: closure.date,
      status: "Active",
      $or: [
        {
          startTime: { $lt: closure.endTime },
          endTime: { $gt: closure.startTime }
        }
      ]
    });

    if (overlappingClosures.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot activate: There is already an active closure during this time period",
        overlappingClosures: overlappingClosures.map(c => ({
          title: c.title,
          time: `${c.startTime} - ${c.endTime}`,
          rooms: c.affectedAllRooms ? "All Rooms" : c.affectedRooms.join(", ")
        }))
      });
    }

    closure.status = "Active";
    closure.activatedAt = new Date();
    closure.activatedBy = req.admin?._id || null;
    closure.activatedByName = req.admin?.name || "System";
    await closure.save();

    console.log(`✅ Closure "${closure.title}" activated manually by ${req.admin?.name || "System"}`);

    const conflictQuery = {
      date: closure.date,
      status: { $in: ["Pending", "Approved", "Ongoing"] }
    };

    if (!closure.affectedAllRooms && closure.affectedRooms?.length > 0) {
      conflictQuery.roomName = { $in: closure.affectedRooms };
    }

    const conflictingReservations = await Reservation.find(conflictQuery)
      .populate("userId", "name email id_number");

    const startTimeMinutes = timeToMinutes(closure.startTime);
    const endTimeMinutes = timeToMinutes(closure.endTime);
    const affectedReservationsList = [];

    for (const reservation of conflictingReservations) {
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
        affectedReservationsList.push(reservation);
        
        reservation.status = "Cancelled";
        reservation.cancellationReason = `Cancelled due to facility closure activation: ${closure.title} - ${closure.reason}`;
        reservation.cancelledBy = "Admin";
        reservation.cancelledAt = new Date();
        await reservation.save();
        
        try {
          if (reservation.userId?.email) {
            sendEmail({
              to: reservation.userId.email,
              subject: "Reservation Cancelled Due to Facility Closure",
              html: `
                <h2>Reservation Cancelled</h2>
                <p>Dear ${reservation.userId.name || "User"},</p>
                <p>Your reservation has been cancelled due to a facility closure:</p>
                <ul>
                  <li><strong>Room:</strong> ${reservation.roomName}</li>
                  <li><strong>Date:</strong> ${reservation.date}</li>
                  <li><strong>Time:</strong> ${resStartTime} - ${resEndTime}</li>
                  <li><strong>Closure:</strong> ${closure.title}</li>
                  <li><strong>Reason:</strong> ${closure.reason}</li>
                </ul>
                <p>We apologize for any inconvenience.</p>
              `
            }).catch(err => console.warn("Email send error:", err.message));
          }
        } catch (emailError) {
          console.warn("⚠️ Failed to send cancellation email:", emailError.message);
        }
      }
    }

    closure.affectedReservations = affectedReservationsList.map(r => ({
      reservationId: r._id,
      userId: r.userId?._id,
      roomName: r.roomName,
      date: r.date,
      startTime: r.datetime ? new Date(r.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : r.time,
      endTime: r.endDatetime ? new Date(r.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : r.endTime,
      cancelledAt: new Date()
    }));
    
    await closure.save();

    res.json({
      success: true,
      message: `Closure activated successfully. ${affectedReservationsList.length} reservations were cancelled.`,
      closure,
      cancelledReservations: affectedReservationsList.length
    });

  } catch (err) {
    console.error("❌ Error activating closure:", err);
    res.status(500).json({
      success: false,
      message: "Failed to activate closure",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/* ------------------------------------------------
   ✅ DEACTIVATE CLOSURE (MANUAL)
------------------------------------------------ */
export const deactivateClosure = async (req, res) => {
  try {
    const { id } = req.params;
    const { restoreReservations, reason } = req.body;

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

    if (closure.status === "Deactivated") {
      return res.status(400).json({
        success: false,
        message: "Closure is already deactivated"
      });
    }

    if (closure.status === "Expired") {
      return res.status(400).json({
        success: false,
        message: "Closure is already expired"
      });
    }

    const previousStatus = closure.status;
    
    closure.status = "Deactivated";
    closure.deactivatedAt = new Date();
    closure.deactivatedBy = req.admin?._id || null;
    closure.deactivatedByName = req.admin?.name || "System";
    closure.deactivatedReason = reason || "Manually deactivated by admin";
    await closure.save();

    console.log(`⏸️ Closure "${closure.title}" deactivated manually by ${req.admin?.name || "System"}`);

    const restoredReservations = [];
    if (restoreReservations && closure.affectedReservations?.length > 0) {
      for (const affected of closure.affectedReservations) {
        try {
          const reservation = await Reservation.findById(affected.reservationId);
          if (reservation && reservation.status === "Cancelled") {
            const conflictExists = await Reservation.findOne({
              _id: { $ne: reservation._id },
              roomName: reservation.roomName,
              date: reservation.date,
              status: { $in: ["Approved", "Ongoing", "Pending"] },
              $or: [
                {
                  datetime: { $lt: reservation.endDatetime },
                  endDatetime: { $gt: reservation.datetime }
                }
              ]
            });

            if (!conflictExists) {
              reservation.status = "Pending";
              reservation.cancellationReason = undefined;
              reservation.cancelledBy = undefined;
              reservation.cancelledAt = undefined;
              await reservation.save();
              restoredReservations.push(reservation);
              
              try {
                if (reservation.userId?.email) {
                  sendEmail({
                    to: reservation.userId.email,
                    subject: "Reservation Restored",
                    html: `
                      <h2>Reservation Restored</h2>
                      <p>Dear ${reservation.userId.name || "User"},</p>
                      <p>Your previously cancelled reservation has been restored:</p>
                      <ul>
                        <li><strong>Room:</strong> ${reservation.roomName}</li>
                        <li><strong>Date:</strong> ${reservation.date}</li>
                        <li><strong>Time:</strong> ${affected.startTime} - ${affected.endTime}</li>
                      </ul>
                      <p>The facility closure that caused the cancellation has been deactivated.</p>
                      <p>Please review your reservation status in your dashboard.</p>
                    `
                  }).catch(err => console.warn("Email send error:", err.message));
                }
              } catch (emailError) {
                console.warn("⚠️ Failed to send restoration email:", emailError.message);
              }
            }
          }
        } catch (err) {
          console.warn(`⚠️ Failed to restore reservation ${affected.reservationId}:`, err.message);
        }
      }
    }

    res.json({
      success: true,
      message: `Closure deactivated successfully. ${restoredReservations.length} reservations were restored.`,
      closure,
      restoredReservations: restoredReservations.length,
      previousStatus
    });

  } catch (err) {
    console.error("❌ Error deactivating closure:", err);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate closure",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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

    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Date, startTime, and endTime are required"
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: "End time must be after start time"
      });
    }

    const conflictQuery = {
      date: date,
      status: { $in: ["Pending", "Approved", "Ongoing"] }
    };

    if (!affectedAllRooms && affectedRooms && affectedRooms.length > 0) {
      conflictQuery.roomName = { $in: affectedRooms };
    }

    const conflictingReservations = await Reservation.find(conflictQuery)
      .populate("userId", "name email id_number");

    const affectedReservationsList = [];
    const startTimeMinutes = timeToMinutes(startTime);
    const endTimeMinutes = timeToMinutes(endTime);

    for (const reservation of conflictingReservations) {
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
      location,
      status
    } = req.body;

    console.log("=".repeat(50));
    console.log("📝 CREATING CLOSURE");
    console.log("=".repeat(50));
    console.log("Request body:", req.body);

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

    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: "End time must be after start time"
      });
    }

    if (!affectedAllRooms && (!affectedRooms || affectedRooms.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one room or choose 'All Rooms'"
      });
    }

    // FIX: Properly determine initial status based on current time and closure start time
    let initialStatus = status || "Scheduled";
    
    // Get current time in Asia/Manila timezone
    const now = new Date();
    const philippinesTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    
    // Parse the closure date and time
    const [year, month, day] = date.split("-");
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    
    // Create a Date object for the closure start time in Asia/Manila
    const closureStartDateTime = new Date(year, month - 1, day, startHours, startMinutes, 0, 0);
    
    // If no status provided, determine based on current time vs closure start time
    if (!status) {
      // Compare dates (considering timezone)
      if (philippinesTime >= closureStartDateTime) {
        // If current time is at or after the closure start time, activate immediately
        initialStatus = "Active";
        console.log(`⏰ Closure start time ${startTime} on ${date} has passed or is now. Setting status to ACTIVE`);
      } else {
        // If closure start time is in the future, schedule it
        initialStatus = "Scheduled";
        console.log(`⏰ Closure start time ${startTime} on ${date} is in the future. Setting status to SCHEDULED`);
      }
    }
    
    console.log(`Current time (Philippines): ${philippinesTime.toISOString()}`);
    console.log(`Closure start time: ${closureStartDateTime.toISOString()}`);
    console.log(`Initial status determined: ${initialStatus}`);

    // Check for overlapping active closures only if we're setting to Active
    if (initialStatus === "Active") {
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
    }

    let affectedReservationsList = [];
    if (initialStatus === "Active") {
      const conflictQuery = {
        date: date,
        status: { $in: ["Pending", "Approved", "Ongoing"] }
      };

      if (!affectedAllRooms && affectedRooms && affectedRooms.length > 0) {
        conflictQuery.roomName = { $in: affectedRooms };
      }

      const conflictingReservations = await Reservation.find(conflictQuery)
        .populate("userId", "name email id_number");

      const startTimeMinutes = timeToMinutes(startTime);
      const endTimeMinutes = timeToMinutes(endTime);

      for (const reservation of conflictingReservations) {
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
    }

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
        endTime: r.endTime,
        cancelledAt: new Date()
      })),
      status: initialStatus,
      activatedAt: initialStatus === "Active" ? new Date() : null,
      activatedBy: initialStatus === "Active" ? (admin?._id || null) : null,
      activatedByName: initialStatus === "Active" ? (admin?.name || "System") : null
    };

    const closure = await Closure.create(closureData);

    const processedReservations = [];
    const failedReservations = [];

    if (initialStatus === "Active") {
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
            
            try {
              if (updatedReservation.userId?.email) {
                sendEmail({
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
                }).catch(err => console.warn("Email send error:", err.message));
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
    }

    console.log("=".repeat(50));
    console.log(`✅ CLOSURE CREATED SUCCESSFULLY with status: ${initialStatus}`);
    console.log(`Affected: ${processedReservations.length} reservations`);
    console.log("=".repeat(50));

    res.status(201).json({
      success: true,
      message: `Closure created successfully with status: ${initialStatus}. ${processedReservations.length} reservations were automatically cancelled.`,
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
    console.log("=== GET CLOSURES CALLED ===");
    console.log("Query params:", req.query);
    
    const {
      page = 1,
      limit = 20,
      status = "All",
      search
    } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } },
        { createdByAdminName: { $regex: search, $options: 'i' } }
      ];
    }

    console.log("MongoDB Query:", JSON.stringify(query, null, 2));

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = await Closure.countDocuments(query);
    
    console.log("Total count:", totalCount);

    const closures = await Closure.find(query)
      .populate("createdBy", "name email")
      .sort({ date: -1, startTime: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`Found ${closures.length} closures`);

    // Auto-update statuses asynchronously (don't await to avoid delay)
    updateExpiredClosures().catch(err => console.error("Auto-update error:", err));
    activateScheduledClosures().catch(err => console.error("Auto-activate error:", err));

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
    console.error("❌ Error fetching closures:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({
      success: false,
      message: "Failed to fetch closures",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/* ------------------------------------------------
   ✅ GET SINGLE CLOSURE BY ID
------------------------------------------------ */
export const getClosureById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("=== GET CLOSURE BY ID ===");
    console.log("ID:", id);

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
    console.error("❌ Error fetching closure:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({
      success: false,
      message: "Failed to fetch closure",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
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

    if (closure.status === "Expired") {
      return res.status(400).json({
        success: false,
        message: "Cannot edit an expired closure"
      });
    }

    if (title) closure.title = title;
    if (reason) closure.reason = reason;
    if (date) closure.date = date;
    if (startTime) closure.startTime = startTime;
    if (endTime) closure.endTime = endTime;
    if (affectedRooms) closure.affectedRooms = affectedRooms;
    if (affectedAllRooms !== undefined) closure.affectedAllRooms = affectedAllRooms;
    if (location) closure.location = location;
    if (status && status !== closure.status && status !== "Expired") {
      closure.status = status;
    }

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

    const restoredReservations = [];
    if (restoreReservations && closure.affectedReservations?.length > 0) {
      for (const affected of closure.affectedReservations) {
        try {
          const reservation = await Reservation.findById(affected.reservationId);
          if (reservation && reservation.status === "Cancelled") {
            const conflictExists = await Reservation.findOne({
              _id: { $ne: reservation._id },
              roomName: reservation.roomName,
              date: reservation.date,
              status: { $in: ["Approved", "Ongoing", "Pending"] },
              $or: [
                {
                  datetime: { $lt: reservation.endDatetime },
                  endDatetime: { $gt: reservation.datetime }
                }
              ]
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

      if (restoreReservations && closure.affectedReservations?.length > 0) {
        for (const affected of closure.affectedReservations) {
          try {
            const reservation = await Reservation.findById(affected.reservationId);
            if (reservation && reservation.status === "Cancelled") {
              const conflictExists = await Reservation.findOne({
                _id: { $ne: reservation._id },
                roomName: reservation.roomName,
                date: reservation.date,
                status: { $in: ["Approved", "Ongoing", "Pending"] },
                $or: [
                  {
                    datetime: { $lt: reservation.endDatetime },
                    endDatetime: { $gt: reservation.datetime }
                  }
                ]
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

    updateExpiredClosures().catch(err => console.error("Auto-update error:", err));
    activateScheduledClosures().catch(err => console.error("Auto-activate error:", err));

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

    updateExpiredClosures().catch(err => console.error("Auto-update error:", err));
    activateScheduledClosures().catch(err => console.error("Auto-activate error:", err));

    const Room = mongoose.model("Room");
    const rooms = await Room.find({}).sort({ floor: 1, room: 1 });

    const reservations = await Reservation.find({
      date,
      status: { $in: ["Pending", "Approved", "Ongoing"] }
    });

    const closures = await Closure.find({
      date,
      status: "Active"
    });

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
    
    updateExpiredClosures().catch(err => console.error("Auto-update error:", err));
    activateScheduledClosures().catch(err => console.error("Auto-activate error:", err));
    
    const closures = await Closure.find({
      date: { $gte: today },
      status: { $in: ["Active", "Scheduled"] }
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
   ✅ GET CLOSURE STATISTICS
------------------------------------------------ */
export const getClosureStats = async (req, res) => {
  try {
    const stats = {
      total: await Closure.countDocuments(),
      active: await Closure.countDocuments({ status: "Active" }),
      scheduled: await Closure.countDocuments({ status: "Scheduled" }),
      deactivated: await Closure.countDocuments({ status: "Deactivated" }),
      expired: await Closure.countDocuments({ status: "Expired" }),
      byType: {
        allRooms: await Closure.countDocuments({ affectedAllRooms: true }),
        specificRooms: await Closure.countDocuments({ affectedAllRooms: false })
      }
    };

    const closures = await Closure.find({});
    let totalAffected = 0;
    for (const closure of closures) {
      totalAffected += closure.affectedReservations?.length || 0;
    }
    stats.totalAffectedReservations = totalAffected;

    res.json({
      success: true,
      stats
    });

  } catch (err) {
    console.error("Error fetching closure stats:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: err.message
    });
  }
};