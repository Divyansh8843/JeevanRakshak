const express = require('express');
const router = express.Router();
const booking = require('../controllers/booking-controller');
const { isAuthenticated } = require('../middleware/auth');

// Public routes
router.post('/bookings', express.json(), booking.createBooking);

// Protected routes (require authentication)
router.use(isAuthenticated);

// Booking management
router.get('/bookings', booking.getBookings);
router.get('/bookings/pending', booking.listPendingForCounselor);
router.post('/bookings/:id/accept', express.json(), booking.acceptBooking);
router.post('/bookings/:id/reject', express.json(), booking.rejectBooking);

// Session management
router.post('/bookings/:id/start-session', express.json(), booking.startSession);
router.post('/bookings/:id/end-session', express.json(), booking.endSession);
// Join flow
router.post('/bookings/:id/request-join', express.json(), booking.requestJoin);
router.post('/bookings/:id/accept-join', express.json(), booking.acceptJoin);
// Feedback
router.post('/bookings/:id/feedback', express.json(), booking.addFeedback);

module.exports = router;
