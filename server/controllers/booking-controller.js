const Booking = require("../models/Booking-model");
const {
  emitToUser,
  emitToCounselor,
  getIO,
  emitBookingUpdate,
} = require("../utils/socket");
const User = require("../models/User-model");
const Counselor = require("../models/Counselor-model");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "change_me";
const { v4: uuidv4 } = require("uuid");
const {
  sendBookingConfirmation,
  sendSessionReminder,
} = require("../utils/mailer");
const Stripe = require('stripe');
const stripe = (() => { try { return Stripe(process.env.STRIPE_SECRET_KEY || ''); } catch (_) { return null; } })();

// POST /api/bookings

exports.createBooking = async (req, res) => {
  try {
    const {
      googleId,
      counselorName,
      counselorEmail,
      sessionType = "video",
      date,
      time,
      notes,
    } = req.body || {};

    // Enhanced validation with specific error codes
    if (!googleId) {
      return res.status(400).json({
        error: "User ID is required",
        code: "MISSING_USER_ID",
      });
    }

    if (!counselorName) {
      return res.status(400).json({
        error: "Counselor name is required",
        code: "MISSING_COUNSELOR_NAME",
      });
    }

    if (!counselorEmail) {
      return res.status(400).json({
        error: "Counselor email is required",
        code: "MISSING_COUNSELOR_EMAIL",
      });
    }

    if (!date) {
      return res.status(400).json({
        error: "Appointment date is required",
        code: "MISSING_DATE",
      });
    }

    if (!time) {
      return res.status(400).json({
        error: "Appointment time is required",
        code: "MISSING_TIME",
      });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: "Invalid date format. Use YYYY-MM-DD",
        code: "INVALID_DATE_FORMAT",
      });
    }

    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({
        error: "Invalid time format. Use HH:MM",
        code: "INVALID_TIME_FORMAT",
      });
    }

    // Validate session type (align with schema: chat, call, video)
    const validSessionTypes = ["video", "call", "chat"];
    if (!validSessionTypes.includes(String(sessionType).toLowerCase())) {
      return res.status(400).json({
        error: "Invalid session type. Must be one of: video, call, chat",
        code: "INVALID_SESSION_TYPE",
      });
    }

    // Validate appointment is in the future
    const appointmentDate = new Date(`${date}T${time}`);
    if (appointmentDate <= new Date()) {
      return res.status(400).json({
        error: "Appointment must be scheduled in the future",
        code: "PAST_APPOINTMENT",
      });
    }

    // Check for existing bookings at the same time (any active booking)
    const existingBooking = await Booking.findOne({
      counselorEmail: counselorEmail.toLowerCase(),
      date,
      time,
      status: {
        $in: [
          "pending_payment",
          "paid_pending_counselor",
          "confirmed",
          "in_session",
        ],
      },
    });

    if (existingBooking) {
      return res.status(400).json({
        error: "This time slot is already booked",
        code: "SLOT_ALREADY_BOOKED",
      });
    }

    // Fetch user and counselor to verify they exist
    const [user, counselor] = await Promise.all([
      User.findOne({ googleId }),
      Counselor.findOne({ email: counselorEmail.toLowerCase() }),
    ]);

    if (!counselor) {
      return res.status(404).json({
        error: "Counselor not found",
        code: "COUNSELOR_NOT_FOUND",
      });
    }
    if (!user) {
      return res.status(404).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Get counselor's price for the session type
    const sessionPrice =
      counselor.prices?.[sessionType.toLowerCase()] || counselor.price || 0;
    if (!sessionPrice) {
      return res.status(400).json({
        error: "Invalid session price",
        code: "INVALID_SESSION_PRICE",
      });
    }

    const sessionId = uuidv4();
    const doc = await Booking.create({
      googleId,
      counselorName,
      counselorEmail: counselorEmail.toLowerCase(),
      sessionType: String(sessionType).toLowerCase(),
      date,
      time,
      notes,
      // Align with schema lifecycle: start at pending_payment; payment flow will advance to paid_pending_counselor
      status: "pending_payment",
      sessionId,
      // Precompute scheduledAt from date/time for scheduler compatibility
      scheduledAt: new Date(`${date}T${time}`),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // In-house suicide risk scoring on user notes (non-blocking)
    try {
      if (notes && String(notes).trim()) {
        const { scoreText } = require("../services/risk-service");
        const risk = await scoreText(String(notes));
        if (risk) {
          doc.riskLabel = risk.label || "SAFE";
          doc.riskScore = Number(risk.score || 0);
          doc.riskModelVersion = String(risk.version || "");
          doc.riskEvaluatedAt = new Date();
          await doc.save();
          // emit risk event to counselor for visibility
          try {
            emitToCounselor(doc.counselorEmail, "risk:flagged", {
              bookingId: doc._id.toString(),
              label: doc.riskLabel,
              score: doc.riskScore,
            });
          } catch (_) {}
        }
      }
    } catch (riskErr) {
      console.warn("Risk scoring failed:", riskErr?.message || riskErr);
    }

    // Emit real-time event to counselor
    try {
      emitToCounselor(counselorEmail, "booking:new", doc);

      // Also emit to the counselors_list room (safe access to io)
      try {
        const io = getIO();
        io.to("counselors_list").emit("counselor:booking_update", {
          email: counselorEmail.toLowerCase(),
          booking: doc,
        });
      } catch (_) {
        // getIO may not be initialized during unit tests or early boot; ignore
      }

      // Log successful notification
      console.log(`Booking notification sent to counselor: ${counselorEmail}`);
    } catch (socketError) {
      // Log socket error but don't fail the booking creation
      console.error("Error sending socket notification:", socketError);
    }
    // Try to send email notification to counselor
    try {
      const mailer = require("../utils/mailer");
      await mailer.sendCounselorBookingAlert(counselorEmail, {
        userName: user.name || "A user",
        date,
        time,
        sessionType,
        notes: notes || "No additional notes",
      });
    } catch (emailError) {
      // Log email error but don't fail the booking creation
      console.error("Error sending email notification:", emailError);
    }

    return res.status(201).json(doc);
  } catch (err) {
    console.error("Create booking failed:", err);
    return res.status(500).json({ error: "Create booking failed" });
  }
};

// GET /api/bookings/pending?email=<counselorEmail>
exports.listPendingForCounselor = async (req, res) => {
  try {
    let email = String(req.query.email || "").toLowerCase();
    // Prefer authenticated counselor email from token/cookie
    try {
      const { getCurrentUser } = require("../utils/auth-helper");
      const u = await getCurrentUser(req);
      if (u?.email) email = String(u.email).toLowerCase();
    } catch (_) {}
    if (!email) return res.status(400).json({ error: "email required" });
    const items = await Booking.find({
      counselorEmail: email,
      status: "paid_pending_counselor",
    }).sort({ createdAt: -1 });
    return res.status(200).json(items);
  } catch (err) {
    console.error("List pending for counselor failed:", err);
    return res.status(500).json({ error: "List pending failed" });
  }
};

// GET /api/bookings/counselor-appointments - Get counselor appointments with filters
exports.getCounselorAppointments = async (req, res) => {
  try {
    // Extract counselor email from auth
    let email = String(req.query.email || "").toLowerCase();
    try {
      const { getCurrentUser } = require("../utils/auth-helper");
      const u = await getCurrentUser(req);
      if (u?.email) email = String(u.email).toLowerCase();
    } catch (_) {}
    
    if (!email) return res.status(400).json({ error: "Counselor email required" });

    // Build filter query
    const filter = { counselorEmail: email };
    
    // Status filter
    const { status, sessionType, dateFrom, dateTo, search, sortBy, order } = req.query;
    
    if (status) {
      // Support multiple statuses separated by comma
      const statuses = status.split(',').map(s => s.trim());
      filter.status = { $in: statuses };
    }
    
    // Session type filter (category)
    if (sessionType) {
      const types = sessionType.split(',').map(t => t.trim().toLowerCase());
      filter.sessionType = { $in: types };
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom;
      if (dateTo) filter.date.$lte = dateTo;
    }
    
    // Search by user name or notes
    if (search) {
      filter.$or = [
        { notes: { $regex: search, $options: 'i' } },
        { googleId: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Sort options
    let sort = { createdAt: -1 }; // Default: newest first
    if (sortBy === 'date') {
      sort = { date: order === 'asc' ? 1 : -1, time: order === 'asc' ? 1 : -1 };
    } else if (sortBy === 'status') {
      sort = { status: order === 'asc' ? 1 : -1, createdAt: -1 };
    } else if (sortBy === 'price') {
      sort = { price: order === 'asc' ? 1 : -1 };
    }
    
    // Execute query with pagination
    const [appointments, total] = await Promise.all([
      Booking.find(filter).sort(sort).skip(skip).limit(limit),
      Booking.countDocuments(filter)
    ]);
    
    // Get summary statistics
    const stats = await Booking.aggregate([
      { $match: { counselorEmail: email } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const summary = {};
    stats.forEach(s => {
      summary[s._id] = s.count;
    });
    
    return res.status(200).json({
      appointments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      summary
    });
  } catch (err) {
    console.error("Get counselor appointments failed:", err);
    return res.status(500).json({ error: "Failed to fetch appointments" });
  }
};

// PUT /api/bookings/:id
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, counselorId, feedback, rating } = req.body;

    // Validate booking ID
    if (!id) {
      return res.status(400).json({
        error: "Booking ID is required",
        code: "MISSING_BOOKING_ID",
      });
    }

    // Find the booking
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        error: "Booking not found",
        code: "BOOKING_NOT_FOUND",
      });
    }

    // Validate status and ensure proper flow
    const validStatuses = [
      "pending",
      "confirmed",
      "rejected",
      "cancelled",
      "in_session",
      "completed",
      "no_show",
    ];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Valid status is required: " + validStatuses.join(", "),
        code: "INVALID_STATUS",
      });
    }

    // Validate status transition
    const validTransitions = {
      pending: ["confirmed", "rejected", "cancelled"],
      confirmed: ["in_session", "cancelled", "no_show"],
      in_session: ["completed", "cancelled"],
      paid_pending_counselor: ["confirmed", "rejected"],
    };

    if (
      validTransitions[booking.status] &&
      !validTransitions[booking.status].includes(status) &&
      booking.status !== status
    ) {
      return res.status(400).json({
        error: `Cannot transition from ${booking.status} to ${status}`,
        code: "INVALID_STATUS_TRANSITION",
        validTransitions: validTransitions[booking.status],
      });
    }

    // If counselorId is provided, verify the counselor has permission to update this booking
    if (counselorId) {
      const Counselor = require("../models/Counselor-model");
      const counselor = await Counselor.findOne({ googleId: counselorId });
      if (!counselor) {
        return res.status(403).json({
          error: "Counselor not found",
          code: "COUNSELOR_NOT_FOUND",
        });
      }

      if (
        counselor.email.toLowerCase() !== booking.counselorEmail.toLowerCase()
      ) {
        return res.status(403).json({
          error: "You do not have permission to update this booking",
          code: "PERMISSION_DENIED",
        });
      }
    }

    // Update booking
    booking.status = status;
    if (notes) booking.notes = notes;

    // Add status update timestamp
    booking.lastUpdated = new Date();

    // If status is completed, add completion timestamp and feedback if provided
    if (status === "completed") {
      booking.completedAt = new Date();

      // Add feedback and rating if provided
      if (feedback) booking.feedback = feedback;
      if (rating && rating >= 1 && rating <= 5) booking.rating = rating;

      // Update counselor stats if this is a new completion
      if (booking.status !== "completed") {
        try {
          const Counselor = require("../models/Counselor-model");
          const counselor = await Counselor.findOne({
            email: booking.counselorEmail,
          });
          if (counselor) {
            counselor.completedSessions =
              (counselor.completedSessions || 0) + 1;
            if (rating) {
              const totalRatings = (counselor.totalRatings || 0) + 1;
              const ratingSum =
                (counselor.avgRating || 0) * (totalRatings - 1) + rating;
              counselor.avgRating = ratingSum / totalRatings;
              counselor.totalRatings = totalRatings;
            }
            await counselor.save();
          }
        } catch (err) {
          console.error("Failed to update counselor stats:", err);
          // Continue with booking update even if counselor stats update fails
        }
      }
    }

    try {
      await booking.save();

      // Emit events with error handling
      try {
        // Emit event to user
        emitToUser(booking.googleId, "booking:update", {
          booking,
        });

        // Emit event to counselor
        emitToCounselor(booking.counselorEmail, "booking:update", {
          booking,
        });

        console.log(`Booking update notification sent for booking ${id}`);
      } catch (socketError) {
        // Log socket error but don't fail the update
        console.error("Error sending socket notification:", socketError);
      }

      res.json({
        message: "Booking updated successfully",
        booking,
      });
    } catch (saveError) {
      console.error("Error saving booking update:", saveError);
      res.status(500).json({
        error: "Failed to save booking update",
        code: "DATABASE_ERROR",
        details: saveError.message,
      });
    }
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({
      error: "Failed to update booking",
      code: "UPDATE_ERROR",
      details: error.message,
    });
  }
};

