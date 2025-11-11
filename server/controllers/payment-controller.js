const Stripe = require('stripe');
const Booking = require('../models/Booking-model');
const { emitToUser, emitToCounselor, emitBookingUpdate } = require('../utils/socket');
const { sendParentAlert } = require('../utils/mailer');
const User = require('../models/User-model');
const { sendParentSMS } = require('../utils/sms');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');

// POST /api/payments/create-checkout-session
// Body: { googleId, counselorName, counselorEmail, sessionType, date, time, notes, successUrl?, cancelUrl? }
exports.createCheckoutSession = async (req, res) => {
  try {
    const {
      googleId,
      counselorName,
      counselorEmail,
      sessionType,
      date,
      time,
      notes,
      successUrl,
      cancelUrl,
    } = req.body || {};

    if (!googleId || !counselorName || !date || !time || !sessionType) {
      return res.status(400).json({ error: 'googleId, counselorName, sessionType, date and time are required' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    // Determine price and currency from Counselor record
    let price = 0;
    let currency = 'INR';
    try {
      if (counselorEmail) {
        const Counselor = require('../models/Counselor-model');
        const c = await Counselor.findOne({ email: (counselorEmail || '').toLowerCase(), active: true });
        if (c) {
          currency = c.currency || 'INR';
          const key = String(sessionType || '').toLowerCase(); // 'chat' | 'call' | 'video'
          if (c.prices && typeof c.prices[key] === 'number') price = Number(c.prices[key]);
          if (!price) price = Number(c.price || 0);
        }
      }
    } catch (_) {}
    if (!price || price <= 0) {
      return res.status(400).json({ error: 'Unable to determine session price. Please contact support.' });
    }

    // Determine duration by session type (defaults)
    const durationByType = { chat: 30, call: 45, video: 60 };
    const normalizedType = String(sessionType || 'video').toLowerCase();
    const durationMinutes = durationByType[normalizedType] || 60;

    // Parse scheduledAt from provided date/time (assumes local date/time strings)
    function parseLocalDateTime(d, t) {
      try {
        // Expect formats like YYYY-MM-DD and HH:mm
        if (!d || !t) return null;
        const [y, m, day] = d.split('-').map(Number);
        const [hh, mm] = t.split(':').map(Number);
        if (!y || !m || !day || isNaN(hh) || isNaN(mm)) return null;
        return new Date(y, m - 1, day, hh, mm, 0, 0);
      } catch (_) { return null; }
    }
    const scheduledAt = parseLocalDateTime(date, time);

    // Create a provisional booking in pending_payment status
    const booking = await Booking.create({
      googleId,
      counselorName,
      counselorEmail,
      sessionType: normalizedType,
      date,
      time,
      notes,
      status: 'pending_payment',
      price: Number(price),
      currency,
      scheduledAt,
      durationMinutes,
    });

    const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    const success = successUrl || `${origin}/profile?payment=success`;
    const cancel = cancelUrl || `${origin}/profile?payment=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Counseling ${String(sessionType).toUpperCase()} with ${counselorName}`,
              description: `Date: ${date} | Time: ${time}`,
            },
            // Stripe expects amounts in smallest currency unit (e.g., paise for INR)
            unit_amount: Math.round(Number(price) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: success,
      cancel_url: cancel,
      metadata: {
        bookingId: booking._id.toString(),
        googleId,
        counselorEmail: counselorEmail || '',
        sessionType: String(sessionType).toLowerCase(),
      },
    });

    booking.checkoutSessionId = session.id;
    await booking.save();

    res.status(200).json({ url: session.url, checkoutSessionId: session.id, bookingId: booking._id });
  } catch (err) {
    console.error('Stripe create session failed:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

// POST /api/payments/webhook
exports.webhook = async (req, res) => {
  let event = req.body;

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    if (webhookSecret) {
      const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // When no webhook secret configured (e.g., local dev), body is raw Buffer
      try {
        const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
        event = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (_) {
        // leave as-is; downstream will likely no-op
      }
    }
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const checkoutSessionId = session.id;

      const booking = await Booking.findOne({ checkoutSessionId });
      if (booking) {
        // Mark as paid, pending counselor confirmation
        booking.status = 'paid_pending_counselor';
        await booking.save();
        try { emitBookingUpdate(booking); } catch (_) {}

        // Notify user the payment is received and awaiting counselor confirmation
        try {
          emitToUser(booking.googleId, 'booking:paid_pending_counselor', {
            id: booking._id.toString(),
            counselorName: booking.counselorName,
            sessionType: booking.sessionType,
            date: booking.date,
            time: booking.time,
            price: booking.price,
            currency: booking.currency,
            paymentStatus: 'completed',
            paymentTimestamp: new Date()
          });
        } catch (error) {
          console.error('Error emitting payment confirmation to user:', error);
        }

        // Notify counselor via realtime socket only (no email/SMS)
        try {
          if (booking.counselorEmail) {
            emitToCounselor(booking.counselorEmail, 'booking:awaiting_confirmation', {
              id: booking._id.toString(),
              googleId: booking.googleId,
              sessionType: booking.sessionType,
              date: booking.date,
              time: booking.time,
              notes: booking.notes,
            });
            // Also nudge counselor dashboard to refresh stats in real time
            emitToCounselor(booking.counselorEmail, 'stats:update', { reason: 'payment_completed', bookingId: booking._id.toString() });
          }
        } catch (_) {}
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handling failed:', err);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
};
