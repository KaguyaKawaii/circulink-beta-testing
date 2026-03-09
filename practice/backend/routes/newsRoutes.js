import express from "express";
import multer from "multer";
import * as newsController from "../controllers/newsController.js";

const router = express.Router();

// Multer (memory storage for images)
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed!"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// 🔹 Routes order is important! 
// 🔸 Put SPECIFIC routes BEFORE generic ones

// Search news (specific path)
router.get("/search/:query", newsController.searchNews);

// Get archived news (specific path)
router.get("/archived", newsController.getArchivedNews);

// Get all active news (specific path)
router.get("/active", newsController.getAllNews);

// Archive / Restore (specific paths with actions)
router.put("/archive/:id", newsController.archiveNews);
router.put("/restore/:id", newsController.restoreNews);

// Create news - upload.array("images", 10)
router.post("/", upload.array("images", 10), newsController.createNews);

// Update news
router.put("/:id", upload.array("images", 10), newsController.updateNews);

// Get single news item by ID (generic - should be near the end)
router.get("/:id", newsController.getNewsById);

// Delete news (only archived) - generic but should be after specific GET routes
router.delete("/:id", newsController.deleteNews);

export default router;