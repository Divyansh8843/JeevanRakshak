const Booking = require('../models/Booking-model');
const { emitToUser, emitToCounselor, io } = require('../utils/socket');
const User = require('../models/User-model');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
const { v4: uuidv4 } = require('uuid');

// POST /api/bookings
exports.createBooking = async (req, res) => {
  try {
    const { googleId, counselorName, counselorEmail, sessionType = 'video', date, time, notes } = req.body || {};
    
    // Enhanced validation with specific error codes
    if (!googleId) {
      return res.status(400).json({ 
        error: 'User ID is required', 
        code: 'MISSING_USER_ID' 
      });
    }
    
    if (!counselorName) {
      return res.status(400).json({ 
        error: 'Counselor name is required', 
        code: 'MISSING_COUNSELOR_NAME' 
      });
    }
    
    if (!counselorEmail) {
      return res.status(400).json({ 
        error: 'Counselor email is required', 
        code: 'MISSING_COUNSELOR_EMAIL' 
      });
    }
    
    if (!date) {
      return res.status(400).json({ 
        error: 'Appointment date is required', 
        code: 'MISSING_DATE' 
      });
    }
    
    if (!time) {
      return res.status(400).json({ 
        error: 'Appointment time is required', 
        code: 'MISSING_TIME' 
      });
    }
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use YYYY-MM-DD', 
        code: 'INVALID_DATE_FORMAT' 
      });
    }
    
    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({ 
        error: 'Invalid time format. Use HH:MM', 
        code: 'INVALID_TIME_FORMAT' 
      });
    }
    
    // Validate session type
    const validSessionTypes = ['video', 'audio', 'chat', 'in-person'];
    if (!validSessionTypes.includes(sessionType.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Invalid session type. Must be one of: video, audio, chat, in-person', 
        code: 'INVALID_SESSION_TYPE' 
      });
    }
    
    // Validate appointment is in the future
    const appointmentDate = new Date(`${date}T${time}`);
    if (appointmentDate <= new Date()) {
      return res.status(400).json({ 
        error: 'Appointment must be scheduled in the future', 
        code: 'PAST_APPOINTMENT' 
      });
    }

    // Check for existing bookings at the same time
    const existingBooking = await Booking.findOne({
      counselorEmail: counselorEmail.toLowerCase(),
      date,
      time,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingBooking) {
      return res.status(400).json({ 
        error: 'This time slot is already booked', 
        code: 'SLOT_ALREADY_BOOKED' 
      });
    }
    
    // Fetch user to verify they exist
    const user = await User.findOne({ googleId });
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found', 
        code: 'USER_NOT_FOUND' 
      });
    }
    
    // Fetch counselor to verify they exist
    const counselor = await Counselor.findOne({ email: counselorEmail.toLowerCase() });
    if (!counselor) {
      return res.status(404).json({ 
        error: 'Counselor not found', 
        code: 'COUNSELOR_NOT_FOUND' 
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
      status: 'pending',
      sessionId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Emit real-time event to counselor
    try {
      emitToCounselor(counselorEmail, 'booking:new', doc);
      
      // Also emit to the counselors_list room
      if (io()) {
        io().to('counselors_list').emit('counselor:booking_update', {
          email: counselorEmail.toLowerCase(),
          booking: doc
        });
      }
      
      // Log successful notification
      console.log(`Booking notification sent to counselor: ${counselorEmail}`);
    } catch (socketError) {
      // Log socket error but don't fail the booking creation
      console.error('Error sending socket notification:', socketError);
    }

    // Try to send email notification to counselor
    try {
      const mailer = require('../utils/mailer');
      await mailer.sendCounselorBookingAlert(counselorEmail, {
        userName: user.name || 'A user',
        date,
        time,
        sessionType,
        notes: notes || 'No additional notes'
      });
    } catch (emailError) {
      // Log email error but don't fail the booking creation
      console.error('Error sending email notification:', emailError);
    }

    return res.status(201).json(doc);
  } catch (err) {
    console.error('Create booking failed:', err);
    return res.status(500).json({ error: 'Create booking failed' });
  }
};

// GET /api/bookings/pending?email=<counselorEmail>
exports.listPendingForCounselor = async (req, res) => {
  try {
    let email = String(req.query.email || '').toLowerCase();
    // Prefer authenticated counselor email from cookie
    try {
      const token = req.cookies?.auth_token;
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        const u = await User.findOne({ googleId: decoded.googleId });
        if (u?.email) email = String(u.email).toLowerCase();
      }
    } catch (_) {}

    // PUT /api/bookings/:id
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, counselorId, feedback, rating } = req.body;

    // Validate booking ID
    if (!id) {
      return res.status(400).json({ 
        error: 'Booking ID is required', 
        code: 'MISSING_BOOKING_ID' 
      });
    }

    // Validate status and ensure proper flow
    const validStatuses = ['pending', 'confirmed', 'rejected', 'cancelled', 'in_session', 'completed', 'no_show'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Valid status is required: ' + validStatuses.join(', '), 
        code: 'INVALID_STATUS' 
      });
    }
    

    
    // Validate status transition
    const validTransitions = {
      'pending': ['confirmed', 'rejected', 'cancelled'],
      'confirmed': ['in_session', 'cancelled', 'no_show'],
      'in_session': ['completed', 'cancelled'],
      'paid_pending_counselor': ['confirmed', 'rejected']
    };
    
    if (validTransitions[booking.status] && 
        !validTransitions[booking.status].includes(status) && 
        booking.status !== status) {
      return res.status(400).json({
        error: `Cannot transition from ${booking.status} to ${status}`,
        code: 'INVALID_STATUS_TRANSITION',
        validTransitions: validTransitions[booking.status]
      });
    }

    // Find the booking
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ 
        error: 'Booking not found', 
        code: 'BOOKING_NOT_FOUND' 
      });
    }

    // If counselorId is provided, verify the counselor has permission to update this booking
    if (counselorId) {
      const counselor = await Counselor.findOne({ googleId: counselorId });
      if (!counselor) {
        return res.status(403).json({ 
          error: 'Counselor not found', 
          code: 'COUNSELOR_NOT_FOUND' 
        });
      }
      
      if (counselor.email.toLowerCase() !== booking.counselorEmail.toLowerCase()) {
        return res.status(403).json({ 
          error: 'You do not have permission to update this booking', 
          code: 'PERMISSION_DENIED' 
        });
      }
    }

    // Update booking
    booking.status = status;
    if (notes) booking.notes = notes;
    
    // Add status update timestamp
    booking.lastUpdated = new Date();
    
    // If status is completed, add completion timestamp and feedback if provided
    if (status === 'completed') {
      booking.completedAt = new Date();
      
      // Add feedback and rating if provided
      if (feedback) booking.feedback = feedback;
      if (rating && rating >= 1 && rating <= 5) booking.rating = rating;
      
      // Update counselor stats if this is a new completion
      if (booking.status !== 'completed') {
        try {
          const Counselor = require('../models/Counselor-model');
          const counselor = await Counselor.findOne({ email: booking.counselorEmail });
          if (counselor) {
            counselor.completedSessions = (counselor.completedSessions || 0) + 1;
            if (rating) {
              const totalRatings = (counselor.totalRatings || 0) + 1;
              const ratingSum = (counselor.avgRating || 0) * (totalRatings - 1) + rating;
              counselor.avgRating = ratingSum / totalRatings;
              counselor.totalRatings = totalRatings;
            }
            await counselor.save();
          }
        } catch (err) {
          console.error('Failed to update counselor stats:', err);
          // Continue with booking update even if counselor stats update fails
        }
      }
    }
    
    try {
      await booking.save();
      
      // Emit events with error handling
      try {
        // Emit event to user
        emitToUser(booking.googleId, 'booking:update', {
          booking
        });

        // Emit event to counselor
        emitToCounselor(booking.counselorEmail, 'booking:update', {
          booking
        });
        
        console.log(`Booking update notification sent for booking ${id}`);
      } catch (socketError) {
        // Log socket error but don't fail the update
        console.error('Error sending socket notification:', socketError);
      }

      res.json({
        message: 'Booking updated successfully',
        booking
      });
    } catch (saveError) {
      console.error('Error saving booking update:', saveError);
      res.status(500).json({ 
        error: 'Failed to save booking update', 
        code: 'DATABASE_ERROR',
        details: saveError.message 
      });
    }
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ 
      error: 'Failed to update booking', 
      code: 'UPDATE_ERROR',
      details: error.message 
    });
  }
};

    if (!email) return res.status(400).json({ error: 'email required' });
    const items = await Booking.find({ counselorEmail: email, status: 'paid_pending_counselor' }).sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (err) {
    console.error('List pending for counselor failed:', err);
    res.status(500).json({ error: 'List pending failed' });
  }
};

