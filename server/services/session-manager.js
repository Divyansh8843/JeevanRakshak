const Booking = require("../models/Booking-model");
const Counselor = require("../models/Counselor-model");
const {
  emitToUser,
  emitToCounselor,
  emitBookingUpdate,
} = require("../utils/socket");

class SessionManager {
  static async updateBookingStatus(bookingId, newStatus, additionalData = {}) {
    const booking = await Booking.findById(bookingId);
    if (!booking) return null;

    const oldStatus = booking.status;
    booking.status = newStatus;

    // Update additional fields
    Object.keys(additionalData).forEach((key) => {
      booking[key] = additionalData[key];
    });

    await booking.save();

    // If session is completed, update counselor earnings
    if (newStatus === "completed" && oldStatus !== "completed") {
      await this.updateCounselorEarnings(booking);
    }

    // Emit update event
    emitBookingUpdate(booking);
    return booking;
  }

  static async updateCounselorEarnings(booking) {
    // Avoid double-counting if earnings were already credited (e.g., during confirmation)
    if (booking.earningsCredited) return;
    const counselor = await Counselor.findOne({
      email: booking.counselorEmail,
    });
    if (!counselor) return;

    const amount = booking.price;
    counselor.earnings.total += amount;

    // Update monthly earnings
    const now = new Date();
    if (counselor.earnings.lastUpdated) {
      const lastUpdate = new Date(counselor.earnings.lastUpdated);
      if (
        lastUpdate.getMonth() !== now.getMonth() ||
        lastUpdate.getFullYear() !== now.getFullYear()
      ) {
        counselor.earnings.thisMonth = amount;
      } else {
        counselor.earnings.thisMonth += amount;
      }
    } else {
      counselor.earnings.thisMonth = amount;
    }

    counselor.earnings.lastUpdated = now;
    counselor.completedSessions += 1;
    await counselor.save();

    // Mark booking as credited to prevent duplicate earnings updates
    try {
      booking.earningsCredited = true;
      booking.updatedAt = now;
      await booking.save();
    } catch (_) {}
  }

  static async handleSessionTimeout(bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking || booking.status !== "in_session") return;

    const now = new Date();
    const startTime = new Date(booking.sessionStartTime);
    const durationMs = (booking.durationMinutes || 30) * 60 * 1000;

    if (now - startTime >= durationMs) {
      await this.updateBookingStatus(bookingId, "completed", {
        sessionEndTime: now,
      });

      // Notify participants
      emitToUser(booking.googleId, "session:ended", {
        bookingId,
        message: "Session time completed",
      });
      emitToCounselor(booking.counselorEmail, "session:ended", {
        bookingId,
        message: "Session time completed",
      });
    }
  }
}

module.exports = SessionManager;
