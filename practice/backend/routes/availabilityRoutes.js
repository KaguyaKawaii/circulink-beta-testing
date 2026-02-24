import express from "express";
import availabilityController from "../controllers/availabilityController.js";

const router = express.Router();

router.get("/availability", availabilityController.getAvailability);

export default router;