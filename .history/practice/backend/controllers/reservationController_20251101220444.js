// controllers/reservationController.js
const mongoose = require("mongoose");

const Reservation = require("../models/Reservation");
const Notification = require("../models/Notification");
const ArchivedReservation = require("../models/ArchivedReservation");
const User = require("../models/User");
const Room = require("../models/Room");
const sendEmail = require("../utils/sendEmail");
const logAction = require("../utils/logAction");
const generateReservationEmail = require("../utils/generateReservationEmail");
const availabilityService = require("../services/availabilityService");
const Admin = require("../models/Admin");
const notificationService = require("../services/notificationService");

/* ------------------------------------------------
   ✅ CHECK USER RESERVATION LIMIT
------------------------------------------------ */
exports.checkUserReservationLimit = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date, time, asMain } = req.query;

    if (!date || !time) {
      return res.status(400).json({ blocked: true, reason: "Date and time are required." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ blocked: true, reason: "User not found." });

    // Calculate selected range
    const selectedStart = new Date(`${date}T${time}:00.000Z`);
    const selectedEnd = new Date(selectedStart.getTime() + 60 * 60 * 1000);

    // Check conflicts (main + participant)
    const conflictingReservations = await Reservation.find({
      status: { $in: ["Approved", "Pending"] },
      $or: [{ userId }, { "participants.id_number": user.id_number }],
      datetime: { $lt: selectedEnd },
      endDatetime: { $gt: selectedStart }
    });

    if (conflictingReservations.length > 0) {
      return res.json({ blocked: true, reason: "You already have a conflicting reservation during this time." });
    }

    // Weekly limit check (only for main user)
    if (asMain === "true") {
      const weekStart = new Date(selectedStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const mainReservations = await Reservation.find({
        userId,
        status: { $in: ["Approved", "Pending"] },
        datetime: { $gte: weekStart, $lte: weekEnd }
      });

      const reservedDays = new Set(mainReservations.map(r => new Date(r.datetime).toISOString().split("T")[0]));
      if (reservedDays.has(date)) return res.json({ blocked: true, reason: "You already have a reservation on this day." });
      if (reservedDays.size >= 2) return res.json({ blocked: true, reason: "You already used your 2 reservation days this week." });
    }

    res.json({ blocked: false });
  } catch (err) {
    console.error("Reservation limit check error:", err);
    res.status(500).json({ blocked: true, reason: err.message });
  }
};

// controllers/reservationController.js

/* ------------------------------------------------
   ✅ FLOOR ACCESS VALIDATION UTILITIES (IMPROVED)
------------------------------------------------ */
const validateFloorAccess = (user, floor) => {
  try {
    // Validate input parameters
    if (!user || !floor) {
      console.log('❌ Missing user or floor parameter');
      return false;
    }

    const normalizedFloor = floor.toString().toLowerCase().trim();
    const userDepartment = user.department?.toString().toLowerCase() || '';
    const userCourse = user.course?.toString().toLowerCase() || '';
    const userProgram = user.program?.toString().toLowerCase() || '';

    console.log(`🔍 Validating floor access:`, {
      floor: normalizedFloor,
      userDepartment,
      userCourse,
      userProgram
    });

    // Ground Floor: Only Graduate students (Master's/Doctoral)
    if (normalizedFloor.includes('ground')) {
      const hasAccess = userProgram.includes('master') || 
                       userProgram.includes('doctoral') || 
                       userProgram.includes('graduate') ||
                       userCourse.includes('master') || 
                       userCourse.includes('doctoral') ||
                       userCourse.includes('graduate') ||
                       userCourse.includes('mba') ||
                       userCourse.includes('mpa') ||
                       userCourse.includes('magc') ||
                       userCourse.includes('mars') ||
                       userCourse.includes('maed');
      console.log(`🔐 Ground floor access for ${user.name}:`, hasAccess);
      return hasAccess;
    }

    // 2nd Floor: Only College of Law (COL) students
    if (normalizedFloor.includes('2nd') || normalizedFloor.includes('second')) {
      const hasAccess = userDepartment.includes('law') || 
                       userCourse.includes('law') ||
                       userDepartment.includes('col') || 
                       userCourse.includes('col');
      console.log(`🔐 2nd floor access for ${user.name}:`, hasAccess);
      return hasAccess;
    }

    // 4th & 5th Floors: All students can access
    if (normalizedFloor.includes('4th') || normalizedFloor.includes('fourth') ||
        normalizedFloor.includes('5th') || normalizedFloor.includes('fifth')) {
      console.log(`🔐 4th/5th floor access for ${user.name}:`, true);
      return true;
    }

    // Default: Allow access if no specific restriction
    console.log(`🔐 Default access for ${user.name}:`, true);
    return true;
  } catch (error) {
    console.error('❌ Error in validateFloorAccess:', error);
    return false; // Fail safe - deny access on error
  }
};

const getFloorRestrictionMessage = (floor) => {
  try {
    if (!floor) return "Floor information is missing.";
    
    const normalizedFloor = floor.toString().toLowerCase().trim();
    
    if (normalizedFloor.includes('ground')) {
      return "Ground Floor is restricted to Graduate students (Master's/Doctoral programs) only.";
    }
    
    if (normalizedFloor.includes('2nd') || normalizedFloor.includes('second')) {
      return "2nd Floor is restricted to College of Law (COL) students only.";
    }
    
    return "This floor has access restrictions.";
  } catch (error) {
    console.error('❌ Error in getFloorRestrictionMessage:', error);
    return "Access restriction check failed.";
  }
};

