const express = require("express");
const router = express.Router();
const booking = require("../controllers/booking-controller");
const bookingFeedback = require("../controllers/booking-controller-feedback");
const { isAuthenticated, isCounselor } = require("../middleware/auth");

// Public routes (still require basic auth)
router.post(
  "/bookings",
  express.json(),
  isAuthenticated,
  booking.createBooking
);

// Protected routes (require authentication)
router.use(isAuthenticated);

// Booking management
router.get("/bookings", booking.getBookings);
router.get("/bookings/pending", booking.listPendingForCounselor);
router.get("/bookings/counselor-appointments", booking.getCounselorAppointments);
router.post("/bookings/:id/accept", express.json(), booking.acceptBooking);
router.post("/bookings/:id/reject", express.json(), booking.rejectBooking);
router.post("/bookings/:id/confirm-payment", express.json(), isCounselor, booking.confirmPaymentAndBook);

// Scheduling and session management
router.post(
  "/bookings/:id/schedule",
  express.json(),
  isCounselor,
  booking.acceptBooking
);
router.post(
  "/bookings/:id/join-request",
  express.json(),
  isCounselor,
  booking.requestJoin
);
router.post("/bookings/:id/accept-join", express.json(), booking.acceptJoin);

// Status updates
router.put("/bookings/:id", express.json(), booking.updateBookingStatus);
// completed session endpoint is handled in booking-controller-feedback

// Session management
router.post(
  "/bookings/:id/start-session",
  express.json(),
  booking.startSession
);
router.post("/bookings/:id/end-session", express.json(), booking.endSession);
router.post("/bookings/:id/join", express.json(), booking.joinSession);
// Reschedule booking (counselor or user may call depending on UI)
router.post(
  "/bookings/:id/reschedule",
  express.json(),
  booking.rescheduleBooking
);
// Join flow
router.post("/bookings/:id/request-join", express.json(), booking.requestJoin);
router.post("/bookings/:id/accept-join", express.json(), booking.acceptJoin);
// Feedback and session completion
router.post(
  "/bookings/:id/feedback",
  express.json(),
  isAuthenticated,
  bookingFeedback.submitFeedback
);
router.post(
  "/bookings/:id/complete",
  express.json(),
  isCounselor,
  bookingFeedback.completeSession
);

module.exports = router;
