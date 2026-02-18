const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const upload = require("../middleware/upload");

// ================== GET ALL USERS (for admin messaging) ==================
router.get("/", userController.getAllUsersForMessaging);

// ================== PUBLIC ROUTES ==================
router.post("/signup", upload.single("profile"), userController.signup);
router.post("/login", userController.login);

// ================== ADMIN & SPECIAL ROUTES ==================
router.put("/toggle-suspend/:id", userController.toggleSuspendUser);
router.put("/toggle-verify/:id", userController.toggleVerifyUser);
router.put("/suspend/:id", userController.suspendUser);
router.put("/unsuspend/:id", userController.unsuspendUser);
router.patch("/verify/:id", userController.verifyUser);
router.put("/archive/:id", userController.archiveUser);
router.put("/restore/:id", userController.restoreUser);
router.put("/admin-edit/:id", upload.single("profile"), userController.adminEditUser);
router.post("/add-user", upload.single("profile"), userController.addUser);

router.get("/archived/all", userController.getArchivedUsers);
router.delete("/archived/:id", userController.deleteArchivedUser);

router.get("/all/users", userController.getAllUsers);
router.get("/search/users", userController.searchUsers);

// ================== STATIC ROUTES ==================
router.get("/check-participant", userController.checkParticipant);

// ================== PROFILE ROUTES ==================
// ✅ EXISTING ROUTES
router.put("/:id/update-profile", userController.updateProfile);
router.post("/:id/upload-picture", upload.single("profile"), userController.uploadPicture);
router.delete("/:id/remove-picture", userController.removePicture);
router.put("/:id/change-password", userController.changePassword);

// ✅ ADD THESE MISSING ROUTES TO FIX 404 ERRORS
router.put("/update-profile/:id", userController.updateProfile); // For /users/update-profile/${id}
router.put("/profile/:id", userController.updateProfile); // For /users/profile/${id}
router.put("/change-password/:id", userController.changePassword); // For /users/change-password/${id}
router.put("/profile/change-password", userController.changePassword); // For /users/profile/change-password

// ================== USER BY ROLE ROUTE ==================
router.get("/role/users", userController.getUsersByRole);

// ================== UNREAD COUNTS ROUTES ==================
router.get("/:userId/unread-counts", userController.getUserUnreadCounts);

// ================== TEST ROUTE ==================
router.get("/test/cloudinary", userController.testCloudinary);

// ================== GENERIC ROUTE LAST ==================
router.get("/:id", userController.getUserById);

// Add these new routes after your existing routes
// ================== BULK OPERATIONS ROUTES ==================
router.post("/revoke-all-verification", userController.revokeAllVerification);
router.post("/bulk-verify", userController.bulkVerifyUsers);
router.get("/verification-stats", userController.getVerificationStats);

module.exports = router;