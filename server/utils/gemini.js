const { GoogleGenerativeAI } = require('@google/generative-ai');

require('dotenv').config();
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
let model;

function cap(items, n = 7) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, n);
}

function getModel() {
  if (!API_KEY) {
    // Return null to allow graceful fallback
    return null;
  }
  if (!model) {
    const genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: MODEL_NAME });
  }
  return model;
}

async function analyzeRoutineData(routine) {
  try {
    const m = getModel();
    if (!m) throw new Error('GEMINI_UNAVAILABLE');
    const prompt = `You are a licensed clinical psychologist assisting with early suicide risk detection for educational and supportive purposes only (not a diagnosis).\n\nGiven the following structured routine data for a teen/young adult, estimate the suicide risk as one of: LOW, MEDIUM, HIGH. Then provide 5 concise, empathetic, practical tips tailored to the inputs.\n\nReturn JSON with keys: risk (LOW|MEDIUM|HIGH) and tips (string[]).\n\nRoutine JSON:\n${JSON.stringify(routine)}\n`;
    const res = await m.generateContent(prompt);
    const text = res.response.text();
    // Try parsing JSON; if fails, fallback
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    const risk = String(parsed.risk || '').toUpperCase();
    const tips = Array.isArray(parsed.tips) ? parsed.tips.slice(0, 7) : [];
    return { risk, tips };
  } catch (_) {
    // Fallback: simple heuristic
    return {
      risk: 'LOW',
      tips: [
        'Connect with a trusted friend or family member',
        'Maintain regular sleep',
        'Engage in light physical activity',
        'Practice mindfulness for 5 minutes',
        'Reach out to a counselor if feelings worsen',
      ],
    };
  }
}

async function chatWithAssistant(messages) {
  try {
    const m = getModel();
    if (!m) throw new Error('GEMINI_UNAVAILABLE');
    const system = 'You are a compassionate mental health support assistant. Be concise, empathetic, and provide actionable, non-judgmental guidance. Avoid medical diagnoses. Encourage professional help when risk is high.';
    const prompt = `${system}\nUser: ${messages.join('\nUser: ')}\nAssistant:`;
    const res = await m.generateContent(prompt);
    return res.response.text();
  } catch (_) {
    // Fallback reply when Gemini is unavailable or errors occur
    return 'I’m here to help. Based on what you’ve shared, consider:\n- 3-minute breathing break\n- Message a supportive friend\n- Short walk or stretch\n- Drink water and have a light snack\nIf you ever feel unsafe, reach out to local crisis support or a counselor.';
  }
}

// Generate tips using Gemini only (do not compute risk). If Gemini is unavailable,
// throw to allow caller to gracefully fallback to deterministic tips.
async function generateTipsFromGemini({ data = {}, riskLabel = 'SAFE' }) {
  const m = getModel();
  if (!m) throw new Error('GEMINI_UNAVAILABLE');

  const prompt = `You are a licensed clinical psychologist assisting with supportive, actionable well-being guidance for educational purposes only (not a diagnosis).

Given structured routine data and an ML-derived risk label, produce 5–7 short, concrete tips tailored to the person's current state. Avoid medical diagnoses. Prefer simple, practical steps (breathing, hydration, short walk, journaling, reaching out to trusted support). If risk is high, include gentle help-seeking guidance. Output ONLY strict JSON as: { "tips": ["...", "..."] } with no extra text.

RiskLabel: ${String(riskLabel).toUpperCase()}
Data: ${JSON.stringify({
    mood: data.mood,
    energy: data.energy,
    sleep: data.sleep,
    stress: data.stress,
    notes: data.notes ? String(data.notes).slice(0, 400) : ''
  })}`;

  const res = await m.generateContent(prompt);
  const text = res.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
  const tips = Array.isArray(parsed.tips) ? parsed.tips : [];
  return cap(tips, 7);
}

module.exports = { analyzeRoutineData, chatWithAssistant, generateTipsFromGemini };
