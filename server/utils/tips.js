// Utility to generate dynamic, data-driven tips without using LLMs.
// Combines routine fields (mood, energy, sleep, stress, notes) with ML risk outputs
// to produce tailored, actionable suggestions.

function normalize(str) {
  return (str || "").toString().trim().toLowerCase();
}

function uniq(items) {
  const seen = new Set();
  const result = [];
  for (const i of items) {
    const key = normalize(i);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(i);
    }
  }
  return result;
}

function cap(items, n = 7) {
  return items.slice(0, n);
}

// riskLabel: SAFE | RISK_LOW | RISK_HIGH | AMBIGUOUS
// data: { mood, energy, sleep, stress, notes }
function generateTips({ data = {}, riskLabel, riskScore, probs }) {
  const mood = normalize(data.mood);
  const energy = normalize(data.energy);
  const sleep = normalize(data.sleep);
  const stress = normalize(data.stress);
  const notes = normalize(data.notes);

  const tips = [];

  // Base depending on risk level
  if (riskLabel === "RISK_HIGH") {
    tips.push(
      "Reach out to a trusted person or counselor today",
      "Practice 4-4-4-4 box breathing for 2 minutes",
      "Avoid caffeine and nicotine for the next 6 hours",
      "Keep plans small: pick one simple, doable task"
    );
  } else if (riskLabel === "RISK_LOW" || riskLabel === "AMBIGUOUS") {
    tips.push(
      "Do a 10-minute mindful walk to reset",
      "Write down one thing that went well today",
      "Drink a full glass of water and stretch for 3 minutes"
    );
  } else {
    // SAFE
    tips.push(
      "Maintain your routine: sleep, meals, movement, and breaks",
      "Plan tomorrow with 3 small goals",
      "Share a positive update with a friend"
    );
  }

  // Stress-driven
  if (stress === "high") {
    tips.push(
      "Try the 5-4-3-2-1 grounding technique",
      "Limit scrolling; set a 15-minute timer",
      "Schedule a short check-in with a mentor or friend"
    );
  } else if (stress === "medium") {
    tips.push("Use Pomodoro: 25 minutes focus, 5 minutes rest");
  }

  // Sleep-driven
  if (sleep === "poor" || sleep === "bad") {
    tips.push(
      "Set a consistent sleep time and wake time",
      "No screens 30 minutes before bed; pick a book or music",
      "Avoid heavy meals and energy drinks late evening"
    );
  } else if (sleep === "fair") {
    tips.push("Aim for a 20-minute daylight walk to support sleep");
  }

  // Energy-driven
  if (energy === "low") {
    tips.push(
      "Take a 10-minute brisk walk and hydrate",
      "Eat a light protein snack (nuts, yogurt)"
    );
  } else if (energy === "medium") {
    tips.push("Plan two short focus blocks and one longer break");
  }

  // Mood-driven
  if (["sad", "down", "depressed"].includes(mood)) {
    tips.push(
      "Do one mood-lifting activity: music, art, call a friend",
      "Write 3 small wins from the past week"
    );
  } else if (["anxious", "nervous", "worried"].includes(mood)) {
    tips.push(
      "Practice slow breathing: inhale 4s, exhale 6s for 5 rounds",
      "List your top worry and one step you can take"
    );
  } else if (["angry", "frustrated"].includes(mood)) {
    tips.push(
      "Do a physical reset: 20 jumping jacks or quick walk",
      "Delay responses; draft a message and review later"
    );
  } else if (["happy", "content"].includes(mood)) {
    tips.push("Lock in routines that support your good mood today");
  }

  // Notes keyword-driven
  if (notes) {
    if (/exam|study|deadline|assignment/.test(notes)) {
      tips.push(
        "Break tasks into 25-minute focus sprints with 5-minute breaks",
        "Write a 3-step plan for the next assignment"
      );
    }
    if (/lonely|alone|isolat/.test(notes)) {
      tips.push(
        "Message one friend or join a short group activity",
        "Spend 15 minutes outside to change context"
      );
    }
    if (/panic|attack|overwhelm/.test(notes)) {
      tips.push(
        "Use a grounding exercise: name 5 things you can see",
        "Reduce stimulants; choose calm music for 10 minutes"
      );
    }
    if (/sleep/.test(notes) && sleep !== "good") {
      tips.push("Keep bedroom dark and cool; avoid naps >20 minutes");
    }
    if (/self\s*harm|suicide|kill|end\s*life/.test(notes)) {
      tips.push(
        "If you feel unsafe, contact a counselor or local helpline",
        "Stay with someone you trust and remove unsafe items"
      );
    }
  }

  // Use ML probabilities to tailor emphasis if available
  if (probs && typeof probs === "object") {
    // If high probability of high risk, add help-seeking emphasis
    const pHigh = probs.RISK_HIGH ?? probs.high ?? probs.HIGH;
    if (typeof pHigh === "number" && pHigh >= 0.5) {
      tips.push(
        "Prioritize support: book a counselor session or talk to a mentor",
        "Keep your evening light; choose calming activities only"
      );
    }
  }

  return cap(uniq(tips));
}

module.exports = { generateTips };