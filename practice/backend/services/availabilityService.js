// services/availabilityService.js
import Room from "../models/Room.js";
import Reservation from "../models/Reservation.js";
import Closure from "../models/Closure.js";

export const generateAvailability = async (date, userId) => {
  try {
    console.log('🔄 Generating availability for:', { date, userId });
    
    // ✅ Get ALL rooms (including inactive ones)
    const rooms = await Room.find({}).sort({ floor: 1, room: 1 });
    console.log(`📋 Found ${rooms.length} total rooms`);

    // ✅ Parse the date properly and find reservations for the entire day
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // ✅ Fetch reservations for this date range
    const reservations = await Reservation.find({
      datetime: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ["Pending", "Approved", "Ongoing"] },
    })
    .populate('userId', 'name email')
    .populate('room_Id', 'room floor')
    .lean();

    console.log(`📅 Found ${reservations.length} reservations for date: ${date}`);

    // ✅ Fetch active closures for this date
    const closures = await Closure.find({
      date: date,
      status: "Active"
    }).lean();

    console.log(`🔒 Found ${closures.length} active closures for date: ${date}`);
    
    // Log closure details for debugging
    if (closures.length > 0) {
      console.log('Closure details:', closures.map(c => ({
        title: c.title,
        startTime: c.startTime,
        endTime: c.endTime,
        affectedAllFloors: c.affectedAllFloors,
        affectedFloors: c.affectedFloors
      })));
    }

    // ✅ Build availability for each room
    const availability = rooms.map((room) => {
      // For inactive rooms
      if (!room.isActive) {
        return {
          _id: room._id,
          floor: room.floor,
          room: room.room,
          isActive: false,
          occupied: [],
          pending: [],
          closedTimeSlots: [],
          isClosed: false,
          hasClosures: false,
          closureInfo: null
        };
      }

      // ✅ Check if room is affected by any closure
      // Use affectedFloors and affectedAllFloors (not affectedRooms/affectedAllRooms)
      const roomClosures = closures.filter(closure => {
        // Check if closure affects all floors
        if (closure.affectedAllFloors) {
          return true;
        }
        
        // Check if closure affects the specific floor of this room
        if (closure.affectedFloors && Array.isArray(closure.affectedFloors)) {
          // Normalize floor names for comparison
          const roomFloorNormalized = room.floor.toString().toLowerCase();
          const affectedFloorsNormalized = closure.affectedFloors.map(f => f.toString().toLowerCase());
          
          return affectedFloorsNormalized.includes(roomFloorNormalized);
        }
        
        return false;
      });
      
      // Check if room is fully closed for the entire day
      const isFullyClosed = roomClosures.some(closure => 
        closure.startTime === "00:00" && closure.endTime === "23:59"
      );
      
      // Check if room has any active closure at all
      const hasClosures = roomClosures.length > 0;
      
      // Get the most relevant closure info (the one that affects this room)
      const closureInfo = roomClosures.length > 0 ? {
        title: roomClosures[0].title,
        reason: roomClosures[0].reason,
        startTime: roomClosures[0].startTime,
        endTime: roomClosures[0].endTime,
        affectedAllFloors: roomClosures[0].affectedAllFloors,
        affectedFloors: roomClosures[0].affectedFloors,
        isFullyClosed: roomClosures[0].startTime === "00:00" && roomClosures[0].endTime === "23:59"
      } : null;

      // ✅ Filter reservations for this specific room
      const roomReservations = reservations.filter((reservation) => {
        const reservationRoomId = reservation.room_Id?._id?.toString();
        const reservationRoomName = reservation.room_Id?.room || reservation.roomName;
        const reservationFloor = reservation.room_Id?.floor || reservation.location;
        
        return (
          reservationRoomId === room._id.toString() ||
          (reservationRoomName && reservationRoomName === room.room) ||
          (reservationFloor && reservationFloor === room.floor && reservationRoomName === room.room)
        );
      });

      console.log(`🏠 Room ${room.room} (Floor ${room.floor}) has ${roomReservations.length} reservations, ${roomClosures.length} closures`);

      // ✅ Separate occupied (approved/ongoing) from pending
      const occupied = roomReservations
        .filter(r => r.status === "Approved" || r.status === "Ongoing")
        .map((r) => ({
          start: r.datetime,
          end: r.endDatetime || new Date(new Date(r.datetime).getTime() + 60 * 60 * 1000),
          reservationId: r._id,
          userName: r.userId?.name || 'Unknown User',
          status: r.status,
          mine: r.userId?._id?.toString() === userId
        }));

      const pending = roomReservations
        .filter(r => r.status === "Pending")
        .map((r) => ({
          start: r.datetime,
          end: r.endDatetime || new Date(new Date(r.datetime).getTime() + 60 * 60 * 1000),
          reservationId: r._id,
          userName: r.userId?.name || 'Unknown User',
          status: r.status,
          mine: r.userId?._id?.toString() === userId
        }));

      // ✅ Format closed time slots
      const closedTimeSlots = roomClosures.map((closure) => ({
        start: `${date}T${closure.startTime}:00`,
        end: `${date}T${closure.endTime}:00`,
        reason: closure.title,
        closureId: closure._id,
        startTime: closure.startTime,
        endTime: closure.endTime,
        title: closure.title,
        affectedFloors: closure.affectedAllFloors ? "All Floors" : closure.affectedFloors
      }));

      return {
        _id: room._id,
        floor: room.floor,
        room: room.room,
        isActive: true,
        occupied,
        pending,
        closedTimeSlots,
        isFullyClosed,
        hasClosures,
        closureInfo,
        // Add a flag to indicate if room should be considered closed
        isClosed: hasClosures // This tells the frontend that the room is closed
      };
    });

    console.log(`✅ Generated availability for ${availability.length} rooms`);
    console.log(`📊 Rooms with closures: ${availability.filter(r => r.hasClosures).length}`);
    
    // Log which rooms are affected by closures
    const closedRooms = availability.filter(r => r.hasClosures);
    if (closedRooms.length > 0) {
      console.log('🚫 Rooms affected by closures:', closedRooms.map(r => `${r.room} (Floor ${r.floor})`));
    }

    return availability;

  } catch (error) {
    console.error('❌ Error in generateAvailability:', error);
    throw error;
  }
};

export default { generateAvailability };