function buildJoinUrl(booking) {
  const roomId = booking._id.toString();
  const type = String(booking.sessionType || 'video').toLowerCase();
  let joinUrl = `https://meet.jit.si/JeevanRakshak-${roomId}`;
  if (type === 'call') joinUrl = `https://meet.jit.si/JeevanRakshak-Call-${roomId}`;
  if (type === 'chat') joinUrl = `https://meet.jit.si/JeevanRakshak-Chat-${roomId}`;
  return { roomId, joinUrl };
}

// POST /api/bookings/:id/accept
exports.acceptBooking = async (req, res) => {
  try {
    const id = req.params.id;
    // Determine counselor email from auth cookie if available
    let email = String(req.body?.email || '').toLowerCase();
    try {
      const token = req.cookies?.auth_token;
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        const u = await User.findOne({ googleId: decoded.googleId });
        if (u?.email) email = String(u.email).toLowerCase();
      }
    } catch (_) {}
    if (!id || !email) return res.status(400).json({ error: 'id and email required' });
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (String(booking.counselorEmail || '').toLowerCase() !== email) {
      return res.status(403).json({ error: 'Not authorized for this booking' });
    }
    if (booking.status !== 'paid_pending_counselor') {
      return res.status(400).json({ error: 'Booking not awaiting counselor confirmation' });
    }
    const { roomId, joinUrl } = buildJoinUrl(booking);
    booking.status = 'confirmed';
    booking.roomId = roomId;
    booking.joinUrl = joinUrl;
    await booking.save();

    // Update counselor earnings
    try {
      const Counselor = require('../models/Counselor-model');
      const counselor = await Counselor.findOne({ email: email });
      if (counselor) {
        // Check if we need to reset monthly earnings (if last update was in a different month)
        const now = new Date();
        const lastUpdated = counselor.earnings?.lastUpdated || now;
        const isNewMonth = lastUpdated.getMonth() !== now.getMonth() || 
                           lastUpdated.getFullYear() !== now.getFullYear();
        
        // Update earnings
        const price = booking.price || 0;
        const update = {
          'earnings.total': (counselor.earnings?.total || 0) + price,
          'earnings.thisMonth': isNewMonth ? price : (counselor.earnings?.thisMonth || 0) + price,
          'earnings.lastUpdated': now
        };
        
        await Counselor.updateOne({ email: email }, { $set: update });
        
        // Emit earnings update event
        emitToCounselor(email, 'earnings:updated', {
          thisMonthDelta: price,
          totalDelta: price,
          thisMonth: isNewMonth ? price : (counselor.earnings?.thisMonth || 0) + price,
          total: (counselor.earnings?.total || 0) + price
        });
      }
    } catch (err) {
      console.error('Update counselor earnings failed:', err);
      // Continue with the booking process even if earnings update fails
    }

    // Realtime notify user and counselor
    try {
      emitToUser(booking.googleId, 'booking:confirmed', {
        id: booking._id.toString(),
        counselorName: booking.counselorName,
        sessionType: booking.sessionType,
        date: booking.date,
        time: booking.time,
        joinUrl: booking.joinUrl,
      });
      if (booking.counselorEmail) {
        emitToCounselor(booking.counselorEmail, 'booking:confirmed', {
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
    console.error('Accept booking failed:', err);
    res.status(500).json({ error: 'Accept booking failed' });
  }
};

// POST /api/bookings/:id/reject
exports.rejectBooking = async (req, res) => {
  try {
    const id = req.params.id;
    // Determine counselor email from auth cookie if available
    let email = String(req.body?.email || '').toLowerCase();
    try {
      const token = req.cookies?.auth_token;
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        const u = await User.findOne({ googleId: decoded.googleId });
        if (u?.email) email = String(u.email).toLowerCase();
      }
    } catch (_) {}
    const reason = String(req.body?.reason || '').trim();
    if (!id || !email) return res.status(400).json({ error: 'id and email required' });
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (String(booking.counselorEmail || '').toLowerCase() !== email) {
      return res.status(403).json({ error: 'Not authorized for this booking' });
    }
    if (booking.status !== 'paid_pending_counselor') {
      return res.status(400).json({ error: 'Booking not awaiting counselor confirmation' });
    }
    booking.status = 'cancelled';
    await booking.save();

    try {
      emitToUser(booking.googleId, 'booking:rejected', { id: booking._id.toString(), reason });
      if (booking.counselorEmail) emitToCounselor(booking.counselorEmail, 'booking:rejected', { id: booking._id.toString(), reason });
    } catch (_) {}

    // Nudge counselor dashboard to refresh stats
    try {
      if (booking.counselorEmail) {
        emitToCounselor(booking.counselorEmail, 'stats:update', { reason: 'booking_rejected', bookingId: booking._id.toString() });
      }
    } catch (_) {}

    // No email/SMS on reject; realtime events already emitted

    res.status(200).json(booking);
  } catch (err) {
    console.error('Reject booking failed:', err);
    res.status(500).json({ error: 'Reject booking failed' });
  }
};

// GET /api/bookings?googleId=xxx
exports.getBookings = async (req, res) => {
  try {
    const { googleId } = req.query;
    if (!googleId) return res.status(400).json({ error: 'googleId required' });
    const items = await Booking.find({ googleId }).sort({ createdAt: -1 }).limit(50);
    res.status(200).json(items);
  } catch (err) {
    console.error('Get bookings failed:', err);
    res.status(500).json({ error: 'Get bookings failed' });
  }
};

// POST /api/bookings/:id/start-session
exports.startSession = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Only allow starting sessions that are confirmed
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Session can only be started for confirmed bookings' });
    }

    // Ensure join URL exists
    if (!booking.joinUrl || !booking.roomId) {
      const { roomId, joinUrl } = buildJoinUrl(booking);
      booking.roomId = roomId;
      booking.joinUrl = joinUrl;
    }
    booking.status = 'in_session';
    await booking.save();

    // Emit realtime hint events (non-blocking)
    try {
      emitToUser(booking.googleId, 'appointment:updated', { id: booking._id.toString(), status: 'in_session' });
      if (booking.counselorEmail) {
        emitToCounselor(booking.counselorEmail, 'appointment:updated', { id: booking._id.toString(), status: 'in_session' });
      }
    } catch (_) {}

    return res.status(200).json({ message: 'Session started', booking });
  } catch (err) {
    console.error('Start session failed:', err);
    return res.status(500).json({ error: 'Start session failed' });
  }
};

