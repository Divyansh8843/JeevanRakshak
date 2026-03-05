const Routine = require("../models/Routine-model");
const { generateTips } = require("../utils/tips");
const User = require("../models/User-model");
const {
  analyzeRoutineData,
  chatWithAssistant,
  generateTipsFromGemini,
} = require("../utils/gemini");
const { scoreText } = require("../services/risk-service");
const { sendParentAlert } = require("../utils/mailer");
const { sendParentSMS } = require("../utils/sms");
const { emitToUser } = require("../utils/socket");
const PROJECT_NAME = process.env.PROJECT_NAME || "JeevanRakshak";
const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || "w5173";

function riskBadge(risk) {
  const r = String(risk || "LOW").toUpperCase();
  const color =
    r === "HIGH" ? "#b91c1c" : r === "MEDIUM" ? "#d97706" : "#059669";
  const bg = r === "HIGH" ? "#fee2e2" : r === "MEDIUM" ? "#fef3c7" : "#ecfdf5";
  return `<span style="display:inline-block;padding:4px 8px;border-radius:999px;background:${bg};color:${color};font-weight:600;font-size:12px">${r}</span>`;
}

function brandHeader(preheader = "") {
  return `
    <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto">
      <div style="display:none;visibility:hidden;opacity:0;height:0;width:0">${preheader}</div>
      <div style="padding:16px 16px 0">
        <h1 style="margin:0;font-size:18px;line-height:24px;color:#111827">${PROJECT_NAME}</h1>
        <p style="margin:4px 0 0;color:#6b7280;font-size:12px">Wellness insights to keep you informed</p>
      </div>
  `;
}

function brandFooter() {
  return `
      <div style="padding:16px;color:#6b7280;font-size:12px">This report is informational and not a diagnosis.
        If you believe there is immediate risk, contact local emergency services.</div>
      <div style="padding:0 16px 24px;color:#9ca3af;font-size:11px">© ${new Date().getFullYear()} ${PROJECT_NAME}</div>
    </div>
  `;
}

