import Room from "../models/Room.js";
import Reservation from "../models/Reservation.js";

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
    .populate('roomId', 'room floor')
    .lean();

    console.log(`📅 Found ${reservations.length} reservations for date: ${date}`);

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
          pending: []
        };
      }

      // ✅ Filter reservations for this specific room
      const roomReservations = reservations.filter((reservation) => {
        // Check multiple possible room identification methods
        const reservationRoomId = reservation.roomId?._id?.toString();
        const reservationRoomName = reservation.roomId?.room || reservation.roomName;
        const reservationFloor = reservation.roomId?.floor || reservation.location;
        
        return (
          reservationRoomId === room._id.toString() ||
          (reservationRoomName && reservationRoomName === room.room) ||
          (reservationFloor && reservationFloor === room.floor && reservationRoomName === room.room)
        );
      });

      console.log(`🏠 Room ${room.room} has ${roomReservations.length} reservations`);

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

      return {
        _id: room._id,
        floor: room.floor,
        room: room.room,
        isActive: true,
        occupied,
        pending
      };
    });

    console.log(`✅ Generated availability for ${availability.length} rooms`);
    return availability;

  } catch (error) {
    console.error('❌ Error in generateAvailability:', error);
    throw error;
  }
};

export default { generateAvailability };
