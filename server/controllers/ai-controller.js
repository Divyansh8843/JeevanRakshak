const Routine = require('../models/Routine-model');
const User = require('../models/User-model');
const { analyzeRoutineData, chatWithAssistant } = require('../utils/gemini');
const { sendParentAlert } = require('../utils/mailer');
const { sendParentSMS } = require('../utils/sms');
const { emitToUser } = require('../utils/socket');

// POST /api/analyze
exports.analyze = async (req, res) => {
  try {
    const { googleId, period = 'daily', data } = req.body || {};
    
    // Enhanced validation
    if (!googleId) {
      return res.status(400).json({ 
        error: 'googleId required',
        code: 'MISSING_GOOGLE_ID'
      });
    }
    
    if (!data) {
      return res.status(400).json({ 
        error: 'data required',
        code: 'MISSING_DATA'
      });
    }
    
    // Validate period
    if (period && !['daily', 'weekly'].includes(period)) {
      return res.status(400).json({
        error: 'Invalid period. Must be daily or weekly',
        code: 'INVALID_PERIOD'
      });
    }
    
    // Validate required data fields
    const requiredFields = ['mood', 'energy', 'sleep', 'stress'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required data fields: ${missingFields.join(', ')}`,
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const analysis = await analyzeRoutineData({ googleId, period, ...data });
    const doc = await Routine.create({ googleId, period, data, risk: analysis.risk, tips: analysis.tips });
    // Realtime notify the user dashboard
    try {
      emitToUser(googleId, 'routine:created', {
        id: doc._id.toString(),
        createdAt: doc.createdAt,
        risk: analysis.risk,
        data,
      });
    } catch (_) {}

    // Professional email/SMS report to parent for every check-in (if configured)
    try {
      const user = await User.findOne({ googleId });
      const to = user?.parentEmail;
      const toSms = user?.parentPhone;
      if (to) {
        const dateStr = new Date(doc.createdAt).toLocaleString();
        const subject = `[${period === 'weekly' ? 'Weekly' : 'Daily'} Report] ${user.name || 'Student'} • ${dateStr}`;
        const rows = [
          { label: 'Mood', value: data?.mood ?? '-' },
          { label: 'Energy', value: data?.energy ?? '-' },
          { label: 'Sleep', value: data?.sleep ?? '-' },
          { label: 'Stress', value: data?.stress ?? '-' },
        ];
        const activities = Array.isArray(data?.activities) ? data.activities : [];
        const notes = (data?.notes || '').toString();
        const html = `
          <div style="font-family:Inter,Arial,sans-serif;max-width:620px;margin:0 auto;padding:16px;color:#111827">
            <h2 style="margin:0 0 8px;font-size:18px;color:#047857">${period === 'weekly' ? 'Weekly' : 'Daily'} Wellness Report</h2>
            <p style="margin:0 0 12px;color:#374151"><b>${user.name || 'Student'}</b> • ${dateStr}</p>
            <table style="border-collapse:collapse;width:100%;margin:8px 0 16px">
              <tbody>
                ${rows.map(r => `<tr><td style=\"border:1px solid #e5e7eb;padding:8px;background:#f9fafb;width:30%\">${r.label}</td><td style=\"border:1px solid #e5e7eb;padding:8px\">${r.value}</td></tr>`).join('')}
                <tr><td style="border:1px solid #e5e7eb;padding:8px;background:#f9fafb">Risk</td><td style="border:1px solid #e5e7eb;padding:8px"><b>${analysis.risk}</b></td></tr>
              </tbody>
            </table>
            ${activities.length ? `<p style="margin:0 0 8px"><b>Activities:</b> ${activities.join(', ')}</p>` : ''}
            ${notes ? `<p style="margin:8px 0 8px"><b>Notes:</b> ${notes}</p>` : ''}
            ${Array.isArray(analysis.tips) && analysis.tips.length ? `<div style="margin-top:12px"><p style="margin:0 0 6px"><b>AI Tips:</b></p><ul style="margin:0;padding-left:18px">${analysis.tips.map(t => `<li>${t}</li>`).join('')}</ul></div>` : ''}
            <p style="margin-top:16px;color:#6b7280;font-size:12px">This report is intended to keep you informed. For emergencies, please contact local services immediately.</p>
          </div>`;
        const text = `Report for ${user.name || 'Student'} • ${dateStr}\nMood: ${data?.mood ?? '-'}\nEnergy: ${data?.energy ?? '-'}\nSleep: ${data?.sleep ?? '-'}\nStress: ${data?.stress ?? '-'}\nRisk: ${analysis.risk}\nActivities: ${(activities).join(', ')}\nNotes: ${notes}\nTips:\n- ${(analysis.tips || []).join('\n- ')}`;
        await sendParentAlert({ to, subject, text, html });
        if (toSms) {
          const smsBody = `${period === 'weekly' ? 'Weekly' : 'Daily'} report for ${user.name || 'Student'}\nMood: ${data?.mood ?? '-'} | Energy: ${data?.energy ?? '-'} | Sleep: ${data?.sleep ?? '-'} | Stress: ${data?.stress ?? '-'}\nRisk: ${analysis.risk}`;
          try { await sendParentSMS({ to: toSms, body: smsBody }); } catch(_) {}
        }
      }
    } catch (_) {}

    // Urgent alert on HIGH risk (maintained)
    if (analysis.risk === 'HIGH') {
      try {
        const user = await User.findOne({ googleId });
        const to = user?.parentEmail;
        const toSms = user?.parentPhone;
        if (to) {
          const subject = 'Important: High risk indicator detected';
          const text = `Our AI detected a high risk indicator based on recent routine inputs.\n\nTips:\n- ${analysis.tips.join('\n- ')}\n\nPlease consider reaching out and seeking professional support.`;
          const html = `<p>Our AI detected a <b>high risk</b> indicator based on recent routine inputs.</p><p>Tips:</p><ul>${analysis.tips.map(t => `<li>${t}</li>`).join('')}</ul><p>Please consider reaching out and seeking professional support.</p>`;
          await sendParentAlert({ to, subject, text, html });
        }
        if (toSms) {
          const smsBody = 'High risk indicator detected in recent routine inputs. Please check your email for details and consider professional support.';
          try { await sendParentSMS({ to: toSms, body: smsBody }); } catch(_) {}
        }
      } catch (_) {}
    }

    res.status(200).json({ risk: analysis.risk, tips: analysis.tips, id: doc._id });
  } catch (err) {
    console.error('Analyze failed:', err);
    res.status(500).json({ error: 'Analyze failed' });
  }
};

// GET /api/routines
exports.getRoutines = async (req, res) => {
  try {
    const { googleId, period } = req.query;
    if (!googleId) return res.status(400).json({ error: 'googleId required' });
    const filter = { googleId };
    if (period) filter.period = period;
    const items = await Routine.find(filter).sort({ createdAt: -1 }).limit(50);
    res.status(200).json(items);
  } catch (err) {
    console.error('Get routines failed:', err);
    res.status(500).json({ error: 'Get routines failed' });
  }
};

// POST /api/chatbot
exports.chatbot = async (req, res) => {
  try {
    const { messages, userId } = req.body || {};
    
    // Enhanced validation
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        error: 'messages array required',
        code: 'MISSING_MESSAGES'
      });
    }
    
    // Validate message content
    const validMessages = messages.filter(msg => msg && typeof msg === 'string' && msg.trim().length > 0);
    if (validMessages.length === 0) {
      return res.status(400).json({
        error: 'No valid message content found',
        code: 'INVALID_MESSAGE_CONTENT'
      });
    }
    
    // Process messages with safety checks
    const sanitizedMessages = validMessages.map(String).slice(0, 20); // Limit to 20 messages
    const reply = await chatWithAssistant(sanitizedMessages, userId);
    
    res.status(200).json({ 
      reply,
      processed: sanitizedMessages.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Chatbot failed:', err);
    res.status(500).json({ 
      error: 'Chatbot processing failed',
      code: 'CHATBOT_ERROR',
      message: err.message
    });
  }
};

// GET /api/risk/trend?googleId=xxx&period=daily|weekly&days=7
exports.getRiskTrend = async (req, res) => {
  try {
    const { googleId } = req.query;
    const period = req.query.period === 'weekly' ? 'weekly' : 'daily';
    const days = Math.min(parseInt(req.query.days || '7', 10) || 7, 30);
    if (!googleId) return res.status(400).json({ error: 'googleId required' });

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const filter = { googleId, period, createdAt: { $gte: since } };
    const items = await Routine.find(filter).sort({ createdAt: 1 });

    const distribution = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    const series = items.map(it => {
      distribution[it.risk] = (distribution[it.risk] || 0) + 1;
      return { t: it.createdAt, risk: it.risk };
    });

    res.status(200).json({ period, days, distribution, series });
  } catch (err) {
    console.error('Get risk trend failed:', err);
    res.status(500).json({ error: 'Get risk trend failed' });
  }
};