// POST /api/bookings/:id/join
exports.joinSession = async (req, res) => {
  try {
    const id = req.params.id;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Verify user is authorized for this booking
    let isAuthorized = false;
    let email = String(req.body?.email || "").toLowerCase();
    let googleId = req.body?.googleId;
    let isCounselor = false;

    try {
      const { getCurrentUser } = require("../utils/auth-helper");
      const u = await getCurrentUser(req);
      if (u?.email) email = String(u.email).toLowerCase();
      if (u?.googleId) googleId = u.googleId;
    } catch (_) {}

    // Check if user is the counselor or the client
    if (String(booking.counselorEmail || "").toLowerCase() === email) {
      isAuthorized = true;
      isCounselor = true;
    } else if (booking.googleId === googleId) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "Not authorized for this booking" });
    }

    // Check if booking is in a valid state for joining (confirmed or already in_session)
    if (booking.status !== "confirmed" && booking.status !== "in_session") {
      return res.status(400).json({ error: "Booking not in a joinable state" });
    }

    // If this is a counselor initiating a join request, emit the event
    if (isCounselor && req.body.initiateJoinRequest) {
      const { emitSessionJoinRequest } = require("../utils/socket");
      emitSessionJoinRequest({
        bookingId: booking._id.toString(),
        sessionType: booking.sessionType,
        counselorName: booking.counselorName,
        counselorEmail: email,
        userGoogleId: booking.googleId,
      });

      return res.json({
        success: true,
        message: "Join request sent to user",
        sessionType: booking.sessionType,
      });
    }

    // If this is a user accepting a join request, emit session started event
    if (!isCounselor && req.body.acceptJoinRequest) {
      const { getIO } = require("../utils/socket");
      const io = getIO();
      const roomName = `session:${booking._id.toString()}`;

      io.to(roomName).emit("session:started", {
        bookingId: booking._id.toString(),
        startTime: new Date(),
        sessionType: booking.sessionType,
        duration: booking.durationMinutes,
      });

      // Update booking status to in_session
      booking.status = "in_session";
      booking.sessionStartTime = new Date();
      await booking.save();

      // Emit booking update
      const { emitBookingUpdate } = require("../utils/socket");
      emitBookingUpdate(booking);

      // Schedule automatic session ending
      const sessionDuration = booking.durationMinutes || 60; // Default to 60 minutes if not specified
      setTimeout(async () => {
        try {
          const updatedBooking = await Booking.findById(booking._id);
          if (updatedBooking && updatedBooking.status === "in_session") {
            updatedBooking.status = "completed";
            await updatedBooking.save();

            // Emit session ended event
            io.to(roomName).emit("session:ended", {
              bookingId: updatedBooking._id.toString(),
              endTime: new Date(),
              sessionType: updatedBooking.sessionType,
            });

            // Emit booking update
            emitBookingUpdate(updatedBooking);
          }
        } catch (err) {
          console.error("Auto-end session error:", err);
        }
      }, sessionDuration * 60 * 1000); // Convert minutes to milliseconds
    }

    // Ensure joinUrl/roomId exists before returning (for confirmed state without acceptJoinRequest)
    if (!booking.joinUrl || !booking.roomId) {
      const ids = buildJoinUrl(booking);
      booking.roomId = ids.roomId;
      booking.joinUrl = ids.joinUrl;
      await booking.save();
    }
    // Return join URL
    res.json({
      joinUrl: booking.joinUrl,
      roomId: booking.roomId,
      sessionType: booking.sessionType,
    });
  } catch (error) {
    console.error("Join session error:", error);
    res.status(500).json({ error: "Failed to join session" });
  }
};

