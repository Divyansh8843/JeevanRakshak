const User = require("../models/User-model");
const Counselor = require("../models/Counselor-model");

const findOrCreateUser = async (profile) => {
  let isCounselor = false;
  if (profile?.email) {
    const emailLower = profile.email.toLowerCase();
    const c = await Counselor.findOne({ email: emailLower, active: true });
    // Also allow counselor via env allowlist
    const allow = (process.env.COUNSELOR_ALLOWLIST || "")
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    isCounselor = !!c || allow.includes(emailLower);
    // If allowlisted but no Counselor doc, create a minimal one
    if (!c && allow.includes(emailLower)) {
      await Counselor.create({ email: emailLower, name: profile.name || emailLower.split('@')[0] });
    }
  }
  let user = await User.findOne({ googleId: profile.googleId });
  if (!user) {
    user = await User.create({ ...profile, isCounselor });
    return user;
  }
  // Update basic fields from Google if changed (keep phone/age/bio intact)
  const updates = {};
  if (profile.name && profile.name !== user.name) updates.name = profile.name;
  if (profile.email && profile.email !== user.email) updates.email = profile.email;
  if (profile.picture && profile.picture !== user.picture) updates.picture = profile.picture;
  if (typeof isCounselor === 'boolean' && user.isCounselor !== isCounselor) updates.isCounselor = isCounselor;
  if (Object.keys(updates).length > 0) {
    user = await User.findOneAndUpdate({ googleId: profile.googleId }, updates, { new: true });
  }
  return user;
};

// Remove undefined/null, trim strings, and whitelist allowed fields
const sanitizeUpdates = (updates) => {
  const allowed = new Set(["name", "phone", "parentPhone", "age", "bio", "picture", "parentEmail"]); // isCounselor is server-managed
  const cleaned = {};
  for (const key of Object.keys(updates || {})) {
    if (!allowed.has(key)) continue;
    let val = updates[key];
    if (val === undefined || val === null) continue;
    if (typeof val === "string") val = val.trim();
    cleaned[key] = val;
  }
  return cleaned;
};

const updateUser = async (googleId, updates) => {
  const cleaned = sanitizeUpdates(updates);
  return await User.findOneAndUpdate(
    { googleId },
    { $set: cleaned },
    { new: true, runValidators: true }
  );
};

module.exports = { findOrCreateUser, updateUser };