// POST /api/bookings/:id/end-session
exports.endSession = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Persist completed status now that schema supports it.
    booking.status = 'completed';
    await booking.save();
    try {
      emitToUser(booking.googleId, 'appointment:updated', { id: booking._id.toString(), status: 'completed' });
      if (booking.counselorEmail) {
        emitToCounselor(booking.counselorEmail, 'appointment:updated', { id: booking._id.toString(), status: 'completed' });
      }
    } catch (_) {}

    // Nudge counselor dashboard to refresh stats/clients after completion
    try {
      if (booking.counselorEmail) {
        emitToCounselor(booking.counselorEmail, 'stats:update', { reason: 'session_completed', bookingId: booking._id.toString() });
        // Earnings update after completion as well (some systems only count completed)
        emitToCounselor(booking.counselorEmail, 'earnings:updated', {
          completedSessionsDelta: 1,
        });
      }
    } catch (_) {}

    return res.status(200).json({ message: 'Session ended', booking });
  } catch (err) {
    console.error('End session failed:', err);
    return res.status(500).json({ error: 'End session failed' });
  }
};

// POST /api/bookings/:id/request-join (counselor triggers at scheduled time)
exports.requestJoin = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Can only request join for confirmed sessions' });
    }
    // Ensure join URL is ready to display in UI
    if (!booking.joinUrl || !booking.roomId) {
      const { roomId, joinUrl } = buildJoinUrl(booking);
      booking.roomId = roomId;
      booking.joinUrl = joinUrl;
      await booking.save();
    }
    try {
      emitToUser(booking.googleId, 'booking:join_request', {
        id: booking._id.toString(),
        joinUrl: booking.joinUrl,
        sessionType: booking.sessionType,
        date: booking.date,
        time: booking.time,
      });
      if (booking.counselorEmail) {
        emitToCounselor(booking.counselorEmail, 'booking:join_request_sent', { id: booking._id.toString() });
      }
    } catch (_) {}
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Request join failed:', err);
    return res.status(500).json({ error: 'Request join failed' });
  }
};

