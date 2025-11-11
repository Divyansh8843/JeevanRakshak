const nodemailer = require("nodemailer");

// Branding
const BRAND = process.env.PROJECT_NAME || "JeevanRakshak";

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn(
      "Email not configured: missing SMTP env vars. Parent alerts will be skipped."
    );
    return null;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

async function sendParentAlert({ to, subject, text, html }) {
  // Validate email format
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.warn("Email not sent: Invalid email format");
    return { success: false, error: "INVALID_EMAIL_FORMAT" };
  }

  const t = getTransporter();
  if (!t) return { success: false, error: "EMAIL_NOT_CONFIGURED" };

  const from = process.env.FROM_EMAIL || process.env.SMTP_USER;

  try {
    const info = await t.sendMail({ from, to, subject, text, html });
    console.log(`Email sent successfully to ${to}, ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (e) {
    console.warn("Failed to send email:", e?.message || e);
    return {
      success: false,
      error: e?.code || "EMAIL_FAILED",
      message: e?.message || "Unknown error",
    };
  }
}
function brandHeader(title){
  return `
  <div style="background:#0ea5a8;padding:16px 24px;color:#fff;font-weight:600;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    ${BRAND} • ${title}
  </div>`;
}
function brandFooter(){
  const year = new Date().getFullYear();
  const origin = process.env.CLIENT_ORIGIN || '';
  const mailFrom = process.env.FROM_EMAIL || process.env.SMTP_USER || '';
  return `
  <div style="background:#f9fafb;padding:12px 16px;border-top:1px solid #e5e7eb;text-align:center;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#6b7280;font-size:12px">
    © ${year} ${BRAND} • <a href="${origin}" style="color:#0ea5a8;text-decoration:none">Dashboard</a>
    ${mailFrom ? ` • Need help? <a href="mailto:${mailFrom}" style="color:#0ea5a8;text-decoration:none">${mailFrom}</a>` : ''}
  </div>`;
}
function card(body){
  return `<div style="border:1px solid #e5e7eb;border-radius:12px;margin:16px;padding:16px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#fff">${body}</div>`;
}
function row(label, value){
  return `<tr><td style="padding:6px 8px;color:#6b7280;font-size:13px;white-space:nowrap">${label}</td><td style="padding:6px 8px;color:#111827;font-weight:600;font-size:14px">${value || '-'}</td></tr>`;
}
function cta(href, text){
  if (!href) return '';
  return `<a href="${href}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:12px;background:#0ea5a8;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">${text}</a>`;
}

async function sendSessionReminder(booking) {
  if (!booking) return { success: false, error: "NO_BOOKING" };
  try {
    const toUser = booking.userEmail || booking.user?.email || null;
    const toCounselor = booking.counselorEmail || null;
    const subject = `${BRAND} • Session Reminder: ${booking.counselorName || ""} at ${
      booking.time || ""
    }`;
    const text = `${BRAND} Reminder: Your session with ${booking.counselorName} is starting at ${booking.time} on ${booking.date}. Join: ${booking.joinUrl || ''}`;
    const html = `
      <div style="display:none;max-height:0;overflow:hidden;opacity:0">${BRAND} session reminder for ${booking.userName || 'you'} at ${booking.time || ''}</div>
      ${brandHeader('Session Reminder')}
      ${card(`
        <div style="font-size:14px;color:#111827;margin-bottom:10px">Hi ${booking.userName || 'there'}, your session starts soon.</div>
        <table style="width:100%;border-collapse:collapse">${
          [
            row('Counselor', booking.counselorName),
            row('Date', booking.date),
            row('Time', booking.time),
            row('Type', String(booking.sessionType||'').toUpperCase()),
            row('Duration', (booking.durationMinutes||60)+' min')
          ].join('')
        }</table>
        ${cta(booking.joinUrl, 'Join Session')}
      `)}
      <div style="padding:0 16px 16px;color:#6b7280;font-size:12px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
        If the button doesn't work, copy and paste this link: ${booking.joinUrl || ''}
      </div>
      ${brandFooter()}
    `;
    if (toUser) await sendParentAlert({ to: toUser, subject, text, html });
    if (toCounselor)
      await sendParentAlert({
        to: toCounselor,
        subject: `${BRAND} • Upcoming session with ${booking.userName || ""}`,
        text,
        html,
      });
    return { success: true };
  } catch (e) {
    console.warn("sendSessionReminder failed:", e?.message || e);
    return { success: false, error: e?.message || "FAILED" };
  }
}

async function sendBookingConfirmation(booking) {
  if (!booking) return { success: false, error: "NO_BOOKING" };
  try {
    const toUser = booking.userEmail || booking.user?.email || null;
    const subject = `${BRAND} • Booking Confirmed: ${booking.counselorName || ""}`;
    const text = `${BRAND}: Your booking is confirmed with ${booking.counselorName} on ${booking.date} at ${booking.time}. Type: ${booking.sessionType}. Price: ${booking.price || ''} ${booking.currency || ''}.`;
    const dashboard = (process.env.CLIENT_ORIGIN || 'http://localhost:5173') + '/dashboard?tab=human-counselor&view=appointments';
    const html = `
      <div style="display:none;max-height:0;overflow:hidden;opacity:0">${BRAND} booking confirmed for ${booking.userName || 'you'} with ${booking.counselorName || ''}</div>
      ${brandHeader('Booking Confirmed')}
      ${card(`
        <div style="font-size:14px;color:#111827;margin-bottom:10px">Hi ${booking.userName || 'there'}, your booking is confirmed.</div>
        <table style="width:100%;border-collapse:collapse">${
          [
            row('Counselor', booking.counselorName),
            row('Date', booking.date),
            row('Time', booking.time),
            row('Type', String(booking.sessionType||'').toUpperCase()),
            row('Price', `${booking.price || ''} ${booking.currency || ''}`)
          ].join('')
        }</table>
        ${cta(dashboard, 'View in My Appointments')}
      `)}
      <div style="padding:0 16px 16px;color:#6b7280;font-size:12px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
        You will receive a join request at the scheduled time.
      </div>
      ${brandFooter()}
    `;
    if (toUser) await sendParentAlert({ to: toUser, subject, text, html });
    return { success: true };
  } catch (e) {
    console.warn("sendBookingConfirmation failed:", e?.message || e);
    return { success: false, error: e?.message || "FAILED" };
  }
}

module.exports = {
  sendParentAlert,
  sendSessionReminder,
  sendBookingConfirmation,
};
