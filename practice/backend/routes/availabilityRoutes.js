import express from "express";
import { getAvailability } from "../controllers/availabilityController.js";

const router = express.Router();

router.get("/availability", getAvailability);

export default router;