// ✅ FIXED: Export the floor access validation function
exports.validateFloorAccess = async (req, res) => {
  try {
    console.log('🔍 Floor access validation request received:', {
      body: req.body,
      headers: req.headers
    });

    const { location, participantIds } = req.body;

    // Validate required fields
    if (!location) {
      console.log('❌ Missing location');
      return res.status(400).json({ 
        valid: false, 
        message: "Location is required." 
      });
    }

    if (!participantIds || !Array.isArray(participantIds)) {
      console.log('❌ Invalid participantIds:', participantIds);
      return res.status(400).json({ 
        valid: false, 
        message: "Participant IDs array is required." 
      });
    }

    // Filter out empty IDs
    const validParticipantIds = participantIds.filter(id => id && id.toString().trim() !== "");
    
    console.log('📋 Processing validation for:', {
      location,
      validParticipantIds,
      originalParticipantIds: participantIds
    });

    if (validParticipantIds.length === 0) {
      console.log('✅ No participants to validate');
      return res.json({
        valid: true,
        validParticipants: [],
        invalidParticipants: [],
        restrictionMessage: null
      });
    }

    const invalidParticipants = [];
    const validParticipants = [];

    // ✅ FIXED: Process each participant with proper error handling
    for (const participantId of validParticipantIds) {
      try {
        console.log('🔍 Looking up participant by ID number:', participantId);
        
        // ✅ FIXED: Only search by id_number field with proper sanitization
        const cleanId = participantId.toString().trim();
        const participantUser = await User.findOne({ 
          id_number: cleanId
        });

        if (!participantUser) {
          console.log('❌ Participant not found with ID number:', cleanId);
          invalidParticipants.push({
            identifier: cleanId,
            reason: "User not found in database"
          });
          continue;
        }

        console.log('✅ Found participant:', {
          name: participantUser.name,
          id_number: participantUser.id_number,
          department: participantUser.department,
          course: participantUser.course,
          program: participantUser.program,
          verified: participantUser.verified
        });

        // ✅ Check if participant is verified
        if (!participantUser.verified) {
          invalidParticipants.push({
            name: participantUser.name,
            id_number: participantUser.id_number,
            department: participantUser.department,
            course: participantUser.course,
            reason: "User account is not verified"
          });
          continue;
        }

        // Validate floor access
        const hasAccess = validateFloorAccess(participantUser, location);
        console.log(`🔐 Floor access for ${participantUser.name}:`, hasAccess);

        if (!hasAccess) {
          invalidParticipants.push({
            name: participantUser.name,
            id_number: participantUser.id_number,
            department: participantUser.department,
            course: participantUser.course,
            reason: `Does not have access to ${location}. ${getFloorRestrictionMessage(location)}`
          });
        } else {
          validParticipants.push({
            name: participantUser.name,
            id_number: participantUser.id_number,
            department: participantUser.department,
            course: participantUser.course
          });
        }
      } catch (userError) {
        console.error('❌ Error processing participant:', participantId, userError);
        invalidParticipants.push({
          identifier: participantId,
          reason: "Database error - " + userError.message
        });
      }
    }

    const result = {
      valid: invalidParticipants.length === 0,
      validParticipants,
      invalidParticipants,
      restrictionMessage: invalidParticipants.length > 0 ? getFloorRestrictionMessage(location) : null
    };

    console.log('✅ Floor access validation result:', result);
    res.json(result);

  } catch (err) {
    console.error("❌ Floor access validation error:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      valid: false, 
      message: "Internal server error during validation.",
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

/* ------------------------------------------------
   ✅ GET RESERVATIONS
------------------------------------------------ */
exports.getAllReservations = async (req, res) => {
  try {
    const { userId } = req.query;
    let query = {};

    if (userId) {
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role === "Staff" && user.floor && user.floor !== "N/A") {
        const normalizeFloor = (floorName) => {
          if (!floorName) return "";
          const normalized = floorName.toLowerCase().trim();
          
          if (normalized.includes("2nd") || normalized.includes("second")) return "2nd Floor";
          if (normalized.includes("3rd") || normalized.includes("third")) return "3rd Floor";
          if (normalized.includes("4th") || normalizedized.includes("fourth")) return "4th Floor";
          if (normalized.includes("5th") || normalized.includes("fifth")) return "5th Floor";
          
          return floorName;
        };

        const normalizedStaffFloor = normalizeFloor(user.floor);
        
        query.location = { 
          $regex: normalizedStaffFloor.replace(" Floor", "").trim(), 
          $options: "i" 
        };
      }
    }

    // FIXED: Only populate fields that exist in the schema
    const reservations = await Reservation.find(query)
      .populate("userId")
      .sort({ datetime: -1 });

    res.json(reservations);
  } catch (err) {
    console.error("Error fetching reservations:", err);
    res.status(500).json({ message: "Failed to fetch reservations" });
  }
};

exports.getUserReservations = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const reservations = await Reservation.find({
      $or: [
        { userId: req.params.userId },
        { "participants.id_number": user.id_number }
      ]
    })
    .populate("userId")
    .sort({ datetime: -1 });

    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch reservations." });
  }
};

exports.getActiveReservation = async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const reservation = await Reservation.findOne({
      userId: req.params.userId,
      status: { $in: ["Pending", "Approved", "Ongoing"] },
      endDatetime: { $gte: new Date() },
      $or: [
        { status: { $nin: ["Rejected", "Expired"] } },
        { 
          status: { $in: ["Rejected", "Expired"] },
          createdAt: { $gte: twentyFourHoursAgo }
        }
      ]
    })
    .populate("userId")
    .sort({ datetime: 1 });
    
    res.json(reservation || null);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch active reservation" });
  }
};

