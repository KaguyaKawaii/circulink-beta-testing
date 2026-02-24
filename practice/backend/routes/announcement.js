import express from 'express';
import announcementController from '../controllers/announcementController.js';

const router = express.Router();

// Get all announcements
router.get('/', announcementController.getAnnouncements);

// Get single announcement
router.get('/:id', announcementController.getAnnouncementById);

// Create announcement
router.post('/', announcementController.createAnnouncement);

// Update announcement
router.put('/:id', announcementController.updateAnnouncement);

// Delete announcement
router.delete('/:id', announcementController.deleteAnnouncement);

// Dismiss announcement for user
router.post('/:id/dismiss', announcementController.dismissAnnouncement);

// Get active announcements for user
router.get('/user/:userId', announcementController.getActiveAnnouncements);

export default router;