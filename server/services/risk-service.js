const axios = require('axios');

const RISK_SERVICE_URL = process.env.RISK_SERVICE_URL || 'http://localhost:8001';
const RISK_WARN = parseFloat(process.env.RISK_T1 || '0.55');
const RISK_ESCALATE = parseFloat(process.env.RISK_T2 || '0.78');

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
      let level = 'SAFE';
      if (risk_score >= RISK_ESCALATE && (risk_label || '').includes('RISK')) level = 'RISK_HIGH';
      else if (risk_score >= RISK_WARN && (risk_label || '').includes('RISK')) level = 'RISK_LOW';
      else if ((risk_label || '').toUpperCase() === 'AMBIGUOUS') level = 'AMBIGUOUS';
      else level = 'SAFE';
      return { label: risk_label, score: risk_score, level, version, probs };
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

module.exports = { scoreText, RISK_WARN, RISK_ESCALATE };
