import * as roomService from "../services/roomService.js";

export const getRooms = async (req, res) => {
  try {
    const rooms = await roomService.getAllRooms();
    res.status(200).json(rooms);
  } catch (err) {
    console.error("❌ Error fetching rooms:", err);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
};

export const getRoomById = async (req, res) => {
  try {
    const room = await roomService.getRoomById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.status(200).json(room);
  } catch (err) {
    console.error("❌ Error fetching room:", err);
    res.status(500).json({ error: "Failed to fetch room" });
  }
};

export const createRoom = async (req, res) => {
  try {
    const room = await roomService.createRoom(req.body, req);
    res.status(201).json(room);
  } catch (err) {
    console.error("❌ Error creating room:", err);
    if (err.code === 11000) {
      return res.status(400).json({ error: "Room already exists on this floor" });
    }
    res.status(500).json({ error: "Failed to create room" });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const room = await roomService.updateRoom(req.params.id, req.body, req);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.status(200).json(room);
  } catch (err) {
    console.error("❌ Error updating room:", err);
    if (err.code === 11000) {
      return res.status(400).json({ error: "Room already exists on this floor" });
    }
    res.status(500).json({ error: "Failed to update room" });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const room = await roomService.deleteRoom(req.params.id, req);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.json({ message: "Room deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting room:", err);
    res.status(500).json({ error: "Failed to delete room" });
  }
};

export const toggleRoomStatus = async (req, res) => {
  try {
    const room = await roomService.toggleRoomStatus(req.params.id, req);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.json({ 
      message: `Room ${room.isActive ? 'activated' : 'deactivated'} successfully`,
      room 
    });
  } catch (err) {
    console.error("❌ Error toggling room status:", err);
    res.status(500).json({ error: "Failed to update room status" });
  }
};

export const getRoomsByFloor = async (req, res) => {
  try {
    const rooms = await roomService.getRoomsByFloor(req.params.floor);
    res.status(200).json(rooms);
  } catch (err) {
    console.error("❌ Error fetching rooms by floor:", err);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
};

export const getRoomsByType = async (req, res) => {
  try {
    const rooms = await roomService.getRoomsByType(req.params.type);
    res.status(200).json(rooms);
  } catch (err) {
    console.error("❌ Error fetching rooms by type:", err);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
};

export const getRoomStats = async (req, res) => {
  try {
    const stats = await roomService.getRoomStats();
    res.status(200).json(stats);
  } catch (err) {
    console.error("❌ Error fetching room stats:", err);
    res.status(500).json({ error: "Failed to fetch room statistics" });
  }
};