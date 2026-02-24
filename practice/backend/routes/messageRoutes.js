import express from "express";
import * as messageController from "../controllers/messageController.js";

const router = express.Router();

// Generic message sending route
router.post("/send", messageController.sendMessage);

// User routes
router.post("/send-to-floor", messageController.sendMessageToFloor);
router.post("/send-to-admin", messageController.sendMessageToAdmin);

// Staff routes
router.post("/staff-reply", messageController.staffReplyToUser);
router.post("/staff-to-admin", messageController.staffMessageToAdmin);

// Admin routes
router.post("/admin-to-user", messageController.adminMessageToUser);
router.post("/admin-to-staff", messageController.adminMessageToStaff);
router.post("/admin-to-floor", messageController.adminMessageToFloor);
// Note: Duplicate "/send" route removed - keep only one

// Conversation fetching routes
router.get("/floor-conversation/:userId/:floor", messageController.getFloorConversation);
router.get("/user-admin-conversation/:userId", messageController.getUserAdminConversation);
router.get("/staff-user-conversation/:staffId/:userId", messageController.getStaffUserConversation);
router.get("/staff-admin-conversation/:staffId", messageController.getStaffAdminConversation);
router.get("/admin-conversation/:entityId", messageController.getAdminConversation);

// Recipient list routes
router.get("/floor-users/:floor", messageController.getFloorUsers);
router.get("/recipients/admin", messageController.getAdminRecipients);
router.get("/recipients/staff/:staffId", messageController.getStaffRecipients);

// Mark messages as read
router.put("/mark-read", messageController.markMessagesAsRead);
router.get("/unread-count/:userId", messageController.getUnreadCount);
router.get("/unread-count/:userId/:conversationId", messageController.getUnreadCountByConversation);

// Staff unread counts
router.get("/staff-total-unread/:staffId", messageController.getStaffTotalUnreadCount);
router.get("/staff-floor-unread/:staffId/:floor", messageController.getStaffFloorUnreadCount);

// Per-user unread counts
router.get("/unread-count-by-user/:staffId/:userId", messageController.getUnreadCountByUser);
router.get("/staff-unread-breakdown/:staffId", messageController.getStaffUnreadBreakdown);

// Mark as read routes
router.post("/mark-read-on-reply", messageController.markMessagesAsReadOnReply);
router.post("/mark-conversation-read", messageController.markConversationAsRead);

router.get("/unread-messages/:userId", messageController.getUnreadMessages);

export default router;