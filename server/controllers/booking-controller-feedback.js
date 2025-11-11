const Booking = require("../models/Booking-model");
const Counselor = require("../models/Counselor-model");
const { emitToUser, emitBookingUpdate, emitToCounselor } = require("../utils/socket");

// POST /api/bookings/:id/feedback
exports.submitFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const googleId = req.user?.googleId; // From auth middleware

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: "Rating must be between 1 and 5",
        code: "INVALID_RATING",
      });
    }

    const booking = await Booking.findOne({ _id: id, googleId });
    if (!booking) {
      return res.status(404).json({
        error: "Booking not found",
        code: "BOOKING_NOT_FOUND",
      });
    }

    if (booking.status !== "completed") {
      return res.status(400).json({
        error: "Can only submit feedback for completed sessions",
        code: "INVALID_SESSION_STATUS",
      });
    }

    if (booking.feedbackRating) {
      return res.status(400).json({
        error: "Feedback already submitted",
        code: "FEEDBACK_EXISTS",
      });
    }

    // Update booking with feedback
    booking.feedbackRating = rating;
    booking.feedbackComment = comment;
    await booking.save();

    // Update counselor rating
    const counselor = await Counselor.findOne({
      email: booking.counselorEmail,
    });
    if (counselor) {
      // Calculate new average rating
      const totalReviews = counselor.reviews || 0;
      const currentRating = counselor.rating || 5;
      const newTotalReviews = totalReviews + 1;
      const newRating =
        (currentRating * totalReviews + rating) / newTotalReviews;

      counselor.rating = parseFloat(newRating.toFixed(1));
      counselor.reviews = newTotalReviews;
      await counselor.save();
    }

    // Notify counselor with updated stats
    emitToCounselor(booking.counselorEmail, "booking:feedback_received", {
      bookingId: booking._id,
      rating,
      comment,
      newAverageRating: counselor?.rating,
      totalReviews: counselor?.reviews,
    });

    // Also emit stats update for live dashboard refresh
    try {
      emitToCounselor(booking.counselorEmail, "stats:update", {
        averageRating: counselor?.rating || 5,
        totalReviews: counselor?.reviews || 0,
      });
    } catch (_) {}

    return res.json({ success: true, rating: counselor?.rating });
  } catch (error) {
    console.error("Submit feedback failed:", error);
    return res.status(500).json({ error: "Submit feedback failed" });
  }
};

// POST /api/bookings/:id/complete
exports.completeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const counselorEmail = req.counselor?.email; // From auth middleware

    const booking = await Booking.findOne({
      _id: id,
      counselorEmail: counselorEmail?.toLowerCase(),
      status: "in_session",
    });

    if (!booking) {
      return res.status(404).json({
        error: "Active session not found",
        code: "SESSION_NOT_FOUND",
      });
    }

    const now = new Date();
    booking.status = "completed";
    booking.sessionEndTime = now;
    booking.updatedAt = now;
    await booking.save();

    // Update counselor earnings
    const counselor = await Counselor.findOne({
      email: counselorEmail?.toLowerCase(),
    });
    if (counselor && booking.price) {
      counselor.earnings.total += booking.price;
      counselor.earnings.thisMonth += booking.price;
      counselor.earnings.lastUpdated = now;
      counselor.completedSessions += 1;
      await counselor.save();
    }

    // Notify participants
    emitToUser(booking.googleId, "session:ended", {
      bookingId: booking._id,
      message: "Session completed by counselor",
    });

    emitBookingUpdate(booking);

    return res.json({ success: true });
  } catch (error) {
    console.error("Complete session failed:", error);
    return res.status(500).json({ error: "Complete session failed" });
  }
};
