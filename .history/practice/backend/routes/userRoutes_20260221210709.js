// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const upload = require("../middleware/upload");

// ================== PUBLIC ROUTES ==================
router.post("/signup", upload.single("profile"), userController.signup);
router.post("/login", userController.login);

// ================== SEARCH ROUTES (MUST COME BEFORE /:id) ==================
router.get("/search/users", userController.searchUsers); // This must be BEFORE /:id
router.get("/check-participant", userController.checkParticipant);

// ================== STATIC ROUTES ==================
router.get("/archived/all", userController.getArchivedUsers);
router.get("/all/users", userController.getAllUsers);
router.get("/role/users", userController.getUsersByRole);
router.get("/test/cloudinary", userController.testCloudinary);
router.get("/verification-stats", userController.getVerificationStats);

// ================== USER BY ID ROUTE (COMES AFTER SPECIFIC ROUTES) ==================
router.get("/:id", userController.getUserById);

// ================== PROFILE ROUTES ==================
router.put("/:id/update-profile", userController.updateProfile);
router.put("/update-profile/:id", userController.updateProfile);
router.put("/profile/:id", userController.updateProfile);
router.post("/:id/upload-picture", upload.single("profile"), userController.uploadPicture);
router.delete("/:id/remove-picture", userController.removePicture);
router.put("/:id/change-password", userController.changePassword);
router.put("/change-password/:id", userController.changePassword);
router.put("/profile/change-password", userController.changePassword);

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

// ================== BULK OPERATIONS ROUTES ==================
router.post("/revoke-all-verification", userController.revokeAllVerification);
router.post("/bulk-verify", userController.bulkVerifyUsers);

// ================== UNREAD COUNTS ROUTES ==================
router.get("/:userId/unread-counts", userController.getUserUnreadCounts);

// ================== GET ALL USERS (for admin messaging) ==================
router.get("/", userController.getAllUsersForMessaging);

module.exports = router;