// POST /api/bookings/:id/accept-join (user confirms they are joining)
exports.acceptJoin = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Join can only be accepted for confirmed sessions' });
    }
    // Ensure join URL exists
    if (!booking.joinUrl || !booking.roomId) {
      const { roomId, joinUrl } = buildJoinUrl(booking);
      booking.roomId = roomId;
      booking.joinUrl = joinUrl;
      await booking.save();
    }
    // Notify counselor that user accepted
    try {
      emitToCounselor(booking.counselorEmail, 'booking:join_accepted', { id: booking._id.toString() });
      emitToUser(booking.googleId, 'booking:join_ready', { id: booking._id.toString(), joinUrl: booking.joinUrl });
    } catch (_) {}
    return res.status(200).json({ ok: true, joinUrl: booking.joinUrl });
  } catch (err) {
    console.error('Accept join failed:', err);
    return res.status(500).json({ error: 'Accept join failed' });
  }
};

// POST /api/bookings/:id/feedback
exports.addFeedback = async (req, res) => {
  try {
    const id = req.params.id;
    const { rating, comment } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id required' });
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Ensure the caller is the owner via auth cookie
    try {
      const token = req.cookies?.auth_token;
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        const u = await User.findOne({ googleId: decoded.googleId });
        if (!u || u.googleId !== booking.googleId) {
          return res.status(403).json({ error: 'Not authorized for this booking' });
        }
      } else {
        return res.status(401).json({ error: 'Not authenticated' });
      }
    } catch (_) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Allow feedback for active or completed sessions
    if (!['completed', 'in_session', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ error: 'Feedback only allowed for active or completed sessions' });
    }

    if (rating != null) booking.feedbackRating = Math.max(1, Math.min(5, Number(rating)));
    if (typeof comment === 'string') booking.feedbackComment = String(comment).slice(0, 2000);
    await booking.save();

    // Notify counselor about feedback update
    try {
      if (booking.counselorEmail) {
        emitToCounselor(booking.counselorEmail, 'appointment:updated', { id: booking._id.toString(), status: booking.status, feedbackRating: booking.feedbackRating });
      }
    } catch (_) {}

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Add feedback failed:', err);
    return res.status(500).json({ error: 'Add feedback failed' });
  }
};
