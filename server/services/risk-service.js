const axios = require('axios');

const RISK_SERVICE_URL = process.env.RISK_SERVICE_URL || 'http://localhost:8001';
const RISK_WARN = parseFloat(process.env.RISK_T1 || '0.55');
const RISK_ESCALATE = parseFloat(process.env.RISK_T2 || '0.78');
const LABELS = ['SAFE', 'AMBIGUOUS', 'RISK_LOW', 'RISK_HIGH'];

function normalizeProbs(probs) {
  if (!Array.isArray(probs)) return probs && typeof probs === 'object' ? probs : {};
  return LABELS.reduce((acc, label, index) => {
    acc[label] = Number(probs[index] || 0);
    return acc;
  }, {});
}

function resolveLevel(label, score) {
  const riskLabel = String(label || '').toUpperCase();
  const riskScore = Number(score || 0);

  if (riskLabel === 'RISK_HIGH') {
    if (riskScore >= RISK_ESCALATE) return 'RISK_HIGH';
    if (riskScore >= RISK_WARN) return 'RISK_LOW';
    return 'AMBIGUOUS';
  }
  if (riskLabel === 'RISK_LOW') return 'RISK_LOW';
  if (riskLabel === 'AMBIGUOUS') return 'AMBIGUOUS';
  return 'SAFE';
}

async function scoreText(text) {
  if (!text || !String(text).trim()) return null;
  const payload = { text: [String(text)] };
  const url = `${RISK_SERVICE_URL}/predict`;
  const maxAttempts = 3;
  let attempt = 0;
  let lastErr = null;
  while (attempt < maxAttempts) {
    try {
      const res = await axios.post(url, payload, { timeout: 3000 });
      const item = Array.isArray(res.data) ? res.data[0] : null;
      if (!item) return null;
      const { risk_label, risk_score, version, probs } = item;
      const score = Number(risk_score || 0);
      const level = resolveLevel(risk_label, score);
      return { label: risk_label, score, level, version, probs: normalizeProbs(probs) };
    } catch (e) {
      lastErr = e;
      attempt += 1;
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 250 * attempt));
        continue;
      }
    }
  }
  console.warn('Risk service unavailable:', lastErr?.message || lastErr);
  return null;
}

async function checkRiskService() {
  try {
    const res = await axios.get(`${RISK_SERVICE_URL}/health`, { timeout: 3000 });
    return {
      ok: Boolean(res.data?.ok),
      serviceUrl: RISK_SERVICE_URL,
      details: res.data,
    };
  } catch (e) {
    return {
      ok: false,
      serviceUrl: RISK_SERVICE_URL,
      error: e?.message || String(e),
    };
  }
}

module.exports = { scoreText, checkRiskService, RISK_WARN, RISK_ESCALATE };