/* ------------------------------------------------
   ✅ CREATE RESERVATION (WITH FLOOR ACCESS VALIDATION) - FIXED PARTICIPANT COUNT
------------------------------------------------ */
exports.createReservation = async (req, res) => {
  try {
    const {
      userId,
      room_Id,
      date,
      time,
      location,
      roomName,
      purpose,
      participants, // This should include ALL participants including main reserver
      datetime,
      numUsers
    } = req.body;

    if (!userId || !date || !datetime || !location || !roomName || !purpose)
      return res.status(400).json({ message: "Missing required fields." });

    const parsedDatetime = new Date(datetime);
    const endDatetime = new Date(parsedDatetime.getTime() + 60 * 60 * 1000);

    // ✅ RULE: Reservation must be booked at least 1 day in advance
    const now = new Date();
    const minAllowed = new Date();
    minAllowed.setDate(minAllowed.getDate() + 1);
    minAllowed.setHours(0, 0, 0, 0);
    if (parsedDatetime < minAllowed) {
      return res.status(400).json({
        message: "Reservations must be made at least 1 day in advance."
      });
    }

    // ✅ Get main user FIRST
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!user.verified)
      return res.status(400).json({ message: "Main user account is not verified." });

    // ✅ FIXED: numUsers represents TOTAL group size (including main reserver)
    const totalParticipantsCount = participants?.length || 0;
    const totalGroupSize = parseInt(numUsers); // numUsers is total including main reserver

    console.log('🔍 Group size validation:', {
      totalGroupSize,
      totalParticipantsCount,
      expectedTotal: totalGroupSize,
      participants: participants?.map(p => ({ name: p.name, id_number: p.id_number }))
    });

    // Validate total group size is between 4-8
    if (totalGroupSize < 4 || totalGroupSize > 8) {
      return res.status(400).json({
        message: "Total group size must be between 4 and 8 users (including main reserver)."
      });
    }

    // ✅ FIXED: The participants array should contain exactly totalGroupSize participants (including main reserver)
    if (totalParticipantsCount !== totalGroupSize) {
      return res.status(400).json({
        message: `Participant count mismatch. Expected ${totalGroupSize} total participants (including main reserver), but found ${totalParticipantsCount}. Please refresh the page and try again.`
      });
    }

    // ✅ FIXED: Check that the main reserver is included in the participants array
    const mainReserverInParticipants = participants.some(p => 
      p.id_number && p.id_number.toString() === user.id_number.toString()
    );

    if (!mainReserverInParticipants) {
      console.log('❌ Main reserver not found in participants:', {
        mainReserverId: user.id_number,
        participants: participants?.map(p => p.id_number)
      });
      return res.status(400).json({
        message: "Main reserver must be included in the participants array."
      });
    }

    console.log('✅ Main reserver found in participants');

    // ✅ FLOOR ACCESS VALIDATION: Check main reserver first
    if (!validateFloorAccess(user, location)) {
      return res.status(400).json({
        message: `Main reserver (${user.name}) does not have access to ${location}. ${getFloorRestrictionMessage(location)}`
      });
    }

    // ✅ Check overlapping reservations for room
    const conflictingReservation = await Reservation.findOne({
      roomName,
      location,
      status: { $in: ["Approved", "Ongoing"] },
      datetime: { $lt: endDatetime },
      endDatetime: { $gt: parsedDatetime }
    });
    if (conflictingReservation)
      return res.status(400).json({ message: "This room is already booked for this time." });

 // ✅ Daily limit: 2 reservations per day (no weekly limit)
const reservationsToday = await Reservation.countDocuments({
  userId,
  date: date, // This comes from req.body.date
  status: { $in: ["Pending", "Approved", "Ongoing"] }
});

if (reservationsToday >= 2) {
  return res.status(400).json({ 
    message: "You can only make 2 reservations per day." 
  });
}

    // ✅ Validate participants & collect emails + FLOOR ACCESS VALIDATION
    const enrichedParticipants = [];
    const invalidParticipants = [];

    for (const participant of participants) {
      let participantUser = null;
      if (participant.id_number) {
        participantUser = await User.findOne({ id_number: participant.id_number });
      }
      if (!participantUser && participant.name) {
        participantUser = await User.findOne({ name: participant.name });
      }

      if (!participantUser) {
        return res.status(400).json({ message: `Participant ${participant.name} not found.` });
      }
      if (!participantUser.verified) {
        return res.status(400).json({ message: `Participant ${participantUser.name} is not verified.` });
      }

      // ✅ FLOOR ACCESS VALIDATION: Check participant eligibility
      if (!validateFloorAccess(participantUser, location)) {
        invalidParticipants.push({
          name: participantUser.name,
          id_number: participantUser.id_number,
          department: participantUser.department,
          course: participantUser.course
        });
        continue; // Continue to check all participants for comprehensive error reporting
      }

      // ✅ FIXED: Skip conflict check for main reserver (they're already checked above)
      if (participantUser.id_number !== user.id_number) {
        const conflicts = await Reservation.find({
          $or: [
            { userId: participantUser._id },
            { "participants.id_number": participantUser.id_number }
          ],
          datetime: { $lt: endDatetime },
          endDatetime: { $gt: parsedDatetime },
          status: { $in: ["Pending", "Approved", "Ongoing"] }
        });
        if (conflicts.length > 0)
          return res.status(400).json({ message: `Participant ${participantUser.name} has a conflicting reservation.` });
      }

      enrichedParticipants.push({
        id_number: participantUser.id_number,
        name: participantUser.name,
        course: participantUser.course || "N/A",
        year_level: participantUser.yearLevel || "N/A",
        department: participantUser.department || "N/A"
      });
    }

    // ✅ Check if any participants failed floor access validation
    if (invalidParticipants.length > 0) {
      const invalidNames = invalidParticipants.map(p => p.name).join(', ');
      return res.status(400).json({
        message: `The following participants do not have access to ${location}: ${invalidNames}. ${getFloorRestrictionMessage(location)}`,
        invalidParticipants: invalidParticipants,
        restriction: getFloorRestrictionMessage(location)
      });
    }

    // ✅ Ensure we have enough valid participants after validation
    if (enrichedParticipants.length !== participants.length) {
      return res.status(400).json({
        message: "Some participants could not be validated for floor access."
      });
    }

    // ✅ Create reservation
    const reservation = await Reservation.create({
      userId,
      room_Id,
      date,
      datetime: parsedDatetime,
      endDatetime,
      numUsers: totalGroupSize, // This should be total including main reserver
      purpose,
      location,
      roomName,
      participants: enrichedParticipants,
      status: "Pending",
      expireAt: new Date(parsedDatetime.getTime() + 15 * 60 * 1000)
    });

    // ✅ Log reservation creation
    await logAction(
      userId,
      user.id_number,
      user.name,
      "Reservation Created",
      `Created reservation for ${roomName} on ${date} at ${time} with ${totalGroupSize} participants`
    );

    // ✅ NOTIFY USER (Main reserver)
    await notificationService.createNotification(
      {
        userId,
        reservationId: reservation._id,
        type: "reservation",
        status: "pending",
        targetRole: "user",
        roomName,
        date,
        startTime: time,
        endTime: new Date(endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      req.app.get("io")
    );

    // ✅ NOTIFY PARTICIPANTS - FIXED VERSION
    console.log('🔔 Creating notifications for participants:', enrichedParticipants.length);
    for (const participant of enrichedParticipants) {
      // Skip if this is the main user
      if (participant.id_number === user.id_number) {
        console.log('⏭️ Skipping main user for participant notification');
        continue;
      }
      
      console.log('🔍 Looking up participant for notification:', {
        id_number: participant.id_number,
        name: participant.name
      });

      // Find participant user by id_number
      const participantUser = await User.findOne({ 
        id_number: participant.id_number.toString().trim()
      });

      if (participantUser) {
        console.log('✅ Found participant user for notification:', {
          name: participantUser.name,
          userId: participantUser._id,
          email: participantUser.email
        });

        try {
          const participantMessage = `You have been added as a participant to a reservation for ${roomName} on ${date} at ${time} by ${user.name}`;
          
          await notificationService.createNotification(
            {
              userId: participantUser._id,
              message: participantMessage,
              reservationId: reservation._id,
              type: "reservation",
              status: "participant_added", 
              targetRole: "user",
              roomName,
              date,
              startTime: time,
              endTime: new Date(endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            },
            req.app.get("io")
          );
          
          console.log('✅ Notification created for participant:', participantUser.name);
        } catch (notifError) {
          console.error('❌ Failed to create notification for participant:', participantUser.name, notifError);
        }
      } else {
        console.warn('⚠️ Participant user not found for notification:', {
          id_number: participant.id_number,
          name: participant.name
        });
      }
    }

    // ✅ NOTIFY ADMIN
    await notificationService.createNotification(
      {
        reservationId: reservation._id,
        type: "reservation",
        status: "new",
        targetRole: "admin",
        userName: user.name,
        roomName,
        date,
        startTime: time,
        endTime: new Date(endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      req.app.get("io")
    );

    // ✅ Send email to main reserver
    await sendEmail({
      to: user.email,
      subject: "Reservation Pending",
      html: generateReservationEmail({
        status: "Pending",
        toName: user.name,
        reservation,
        formattedDate: date,
        time,
        participants: enrichedParticipants
      })
    });

    // ✅ FIXED: Send email to participants
    for (const participant of enrichedParticipants) {
      // Skip if this is the main user
      if (participant.id_number === user.id_number) continue;
      
      console.log('🔍 Looking up participant for email:', {
        id_number: participant.id_number,
        name: participant.name
      });

      // Find participant user by id_number
      const participantUser = await User.findOne({ 
        id_number: participant.id_number.toString().trim()
      });

      if (participantUser && participantUser.email) {
        console.log('📧 Sending email to participant:', {
          name: participantUser.name,
          email: participantUser.email
        });

        try {
          await sendEmail({
            to: participantUser.email,
            subject: "You have been added as a participant",
            html: generateReservationEmail({
              status: "Pending",
              toName: participantUser.name, // Use the name from user record
              reservation,
              formattedDate: date,
              time,
              participants: enrichedParticipants,
              isParticipant: true
            })
          });
          console.log('✅ Email sent to participant:', participantUser.name);
        } catch (emailError) {
          console.warn('⚠️ Failed to send email to participant:', participantUser.name, emailError.message);
        }
      } else {
        console.warn('⚠️ Participant user not found or no email:', {
          id_number: participant.id_number,
          name: participant.name,
          found: !!participantUser,
          hasEmail: participantUser?.email
        });
      }
    }

    res.status(201).json(reservation);
  } catch (err) {
    console.error("Reservation creation error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};
/* ------------------------------------------------
   ✅ UPDATE / CANCEL RESERVATION
------------------------------------------------ */
exports.updateReservationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["Pending", "Approved", "Rejected", "Cancelled", "Ongoing", "Expired"];
    if (!allowedStatuses.includes(status))
      return res.status(400).json({ message: "Invalid status." });

    // ✅ PREVENT APPROVING EXPIRED RESERVATIONS
    if (status === "Approved") {
      const reservationToApprove = await Reservation.findById(req.params.id);
      if (!reservationToApprove) return res.status(404).json({ message: "Reservation not found." });
      
      const now = new Date();
      if (reservationToApprove.endDatetime <= now) {
        return res.status(400).json({ 
          message: "Cannot approve this reservation - the scheduled time has already passed." 
        });
      }
    }

    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("userId");
    if (!reservation) return res.status(404).json({ message: "Reservation not found." });

    // ✅ Log reservation status update
    await logAction(
      reservation.userId._id,
      reservation.userId.id_number,
      reservation.userId.name,
      "Reservation Status Updated",
      `Reservation for ${reservation.roomName} changed to ${status}`
    );

    // ✅ CREATE NOTIFICATION
    await notificationService.createNotification(
      {
        userId: reservation.userId._id,
        reservationId: reservation._id,
        type: "reservation",
        status: status.toLowerCase(),
        targetRole: "user",
        roomName: reservation.roomName,
        date: reservation.date,
        startTime: new Date(reservation.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        endTime: new Date(reservation.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      req.app.get("io")
    );

    // ✅ Send emails
    try {
      const emailHtml = generateReservationEmail({
        status,
        toName: reservation.userId.name,
        reservation,
        formattedDate: reservation.date,
        time: `${new Date(reservation.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(reservation.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        participants: reservation.participants
      });

      // 📧 Send to main user
      if (reservation.userId.email) {
        await sendEmail({
          to: reservation.userId.email,
          subject: `Reservation ${status}`,
          html: emailHtml
        });
      }

      // ✅ FIXED: Send to participants
      for (const participant of reservation.participants) {
        if (participant.id_number === reservation.userId.id_number) continue;
        
        const participantUser = await User.findOne({ 
          id_number: participant.id_number.toString().trim()
        });
        
        if (participantUser?.email) {
          try {
            await sendEmail({
              to: participantUser.email,
              subject: `Reservation ${status}`,
              html: generateReservationEmail({
                status,
                toName: participantUser.name, // Use name from user record
                reservation,
                formattedDate: reservation.date,
                time: `${new Date(reservation.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(reservation.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                participants: reservation.participants,
                isParticipant: true
              })
            });
            console.log('✅ Status email sent to participant:', participantUser.name);
          } catch (emailError) {
            console.warn('⚠️ Failed to send status email to participant:', participantUser.name, emailError.message);
          }
        }
      }
    } catch (emailErr) {
      console.warn("⚠️ Failed to send status email:", emailErr.message);
    }

    res.status(200).json(reservation);
  } catch (err) {
    console.error("Error updating reservation status:", err);
    res.status(500).json({ message: "Failed to update reservation." });
  }
};

exports.cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate("userId");
    if (!reservation) return res.status(404).json({ message: "Reservation not found." });

    reservation.status = "Cancelled";
    await reservation.save();

    // ✅ Log reservation cancellation
    await logAction(
      reservation.userId._id,
      reservation.userId.id_number,
      reservation.userId.name,
      "Reservation Cancelled",
      `Cancelled reservation for ${reservation.roomName}`
    );

    // ✅ CREATE NOTIFICATION
    await notificationService.createNotification(
      {
        userId: reservation.userId._id,
        reservationId: reservation._id,
        type: "reservation",
        status: "cancelled",
        targetRole: "user",
        roomName: reservation.roomName
      },
      req.app.get("io")
    );

    // ✅ Send email to main user
    try {
      await sendEmail({
        to: reservation.userId.email,
        subject: "Reservation Cancelled",
        html: generateReservationEmail({
          status: "Cancelled",
          toName: reservation.userId.name,
          reservation,
          formattedDate: reservation.date,
          time: `${new Date(reservation.datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          participants: reservation.participants
        })
      });

      // ✅ FIXED: Send email to participants
      for (const participant of reservation.participants) {
        if (participant.id_number === reservation.userId.id_number) continue;
        
        const participantUser = await User.findOne({ 
          id_number: participant.id_number.toString().trim()
        });
        
        if (participantUser?.email) {
          try {
            await sendEmail({
              to: participantUser.email,
              subject: "Reservation Cancelled",
              html: generateReservationEmail({
                status: "Cancelled",
                toName: participantUser.name, // Use name from user record
                reservation,
                formattedDate: reservation.date,
                time: `${new Date(reservation.datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
                participants: reservation.participants,
                isParticipant: true
              })
            });
            console.log('✅ Cancellation email sent to participant:', participantUser.name);
          } catch (emailError) {
            console.warn('⚠️ Failed to send cancellation email to participant:', participantUser.name, emailError.message);
          }
        }
      }
    } catch (emailErr) {
      console.warn("⚠️ Failed to send cancellation email:", emailErr.message);
    }

    res.json({ message: "Reservation cancelled successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to cancel reservation." });
  }
};

/* ------------------------------------------------
   ✅ GET PARTICIPANTS DETAILS
------------------------------------------------ */
exports.getParticipantsDetails = async (req, res) => {
  try {
    const { reservationId } = req.params;
    
    if (!reservationId) {
      return res.status(400).json({ message: "Reservation ID is required" });
    }

    const reservation = await Reservation.findById(reservationId)
      .populate("userId", "name email id_number course year_level department");
    
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    // Get details for all participants
    const participantsDetails = await Promise.all(
      reservation.participants.map(async (participant) => {
        const user = await User.findOne({ id_number: participant.id_number });
        return {
          id_number: participant.id_number,
          name: participant.name,
          course: participant.course || user?.course || "N/A",
          year_level: participant.year_level || user?.yearLevel || "N/A",
          department: participant.department || user?.department || "N/A",
          email: user?.email || "N/A"
        };
      })
    );

    res.json({
      mainUser: {
        id_number: reservation.userId.id_number,
        name: reservation.userId.name,
        course: reservation.userId.course || "N/A",
        year_level: reservation.userId.yearLevel || "N/A",
        department: reservation.userId.department || "N/A",
        email: reservation.userId.email
      },
      participants: participantsDetails
    });
  } catch (err) {
    console.error("Error fetching participants details:", err);
    res.status(500).json({ message: "Failed to fetch participants details" });
  }
};

/* ------------------------------------------------
   ✅ START RESERVATION (NO TIME RESTRICTIONS FOR TESTING)
------------------------------------------------ */
exports.startReservation = async (req, res) => {
  try {
    console.log("🔄 Starting reservation with ID:", req.params.id);
    
    const reservation = await Reservation.findById(req.params.id).populate("userId");

    if (!reservation) {
      console.log("❌ Reservation not found");
      return res.status(404).json({ message: "Reservation not found" });
    }

    console.log(`📋 Reservation details:`, {
      id: reservation._id,
      status: reservation.status,
      roomName: reservation.roomName,
      roomId: reservation.roomId,
      userId: reservation.userId?._id
    });

    // Check if reservation is approved
    if (reservation.status !== "Approved") {
      console.log(`❌ Reservation not approved. Current status: ${reservation.status}`);
      return res.status(400).json({ 
        message: `Reservation must be approved to start. Current status: ${reservation.status}` 
      });
    }

    // NO TIME RESTRICTIONS FOR TESTING - can start anytime
    const now = new Date();
    
    console.log(`⏰ Current time:`, now);
    console.log(`📅 Reservation datetime:`, reservation.datetime);
    console.log(`🔚 Reservation end datetime:`, reservation.endDatetime);

    // Check if reservation hasn't expired (but allow starting even if expired for testing)
    if (now > new Date(reservation.endDatetime)) {
      console.log(`⚠️ Reservation would normally be expired, but allowing for testing`);
      // Don't block - just log warning
    }

    // Update reservation status - use findByIdAndUpdate to avoid validation issues
    console.log(`💾 Updating reservation status...`);
    
    const updatedReservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { 
        status: "Ongoing",
        actualStartTime: now
      },
      { 
        new: true, 
        runValidators: false // Skip validation to avoid roomId requirement
      }
    ).populate("userId");
    
    console.log(`✅ Reservation updated successfully`);

    // ✅ Log reservation start
    try {
      await logAction(
        updatedReservation.userId._id,
        updatedReservation.userId.id_number,
        updatedReservation.userId.name,
        "Reservation Started",
        `Started reservation for ${updatedReservation.roomName}`
      );
      console.log(`📝 Log action completed`);
    } catch (logError) {
      console.warn("⚠️ Failed to log action:", logError.message);
    }

    // ✅ CREATE NOTIFICATION
    try {
      await notificationService.createNotification(
        {
          userId: updatedReservation.userId._id,
          reservationId: updatedReservation._id,
          type: "reservation",
          status: "ongoing",
          targetRole: "user",
          roomName: updatedReservation.roomName
        },
        req.app.get("io")
      );
      console.log(`🔔 Notification created`);
    } catch (notifError) {
      console.warn("⚠️ Failed to create notification:", notifError.message);
    }

    console.log(`🎉 Reservation started successfully!`);
    res.json(updatedReservation);
    
  } catch (err) {
    console.error("❌ Error starting reservation:", err);
    console.error("❌ Error stack:", err.stack);
    res.status(500).json({ 
      message: "Failed to start reservation",
      error: err.message 
    });
  }
};

/* ------------------------------------------------
   ✅ END RESERVATION EARLY (FIXED)
------------------------------------------------ */
exports.endReservationEarly = async (req, res) => {
  try {
    console.log("🔄 Ending reservation early with ID:", req.params.id);
    
    const reservation = await Reservation.findById(req.params.id).populate("userId");

    if (!reservation) {
      console.log("❌ Reservation not found");
      return res.status(404).json({ 
        success: false,
        message: "Reservation not found" 
      });
    }

    console.log(`📋 Reservation details:`, {
      id: reservation._id,
      status: reservation.status,
      roomName: reservation.roomName,
      userId: reservation.userId?._id
    });

    // Check if reservation is ongoing
    if (reservation.status !== "Ongoing") {
      console.log(`❌ Reservation not ongoing. Current status: ${reservation.status}`);
      return res.status(400).json({ 
        success: false,
        message: "Only ongoing reservations can be ended early",
        currentStatus: reservation.status 
      });
    }

    console.log(`✅ Reservation can be ended early`);

    // Update using findByIdAndUpdate to avoid validation issues
    const updatedReservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { 
        status: "Completed",
        actualEndTime: new Date()
      },
      { 
        new: true, 
        runValidators: false // Skip validation
      }
    ).populate("userId");
    
    console.log(`✅ Reservation status updated to Completed`);

    // ✅ Log reservation end
    try {
      await logAction(
        updatedReservation.userId._id,
        updatedReservation.userId.id_number,
        updatedReservation.userId.name,
        "Reservation Ended Early",
        `Ended reservation early for ${updatedReservation.roomName}`
      );
      console.log(`📝 Log action completed`);
    } catch (logError) {
      console.warn("⚠️ Failed to log action:", logError.message);
    }

    // ✅ CREATE NOTIFICATION
    try {
      await notificationService.createNotification(
        {
          userId: updatedReservation.userId._id,
          reservationId: updatedReservation._id,
          type: "reservation",
          status: "completed",
          targetRole: "user",
          roomName: updatedReservation.roomName
        },
        req.app.get("io")
      );
      console.log(`🔔 Notification created`);
    } catch (notifError) {
      console.warn("⚠️ Failed to create notification:", notifError.message);
    }

    console.log(`🎉 Reservation ended early successfully!`);
    
    res.json({
      success: true,
      message: "Reservation ended early successfully",
      reservation: updatedReservation
    });
    
  } catch (err) {
    console.error("❌ Error ending reservation:", err);
    console.error("❌ Error stack:", err.stack);
    res.status(500).json({ 
      success: false,
      message: "Failed to end reservation",
      error: err.message 
    });
  }
};

/* ------------------------------------------------
   ✅ REQUEST TIME EXTENSION
------------------------------------------------ */
exports.requestExtension = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      extensionReason, 
      extensionType = "continuous" 
    } = req.body;

    console.log('🔄 Requesting continuous extension for reservation:', id);
    console.log('📦 Request data:', req.body);

    // Find the reservation and make sure all required fields are populated
    const reservation = await Reservation.findById(id);
    
    if (!reservation) {
      return res.status(404).json({ 
        error: "Reservation not found" 
      });
    }

    console.log('📋 Current reservation data:', {
      roomId: reservation.roomId,
      status: reservation.status,
      endDatetime: reservation.endDatetime
    });

    // Check if reservation can be extended
    if (reservation.status !== 'Approved' && reservation.status !== 'Ongoing') {
      return res.status(400).json({ 
        error: "Only approved or ongoing reservations can be extended" 
      });
    }

    // Check for existing extension request
    if (reservation.extensionRequested && reservation.extensionStatus === "Pending") {
      return res.status(400).json({ 
        error: "Extension request already pending" 
      });
    }

    // Find next reservation to determine maximum extension time
    const nextReservation = await Reservation.findOne({
      roomId: reservation.roomId,
      datetime: { $gt: reservation.endDatetime },
      status: { $in: ["Approved", "Pending"] },
      _id: { $ne: reservation._id }
    }).sort({ datetime: 1 });

    let maxExtendedEndDatetime = null;
    let conflictTime = null;

    if (nextReservation) {
      // Set maximum extension to 15 minutes before next reservation
      maxExtendedEndDatetime = new Date(nextReservation.datetime.getTime() - 15 * 60 * 1000);
      conflictTime = maxExtendedEndDatetime;
      console.log('⏰ Next reservation found, max extension until:', maxExtendedEndDatetime);
    } else {
      // No next reservation - set maximum to 2 hours from current end
      maxExtendedEndDatetime = new Date(reservation.endDatetime.getTime() + 2 * 60 * 60 * 1000);
      console.log('✅ No conflicts, max extension until:', maxExtendedEndDatetime);
    }

    // For continuous extension, set extendedEndDatetime to max possible
    const extendedEndDatetime = maxExtendedEndDatetime;

    // Use findByIdAndUpdate instead of direct modification to avoid validation issues
    const updateData = {
      extensionRequested: true,
      extensionStatus: "Pending",
      extensionType: "continuous",
      extendedEndDatetime: extendedEndDatetime,
      maxExtendedEndDatetime: maxExtendedEndDatetime,
      extensionReason: extensionReason,
      extensionMinutes: 0,
      extensionHours: 0
    };

    console.log('📝 Update data:', updateData);

    const updatedReservation = await Reservation.findByIdAndUpdate(
      id,
      { $set: updateData },
      { 
        new: true,
        runValidators: true 
      }
    );

    console.log('✅ Continuous extension requested successfully:', updatedReservation._id);
    
    res.json({
      success: true,
      message: "Continuous extension requested successfully",
      reservation: updatedReservation,
      conflictTime: conflictTime
    });

  } catch (error) {
    console.error("❌ Error requesting continuous extension:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message 
    });
  }
};

