import express from "express";
import * as userController from "../controllers/userController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// ================== PUBLIC ROUTES ==================
router.post("/signup", upload.single("profile"), userController.signup);
router.post("/login", userController.login);
router.post("/logout/:userId", userController.logout);
router.post("/validate-session", userController.validateSession);

// ================== SEARCH ROUTES ==================
router.get("/search", userController.searchUsers);
router.get("/search/users", userController.searchUsers);
router.get("/check-participant", userController.checkParticipant);

// ================== USER LIST ROUTES ==================
router.get("/list/all", userController.getAllUsers);           // GET /api/users/list/all
router.get("/list/archived", userController.getArchivedUsers); // GET /api/users/list/archived
router.get("/list/role", userController.getUsersByRole);       // GET /api/users/list/role
router.get("/list/messaging", userController.getAllUsersForMessaging); // GET /api/users/list/messaging

// ================== STATS ROUTES ==================
router.get("/stats/verification", userController.getVerificationStats);
router.get("/test/cloudinary", userController.testCloudinary);

// ================== UNREAD COUNTS ==================
router.get("/:userId/unread-counts", userController.getUserUnreadCounts);

// ================== SINGLE USER ROUTES ==================
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateProfile);
router.put("/profile/:id", userController.updateProfile);
router.post("/:id/upload-picture", upload.single("profile"), userController.uploadPicture);
router.delete("/:id/remove-picture", userController.removePicture);
router.put("/change-password/:id", userController.changePassword);

// ================== ADMIN ROUTES ==================
router.put("/admin/toggle-suspend/:id", userController.toggleSuspendUser);
router.put("/admin/toggle-verify/:id", userController.toggleVerifyUser);
router.put("/admin/suspend/:id", userController.suspendUser);
router.put("/admin/unsuspend/:id", userController.unsuspendUser);
router.patch("/admin/verify/:id", userController.verifyUser);
router.put("/admin/archive/:id", userController.archiveUser);
router.put("/admin/restore/:id", userController.restoreUser);
router.put("/admin/edit/:id", upload.single("profile"), userController.adminEditUser);
router.post("/admin/add", upload.single("profile"), userController.addUser);
router.delete("/admin/archived/:id", userController.deleteArchivedUser);
router.post("/admin/force-logout/:userId", userController.forceLogoutUser);

// ================== BULK OPERATIONS ==================
router.post("/admin/bulk/revoke-verification", userController.revokeAllVerification);
router.post("/admin/bulk/verify", userController.bulkVerifyUsers);
router.post("/admin/bulk/archive", userController.bulkArchiveUsers);
router.post("/admin/bulk/restore-archived", userController.bulkRestoreArchivedUsers);
router.post("/admin/bulk/delete-archived", userController.bulkDeleteArchivedUsers);

export default router;