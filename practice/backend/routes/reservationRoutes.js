const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');

// User limit check
router.get('/check-limit/:userId', reservationController.checkUserReservationLimit);

// Reservation routes
router.get('/', reservationController.getAllReservations);
router.get('/user/:userId', reservationController.getUserReservations);
router.get('/active/:userId', reservationController.getActiveReservation);

// Availability route
router.get('/availability', reservationController.getAvailability);

// User search for admin
router.get('/users/search', reservationController.searchUsers);

// Single reservation by ID
router.get('/:id', reservationController.getReservationById);

// Create reservation
router.post('/', reservationController.createReservation);

// Admin create reservation (auto-approved)
router.post('/admin-create', reservationController.adminCreateReservation);

// Edit reservation (admin only)
router.patch('/:id/edit', reservationController.editReservation);

// Update status
router.patch('/:id/status', reservationController.updateReservationStatus);

// Cancel reservation
router.delete('/:id', reservationController.cancelReservation);

// Archive routes
router.post('/:id/archive', reservationController.archiveReservation);
router.get('/archived/all', reservationController.getArchivedReservations);
router.post('/archived/:id/restore', reservationController.restoreReservation);
router.delete('/archived/:id', reservationController.deleteArchivedReservation);

// Reservation actions
router.post('/start/:id', reservationController.startReservation);
router.post('/:id/end-early', reservationController.endReservationEarly);

// Extension routes
router.put('/:id/request-extension', reservationController.requestExtension);
router.put('/:id/handle-extension', reservationController.handleExtension);

// Participants routes
router.get('/participants/details/:reservationId', reservationController.getParticipantsDetails);
router.get('/participants/available-users', reservationController.getAvailableUsers);
router.post('/participants/remove', reservationController.removeParticipant);
router.post('/participants/add', reservationController.addParticipant);

// Floor access validation
router.post('/validate-floor-access', reservationController.validateFloorAccess);

// Maintenance
router.post('/check-expired', reservationController.checkExpiredReservations);

module.exports = router;