function buildJoinUrl(booking) {
  const roomId = booking._id.toString();
  const type = String(booking.sessionType || "video").toLowerCase();
  let joinUrl = `https://meet.jit.si/JeevanRakshak-${roomId}`;
  if (type === "call")
    joinUrl = `https://meet.jit.si/JeevanRakshak-Call-${roomId}`;
  if (type === "chat")
    joinUrl = `https://meet.jit.si/JeevanRakshak-Chat-${roomId}`;
  return { roomId, joinUrl };
}

// POST /api/bookings/:id/confirm-payment - Counselor confirms payment and books session
exports.confirmPaymentAndBook = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Determine counselor email from auth
    let email = String(req.body?.email || "").toLowerCase();
    try {
      const { getCurrentUser } = require("../utils/auth-helper");
      const u = await getCurrentUser(req);
      if (u?.email) email = String(u.email).toLowerCase();
    } catch (_) {}
    
    if (!id || !email) {
      return res.status(400).json({ error: "Booking ID and counselor email required" });
    }
    
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    // Verify counselor authorization
    if (String(booking.counselorEmail || "").toLowerCase() !== email) {
      return res.status(403).json({ error: "Not authorized for this booking" });
    }
    
    // Must be paid; allow either 'paid_pending_counselor' (normal) or 'pending_payment' if Stripe verifies paid
    if (booking.status !== "paid_pending_counselor") {
      let okToConfirm = false;
      if (booking.status === "pending_payment") {
        try {
          // Verify via Stripe if possible
          if (stripe && booking.checkoutSessionId) {
            const session = await stripe.checkout.sessions.retrieve(booking.checkoutSessionId);
            if (session && (session.payment_status === 'paid' || session.status === 'complete')) {
              okToConfirm = true;
              // update booking to paid_pending_counselor for consistency before confirming
              booking.status = "paid_pending_counselor";
              await booking.save();
            }
          } else {
            // If Stripe not configured (e.g., local dev), allow counselor to confirm manually
            okToConfirm = true;
          }
        } catch (verifyErr) {
          console.error("Stripe verify failed:", verifyErr?.message || verifyErr);
        }
      }
      if (!okToConfirm) {
        return res.status(400).json({ 
          error: "Booking not paid yet. Awaiting payment completion",
          currentStatus: booking.status 
        });
      }
    }
    
    // Generate join URL and room ID
    const { roomId, joinUrl } = buildJoinUrl(booking);
    
    // Update booking to confirmed
    booking.status = "confirmed";
    booking.roomId = roomId;
    booking.joinUrl = joinUrl;
    booking.lastUpdated = new Date();
    await booking.save();
    
    // Update counselor earnings atomically
    try {
      const counselor = await Counselor.findOne({ email: email });
      if (counselor && !booking.earningsCredited) {
        const now = new Date();
        const lastUpdated = counselor.earnings?.lastUpdated || now;
        const isNewMonth = 
          lastUpdated.getMonth() !== now.getMonth() ||
          lastUpdated.getFullYear() !== now.getFullYear();
        
        const price = booking.price || 0;
        const newThisMonth = isNewMonth 
          ? price 
          : (counselor.earnings?.thisMonth || 0) + price;
        const newTotal = (counselor.earnings?.total || 0) + price;
        
        await Counselor.updateOne(
          { email: email },
          {
            $set: {
              "earnings.total": newTotal,
              "earnings.thisMonth": newThisMonth,
              "earnings.lastUpdated": now
            }
          }
        );
        
        // Mark booking as credited
        booking.earningsCredited = true;
        await booking.save();
        
        // Emit real-time earnings update
        emitToCounselor(email, "earnings:updated", {
          bookingId: booking._id.toString(),
          thisMonthDelta: price,
          totalDelta: price,
          thisMonth: newThisMonth,
          total: newTotal,
          timestamp: now
        });
      }
    } catch (err) {
      console.error("Update counselor earnings failed:", err);
    }
    
    // Emit booking updates in real-time
    emitBookingUpdate(booking);
    
    // Notify user booking is confirmed
    try {
      emitToUser(booking.googleId, "booking:confirmed", {
        id: booking._id.toString(),
        counselorName: booking.counselorName,
        sessionType: booking.sessionType,
        date: booking.date,
        time: booking.time,
        joinUrl: booking.joinUrl,
        status: "confirmed"
      });
    } catch (_) {}
    
    return res.status(200).json({
      success: true,
      booking,
      message: "Payment confirmed and session booked"
    });
  } catch (err) {
    console.error("Confirm payment and book failed:", err);
    return res.status(500).json({ error: "Failed to confirm payment and book session" });
  }
};

