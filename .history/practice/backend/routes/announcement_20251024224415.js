const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');

// Announcement routes
router.post('/', announcementController.createAnnouncement);
router.get('/', announcementController.getAnnouncements);
router.get('/active', announcementController.getActiveAnnouncements);
router.get('/management', announcementController.getAllAnnouncementsForManagement); // NEW ROUTE
router.get('/:id', announcementController.getAnnouncementById);
router.put('/:id', announcementController.updateAnnouncement);
router.delete('/:id', announcementController.deleteAnnouncement);
router.post('/:id/dismiss', announcementController.dismissAnnouncement);

module.exports = router;