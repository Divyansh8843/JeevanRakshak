const SessionManager = require("../services/session-manager");
const { emitToUser, emitToCounselor, emitBookingUpdate } = require("./socket");

class SessionHandler {
  static async handleJoinRequest(socket, data) {
    try {
      const { bookingId, sessionType } = data;
      const counselorEmail = socket.counselorData?.email;

      if (!bookingId || !counselorEmail) return;

      // Fetch booking and only update join metadata (do not change enum status)
      const Booking = require("../models/Booking-model");
      const bookingDoc = await Booking.findById(bookingId);
      if (!bookingDoc) return;

      const booking = await SessionManager.updateBookingStatus(
        bookingId,
        bookingDoc.status,
        {
          lastJoinRequestTime: new Date(),
          joinUrl: data.joinUrl,
          sessionType: sessionType,
        }
      );

      if (booking) {
        emitToUser(booking.googleId, "booking:join_request", {
          id: bookingId,
          joinUrl: data.joinUrl,
          sessionType: sessionType,
          requestTime: new Date(),
        });
      }
    } catch (error) {
      console.error("Error handling join request:", error);
    }
  }

  static async handleJoinAccept(socket, data) {
    try {
      const { bookingId } = data;
      const googleId = socket.userData?.googleId;

      if (!bookingId || !googleId) return;

      const booking = await SessionManager.updateBookingStatus(
        bookingId,
        "in_session",
        {
          sessionStartTime: new Date(),
          joinAcceptedTime: new Date(),
        }
      );

      if (booking) {
        emitToCounselor(booking.counselorEmail, "session:starting", {
          bookingId,
        });
        emitToUser(booking.googleId, "session:starting", { bookingId });

        // Set session timeout
        const durationMs = (booking.durationMinutes || 30) * 60 * 1000;
        setTimeout(() => {
          SessionManager.handleSessionTimeout(bookingId);
        }, durationMs);
      }
    } catch (error) {
      console.error("Error handling join accept:", error);
    }
  }

  static async handleFeedback(socket, data) {
    try {
      const { bookingId, rating, comment } = data;
      const googleId = socket.userData?.googleId;

      if (!bookingId || !googleId || !rating) return;

      const booking = await SessionManager.updateBookingStatus(
        bookingId,
        "completed",
        {
          feedbackRating: rating,
          feedbackComment: comment,
        }
      );

      if (booking) {
        emitToCounselor(booking.counselorEmail, "booking:feedback_received", {
          bookingId,
          rating,
          comment,
        });
      }
    } catch (error) {
      console.error("Error handling feedback:", error);
    }
  }
}

module.exports = SessionHandler;