/* ------------------------------------------------
   ✅ HANDLE EXTENSION REQUEST
------------------------------------------------ */
exports.handleExtension = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // "approve" or "reject"

    console.log(`🔄 Handling extension ${action} for reservation:`, id);

    // Find the reservation
    const reservation = await Reservation.findById(id);
    
    if (!reservation) {
      return res.status(404).json({ 
        error: "Reservation not found" 
      });
    }

    // Check if there's a pending extension request
    if (!reservation.extensionRequested || reservation.extensionStatus !== "Pending") {
      return res.status(400).json({ 
        error: "No pending extension request found" 
      });
    }

    let updateData = {};
    
    if (action === "approve") {
      // Approve the extension
      updateData = {
        extensionStatus: "Approved",
        // Update the end datetime to the extended time
        endDatetime: reservation.extendedEndDatetime || reservation.endDatetime
      };
      
      console.log('✅ Extension approved for reservation:', reservation._id);
      
    } else if (action === "reject") {
      // Reject the extension - reset extension fields but KEEP extensionRequested as true
      // This allows frontend to detect rejected extensions with hasRejectedExtension
      updateData = {
        extensionStatus: "Rejected",
        extensionRequested: true, // Keep as true to show rejection status
        extendedEndDatetime: null,
        maxExtendedEndDatetime: null,
        extensionReason: "",
        extensionMinutes: 0,
        extensionHours: 0
      };
      
      console.log('❌ Extension rejected for reservation:', reservation._id);
      
    } else {
      return res.status(400).json({ 
        error: "Invalid action. Use 'approve' or 'reject'" 
      });
    }

    // Use findByIdAndUpdate to avoid validation issues with roomId
    const updatedReservation = await Reservation.findByIdAndUpdate(
      id,
      { $set: updateData },
      { 
        new: true,
        runValidators: false // Skip validation to avoid roomId requirement
      }
    );

    if (!updatedReservation) {
      return res.status(404).json({ 
        error: "Reservation not found after update" 
      });
    }

    // ✅ Log the extension action
    try {
      await logAction(
        updatedReservation.userId,
        updatedReservation.userId?.id_number || "N/A",
        updatedReservation.userId?.name || "N/A",
        `Extension ${action === "approve" ? "Approved" : "Rejected"}`,
        `Extension ${action === "approve" ? "approved" : "rejected"} for reservation in ${updatedReservation.roomName}`
      );
    } catch (logError) {
      console.warn("⚠️ Failed to log extension action:", logError.message);
    }

    // ✅ CREATE NOTIFICATION
    try {
      await notificationService.createNotification(
        {
          userId: updatedReservation.userId,
          reservationId: updatedReservation._id,
          type: "extension",
          status: action === "approve" ? "approved" : "rejected",
          targetRole: "user",
          roomName: updatedReservation.roomName
        },
        req.app.get("io")
      );
    } catch (notifError) {
      console.warn("⚠️ Failed to create notification:", notifError.message);
    }

    res.json({
      success: true,
      message: `Extension ${action}ed successfully`,
      reservation: updatedReservation
    });

  } catch (error) {
    console.error("❌ Error handling extension:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message 
    });
  }
};



