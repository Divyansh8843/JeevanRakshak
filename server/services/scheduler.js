const Routine = require("../models/Routine-model");
const User = require("../models/User-model");
const Booking = require("../models/Booking-model");
const Counselor = require("../models/Counselor-model");
const { sendParentAlert, sendSessionReminder } = require("../utils/mailer");
const { sendParentSMS } = require("../utils/sms");
const {
  emitToUser,
  emitToCounselor,
  getIO,
  emitBookingUpdate,
} = require("../utils/socket");

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_WEEK = 7 * ONE_DAY;

const PROJECT_NAME = process.env.PROJECT_NAME || "JeevanRakshak";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || "http://localhost:5173";

function brandHeader(preheader = "") {
  return `
    <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto">
      <div style="display:none;visibility:hidden;opacity:0;height:0;width:0">${preheader}</div>
      <div style="padding:16px 16px 0">
        <h1 style="margin:0;font-size:18px;line-height:24px;color:#111827">${PROJECT_NAME}</h1>
        <p style="margin:4px 0 0;color:#6b7280;font-size:12px">Weekly/Daily wellbeing summary</p>
      </div>
  `;
}

function brandFooter() {
  return `
      <div style="padding:16px;color:#6b7280;font-size:12px">This summary is informational. For emergencies, contact local services.</div>
      <div style="padding:0 16px 24px;color:#9ca3af;font-size:11px">© ${new Date().getFullYear()} ${PROJECT_NAME}</div>
    </div>
  `;
}

