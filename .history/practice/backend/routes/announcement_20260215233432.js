// routes/announcementRoutes.js
import express from 'express';
const router = express.Router();
import * as announcementController from '../controllers/announcementController.js';

// Announcement routes
router.post('/', announcementController.createAnnouncement);
router.get('/', announcementController.getAnnouncements);
router.get('/active', announcementController.getActiveAnnouncements);
router.get('/management', announcementController.getAllAnnouncementsForManagement);
router.get('/:id', announcementController.getAnnouncementById);
router.put('/:id', announcementController.updateAnnouncement);
router.delete('/:id', announcementController.deleteAnnouncement);
router.post('/:id/dismiss', announcementController.dismissAnnouncement);

export default router;