// POST /api/bookings/:id/accept
exports.acceptBooking = async (req, res) => {
  try {
    const id = req.params.id;
    // Determine counselor email from auth cookie if available
    let email = String(req.body?.email || "").toLowerCase();
    try {
      const token = req.cookies?.auth_token;
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        const u = await User.findOne({ googleId: decoded.googleId });
        if (u?.email) email = String(u.email).toLowerCase();
      }
    } catch (_) {}
    if (!id || !email)
      return res.status(400).json({ error: "id and email required" });
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (String(booking.counselorEmail || "").toLowerCase() !== email) {
      return res.status(403).json({ error: "Not authorized for this booking" });
    }
    if (booking.status !== "paid_pending_counselor") {
      return res
        .status(400)
        .json({ error: "Booking not awaiting counselor confirmation" });
    }
    const { roomId, joinUrl } = buildJoinUrl(booking);
    booking.status = "confirmed";
    booking.roomId = roomId;
    booking.joinUrl = joinUrl;
    booking.lastUpdated = new Date();
    await booking.save();

    // Update counselor earnings
    try {
      const Counselor = require("../models/Counselor-model");
      const counselor = await Counselor.findOne({ email: email });
      if (counselor) {
        // Check if we need to reset monthly earnings (if last update was in a different month)
        const now = new Date();
        const lastUpdated = counselor.earnings?.lastUpdated || now;
        const isNewMonth =
          lastUpdated.getMonth() !== now.getMonth() ||
          lastUpdated.getFullYear() !== now.getFullYear();

        // Update earnings
        const price = booking.price || 0;
        const update = {
          "earnings.total": (counselor.earnings?.total || 0) + price,
          "earnings.thisMonth": isNewMonth
            ? price
            : (counselor.earnings?.thisMonth || 0) + price,
          "earnings.lastUpdated": now,
        };

        await Counselor.updateOne({ email: email }, { $set: update });

        // Mark booking as earnings credited so end-session won't double-credit
        try {
          booking.earningsCredited = true;
          await booking.save();
        } catch (_) {}

        // Emit earnings update event
        emitToCounselor(email, "earnings:updated", {
          thisMonthDelta: price,
          totalDelta: price,
          thisMonth: isNewMonth
            ? price
            : (counselor.earnings?.thisMonth || 0) + price,
          total: (counselor.earnings?.total || 0) + price,
        });
      }
    } catch (err) {
      console.error("Update counselor earnings failed:", err);
      // Continue with the booking process even if earnings update fails
    }

    // Use the enhanced emitBookingUpdate function for real-time updates
    const { emitBookingUpdate } = require("../utils/socket");
    emitBookingUpdate(booking);

    // Also send the traditional event notifications for backward compatibility
    try {
      const { emitToUser, emitToCounselor } = require("../utils/socket");
      emitToUser(booking.googleId, "booking:confirmed", {
        id: booking._id.toString(),
        counselorName: booking.counselorName,
        sessionType: booking.sessionType,
        date: booking.date,
        time: booking.time,
        joinUrl: booking.joinUrl,
      });
      if (booking.counselorEmail) {
        emitToCounselor(booking.counselorEmail, "booking:confirmed", {
          id: booking._id.toString(),
          googleId: booking.googleId,
          sessionType: booking.sessionType,
          date: booking.date,
          time: booking.time,
          joinUrl: booking.joinUrl,
        });
      }
    } catch (_) {}

    // No email/SMS on accept; realtime events already emitted

    res.status(200).json(booking);
  } catch (err) {
    console.error("Accept booking failed:", err);
    res.status(500).json({ error: "Accept booking failed" });
  }
};

