const Routine = require("../models/Routine-model");
const User = require("../models/User-model");
const Booking = require("../models/Booking-model");
const { sendParentAlert } = require("../utils/mailer");
const { sendParentSMS } = require("../utils/sms");
const { emitToUser, emitToCounselor } = require("../utils/socket");

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_WEEK = 7 * ONE_DAY;

async function sendDigest(period) {
  try {
    const windowMs = period === "weekly" ? ONE_WEEK : ONE_DAY;
    const since = new Date(Date.now() - windowMs);

    // Get users that have parentEmail set
    const parents = await User.find(
      { parentEmail: { $exists: true, $ne: "" } },
      { googleId: 1, name: 1, parentEmail: 1 }
    ).lean();
    if (!parents.length) return;

    for (const u of parents) {
      const items = await Routine.find({
        googleId: u.googleId,
        createdAt: { $gte: since },
      })
        .sort({ createdAt: 1 })
        .lean();
      if (!items.length) continue;
      const distribution = { LOW: 0, MEDIUM: 0, HIGH: 0 };
      let lastRisk = "LOW";
      for (const it of items) {
        distribution[it.risk] = (distribution[it.risk] || 0) + 1;
        lastRisk = it.risk || lastRisk;
      }
      // Only alert when there is any MEDIUM/HIGH in the window
      if (distribution.HIGH > 0 || distribution.MEDIUM > 0) {
        const to = u.parentEmail;
        const subject = `Update: ${
          period === "weekly" ? "Weekly" : "Daily"
        } wellbeing summary for ${u.name || "your child"}`;
        const text = `Summary of AI risk assessments in the last ${
          period === "weekly" ? "week" : "day"
        }:\nLOW: ${distribution.LOW}\nMEDIUM: ${distribution.MEDIUM}\nHIGH: ${
          distribution.HIGH
        }\nLatest risk: ${lastRisk}`;
        const html = `<p>Summary of AI risk assessments in the last <b>${
          period === "weekly" ? "week" : "day"
        }</b>:</p>
<ul><li>LOW: ${distribution.LOW}</li><li>MEDIUM: ${
          distribution.MEDIUM
        }</li><li>HIGH: ${distribution.HIGH}</li></ul>
<p>Latest risk: <b>${lastRisk}</b></p>`;
        try {
          await sendParentAlert({ to, subject, text, html });
          if (u.parentPhone) {
            const smsBody = `${period === 'weekly' ? 'Weekly' : 'Daily'} summary for ${u.name || 'your child'}: LOW ${distribution.LOW}, MED ${distribution.MEDIUM}, HIGH ${distribution.HIGH}. Latest: ${lastRisk}`;
            await sendParentSMS({ to: u.parentPhone, body: smsBody });
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    console.error(`Scheduler ${period} digest failed:`, err);
  }
}

function startScheduler() {
  // Stagger daily and weekly jobs to avoid overlap
  // Initial run ~5 minutes after boot to let server warm up
  setTimeout(() => sendDigest("daily"), 5 * 60 * 1000);
  setTimeout(() => sendDigest("weekly"), 10 * 60 * 1000);

  // Run every 24h and 7d
  setInterval(() => sendDigest("daily"), ONE_DAY);
  setInterval(() => sendDigest("weekly"), ONE_WEEK);

  // Every minute: auto-complete sessions whose scheduled time has passed
  setInterval(async () => {
    try {
      const now = Date.now();
      // Find sessions in_session with scheduledAt and durationMinutes
      const candidates = await Booking.find({
        status: 'in_session',
        scheduledAt: { $ne: null },
        durationMinutes: { $gt: 0 },
      }).limit(200).lean();
      if (!candidates.length) return;
      for (const b of candidates) {
        const endTime = new Date(b.scheduledAt).getTime() + (Number(b.durationMinutes) || 0) * 60000;
        if (endTime <= now) {
          // Mark completed
          await Booking.updateOne({ _id: b._id, status: 'in_session' }, { $set: { status: 'completed', updatedAt: new Date() } });
          
          // Update counselor's completed sessions count
          try {
            if (b.counselorEmail) {
              const Counselor = require('../models/Counselor-model');
              await Counselor.updateOne(
                { email: b.counselorEmail.toLowerCase() },
                { $inc: { completedSessions: 1 } }
              );
            }
          } catch (err) {
            console.error('Failed to update counselor completed sessions:', err);
          }
          
          try {
            emitToUser(b.googleId, 'appointment:updated', { id: String(b._id), status: 'completed' });
            if (b.counselorEmail) {
              emitToCounselor(b.counselorEmail, 'appointment:updated', { id: String(b._id), status: 'completed' });
              // Notify about completed session count update
              emitToCounselor(b.counselorEmail, 'stats:update', { completedSession: true });
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      console.warn('Auto-complete sessions failed:', e?.message || e);
    }
  }, 60 * 1000);

  console.log("In-process scheduler started (daily/weekly digests + auto-complete sessions).");
}

module.exports = { startScheduler };