// POST /api/analyze
exports.analyze = async (req, res) => {
  try {
    const { googleId, period = "daily", data } = req.body || {};

    // Enhanced validation
    if (!googleId) {
      return res.status(400).json({
        error: "googleId required",
        code: "MISSING_GOOGLE_ID",
      });
    }

    if (!data) {
      return res.status(400).json({
        error: "data required",
        code: "MISSING_DATA",
      });
    }

    // Validate period
    if (period && !["daily", "weekly"].includes(period)) {
      return res.status(400).json({
        error: "Invalid period. Must be daily or weekly",
        code: "INVALID_PERIOD",
      });
    }

    // Validate required data fields
    const requiredFields = ["mood", "energy", "sleep", "stress"];
    const missingFields = requiredFields.filter((field) => !data[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required data fields: ${missingFields.join(", ")}`,
        code: "MISSING_REQUIRED_FIELDS",
      });
    }

    const analysis = await analyzeRoutineData({ googleId, period, ...data });
    const doc = await Routine.create({
      googleId,
      period,
      data,
      risk: analysis.risk,
      tips: analysis.tips,
    });
    // Realtime notify the user dashboard
    try {
      emitToUser(googleId, "routine:created", {
        id: doc._id.toString(),
        createdAt: doc.createdAt,
        risk: analysis.risk,
        data,
      });
      // Also emit updated routines list for real-time dashboards that listen to 'routines:update'
      try {
        const items = await Routine.find({ googleId })
          .sort({ createdAt: -1 })
          .limit(50);
        emitToUser(googleId, "routines:update", items);
      } catch (_) {}
    } catch (_) {}

    // Professional email/SMS report to parent for every check-in (if configured)
    try {
      const user = await User.findOne({ googleId });
      const to = user?.parentEmail;
      const toSms = user?.parentPhone;
      if (to) {
        const dateStr = new Date(doc.createdAt).toLocaleString();
        const isWeekly = period === "weekly";
        const riskText = String(analysis.risk || "LOW").toUpperCase();
        const subject = `${PROJECT_NAME} • ${
          isWeekly ? "Weekly" : "Daily"
        } Wellness Report for ${user.name || "Student"}${
          riskText === "HIGH" ? " • High Risk" : ""
        }`;
        const preheader = `${isWeekly ? "Weekly" : "Daily"} summary • Mood ${
          data?.mood ?? "-"
        }, Energy ${data?.energy ?? "-"}, Sleep ${data?.sleep ?? "-"}, Stress ${
          data?.stress ?? "-"
        }`;
        const rows = [
          { label: "Mood", value: data?.mood ?? "-" },
          { label: "Energy", value: data?.energy ?? "-" },
          { label: "Sleep", value: data?.sleep ?? "-" },
          { label: "Stress", value: data?.stress ?? "-" },
        ];
        const activities = Array.isArray(data?.activities)
          ? data.activities
          : [];
        const notes = (data?.notes || "").toString();
        const dashboardUrl = `${CLIENT_ORIGIN}/dashboard`;
        const html = `
          ${brandHeader(preheader)}
          <div style="padding:16px">
            <div style="display:flex;align-items:center;gap:8px;color:#111827">
              <h2 style="margin:0;font-size:16px">${
                isWeekly ? "Weekly" : "Daily"
              } Wellness Report</h2>
              ${riskBadge(riskText)}
            </div>
            <p style="margin:6px 0 12px;color:#374151"><b>${
              user.name || "Student"
            }</b> • ${dateStr}</p>
            <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:12px">
              <table style="border-collapse:collapse;width:100%">
                <tbody>
                  ${rows
                    .map(
                      (r) =>
                        `<tr>
                           <td style=\"border-bottom:1px solid #f3f4f6;padding:10px;background:#f9fafb;width:30%\">${r.label}</td>
                           <td style=\"border-bottom:1px solid #f3f4f6;padding:10px\">${r.value}</td>
                         </tr>`
                    )
                    .join("")}
                  <tr>
                    <td style="border-bottom:1px solid #f3f4f6;padding:10px;background:#f9fafb">Risk</td>
                    <td style="border-bottom:1px solid #f3f4f6;padding:10px">${riskBadge(
                      riskText
                    )}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            ${
              activities.length
                ? `<div style="margin:8px 0 12px"><b>Activities:</b> ${activities.join(
                    ", "
                  )}</div>`
                : ""
            }
            ${
              notes
                ? `<div style="margin:8px 0 12px"><b>Notes:</b> ${notes}</div>`
                : ""
            }
            ${
              Array.isArray(analysis.tips) && analysis.tips.length
                ? `<div style="margin-top:12px">
                     <p style="margin:0 0 6px"><b>AI Tips:</b></p>
                     <ul style="margin:0;padding-left:18px">${analysis.tips
                       .map((t) => `<li>${t}</li>`)
                       .join("")}</ul>
                   </div>`
                : ""
            }
            ${
              riskText === "HIGH"
                ? `<div style="margin-top:12px;padding:12px;border:1px solid #fecaca;border-radius:8px;background:#fff1f2;color:#991b1b">
                     <b>Important:</b> Elevated risk signal detected. Consider reaching out to the student and professional support.
                   </div>`
                : ""
            }
            <div style="margin-top:16px">
              <a href="${dashboardUrl}" style="display:inline-block;background:#047857;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600">Open Dashboard</a>
            </div>
          </div>
          ${brandFooter()}
        `;
        const text = `Report for ${
          user.name || "Student"
        } • ${dateStr}\nMood: ${data?.mood ?? "-"}\nEnergy: ${
          data?.energy ?? "-"
        }\nSleep: ${data?.sleep ?? "-"}\nStress: ${
          data?.stress ?? "-"
        }\nRisk: ${analysis.risk}\nActivities: ${activities.join(
          ", "
        )}\nNotes: ${notes}\nTips:\n- ${(analysis.tips || []).join("\n- ")}`;
        await sendParentAlert({ to, subject, text, html });
        if (toSms) {
          const smsBody = `${
            period === "weekly" ? "Weekly" : "Daily"
          } report for ${user.name || "Student"}\nMood: ${
            data?.mood ?? "-"
          } | Energy: ${data?.energy ?? "-"} | Sleep: ${
            data?.sleep ?? "-"
          } | Stress: ${data?.stress ?? "-"}\nRisk: ${analysis.risk}`;
          try {
            await sendParentSMS({ to: toSms, body: smsBody });
          } catch (_) {}
        }
      }
    } catch (_) {}

    // Urgent alert on HIGH risk (maintained)
    if (analysis.risk === "HIGH") {
      try {
        const user = await User.findOne({ googleId });
        const to = user?.parentEmail;
        const toSms = user?.parentPhone;
        if (to) {
          const subject = "Important: High risk indicator detected";
          const text = `Our AI detected a high risk indicator based on recent routine inputs.\n\nTips:\n- ${analysis.tips.join(
            "\n- "
          )}\n\nPlease consider reaching out and seeking professional support.`;
          const html = `<p>Our AI detected a <b>high risk</b> indicator based on recent routine inputs.</p><p>Tips:</p><ul>${analysis.tips
            .map((t) => `<li>${t}</li>`)
            .join(
              ""
            )}</ul><p>Please consider reaching out and seeking professional support.</p>`;
          await sendParentAlert({ to, subject, text, html });
        }
        if (toSms) {
          const smsBody =
            "High risk indicator detected in recent routine inputs. Please check your email for details and consider professional support.";
          try {
            await sendParentSMS({ to: toSms, body: smsBody });
          } catch (_) {}
        }
      } catch (_) {}
    }

    res
      .status(200)
      .json({ risk: analysis.risk, tips: analysis.tips, id: doc._id });
  } catch (err) {
    console.error("Analyze failed:", err);
    res.status(500).json({ error: "Analyze failed" });
  }
};

// GET /api/routines
exports.getRoutines = async (req, res) => {
  try {
    const { googleId, period } = req.query;
    if (!googleId) return res.status(400).json({ error: "googleId required" });
    const filter = { googleId };
    if (period) filter.period = period;
    const items = await Routine.find(filter).sort({ createdAt: -1 }).limit(50);
    res.status(200).json(items);
  } catch (err) {
    console.error("Get routines failed:", err);
    res.status(500).json({ error: "Get routines failed" });
  }
};

// POST /api/chatbot
exports.chatbot = async (req, res) => {
  try {
    const { messages, userId } = req.body || {};

    // Enhanced validation
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "messages array required",
        code: "MISSING_MESSAGES",
      });
    }

    // Validate message content
    const validMessages = messages.filter(
      (msg) => msg && typeof msg === "string" && msg.trim().length > 0
    );
    if (validMessages.length === 0) {
      return res.status(400).json({
        error: "No valid message content found",
        code: "INVALID_MESSAGE_CONTENT",
      });
    }

    // Process messages with safety checks
    const sanitizedMessages = validMessages.map(String).slice(0, 20); // Limit to 20 messages
    const reply = await chatWithAssistant(sanitizedMessages, userId);

    res.status(200).json({
      reply,
      processed: sanitizedMessages.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Chatbot failed:", err);
    res.status(500).json({
      error: "Chatbot processing failed",
      code: "CHATBOT_ERROR",
      message: err.message,
    });
  }
};

// POST /api/risk/checkin (in-house ML)
exports.checkinML = async (req, res) => {
  try {
    const { googleId, period = "daily", data } = req.body || {};
    if (!googleId) return res.status(400).json({ error: "googleId required" });
    if (!data) return res.status(400).json({ error: "data required" });

    // Build text to score (notes + structured)
    const notes = String(data.notes || "").slice(0, 2000);
    const txt = [
      `mood:${data.mood}`,
      `energy:${data.energy}`,
      `sleep:${data.sleep}`,
      `stress:${data.stress}`,
      notes,
    ]
      .filter(Boolean)
      .join(" | ");

    // Score via in-house ML
    const risk = await scoreText(txt);
    // If ML service is unavailable or returns no score, always return an error.
    // This enforces strict behavior so no routine is created without ML.
    if (!risk) {
      return res
        .status(503)
        .json({
          ok: false,
          error: "ML risk model unavailable",
          code: "ML_UNAVAILABLE",
        });
    }
    // Prefer service-derived level which already applies thresholds; fall back to raw label
    const computedLevel = (risk?.level || risk?.label || "SAFE").toUpperCase();
    const riskLabel = computedLevel; // store the resolved level for consistency
    const riskScore = Number(risk?.score || 0);
    const riskModelVersion = String(risk?.version || "");
    const riskEvaluatedAt = new Date();
    const riskSource = "ml";

    // Map level -> legacy LOW/MEDIUM/HIGH for existing UI
    // Treat SAFE and AMBIGUOUS as LOW; RISK_LOW as MEDIUM; RISK_HIGH as HIGH
    const legacy =
      riskLabel === "RISK_HIGH"
        ? "HIGH"
        : riskLabel === "RISK_LOW"
        ? "MEDIUM"
        : "LOW";

    // Tips engine selection: default ML deterministic; optional Gemini if configured
    let tipsEngine = String(process.env.TIPS_ENGINE).toLowerCase();
    let tips;
    if (tipsEngine === "gemini") {
      try {
        tips = await generateTipsFromGemini({ data, riskLabel });
      } catch (_) {
        // Fallback to deterministic tips if Gemini is unavailable or errors occur
        tips = generateTips({ data, riskLabel, riskScore, probs: risk?.probs });
        tipsEngine = "ml";
      }
    } else {
      tips = generateTips({ data, riskLabel, riskScore, probs: risk?.probs });
      tipsEngine = "ml";
    }

    const doc = await Routine.create({
      googleId,
      period,
      data,
      riskSource,
      risk: legacy,
      riskLabel,
      riskScore,
      riskModelVersion,
      riskEvaluatedAt,
      tips,
      tipsEngine,
    });

    try {
      emitToUser(googleId, "routine:created", {
        id: doc._id.toString(),
        createdAt: doc.createdAt,
        risk: legacy,
        riskLabel,
        riskScore,
        data,
      });
      // Also emit updated routines list for real-time dashboards that listen to 'routines:update'
      try {
        const items = await Routine.find({ googleId })
          .sort({ createdAt: -1 })
          .limit(50);
        emitToUser(googleId, "routines:update", items);
      } catch (_) {}
    } catch (_) {}

    return res.status(200).json({
      ok: true,
      id: doc._id,
      riskSource,
      riskLabel,
      riskScore,
      risk: legacy,
      tips,
      tipsEngine,
    });
  } catch (err) {
    console.error("checkinML failed:", err);
    return res.status(500).json({ error: "checkin failed" });
  }
};

// GET /api/risk/trend?googleId=xxx&period=daily|weekly&days=7
exports.getRiskTrend = async (req, res) => {
  try {
    const { googleId } = req.query;
    const period = req.query.period === "weekly" ? "weekly" : "daily";
    const days = Math.min(parseInt(req.query.days || "7", 10) || 7, 30);
    if (!googleId) return res.status(400).json({ error: "googleId required" });

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const filter = { googleId, period, createdAt: { $gte: since } };
    const items = await Routine.find(filter).sort({ createdAt: 1 });

    const distribution = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    const series = items.map((it) => {
      distribution[it.risk] = (distribution[it.risk] || 0) + 1;
      return { t: it.createdAt, risk: it.risk };
    });

    res.status(200).json({ period, days, distribution, series });
  } catch (err) {
    console.error("Get risk trend failed:", err);
    res.status(500).json({ error: "Get risk trend failed" });
  }
};