/* ------------------------------------------------
   ✅ ARCHIVE / RESTORE
------------------------------------------------ */
exports.archiveReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate("userId");
    if (!reservation) return res.status(404).json({ message: "Reservation not found" });

    await ArchivedReservation.create({ ...reservation.toObject(), archivedAt: new Date() });
    await Reservation.findByIdAndDelete(req.params.id);

    await logAction(
      reservation.userId._id,
      reservation.userId.id_number,
      reservation.userId.name,
      "Reservation Archived",
      `Archived reservation for ${reservation.roomName}`
    );

    res.json({ message: "Reservation archived successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to archive reservation" });
  }
};

exports.getArchivedReservations = async (req, res) => {
  try {
    const archived = await ArchivedReservation.find().populate("userId");
    res.json(archived);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch archived reservations" });
  }
};

exports.restoreReservation = async (req, res) => {
  try {
    const archived = await ArchivedReservation.findById(req.params.id).populate("userId");
    if (!archived) return res.status(404).json({ message: "Not found in archive" });

    const restoredData = archived.toObject();
    delete restoredData._id;

    if (!restoredData.date && restoredData.datetime) {
      restoredData.date = new Date(restoredData.datetime).toISOString().split("T")[0];
    }

    const restoredReservation = new Reservation(restoredData);
    await restoredReservation.save();
    await ArchivedReservation.findByIdAndDelete(req.params.id);

    await logAction(
      archived.userId._id,
      archived.userId.id_number,
      archived.userId.name,
      "Reservation Restored",
      `Restored archived reservation for ${archived.roomName}`
    );

    res.json({ message: "Reservation restored", restoredReservation });
  } catch (err) {
    res.status(500).json({ message: "Failed to restore reservation" });
  }
};

