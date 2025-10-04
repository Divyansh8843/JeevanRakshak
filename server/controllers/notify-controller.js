const twilio = require('twilio');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Load from env
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  CLIENT_ORIGIN,
} = process.env;

// Enhanced logging for notifications
const logNotification = (type, recipient, status, details = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    recipient,
    status,
    details
  };
  console.log(`📧 [${type.toUpperCase()}] ${recipient} - ${status}:`, details);
  
  // Optional: Write to log file for production monitoring
  try {
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, `notifications-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  } catch (e) {
    console.warn('Failed to write notification log:', e.message);
  }
};

// Lazy init to avoid crashing when creds missing
let smsClient = null;
function getTwilio() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) return null;
  if (!smsClient) smsClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return smsClient;
}

function getTransport() {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function buildAppointmentMessage(payload) {
  const { userName, counselorName, date, time, type } = payload;
  return (
    `JeevanRakshak Update\n` +
    `Student: ${userName || '-'}\n` +
    `Counselor: ${counselorName || '-'}\n` +
    `When: ${date || '-'} ${time || ''}\n` +
    `Mode: ${type || '-'}\n` +
    `We will share a brief summary after the session.`
  );
}

function buildReportMessage(payload) {
  const { userName, risk, tips = [] } = payload;
  const tipsLine = Array.isArray(tips) && tips.length ? `\nTips: ${tips.slice(0,3).join('; ')}` : '';
  return (
    `JeevanRakshak Report\n` +
    `Student: ${userName || '-'}\n` +
    `AI Risk: ${risk || 'LOW'}${tipsLine}`
  );
}

// Enhanced professional email template
function buildProfessionalEmailHtml(type, data = {}) {
  const { subject, userName, counselorName, date, time, sessionType, riskLevel, reportSummary, tips = [] } = data;
  
  const baseStyles = {
    container: 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #f8fafc; padding: 20px; margin: 0;',
    card: 'max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;',
    header: 'background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px 40px; text-align: center;',
    content: 'padding: 40px;',
    footer: 'background: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb; text-align: center;'
  };
  
  let contentHtml = '';
  
  if (type === 'appointment') {
    contentHtml = `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Counseling Session Scheduled</h2>
        <p style="color: #6b7280; margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">Dear Parent/Guardian,</p>
        <p style="color: #374151; margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
          We're writing to inform you that <strong>${userName}</strong> has scheduled a counseling session through JeevanRakshak.
        </p>
      </div>
      
      <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 25px; margin: 25px 0;">
        <h3 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 18px;">Session Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #374151; font-weight: 600; width: 40%;">Student:</td><td style="padding: 8px 0; color: #1f2937;">${userName}</td></tr>
          <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Counselor:</td><td style="padding: 8px 0; color: #1f2937;">${counselorName}</td></tr>
          <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Date & Time:</td><td style="padding: 8px 0; color: #1f2937;">${date} at ${time}</td></tr>
          <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Session Type:</td><td style="padding: 8px 0; color: #1f2937;">${sessionType}</td></tr>
        </table>
      </div>
      
      <p style="color: #374151; margin: 25px 0; font-size: 16px; line-height: 1.6;">
        We will provide a brief summary after the session. If you have any questions or concerns, please don't hesitate to contact us.
      </p>`;
  } else if (type === 'report') {
    const riskColor = riskLevel === 'HIGH' ? '#dc2626' : riskLevel === 'MEDIUM' ? '#d97706' : '#059669';
    const riskBg = riskLevel === 'HIGH' ? '#fef2f2' : riskLevel === 'MEDIUM' ? '#fffbeb' : '#f0fdf4';
    
    contentHtml = `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Mental Health Assessment Report</h2>
        <p style="color: #6b7280; margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">Dear Parent/Guardian,</p>
        <p style="color: #374151; margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
          We're sharing an important mental health assessment report for <strong>${userName}</strong>.
        </p>
      </div>
      
      <div style="background: ${riskBg}; border: 2px solid ${riskColor}; border-radius: 8px; padding: 25px; margin: 25px 0;">
        <h3 style="color: ${riskColor}; margin: 0 0 15px 0; font-size: 18px;">Assessment Results</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #374151; font-weight: 600; width: 30%;">Student:</td><td style="padding: 8px 0; color: #1f2937;">${userName}</td></tr>
          <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Risk Level:</td><td style="padding: 8px 0; color: ${riskColor}; font-weight: 700;">${riskLevel}</td></tr>
          <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Date:</td><td style="padding: 8px 0; color: #1f2937;">${new Date().toLocaleDateString()}</td></tr>
        </table>
        ${reportSummary ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid ${riskColor};"><p style="color: #374151; margin: 0; font-size: 15px; line-height: 1.5;"><strong>Summary:</strong> ${reportSummary}</p></div>` : ''}
      </div>
      
      ${tips.length > 0 ? `
      <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 25px; margin: 25px 0;">
        <h3 style="color: #15803d; margin: 0 0 15px 0; font-size: 18px;">Recommended Actions</h3>
        <ul style="margin: 0; padding-left: 20px; color: #374151;">
          ${tips.map(tip => `<li style="margin: 8px 0; line-height: 1.5;">${tip}</li>`).join('')}
        </ul>
      </div>` : ''}
      
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5; text-align: center;">
          <strong>Important:</strong> If this is an emergency situation, please contact emergency services immediately at 112 or your local emergency number.
        </p>
      </div>`;
  }
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="${baseStyles.container}">
      <div style="${baseStyles.card}">
        <div style="${baseStyles.header}">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">JeevanRakshak</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Mental Health & Wellness Platform</p>
        </div>
        
        <div style="${baseStyles.content}">
          ${contentHtml}
        </div>
        
        <div style="${baseStyles.footer}">
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">This is an automated message from JeevanRakshak</p>
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} JeevanRakshak. All rights reserved.</p>
          ${CLIENT_ORIGIN ? `<p style="margin: 10px 0 0 0;"><a href="${CLIENT_ORIGIN}" style="color: #10b981; text-decoration: none; font-size: 14px;">Visit Dashboard</a></p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
}

// Legacy function for backward compatibility
function buildEmailHtml(subject, lines = []) {
  const rows = lines
    .map((l) => `<tr><td style="padding:6px 0;color:#111;font-size:14px;">${l}</td></tr>`) 
    .join('');
  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:16px;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
    <tr><td style="font-size:18px;font-weight:700;color:#047857;">${subject}</td></tr>
    ${rows}
    <tr><td style="padding-top:12px;font-size:12px;color:#6b7280;">— JeevanRakshak</td></tr>
  </table></body></html>`;
}

// Enhanced SMS sending with retry logic and validation
async function sendSMS(to, body, retries = 3) {
  const client = getTwilio();
  if (!client) {
    logNotification('sms', to, 'FAILED', { error: 'Twilio not configured' });
    return { ok: false, error: 'Twilio not configured' };
  }
  
  // Validate phone number format
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(to.replace(/[\s\-\(\)]/g, ''))) {
    logNotification('sms', to, 'FAILED', { error: 'Invalid phone number format' });
    return { ok: false, error: 'Invalid phone number format' };
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const resp = await client.messages.create({ 
        from: TWILIO_FROM, 
        to: to.startsWith('+') ? to : `+91${to}`, // Add country code if missing
        body: body.substring(0, 1600) // SMS length limit
      });
      
      logNotification('sms', to, 'SUCCESS', { 
        sid: resp.sid, 
        status: resp.status,
        attempt 
      });
      
      return { ok: true, sid: resp.sid, status: resp.status };
    } catch (error) {
      logNotification('sms', to, 'RETRY', { 
        attempt, 
        error: error.message,
        code: error.code 
      });
      
      if (attempt === retries) {
        logNotification('sms', to, 'FAILED', { 
          error: error.message,
          code: error.code,
          finalAttempt: true 
        });
        return { ok: false, error: error.message, code: error.code };
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

// Enhanced email sending with retry logic and validation
async function sendEmail(to, subject, html, retries = 3) {
  const transport = getTransport();
  if (!transport) {
    logNotification('email', to, 'FAILED', { error: 'SMTP not configured' });
    return { ok: false, error: 'SMTP not configured' };
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    logNotification('email', to, 'FAILED', { error: 'Invalid email format' });
    return { ok: false, error: 'Invalid email format' };
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const info = await transport.sendMail({ 
        from: MAIL_FROM, 
        to, 
        subject, 
        html,
        headers: {
          'X-Mailer': 'JeevanRakshak v1.0',
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal'
        }
      });
      
      logNotification('email', to, 'SUCCESS', { 
        messageId: info.messageId,
        response: info.response,
        attempt 
      });
      
      return { ok: true, id: info.messageId, response: info.response };
    } catch (error) {
      logNotification('email', to, 'RETRY', { 
        attempt, 
        error: error.message,
        code: error.code 
      });
      
      if (attempt === retries) {
        logNotification('email', to, 'FAILED', { 
          error: error.message,
          code: error.code,
          finalAttempt: true 
        });
        return { ok: false, error: error.message, code: error.code };
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

// Enhanced appointment notification with professional formatting
exports.notifyAppointment = async (req, res) => {
  try {
    const { parentPhone, parentEmail, userName, counselorName, date, time, type: sessionType } = req.body || {};
    
    // Validation
    if (!userName || !counselorName || !date || !time) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required fields: userName, counselorName, date, time' 
      });
    }
    
    if (!parentPhone && !parentEmail) {
      return res.status(400).json({ 
        ok: false, 
        error: 'At least one parent contact method (phone or email) is required' 
      });
    }
    
    const results = {};
    const timestamp = new Date().toISOString();
    
    // Enhanced SMS notification
    if (parentPhone) {
      const smsText = `JeevanRakshak Alert: ${userName} has scheduled a counseling session.\n\nDetails:\n- Counselor: ${counselorName}\n- Date: ${date} at ${time}\n- Type: ${sessionType || 'Counseling Session'}\n\nWe'll send a summary after the session. For urgent concerns, contact us immediately.`;
      
      results.sms = await sendSMS(parentPhone, smsText);
    }
    
    // Enhanced Email notification
    if (parentEmail) {
      const emailData = {
        subject: 'Counseling Session Scheduled - JeevanRakshak',
        userName,
        counselorName,
        date,
        time,
        sessionType: sessionType || 'Counseling Session'
      };
      
      const emailHtml = buildProfessionalEmailHtml('appointment', emailData);
      results.email = await sendEmail(parentEmail, emailData.subject, emailHtml);
    }
    
    // Log the notification attempt
    console.log(`📧 Appointment notification sent:`, {
      timestamp,
      userName,
      counselorName,
      parentContacts: {
        phone: parentPhone ? 'provided' : 'not provided',
        email: parentEmail ? 'provided' : 'not provided'
      },
      results
    });

    return res.json({ 
      ok: true, 
      results,
      timestamp,
      message: 'Appointment notifications processed successfully'
    });
  } catch (e) {
    console.error('Appointment notification failed:', e);
    return res.status(500).json({ 
      ok: false, 
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Enhanced mental health report notification
exports.notifyReport = async (req, res) => {
  try {
    const { parentPhone, parentEmail, userName, risk: riskLevel, tips = [], reportSummary } = req.body || {};
    
    // Enhanced validation
    if (!userName || !userName.trim()) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required field: userName',
        code: 'MISSING_USERNAME'
      });
    }
    
    if (!riskLevel) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required field: riskLevel',
        code: 'MISSING_RISK_LEVEL'
      });
    }
    
    // Validate risk level format
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(riskLevel.toUpperCase())) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid risk level. Must be LOW, MEDIUM, or HIGH',
        code: 'INVALID_RISK_LEVEL'
      });
    }
    
    if (!parentPhone && !parentEmail) {
      return res.status(400).json({ 
        ok: false, 
        error: 'At least one parent contact method (phone or email) is required',
        code: 'MISSING_PARENT_CONTACT'
      });
    }
    
    const results = {};
    const timestamp = new Date().toISOString();
    const processedTips = Array.isArray(tips) ? tips.slice(0, 5) : [];
    
    // Enhanced SMS notification
    if (parentPhone) {
      const urgencyText = riskLevel === 'HIGH' ? 'URGENT - ' : '';
      const smsText = `${urgencyText}JeevanRakshak Mental Health Report\n\nStudent: ${userName}\nRisk Level: ${riskLevel}\nDate: ${new Date().toLocaleDateString()}\n\n${reportSummary ? `Summary: ${reportSummary.substring(0, 100)}...\n\n` : ''}${riskLevel === 'HIGH' ? 'Please contact us immediately or seek professional help.' : 'Please check the detailed report in your dashboard.'}`;
      
      results.sms = await sendSMS(parentPhone, smsText);
    }
    
    // Enhanced Email notification
    if (parentEmail) {
      const emailData = {
        subject: `${riskLevel === 'HIGH' ? 'URGENT - ' : ''}Mental Health Report for ${userName} - JeevanRakshak`,
        userName,
        riskLevel,
        reportSummary,
        tips: processedTips
      };
      
      const emailHtml = buildProfessionalEmailHtml('report', emailData);
      results.email = await sendEmail(parentEmail, emailData.subject, emailHtml);
    }
    
    // Log the notification attempt
    console.log(`🚨 Mental health report notification sent:`, {
      timestamp,
      userName,
      riskLevel,
      parentContacts: {
        phone: parentPhone ? 'provided' : 'not provided',
        email: parentEmail ? 'provided' : 'not provided'
      },
      results
    });

    return res.json({ 
      ok: true, 
      results,
      timestamp,
      riskLevel,
      message: 'Mental health report notifications processed successfully'
    });
  } catch (e) {
    console.error('Report notification failed:', e);
    return res.status(500).json({ 
      ok: false, 
      error: e.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Send email notification to parents
exports.sendParentEmailNotification = async (req, res) => {
  try {
    const { parentEmail, userName, riskLevel, reportSummary } = req.body;

    if (!parentEmail || !userName || !riskLevel) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: parentEmail,
      subject: `Mental Health Report for ${userName}`,
      html: `
        <h2>Mental Health Report</h2>
        <p>Dear Parent/Guardian,</p>
        <p>This is an automated report regarding ${userName}'s mental health assessment.</p>
        <p><strong>Risk Level:</strong> ${riskLevel}</p>
        <p><strong>Summary:</strong> ${reportSummary || "Please check the dashboard for detailed information."}</p>
        <p>If you have any concerns, please contact our support team immediately.</p>
        <p>Best regards,<br>JeevanRakshak Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Email sending failed:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
};

// Send SMS notification to parents (using a service like Twilio)
exports.sendParentSMSNotification = async (req, res) => {
  try {
    const { parentPhone, userName, riskLevel } = req.body;

    if (!parentPhone || !userName || !riskLevel) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // For now, we'll simulate SMS sending
    // In production, you would integrate with Twilio or similar service
    const message = `JeevanRakshak Alert: ${userName}'s mental health assessment shows ${riskLevel} risk level. Please check the dashboard for details.`;
    
    console.log(`SMS would be sent to ${parentPhone}: ${message}`);
    
    // TODO: Implement actual SMS sending with Twilio
    // const client = require('twilio')(accountSid, authToken);
    // await client.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE,
    //   to: parentPhone
    // });

    res.status(200).json({ message: "SMS sent successfully" });
  } catch (error) {
    console.error("SMS sending failed:", error);
    res.status(500).json({ error: "Failed to send SMS" });
  }
};

// Send combined notification (email + SMS) to parents when risk is detected
exports.sendParentNotification = async (req, res) => {
  try {
    const { userGoogleId, riskLevel, reportSummary } = req.body;

    if (!userGoogleId || !riskLevel) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get user data to fetch parent contact info
    const User = require("../models/User-model");
    const user = await User.findOne({ googleId: userGoogleId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.parentEmail || !user.parentPhone) {
      return res.status(400).json({ 
        error: "Parent contact information not available. Please update profile." 
      });
    }

    const results = { email: null, sms: null };

    // Send email notification
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.parentEmail,
        subject: `Mental Health Alert for ${user.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Mental Health Alert</h2>
            <p>Dear Parent/Guardian,</p>
            <p>This is an important notification regarding <strong>${user.name}</strong>'s mental health assessment.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #e74c3c; margin: 20px 0;">
              <p><strong>Risk Level:</strong> <span style="color: #e74c3c;">${riskLevel.toUpperCase()}</span></p>
              <p><strong>Assessment Summary:</strong> ${reportSummary || "Please check the JeevanRakshak dashboard for detailed information."}</p>
            </div>
            <p><strong>Recommended Actions:</strong></p>
            <ul>
              <li>Have a gentle conversation with ${user.name}</li>
              <li>Consider professional counseling if needed</li>
              <li>Monitor their well-being closely</li>
              <li>Contact our support team for guidance</li>
            </ul>
            <p>If this is an emergency, please contact emergency services immediately.</p>
            <p>Best regards,<br><strong>JeevanRakshak Team</strong></p>
            <hr>
            <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      results.email = "success";
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      results.email = "failed";
    }

    // Send SMS notification
    try {
      const message = `JeevanRakshak ALERT: ${user.name}'s mental health assessment shows ${riskLevel.toUpperCase()} risk level. Please check the dashboard and consider speaking with them. If emergency, call 911.`;
      
      console.log(`SMS would be sent to ${user.parentPhone}: ${message}`);
      
      // TODO: Implement actual SMS sending with Twilio
      // const client = require('twilio')(accountSid, authToken);
      // await client.messages.create({
      //   body: message,
      //   from: process.env.TWILIO_PHONE,
      //   to: user.parentPhone
      // });

      results.sms = "success";
    } catch (smsError) {
      console.error("SMS sending failed:", smsError);
      results.sms = "failed";
    }

    res.status(200).json({ 
      message: "Notifications processed",
      results,
      parentEmail: user.parentEmail,
      parentPhone: user.parentPhone
    });
  } catch (error) {
    console.error("Parent notification failed:", error);
    res.status(500).json({ error: "Failed to send parent notifications" });
  }
};