// POST /api/bookings/:id/reject
exports.rejectBooking = async (req, res) => {
  try {
    const id = req.params.id;
    // Determine counselor email from auth cookie if available
    let email = String(req.body?.email || "").toLowerCase();
    try {
      const token = req.cookies?.auth_token;
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        const u = await User.findOne({ googleId: decoded.googleId });
        if (u?.email) email = String(u.email).toLowerCase();
      }
    } catch (_) {}
    const reason = String(req.body?.reason || "").trim();
    if (!id || !email)
      return res.status(400).json({ error: "id and email required" });
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (String(booking.counselorEmail || "").toLowerCase() !== email) {
      return res.status(403).json({ error: "Not authorized for this booking" });
    }
    if (booking.status !== "paid_pending_counselor") {
      return res
        .status(400)
        .json({ error: "Booking not awaiting counselor confirmation" });
    }
    booking.status = "cancelled";
    await booking.save();

    try {
      emitToUser(booking.googleId, "booking:rejected", {
        id: booking._id.toString(),
        reason,
      });
      if (booking.counselorEmail)
        emitToCounselor(booking.counselorEmail, "booking:rejected", {
          id: booking._id.toString(),
          reason,
        });
    } catch (_) {}

    // Nudge counselor dashboard to refresh stats
    try {
      if (booking.counselorEmail) {
        emitToCounselor(booking.counselorEmail, "stats:update", {
          reason: "booking_rejected",
          bookingId: booking._id.toString(),
        });
      }
    } catch (_) {}

    // No email/SMS on reject; realtime events already emitted

    res.status(200).json(booking);
  } catch (err) {
    console.error("Reject booking failed:", err);
    res.status(500).json({ error: "Reject booking failed" });
  }
};

