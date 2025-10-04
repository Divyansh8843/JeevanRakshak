const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
let model;

function getModel() {
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  if (!model) {
    const genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: MODEL_NAME });
  }
  return model;
}

async function analyzeRoutineData(routine) {
  const m = getModel();
  const prompt = `You are a licensed clinical psychologist assisting with early suicide risk detection for educational and supportive purposes only (not a diagnosis).\n
Given the following structured routine data for a teen/young adult, estimate the suicide risk as one of: LOW, MEDIUM, HIGH. Then provide 5 concise, empathetic, practical tips tailored to the inputs.\n
Return JSON with keys: risk (LOW|MEDIUM|HIGH) and tips (string[]).\n
Routine JSON:\n${JSON.stringify(routine)}\n`;
  const res = await m.generateContent(prompt);
  const text = res.response.text();
  try {
    // Extract JSON from response (might include surrounding text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    const risk = String(parsed.risk || '').toUpperCase();
    const tips = Array.isArray(parsed.tips) ? parsed.tips.slice(0, 7) : [];
    return { risk, tips };
  } catch (e) {
    // Fallback: simple heuristic
    return { risk: 'LOW', tips: ['Connect with a trusted friend or family member', 'Maintain regular sleep', 'Engage in light physical activity', 'Practice mindfulness for 5 minutes', 'Reach out to a counselor if feelings worsen'] };
  }
}

async function chatWithAssistant(messages) {
  const m = getModel();
  const system = 'You are a compassionate mental health support assistant. Be concise, empathetic, and provide actionable, non-judgmental guidance. Avoid medical diagnoses. Encourage professional help when risk is high.';
  const prompt = `${system}\nUser: ${messages.join('\nUser: ')}\nAssistant:`;
  const res = await m.generateContent(prompt);
  return res.response.text();
}

module.exports = { analyzeRoutineData, chatWithAssistant };