exports.deleteArchivedReservation = async (req, res) => {
  try {
    const archived = await ArchivedReservation.findById(req.params.id).populate("userId");
    if (!archived) return res.status(404).json({ message: "Archived reservation not found." });

    await ArchivedReservation.findByIdAndDelete(req.params.id);

    await logAction(
      archived.userId._id,
      archived.userId.id_number,
      archived.userId.name,
      "Archived Reservation Deleted",
      `Permanently deleted archived reservation for ${archived.roomName}`
    );

    res.json({ message: "Archived reservation permanently deleted." });
  } catch (err) {
    console.error("Delete archived reservation error:", err);
    res.status(500).json({ message: "Failed to delete reservation." });
  }
};

exports.generateAvailability = async (date, userId) => {
  try {
    const rooms = await Room.find({ isActive: true }).sort({ floor: 1, room: 1 });

    const reservations = await Reservation.find({
      date,
      status: { $in: ["Pending", "Approved"] },
    });

    const availability = rooms.map((room) => {
      const roomReservations = reservations.filter(
        (r) => r.location === room.floor && r.roomName === room.room
      );

      const occupied = roomReservations.map((r) => ({
        start: r.datetime,
        end: r.endDatetime,
        mine: r.userId.toString() === userId,
        status: r.status,
      }));

      return {
        floor: room.floor,
        room: room.room,
        occupied,
      };
    });

    return availability;
  } catch (error) {
    console.error("Error generating availability:", error);
    throw error;
  }
};

/* ------------------------------------------------
   ✅ AVAILABILITY - FIXED: REMOVE INACTIVE ROOM FILTER
------------------------------------------------ */
exports.generateAvailability = async (date, userId) => {
  try {
    // ✅ FIXED: Remove isActive filter to include all rooms
    const rooms = await Room.find({}).sort({ floor: 1, room: 1 });

    const reservations = await Reservation.find({
      date,
      status: { $in: ["Pending", "Approved"] },
    });

    const availability = rooms.map((room) => {
      const roomReservations = reservations.filter(
        (r) => r.location === room.floor && r.roomName === room.room
      );

      const occupied = roomReservations.map((r) => ({
        start: r.datetime,
        end: r.endDatetime,
        mine: r.userId.toString() === userId,
        status: r.status,
      }));

      return {
        floor: room.floor,
        room: room.room,
        occupied,
        isActive: room.isActive // ✅ Include active status for frontend filtering
      };
    });

    return availability;
  } catch (error) {
    console.error("Error generating availability:", error);
    throw error;
  }
};

// ✅ Availability route controller - UPDATED
exports.getAvailability = async (req, res) => {
  try {
    const { date, userId } = req.query;
    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const availability = await exports.generateAvailability(date, userId);
    res.json(availability);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch availability", error: error.message });
  }
};

