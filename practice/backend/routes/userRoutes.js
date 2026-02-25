import express from "express";
import * as userController from "../controllers/userController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// ================== PUBLIC ROUTES ==================
router.post("/signup", upload.single("profile"), userController.signup);
router.post("/login", userController.login);

// ================== SEARCH ROUTES (MUST COME BEFORE /:id) ==================
router.get("/search", userController.searchUsers); // FIXED: Changed from /search/users to /search
router.get("/check-participant", userController.checkParticipant);

// ================== STATIC ROUTES ==================
router.get("/archived/all", userController.getArchivedUsers);
router.get("/all/users", userController.getAllUsers); // This is /api/users/all/users
router.get("/role/users", userController.getUsersByRole);
router.get("/test/cloudinary", userController.testCloudinary);
router.get("/verification-stats", userController.getVerificationStats);

// ================== UNREAD COUNTS ROUTES ==================
router.get("/:userId/unread-counts", userController.getUserUnreadCounts);

// ================== GET ALL USERS (for admin messaging) ==================
router.get("/messaging", userController.getAllUsersForMessaging);

// ================== USER BY ID ROUTE (COMES AFTER SPECIFIC ROUTES) ==================
router.get("/:id", userController.getUserById);

// ================== PROFILE ROUTES ==================
router.put("/profile/:id", userController.updateProfile);
router.post("/:id/upload-picture", upload.single("profile"), userController.uploadPicture);
router.delete("/:id/remove-picture", userController.removePicture);
router.put("/change-password/:id", userController.changePassword); // FIXED: Consistent endpoint

// ================== ADMIN ROUTES ==================
router.put("/toggle-suspend/:id", userController.toggleSuspendUser);
router.put("/toggle-verify/:id", userController.toggleVerifyUser);
router.put("/suspend/:id", userController.suspendUser);
router.put("/unsuspend/:id", userController.unsuspendUser);
router.patch("/verify/:id", userController.verifyUser); // FIXED: This matches frontend call
router.put("/archive/:id", userController.archiveUser);
router.put("/restore/:id", userController.restoreUser);
router.put("/admin-edit/:id", upload.single("profile"), userController.adminEditUser);
router.post("/add-user", upload.single("profile"), userController.addUser);
router.delete("/archived/:id", userController.deleteArchivedUser);

// ================== BULK OPERATIONS ROUTES ==================
router.post("/revoke-all-verification", userController.revokeAllVerification);
router.post("/bulk-verify", userController.bulkVerifyUsers);

export default router;