// GET /api/bookings?googleId=xxx
exports.getBookings = async (req, res) => {
  try {
    const { googleId } = req.query;
    if (!googleId) return res.status(400).json({ error: "googleId required" });
    const items = await Booking.find({ googleId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(items);
  } catch (err) {
    console.error("Get bookings failed:", err);
    res.status(500).json({ error: "Get bookings failed" });
  }
};

// POST /api/bookings/:id/start-session
exports.startSession = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "id required" });
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Only allow starting sessions that are confirmed
    if (booking.status !== "confirmed") {
      return res
        .status(400)
        .json({ error: "Session can only be started for confirmed bookings" });
    }

    // Ensure join URL exists
    if (!booking.joinUrl || !booking.roomId) {
      const { roomId, joinUrl } = buildJoinUrl(booking);
      booking.roomId = roomId;
      booking.joinUrl = joinUrl;
    }
    booking.status = "in_session";
    await booking.save();

    // Emit realtime hint events (non-blocking)
    try {
      emitToUser(booking.googleId, "appointment:updated", {
        id: booking._id.toString(),
        status: "in_session",
      });
      if (booking.counselorEmail) {
        emitToCounselor(booking.counselorEmail, "appointment:updated", {
          id: booking._id.toString(),
          status: "in_session",
        });
      }
    } catch (_) {}

    return res.status(200).json({ message: "Session started", booking });
  } catch (err) {
    console.error("Start session failed:", err);
    return res.status(500).json({ error: "Start session failed" });
  }
};

// POST /api/bookings/:id/end-session
exports.endSession = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "id required" });
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Persist completed status now that schema supports it.
    booking.status = "completed";
    await booking.save();
    try {
      emitToUser(booking.googleId, "appointment:updated", {
        id: booking._id.toString(),
        status: "completed",
      });
      if (booking.counselorEmail) {
        emitToCounselor(booking.counselorEmail, "appointment:updated", {
          id: booking._id.toString(),
          status: "completed",
        });
      }
    } catch (_) {}

    // Nudge counselor dashboard to refresh stats/clients after completion
    try {
      if (booking.counselorEmail) {
        emitToCounselor(booking.counselorEmail, "stats:update", {
          reason: "session_completed",
          bookingId: booking._id.toString(),
        });
        // Earnings update: credit counselor only if not already credited
        try {
          const Counselor = require("../models/Counselor-model");
          const counselor = await Counselor.findOne({
            email: booking.counselorEmail,
          });
          if (counselor) {
            // increment completedSessions
            const completedDelta = 1;
            let price = booking.price || counselor.price || 0;

            // Only credit earnings if booking wasn't already credited (avoid double-count)
            if (!booking.earningsCredited) {
              const now = new Date();
              const lastUpdated = counselor.earnings?.lastUpdated || now;
              const isNewMonth =
                lastUpdated.getMonth() !== now.getMonth() ||
                lastUpdated.getFullYear() !== now.getFullYear();

              const update = {
                $inc: {
                  completedSessions: completedDelta,
                },
                $set: {
                  "earnings.lastUpdated": now,
                },
              };

              // update earnings totals properly
              const newThisMonth = isNewMonth
                ? price
                : (counselor.earnings?.thisMonth || 0) + price;
              const newTotal = (counselor.earnings?.total || 0) + price;

              update.$set["earnings.thisMonth"] = newThisMonth;
              update.$set["earnings.total"] = newTotal;

              await Counselor.updateOne(
                { email: booking.counselorEmail },
                update
              );

              // mark booking credited
              booking.earningsCredited = true;
              await booking.save();

              // emit earnings update
              emitToCounselor(booking.counselorEmail, "earnings:updated", {
                thisMonthDelta: price,
                totalDelta: price,
                completedSessionsDelta: completedDelta,
                thisMonth: newThisMonth,
                total: newTotal,
              });
            } else {
              // still emit completedSessions delta so UI updates
              await Counselor.updateOne(
                { email: booking.counselorEmail },
                { $inc: { completedSessions: 1 } }
              );
              emitToCounselor(booking.counselorEmail, "earnings:updated", {
                completedSessionsDelta: 1,
              });
            }
          }
        } catch (err) {
          console.error("Earnings credit on endSession failed:", err);
        }
      }
    } catch (_) {}

    return res.status(200).json({ message: "Session ended", booking });
  } catch (err) {
    console.error("End session failed:", err);
    return res.status(500).json({ error: "End session failed" });
  }
};

