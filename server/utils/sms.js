const clientCache = { client: null };

function getTwilioClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('SMS not configured: missing Twilio env vars. SMS will be skipped.');
    return null;
  }
  if (!clientCache.client) {
    const twilio = require('twilio');
    clientCache.client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return clientCache.client;
}

async function sendParentSMS({ to, body }) {
  // Validate phone number format
  if (!to || !/^\+?[1-9]\d{1,14}$/.test(to.replace(/\D/g, ''))) {
    console.warn('SMS not sent: Invalid phone number format');
    return { success: false, error: 'INVALID_PHONE_FORMAT' };
  }
  
  // Validate message body
  if (!body || body.trim().length === 0) {
    console.warn('SMS not sent: Empty message body');
    return { success: false, error: 'EMPTY_MESSAGE' };
  }
  
  const client = getTwilioClient();
  if (!client) return { success: false, error: 'SMS_NOT_CONFIGURED' };
  
  const from = process.env.TWILIO_FROM;
  if (!from) {
    console.warn('SMS not sent: TWILIO_FROM is missing');
    return { success: false, error: 'MISSING_FROM_NUMBER' };
  }
  
  try {
    const message = await client.messages.create({ from, to, body });
    console.log(`SMS sent successfully to ${to}, SID: ${message.sid}`);
    return { success: true, messageId: message.sid };
  } catch (e) {
    console.warn('Failed to send SMS:', e?.message || e);
    return { 
      success: false, 
      error: e?.code || 'SMS_FAILED',
      message: e?.message || 'Unknown error'
    };
  }
}

module.exports = { sendParentSMS };
