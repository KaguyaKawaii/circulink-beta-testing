import { 
  registerAdmin,
  loginAdmin, 
  verifyOTP,
  resendOTP,
  updateAdminProfile,
  updateAdminPassword,
  getSystemSettings,
  updateSystemSettings,
  getSummaryCounts
} from "../controllers/adminController.js";

const router = express.Router();

// Admin authentication
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

// Admin profile management
router.put("/:id", updateAdminProfile);
router.put("/:id/password", updateAdminPassword);

// System settings
router.get("/system/settings", getSystemSettings);
router.put("/system/settings", updateSystemSettings);

// Dashboard data
// router.get("/summary", getSummaryCounts);

export default router;