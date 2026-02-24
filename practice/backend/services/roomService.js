import Room from "../models/Room.js";
import logAction from "../utils/logAction.js";

export const getAllRooms = async () => {
  return await Room.find().sort({ floor: 1, room: 1 });
};

export const getRoomById = async (roomId) => {
  return await Room.findById(roomId);
};

export const createRoom = async (data, req) => {
  const room = await Room.create(data);

  // Log the room creation action
  await logAction(
    req.adminId,
    req.id_number || "N/A",
    req.userName || "Admin",
    "Created Room",
    `Room: ${room.room}, Floor: ${room.floor}, Type: ${room.type}, Capacity: ${room.capacity}`
  );

  return room;
};

export const updateRoom = async (roomId, data, req) => {
  const oldRoom = await Room.findById(roomId);
  const room = await Room.findByIdAndUpdate(roomId, data, { new: true, runValidators: true });

  if (!room) return null;

  // Log changes
  const changes = [];
  if (oldRoom.room !== room.room) changes.push(`name: ${oldRoom.room} → ${room.room}`);
  if (oldRoom.floor !== room.floor) changes.push(`floor: ${oldRoom.floor} → ${room.floor}`);
  if (oldRoom.type !== room.type) changes.push(`type: ${oldRoom.type} → ${room.type}`);
  if (oldRoom.capacity !== room.capacity) changes.push(`capacity: ${oldRoom.capacity} → ${room.capacity}`);
  if (oldRoom.isActive !== room.isActive) changes.push(`status: ${oldRoom.isActive ? 'Active' : 'Inactive'} → ${room.isActive ? 'Active' : 'Inactive'}`);
  if (oldRoom.notes !== room.notes) changes.push(`notes updated`);
  
  // Check feature changes
  const featureChanges = [];
  Object.keys(room.features || {}).forEach(feature => {
    const oldValue = oldRoom.features?.[feature] || false;
    const newValue = room.features?.[feature] || false;
    if (oldValue !== newValue) {
      featureChanges.push(`${feature}: ${oldValue ? 'Yes' : 'No'} → ${newValue ? 'Yes' : 'No'}`);
    }
  });

  if (featureChanges.length > 0) {
    changes.push(`features: ${featureChanges.join(', ')}`);
  }

  // Log the room update action
  await logAction(
    req.adminId,
    req.id_number || "N/A",
    req.userName || "Admin",
    "Updated Room",
    `Room: ${room.room} (${room._id}) - Changes: ${changes.join('; ')}`
  );

  return room;
};

export const deleteRoom = async (roomId, req) => {
  const room = await Room.findByIdAndDelete(roomId);
  
  if (!room) return null;

  // Log the room deletion action
  await logAction(
    req.adminId,
    req.id_number || "N/A",
    req.userName || "Admin",
    "Deleted Room",
    `Room ID: ${room._id}, Name: ${room.room}, Floor: ${room.floor}`
  );

  return room;
};

export const toggleRoomStatus = async (roomId, req) => {
  const room = await Room.findById(roomId);
  if (!room) return null;

  const updatedRoom = await Room.findByIdAndUpdate(
    roomId, 
    { isActive: !room.isActive }, 
    { new: true }
  );

  // Log the room status toggle action
  await logAction(
    req.adminId,
    req.id_number || "N/A",
    req.userName || "Admin",
    updatedRoom.isActive ? "Activated Room" : "Deactivated Room",
    `Room: ${updatedRoom.room}, Floor: ${updatedRoom.floor}, New Status: ${updatedRoom.isActive ? 'Active' : 'Inactive'}`
  );

  return updatedRoom;
};

export const getRoomsByFloor = async (floor) => {
  return await Room.find({ floor }).sort({ room: 1 }); // ✅ Removed isActive filter
};

export const getRoomsByType = async (type) => {
  return await Room.find({ type }).sort({ floor: 1, room: 1 }); // ✅ Removed isActive filter
};

export const getAvailableRooms = async () => {
  return await Room.find({ isActive: true }).sort({ floor: 1, room: 1 }); // Keep this one filtered (it's for available rooms)
};

export const getRoomStats = async () => {
  const stats = await Room.aggregate([
    {
      $group: {
        _id: null,
        totalRooms: { $sum: 1 },
        activeRooms: { $sum: { $cond: ["$isActive", 1, 0] } },
        inactiveRooms: { $sum: { $cond: ["$isActive", 0, 1] } },
        totalCapacity: { $sum: "$capacity" },
        avgCapacity: { $avg: "$capacity" }
      }
    }
  ]);

  const floors = await Room.distinct("floor");
  const types = await Room.aggregate([
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    ...stats[0],
    floors: floors.length,
    roomTypes: types
  };
};