function riskBadge(r) {
  const risk = String(r || 'LOW').toUpperCase();
  const color = risk === 'HIGH' ? '#b91c1c' : risk === 'MEDIUM' ? '#d97706' : '#059669';
  const bg = risk === 'HIGH' ? '#fee2e2' : risk === 'MEDIUM' ? '#fef3c7' : '#ecfdf5';
  return `<span style="display:inline-block;padding:4px 8px;border-radius:999px;background:${bg};color:${color};font-weight:600;font-size:12px">${risk}</span>`;
}

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
        const isWeekly = period === "weekly";
        const preheader = `${isWeekly ? 'Weekly' : 'Daily'}: LOW ${distribution.LOW}, MED ${distribution.MEDIUM}, HIGH ${distribution.HIGH}`;
        const subject = `${PROJECT_NAME} • ${isWeekly ? "Weekly" : "Daily"} wellbeing summary for ${u.name || "your child"}`;
        const text = `${isWeekly ? 'Weekly' : 'Daily'} summary\nLOW: ${distribution.LOW}\nMEDIUM: ${distribution.MEDIUM}\nHIGH: ${distribution.HIGH}\nLatest risk: ${lastRisk}`;
        const html = `
          ${brandHeader(preheader)}
          <div style="padding:16px">
            <div style="display:flex;align-items:center;gap:8px;color:#111827">
              <h2 style="margin:0;font-size:16px">${isWeekly ? 'Weekly' : 'Daily'} Summary</h2>
              ${riskBadge(lastRisk)}
            </div>
            <div style="margin:10px 0 14px;color:#374151">${u.name || 'Your child'}</div>
            <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:12px">
              <table style="border-collapse:collapse;width:100%">
                <tbody>
                  <tr><td style="border-bottom:1px solid #f3f4f6;padding:10px;background:#f9fafb;width:40%">LOW</td><td style="border-bottom:1px solid #f3f4f6;padding:10px">${distribution.LOW}</td></tr>
                  <tr><td style="border-bottom:1px solid #f3f4f6;padding:10px;background:#f9fafb">MEDIUM</td><td style="border-bottom:1px solid #f3f4f6;padding:10px">${distribution.MEDIUM}</td></tr>
                  <tr><td style="padding:10px;background:#f9fafb">HIGH</td><td style="padding:10px">${distribution.HIGH}</td></tr>
                </tbody>
              </table>
            </div>
            <div style="margin-top:8px;color:#374151">Latest risk: ${riskBadge(lastRisk)}</div>
            <div style="margin-top:16px">
              <a href="${CLIENT_ORIGIN}/dashboard" style="display:inline-block;background:#047857;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600">Open Dashboard</a>
            </div>
          </div>
          ${brandFooter()}
        `;
        try {
          await sendParentAlert({ to, subject, text, html });
          if (u.parentPhone) {
            const smsBody = `${
              period === "weekly" ? "Weekly" : "Daily"
            } summary for ${u.name || "your child"}: LOW ${
              distribution.LOW
            }, MED ${distribution.MEDIUM}, HIGH ${
              distribution.HIGH
            }. Latest: ${lastRisk}`;
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

  // Every minute: handle session management tasks
  setInterval(async () => {
    try {
      const now = Date.now();

      // 1. Send reminders for upcoming sessions (15 minutes before)
      const upcomingSessions = await Booking.find({
        status: "confirmed",
        scheduledAt: {
          $gt: new Date(now),
          $lte: new Date(now + 15 * 60000),
        },
      }).lean();

      for (const session of upcomingSessions) {
        emitToUser(session.googleId, "session:reminder", {
          bookingId: session._id,
          startTime: session.scheduledAt,
          message: "Your session starts in 15 minutes",
        });

        emitToCounselor(session.counselorEmail, "session:reminder", {
          bookingId: session._id,
          startTime: session.scheduledAt,
          message: "You have a session starting in 15 minutes",
        });

        await sendSessionReminder(session);
      }

      // 2. Auto-complete sessions that have reached their duration
      const activeSessions = await Booking.find({
        status: "in_session",
        sessionStartTime: { $exists: true },
        durationMinutes: { $gt: 0 },
      }).lean();

      for (const session of activeSessions) {
        const endTime =
          new Date(session.sessionStartTime).getTime() +
          (Number(session.durationMinutes) || 30) * 60000;
        if (endTime <= now) {
          // Mark completed and update counselor earnings
          await Booking.updateOne(
            { _id: session._id, status: "in_session" },
            {
              $set: {
                status: "completed",
                sessionEndTime: new Date(endTime),
                updatedAt: new Date(),
              },
            }
          );

          // Update counselor earnings, avoiding double-counting
          try {
            // Re-fetch booking to check credit flag
            const bookingDoc = await Booking.findById(session._id);
            if (bookingDoc && !bookingDoc.earningsCredited) {
              const counselor = await Counselor.findOne({
                email: bookingDoc.counselorEmail,
              });
              if (counselor && bookingDoc.price) {
                counselor.earnings.total =
                  (counselor.earnings.total || 0) + bookingDoc.price;
                counselor.earnings.thisMonth =
                  (counselor.earnings.thisMonth || 0) + bookingDoc.price;
                counselor.completedSessions =
                  (counselor.completedSessions || 0) + 1;
                counselor.earnings.lastUpdated = new Date();
                await counselor.save();

                // Mark booking as credited
                await Booking.updateOne(
                  { _id: bookingDoc._id },
                  { $set: { earningsCredited: true, updatedAt: new Date() } }
                );
              }
            }
          } catch (err) {
            console.error("Failed to update counselor earnings:", err);
          }
          // Re-read updated booking document
          let updated = null;
          try {
            updated = await Booking.findById(session._id);
          } catch (_) {
            updated = null;
          }

          // Emit session ended to session room
          try {
            const io = getIO();
            io.to(`session:${String(session._id)}`).emit("session:ended", {
              bookingId: String(session._id),
              endedAt: new Date(endTime),
            });
          } catch (_) {}

          // Notify user and counselor about completion
          try {
            emitToUser(session.googleId, "appointment:updated", {
              id: String(session._id),
              status: "completed",
            });
            if (session.counselorEmail) {
              emitToCounselor(session.counselorEmail, "appointment:updated", {
                id: String(session._id),
                status: "completed",
              });
              emitToCounselor(session.counselorEmail, "stats:update", {
                completedSession: true,
              });
            }
          } catch (_) {}

          try {
            if (updated) emitBookingUpdate(updated);
          } catch (_) {}
        }
      }
    } catch (e) {
      console.warn("Auto-complete sessions failed:", e?.message || e);
    }
  }, 60 * 1000);

  console.log(
    "In-process scheduler started (daily/weekly digests + auto-complete sessions)."
  );
}

module.exports = { startScheduler };
