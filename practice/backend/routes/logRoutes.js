import express from "express";
import * as logController from "../controllers/logController.js";

const router = express.Router();

// GET /api/logs
router.get("/", logController.getAllLogs);

export default router;