// POST /api/bookings/:id/request-join (counselor triggers join request by category)
exports.requestJoin = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id)
      return res
        .status(400)
        .json({ error: "id required", code: "MISSING_BOOKING_ID" });
    const booking = await Booking.findById(id);
    if (!booking)
      return res
        .status(404)
        .json({ error: "Booking not found", code: "BOOKING_NOT_FOUND" });

    // Allow joining for confirmed status (after payment confirmed)
    if (booking.status !== "confirmed" && booking.status !== "in_session") {
      return res.status(400).json({
        error: "Can only request join for confirmed or in_session sessions",
        status: booking.status,
        code: "INVALID_BOOKING_STATUS",
      });
    }

    // Check if session time is valid (not too early, not too late)
    const sessionTime = new Date(`${booking.date}T${booking.time}`);
    const now = new Date();
    const timeDiff = Math.abs(sessionTime - now) / (1000 * 60); // difference in minutes

    if (timeDiff > 15 && sessionTime > now) {
      return res.status(400).json({
        error: "Cannot join session more than 15 minutes before scheduled time",
        code: "TOO_EARLY_TO_JOIN",
        scheduledTime: sessionTime,
        currentTime: now,
      });
    }

    // Ensure join URL is ready
    if (!booking.joinUrl || !booking.roomId) {
      const { roomId, joinUrl } = buildJoinUrl(booking);
      booking.roomId = roomId;
      booking.joinUrl = joinUrl;
      await booking.save();
    }

    // Add timestamp for tracking join request time
    const requestTimestamp = new Date();
    booking.lastJoinRequestTime = requestTimestamp;
    await booking.save();

    try {
      // Emit to user with session category/type info for real-time acceptance
      emitToUser(booking.googleId, "session:join_request", {
        bookingId: booking._id.toString(),
        joinUrl: booking.joinUrl,
        sessionType: booking.sessionType, // Category: chat, call, video
        category: booking.sessionType,
        date: booking.date,
        time: booking.time,
        requestTime: requestTimestamp,
        counselorName: booking.counselorName,
        counselorEmail: booking.counselorEmail,
        durationMinutes: booking.durationMinutes || 60
      });

      // Also use booking:join_request for backward compatibility
      emitToUser(booking.googleId, "booking:join_request", {
        id: booking._id.toString(),
        joinUrl: booking.joinUrl,
        sessionType: booking.sessionType,
        date: booking.date,
        time: booking.time,
        requestTime: requestTimestamp,
        counselorName: booking.counselorName,
      });

      // Emit to counselor with confirmation
      if (booking.counselorEmail) {
        emitToCounselor(booking.counselorEmail, "session:join_request_sent", {
          bookingId: booking._id.toString(),
          status: "sent",
          timestamp: requestTimestamp,
          sessionType: booking.sessionType,
          userName: booking.userName || "User",
        });
      }

      // Emit to the booking room
      const { getIO } = require("../utils/socket");
      const io = getIO();
      io.to(`booking:${booking._id.toString()}`).emit("session:join_request", {
        bookingId: booking._id.toString(),
        status: "requested",
        timestamp: requestTimestamp,
        sessionType: booking.sessionType,
        category: booking.sessionType
      });
    } catch (error) {
      console.error("Error emitting join request events:", error);
    }

    return res.status(200).json({
      ok: true,
      joinUrl: booking.joinUrl,
      roomId: booking.roomId,
      requestTime: requestTimestamp,
      sessionType: booking.sessionType,
      category: booking.sessionType
    });
  } catch (err) {
    console.error("Request join failed:", err);
    return res.status(500).json({
      error: "Request join failed",
      code: "JOIN_REQUEST_FAILED",
      message: err.message,
    });
  }
};

// POST /api/bookings/:id/accept-join (user accepts join request in real-time)
exports.acceptJoin = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "id required" });
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Allow joining for confirmed status (after payment and counselor confirmation)
    if (booking.status !== "confirmed" && booking.status !== "in_session") {
      return res.status(400).json({
        error: "Join can only be accepted for confirmed or in_session sessions",
        status: booking.status,
      });
    }

    // Ensure join URL exists
    if (!booking.joinUrl || !booking.roomId) {
      const { roomId, joinUrl } = buildJoinUrl(booking);
      booking.roomId = roomId;
      booking.joinUrl = joinUrl;
    }

    // Update booking status to in_session if it was confirmed
    const sessionStartTime = new Date();
    if (booking.status === "confirmed") {
      booking.status = "in_session";
      booking.sessionStartTime = sessionStartTime;
    }

    // Track join acceptance time
    booking.joinAcceptedTime = new Date();
    await booking.save();

    // Create room name for session
    const roomName = `session:${booking._id.toString()}`;
    const sessionDuration = booking.durationMinutes || 60;

    try {
      // Get socket.io instance
      const { getIO } = require("../utils/socket");
      const io = getIO();

      // Notify both parties that session has started
      const sessionStartData = {
        bookingId: booking._id.toString(),
        startTime: sessionStartTime,
        sessionType: booking.sessionType,
        category: booking.sessionType,
        joinUrl: booking.joinUrl,
        roomId: booking.roomId,
        durationMinutes: sessionDuration
      };

      // Emit to counselor
      emitToCounselor(booking.counselorEmail, "session:started", sessionStartData);
      emitToCounselor(booking.counselorEmail, "booking:join_accepted", {
        id: booking._id.toString(),
        status: "accepted",
        timestamp: booking.joinAcceptedTime,
        joinUrl: booking.joinUrl,
      });

      // Emit to user
      emitToUser(booking.googleId, "session:started", sessionStartData);
      emitToUser(booking.googleId, "booking:join_ready", {
        id: booking._id.toString(),
        joinUrl: booking.joinUrl,
        roomId: booking.roomId,
        sessionType: booking.sessionType,
      });

      // Emit to session room
      io.to(roomName).emit("session:started", sessionStartData);

      // Emit booking update to all relevant parties
      emitBookingUpdate(booking);
    } catch (error) {
      console.error("Error emitting join acceptance events:", error);
    }

    // Schedule automatic session end and feedback prompt
    const endTimeMs = sessionDuration * 60 * 1000;
    setTimeout(async () => {
      try {
        const updatedBooking = await Booking.findById(booking._id);
        if (updatedBooking && updatedBooking.status === "in_session") {
          // Mark session as completed
          updatedBooking.status = "completed";
          updatedBooking.sessionEndTime = new Date();
          await updatedBooking.save();

          const { getIO } = require("../utils/socket");
          const io = getIO();

          // Emit session ended event
          const sessionEndData = {
            bookingId: updatedBooking._id.toString(),
            endTime: updatedBooking.sessionEndTime,
            sessionType: updatedBooking.sessionType,
            category: updatedBooking.sessionType,
            duration: sessionDuration
          };

          io.to(roomName).emit("session:ended", sessionEndData);
          emitToUser(updatedBooking.googleId, "session:ended", sessionEndData);
          emitToCounselor(updatedBooking.counselorEmail, "session:ended", sessionEndData);

          // Prompt user for feedback and review
          emitToUser(updatedBooking.googleId, "session:feedback_request", {
            bookingId: updatedBooking._id.toString(),
            counselorName: updatedBooking.counselorName,
            sessionType: updatedBooking.sessionType,
            endTime: updatedBooking.sessionEndTime
          });

          // Emit booking update
          emitBookingUpdate(updatedBooking);

          console.log(`Session ${updatedBooking._id} automatically ended after ${sessionDuration} minutes`);
        }
      } catch (err) {
        console.error("Auto-end session error:", err);
      }
    }, endTimeMs);

    return res.status(200).json({
      ok: true,
      joinUrl: booking.joinUrl,
      roomId: booking.roomId,
      status: booking.status,
      sessionType: booking.sessionType,
      category: booking.sessionType,
      sessionStartTime: sessionStartTime,
      durationMinutes: sessionDuration
    });
  } catch (err) {
    console.error("Accept join failed:", err);
    return res.status(500).json({ error: "Accept join failed" });
  }
};