/* ------------------------------------------------
   ✅ CHECK AND MARK EXPIRED RESERVATIONS + NOTIFY (FIXED FOR PENDING & APPROVED RESERVATIONS)
------------------------------------------------ */
exports.checkExpiredReservations = async (req, res) => {
  try {
    console.log("🔄 Running checkExpiredReservations...");
    const now = new Date();
    
    console.log(`⏰ Current time: ${now}`);
    console.log(`📅 Checking for reservations that should be expired...`);

    // FIXED: Include ALL reservations that are past their end time, regardless of status
    const expiringReservations = await Reservation.find({
      status: { $in: ["Pending", "Approved", "Ongoing"] },
      $or: [
        // ✅ FIXED: ANY reservation that has ended (endDatetime is in the past) 
        // - INCLUDES PENDING AND APPROVED that were approved too late!
        { endDatetime: { $lte: now } },
        // Reservations that never checked in within 15 minutes of start time
        { 
          datetime: { $lte: new Date(now.getTime() - 15 * 60 * 1000) }, 
          checkedIn: { $ne: true },
          status: { $in: ["Pending", "Approved"] }
        }
      ]
    }).populate("userId");

    console.log(`📊 Found ${expiringReservations.length} reservations to expire`);

    // Log each reservation being expired with details
    expiringReservations.forEach(reservation => {
      let reason = "";
      if (reservation.endDatetime <= now) {
        reason = `End time passed (${reservation.endDatetime}) - Status was: ${reservation.status}`;
        
        // Special message for late approvals
        if (reservation.status === "Approved") {
          reason += " - Approved too late, reservation time already passed";
        } else if (reservation.status === "Pending") {
          reason += " - Never approved, reservation time passed";
        }
      } else {
        reason = `No check-in within 15 minutes of start time (${reservation.datetime})`;
      }
      
      console.log(`❌ Expiring reservation:`, {
        id: reservation._id,
        room: reservation.roomName,
        date: reservation.date,
        start: reservation.datetime,
        end: reservation.endDatetime,
        status: reservation.status,
        reason: reason
      });
    });

    if (expiringReservations.length === 0) {
      console.log("✅ No reservations need to be expired at this time");
      return res.json({ message: "No reservations to expire." });
    }

    // Update all found reservations to Expired status
    const ids = expiringReservations.map(r => r._id);
    const updateResult = await Reservation.updateMany(
      { _id: { $in: ids } },
      { $set: { status: "Expired" } }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} reservations to Expired status`);

    const io = req.app.get("io");

    // Process notifications and emails for each expired reservation
    for (const reservation of expiringReservations) {
      let reason = "";
      if (reservation.endDatetime <= now) {
        if (reservation.status === "Approved") {
          reason = "was approved too late - the reservation time has already passed.";
        } else if (reservation.status === "Pending") {
          reason = "was never approved and the reservation time has passed.";
        } else {
          reason = "has ended.";
        }
      } else {
        reason = "was cancelled because no one checked in within 15 minutes.";
      }

      console.log(`📝 Processing expiration for: ${reservation.roomName} - ${reason}`);

      // ✅ Log reservation expiration
      try {
        await logAction(
          reservation.userId._id,
          reservation.userId.id_number,
          reservation.userId.name,
          "Reservation Expired",
          `Reservation for ${reservation.roomName} expired: ${reason} (Was ${reservation.status})`
        );
        console.log(`📋 Logged expiration action for ${reservation.userId.name}`);
      } catch (logError) {
        console.warn("⚠️ Failed to log action:", logError.message);
      }

      // ✅ CREATE NOTIFICATION
      try {
        await notificationService.createNotification(
          {
            userId: reservation.userId._id,
            reservationId: reservation._id,
            type: "reservation",
            status: "expired",
            targetRole: "user",
            roomName: reservation.roomName,
            extraNote: reason
          },
          io
        );
        console.log(`🔔 Created notification for ${reservation.userId.name}`);
      } catch (notifError) {
        console.warn("⚠️ Failed to create notification:", notifError.message);
      }

      // ✅ Send email to main reserver
      if (reservation.userId.email) {
        try {
          await sendEmail({
            to: reservation.userId.email,
            subject: "Reservation Expired",
            html: generateReservationEmail({
              status: "Expired",
              toName: reservation.userId.name,
              reservation,
              formattedDate: reservation.date,
              time: `${new Date(reservation.datetime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })} - ${new Date(reservation.endDatetime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}`,
              participants: reservation.participants,
              extraNote: reason,
            }),
          });
          console.log(`📧 Sent expiration email to main reserver: ${reservation.userId.email}`);
        } catch (emailErr) {
          console.warn("⚠️ Failed to send expiration email to main reserver:", emailErr.message);
        }
      }

      // ✅ Send expiration emails to participants
      for (const participant of reservation.participants) {
        if (participant.id_number === reservation.userId.id_number) continue;
        
        const participantUser = await User.findOne({ 
          id_number: participant.id_number.toString().trim()
        });

        if (participantUser?.email) {
          try {
            await sendEmail({
              to: participantUser.email,
              subject: "Reservation Expired",
              html: generateReservationEmail({
                status: "Expired",
                toName: participantUser.name,
                reservation,
                formattedDate: reservation.date,
                time: `${new Date(reservation.datetime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })} - ${new Date(reservation.endDatetime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`,
                participants: reservation.participants,
                isParticipant: true,
                extraNote: reason,
              }),
            });
            console.log(`📧 Sent expiration email to participant: ${participantUser.email}`);
          } catch (emailError) {
            console.warn('⚠️ Failed to send expiration email to participant:', participantUser.name, emailError.message);
          }
        }

        // Send real-time notification to participant
        if (io && participantUser) {
          try {
            io.to(participantUser._id.toString()).emit("notification", {
              message: `Reservation for ${reservation.roomName} ${reason}`,
              type: "reservation",
            });
            console.log(`🔔 Sent real-time notification to participant: ${participantUser.name}`);
          } catch (ioError) {
            console.warn('⚠️ Failed to send real-time notification to participant:', ioError.message);
          }
        }
      }
    }

    console.log(`🎉 Successfully expired ${expiringReservations.length} reservations`);
    res.json({ message: `${expiringReservations.length} reservations expired and notified.` });
    
  } catch (err) {
    console.error("❌ Error checking expired reservations:", err);
    console.error("❌ Error stack:", err.stack);
    res.status(500).json({ 
      message: "Failed to check expired reservations.",
      error: err.message 
    });
  }
};
exports.getReservationsByFloor = async (req, res) => {
  try {
    const floor = req.query.floor || req.params.floor;
    let query = {};
    if (floor) {
      query.location = floor;
    }

    const reservations = await Reservation.find(query)
      .populate("userId", "name email id_number department")
      .sort({ datetime: -1 });

    res.status(200).json(reservations);
  } catch (err) {
    console.error("Error fetching reservations by floor:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ------------------------------------------------
   ✅ GET SINGLE RESERVATION BY ID (FIXED)
------------------------------------------------ */
exports.getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 Fetching reservation by ID:', id);
    
    if (!id) {
      return res.status(400).json({ message: "Reservation ID is required" });
    }

    // ✅ ADD VALIDATION: Check if it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('❌ Invalid ObjectId format:', id);
      return res.status(400).json({ 
        message: "Invalid reservation ID format",
        details: "ID must be a 24-character hex string"
      });
    }

    const reservation = await Reservation.findById(id)
      .populate("userId", "name email id_number course year_level department")
      .lean();

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    // Get enriched participant details
    const enrichedParticipants = await Promise.all(
      reservation.participants.map(async (participant) => {
        const user = await User.findOne({ id_number: participant.id_number });
        return {
          id_number: participant.id_number,
          name: participant.name,
          course: participant.course || user?.course || "N/A",
          year_level: participant.year_level || user?.yearLevel || "N/A",
          department: participant.department || user?.department || "N/A",
          email: user?.email || "N/A"
        };
      })
    );

    const response = {
      ...reservation,
      participants: enrichedParticipants
    };

    console.log('✅ Successfully fetched reservation:', reservation._id);
    res.json(response);
  } catch (err) {
    console.error("❌ Error fetching reservation by ID:", err);
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        message: "Invalid reservation ID format",
        details: "ID must be a 24-character hex string"
      });
    }
    
    res.status(500).json({ 
      message: "Failed to fetch reservation details",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/* ------------------------------------------------
   ✅ GET AVAILABLE USERS FOR PARTICIPANT REPLACEMENT
------------------------------------------------ */
exports.getAvailableUsers = async (req, res) => {
  try {
    const { reservationId, searchTerm = '' } = req.query;
    
    if (!reservationId) {
      return res.status(400).json({ message: "Reservation ID is required" });
    }

    // Get the reservation to check current participants and time
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    // Find users that are not already in this reservation and match search term
    const currentParticipantIds = reservation.participants.map(p => p.id_number);
    currentParticipantIds.push(reservation.userId.id_number); // Exclude main reserver

    const searchFilter = searchTerm ? {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { id_number: { $regex: searchTerm, $options: 'i' } }
      ]
    } : {};

    const availableUsers = await User.find({
      ...searchFilter,
      id_number: { $nin: currentParticipantIds },
      verified: true
    }).select('name id_number course year_level department email').limit(20);

    res.json(availableUsers);
  } catch (err) {
    console.error("Error fetching available users:", err);
    res.status(500).json({ message: "Failed to fetch available users" });
  }
};

/* ------------------------------------------------
   ✅ REMOVE PARTICIPANT FROM RESERVATION
------------------------------------------------ */
exports.removeParticipant = async (req, res) => {
  try {
    const { reservationId, participantIdNumber } = req.body;

    if (!reservationId || !participantIdNumber) {
      return res.status(400).json({ message: "Reservation ID and participant ID number are required" });
    }

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    // Check if reservation can be modified
    if (!["Pending", "Approved"].includes(reservation.status)) {
      return res.status(400).json({ 
        message: "Cannot modify participants for a reservation that is not Pending or Approved" 
      });
    }

    // Find and remove the participant
    const participantIndex = reservation.participants.findIndex(
      p => p.id_number === participantIdNumber
    );

    if (participantIndex === -1) {
      return res.status(404).json({ message: "Participant not found in this reservation" });
    }

    const removedParticipant = reservation.participants[participantIndex];
    reservation.participants.splice(participantIndex, 1);

    await reservation.save();

    // ✅ Log participant removal
    await logAction(
      reservation.userId._id,
      reservation.userId.id_number,
      reservation.userId.name,
      "Participant Removed",
      `Removed participant ${removedParticipant.name} (${removedParticipant.id_number}) from reservation for ${reservation.roomName}`
    );

    // ✅ CREATE NOTIFICATION for removed participant
    const removedUser = await User.findOne({ id_number: participantIdNumber });
    if (removedUser) {
      await notificationService.createNotification(
        {
          userId: removedUser._id,
          reservationId: reservation._id,
          type: "participant",
          status: "removed",
          targetRole: "user",
          roomName: reservation.roomName,
          date: reservation.date,
          startTime: new Date(reservation.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          endTime: new Date(reservation.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          // Optional: Add a custom message to be more specific
          message: `You have been removed from the reservation for ${reservation.roomName} on ${reservation.date} at ${new Date(reservation.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        },
        req.app.get("io")
      );

      // Send email to removed participant
      try {
        await sendEmail({
          to: removedUser.email,
          subject: "Removed from Reservation",
          html: generateReservationEmail({
            status: "Removed",
            toName: removedUser.name,
            reservation,
            formattedDate: reservation.date,
            time: `${new Date(reservation.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(reservation.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            participants: reservation.participants,
            isParticipant: true,
            extraNote: "You have been removed from this reservation by the main reserver."
          })
        });
        console.log(`📧 Removal email sent to: ${removedUser.email}`);
      } catch (emailErr) {
        console.warn("⚠️ Failed to send removal email:", emailErr.message);
      }

      console.log(`✅ Notification sent to removed participant: ${removedUser.name}`);
    } else {
      console.warn(`⚠️ Removed participant user not found with ID: ${participantIdNumber}`);
    }

    res.json({
      success: true,
      message: "Participant removed successfully",
      reservation
    });

  } catch (err) {
    console.error("Error removing participant:", err);
    res.status(500).json({ message: "Failed to remove participant" });
  }
};

/* ------------------------------------------------
   ✅ ADD PARTICIPANT TO RESERVATION - FIXED VERSION
------------------------------------------------ */
exports.addParticipant = async (req, res) => {
  try {
    const { reservationId, participantIdNumber } = req.body;

    if (!reservationId || !participantIdNumber) {
      return res.status(400).json({ message: "Reservation ID and participant ID number are required" });
    }

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    // Check if reservation can be modified
    if (!["Pending", "Approved"].includes(reservation.status)) {
      return res.status(400).json({ 
        message: "Cannot modify participants for a reservation that is not Pending or Approved" 
      });
    }

    // ✅ FIXED: Use numUsers from reservation instead of hardcoding to 5
    const maxParticipants = reservation.numUsers || 4; // Total including main reserver
    const currentParticipantCount = reservation.participants.length; // Additional participants only
    
    // ✅ FIXED: Changed from < to <= to allow replacing removed participants
    const canAddMoreParticipants = currentParticipantCount <= (maxParticipants - 1);

    if (!canAddMoreParticipants) {
      return res.status(400).json({ 
        message: `Maximum group size reached (${maxParticipants} total including main reserver). Cannot add more participants.` 
      });
    }

    // Check if participant already exists
    const existingParticipant = reservation.participants.find(
      p => p.id_number === participantIdNumber
    );
    if (existingParticipant) {
      return res.status(400).json({ message: "Participant is already in this reservation" });
    }

    // Find the user to add
    const newParticipantUser = await User.findOne({ 
      id_number: participantIdNumber,
      verified: true 
    });
    if (!newParticipantUser) {
      return res.status(404).json({ message: "User not found or not verified" });
    }

    // Check floor access for new participant
    if (!validateFloorAccess(newParticipantUser, reservation.location)) {
      return res.status(400).json({
        message: `Participant ${newParticipantUser.name} does not have access to ${reservation.location}. ${getFloorRestrictionMessage(reservation.location)}`
      });
    }

    // Check for conflicting reservations for the new participant
    const conflictingReservations = await Reservation.find({
      $or: [
        { userId: newParticipantUser._id },
        { "participants.id_number": newParticipantUser.id_number }
      ],
      datetime: { $lt: reservation.endDatetime },
      endDatetime: { $gt: reservation.datetime },
      status: { $in: ["Pending", "Approved", "Ongoing"] },
      _id: { $ne: reservation._id }
    });

    if (conflictingReservations.length > 0) {
      return res.status(400).json({ 
        message: `Participant ${newParticipantUser.name} has a conflicting reservation during this time.` 
      });
    }

    // Add the participant
    const newParticipant = {
      id_number: newParticipantUser.id_number,
      name: newParticipantUser.name,
      course: newParticipantUser.course || "N/A",
      year_level: newParticipantUser.yearLevel || "N/A",
      department: newParticipantUser.department || "N/A"
    };

    reservation.participants.push(newParticipant);
    await reservation.save();

    // ✅ Log participant addition
    await logAction(
      reservation.userId._id,
      reservation.userId.id_number,
      reservation.userId.name,
      "Participant Added",
      `Added participant ${newParticipantUser.name} (${newParticipantUser.id_number}) to reservation for ${reservation.roomName}`
    );

    // ✅ CREATE NOTIFICATION for new participant
    await notificationService.createNotification(
      {
        userId: newParticipantUser._id,
        reservationId: reservation._id,
        type: "reservation",
        status: "participant_added",
        targetRole: "user",
        roomName: reservation.roomName,
        date: reservation.date,
        startTime: new Date(reservation.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        endTime: new Date(reservation.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        message: `You have been added as a participant to a reservation for ${reservation.roomName} on ${reservation.date} by ${reservation.userId.name}`
      },
      req.app.get("io")
    );

    // Send email to new participant
    try {
      await sendEmail({
        to: newParticipantUser.email,
        subject: "Added to Reservation",
        html: generateReservationEmail({
          status: "Added",
          toName: newParticipantUser.name,
          reservation,
          formattedDate: reservation.date,
          time: `${new Date(reservation.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(reservation.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          participants: reservation.participants,
          isParticipant: true,
          extraNote: "You have been added to this reservation by the main reserver."
        })
      });
    } catch (emailErr) {
      console.warn("⚠️ Failed to send addition email:", emailErr.message);
    }

    res.json({
      success: true,
      message: "Participant added successfully",
      reservation
    });

  } catch (err) {
    console.error("Error adding participant:", err);
    res.status(500).json({ message: "Failed to add participant" });
  }
};