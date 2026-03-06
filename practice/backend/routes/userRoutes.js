import express from "express";
import * as userController from "../controllers/userController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// ================== PUBLIC ROUTES ==================
router.post("/signup", upload.single("profile"), userController.signup);
router.post("/login", userController.login);
router.post("/logout/:userId", userController.logout);
router.post("/validate-session", userController.validateSession);

// ================== SEARCH ROUTES (MUST COME BEFORE /:id) ==================
router.get("/search", userController.searchUsers);
// Add alias for /search/users to maintain compatibility
router.get("/search/users", userController.searchUsers);
router.get("/check-participant", userController.checkParticipant);

// ================== STATIC ROUTES (MUST COME BEFORE /:id) ==================
router.get("/archived/all", userController.getArchivedUsers);
router.get("/all/users", userController.getAllUsers);
router.get("/role/users", userController.getUsersByRole);
router.get("/test/cloudinary", userController.testCloudinary);
router.get("/verification-stats", userController.getVerificationStats);
router.get("/messaging", userController.getAllUsersForMessaging);

// ================== UNREAD COUNTS ROUTES (MUST COME BEFORE /:id) ==================
router.get("/:userId/unread-counts", userController.getUserUnreadCounts);

// ================== USER BY ID ROUTE (GET) ==================
router.get("/:id", userController.getUserById);

// ================== UPDATE PROFILE ROUTE (PUT by ID) - ADD THIS! ==================
// This matches what the frontend is trying to call: PUT /users/:id
router.put("/:id", userController.updateProfile);

// ================== PROFILE ROUTES (Alternative paths) ==================
router.put("/profile/:id", userController.updateProfile); // Keep for backward compatibility
router.post("/:id/upload-picture", upload.single("profile"), userController.uploadPicture);
router.delete("/:id/remove-picture", userController.removePicture);
router.put("/change-password/:id", userController.changePassword);

// ================== ADMIN ROUTES ==================
router.put("/toggle-suspend/:id", userController.toggleSuspendUser);
router.put("/toggle-verify/:id", userController.toggleVerifyUser);
router.put("/suspend/:id", userController.suspendUser);
router.put("/unsuspend/:id", userController.unsuspendUser);
router.patch("/verify/:id", userController.verifyUser);
router.put("/archive/:id", userController.archiveUser);
router.put("/restore/:id", userController.restoreUser);
router.put("/admin-edit/:id", upload.single("profile"), userController.adminEditUser);
router.post("/add-user", upload.single("profile"), userController.addUser);
router.delete("/archived/:id", userController.deleteArchivedUser);
router.post("/force-logout/:userId", userController.forceLogoutUser);

// ================== BULK OPERATIONS ROUTES ==================
router.post("/revoke-all-verification", userController.revokeAllVerification);
router.post("/bulk-verify", userController.bulkVerifyUsers);
router.post("/bulk-archive", userController.bulkArchiveUsers);
router.post("/bulk-restore-archived", userController.bulkRestoreArchivedUsers);
router.post("/bulk-delete-archived", userController.bulkDeleteArchivedUsers);

export default router;