// POST /api/bookings/:id/feedback
exports.addFeedback = async (req, res) => {
  try {
    const id = req.params.id;
    const { rating, comment } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Ensure the caller is the owner via auth cookie
    try {
      const token = req.cookies?.auth_token;
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        const u = await User.findOne({ googleId: decoded.googleId });
        if (!u || u.googleId !== booking.googleId) {
          return res
            .status(403)
            .json({ error: "Not authorized for this booking" });
        }
      } else {
        return res.status(401).json({ error: "Not authenticated" });
      }
    } catch (_) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Allow feedback for active or completed sessions
    if (!["completed", "in_session", "confirmed"].includes(booking.status)) {
      return res.status(400).json({
        error: "Feedback only allowed for active or completed sessions",
      });
    }

    if (rating != null)
      booking.feedbackRating = Math.max(1, Math.min(5, Number(rating)));
    if (typeof comment === "string")
      booking.feedbackComment = String(comment).slice(0, 2000);
    await booking.save();

    // Notify counselor about feedback update
    try {
      if (booking.counselorEmail) {
        emitToCounselor(booking.counselorEmail, "appointment:updated", {
          id: booking._id.toString(),
          status: booking.status,
          feedbackRating: booking.feedbackRating,
        });
      }
    } catch (_) {}

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Add feedback failed:", err);
    return res.status(500).json({ error: "Add feedback failed" });
  }
};

// POST /api/bookings/:id/reschedule
exports.rescheduleBooking = async (req, res) => {
  try {
    const id = req.params.id;
    const { date, time } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });
    if (!date || !time)
      return res.status(400).json({ error: "date and time required" });

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Basic permission: only counselor or the booking owner may reschedule
    // if middleware provided req.user / req.counselor set those checks elsewhere

    // Prevent rescheduling of completed or cancelled sessions
    if (["completed", "cancelled", "no_show"].includes(booking.status)) {
      return res
        .status(400)
        .json({ error: "Cannot reschedule completed/cancelled session" });
    }

    // Check for conflict: same counselor, same date & time with confirmed/in_session
    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      counselorEmail: booking.counselorEmail,
      date: String(date),
      time: String(time),
      status: { $in: ["confirmed", "in_session"] },
    });
    if (conflict) {
      return res
        .status(409)
        .json({
          error: "Time slot already taken by another confirmed session",
        });
    }

    // Apply reschedule
    booking.date = String(date);
    booking.time = String(time);
    // If session was confirmed, keep confirmed; otherwise leave status as-is
    await booking.save();

    // Emit update to parties
    try {
      const {
        emitBookingUpdate,
        emitToUser,
        emitToCounselor,
      } = require("../utils/socket");
      emitBookingUpdate(booking);
      if (booking.googleId)
        emitToUser(booking.googleId, "appointment:updated", {
          id: booking._id.toString(),
          date: booking.date,
          time: booking.time,
          status: booking.status,
        });
      if (booking.counselorEmail)
        emitToCounselor(booking.counselorEmail, "appointment:updated", {
          id: booking._id.toString(),
          date: booking.date,
          time: booking.time,
          status: booking.status,
        });
    } catch (_) {}

    return res.status(200).json({ ok: true, booking });
  } catch (err) {
    console.error("Reschedule failed:", err);
    return res.status(500).json({ error: "Reschedule failed" });
  }
};
