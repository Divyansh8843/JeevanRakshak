const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn('Email not configured: missing SMTP env vars. Parent alerts will be skipped.');
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
    console.warn('Email not sent: Invalid email format');
    return { success: false, error: 'INVALID_EMAIL_FORMAT' };
  }
  
  const t = getTransporter();
  if (!t) return { success: false, error: 'EMAIL_NOT_CONFIGURED' };
  
  const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
  
  try {
    const info = await t.sendMail({ from, to, subject, text, html });
    console.log(`Email sent successfully to ${to}, ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (e) {
    console.warn('Failed to send email:', e?.message || e);
    return { 
      success: false, 
      error: e?.code || 'EMAIL_FAILED',
      message: e?.message || 'Unknown error'
    };
  }
}

module.exports = { sendParentAlert };
