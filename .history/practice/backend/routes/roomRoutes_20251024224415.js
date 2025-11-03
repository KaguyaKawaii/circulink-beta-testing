const express = require("express");
const router = express.Router();
const roomController = require("../controllers/roomController");

// GET /rooms
router.get("/", roomController.getRooms);

// GET /rooms/stats
router.get("/stats", roomController.getRoomStats);

// GET /rooms/:id
router.get("/:id", roomController.getRoomById);

// GET /rooms/floor/:floor
router.get("/floor/:floor", roomController.getRoomsByFloor);

// GET /rooms/type/:type
router.get("/type/:type", roomController.getRoomsByType);

// POST /rooms
router.post("/", roomController.createRoom);

// PUT /rooms/:id
router.put("/:id", roomController.updateRoom);

// PATCH /rooms/:id/toggle-status
router.patch("/:id/toggle-status", roomController.toggleRoomStatus);

// DELETE /rooms/:id
router.delete("/:id", roomController.deleteRoom);

module.exports = router;