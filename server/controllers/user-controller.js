const { findOrCreateUser, updateUser } = require("../services/User-service");
const jwt = require("jsonwebtoken");
const User = require("../models/User-model");
const { OAuth2Client } = require("google-auth-library");

// Initialize Google OAuth client
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI; // e.g., http://localhost:8080/api/auth/google/callback
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET || "change_me";

const googleClient = GOOGLE_CLIENT_ID
  ? new OAuth2Client(GOOGLE_CLIENT_ID)
  : null;
const googleRedirectClient =
  GOOGLE_CLIENT_ID && GOOGLE_REDIRECT_URI
    ? new OAuth2Client(
        GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI
      )
    : null;

// Helpers
const { getCurrentUser } = require("../utils/auth-helper");
async function getCurrentUserFromCookie(req) {
  return getCurrentUser(req);
}

// POST /api/auth/google (token-post flow; still supported for fallback)
exports.googleLogin = async (req, res) => {
  try {
    const { id_token } = req.body;
    if (!id_token)
      return res.status(400).json({ error: "id_token is required" });
    if (!googleClient)
      return res.status(500).json({ error: "Google client not configured" });

    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const profile = {
      googleId: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
    };

    const user = await findOrCreateUser(profile);
    // Issue long-lived cookie (persistent until logout)
    const token = jwt.sign({ googleId: user.googleId }, JWT_SECRET, {
      expiresIn: "365d",
    });
    res.cookie("auth_token", token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 365 * 24 * 60 * 60 * 1000, // 365 days
    });
    return res.status(200).json({ token, ...user.toObject() });
  } catch (e) {
    console.error("Google login failed:", e);
    return res.status(500).json({ error: "Google login failed" });
  }
};

// GET /api/counselors/me
exports.getMyCounselorProfile = async (req, res) => {
  try {
    const user = await getCurrentUserFromCookie(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    if (!user.isCounselor) {
      // Auto-enable counselor if allowlisted
      const allow = (process.env.COUNSELOR_ALLOWLIST || "")
        .split(/[\s,]+/)
        .map((s) => s.toLowerCase())
        .filter(Boolean);
      if (user.email && allow.includes(String(user.email).toLowerCase())) {
        user.isCounselor = true;
        await user.save();
      } else {
        return res
          .status(403)
          .json({ error: "Access denied: Not a counselor" });
      }
    }
    if (!user.email)
      return res.status(400).json({ error: "Missing user email" });
    const Counselor = require("../models/Counselor-model");
    let c = await Counselor.findOne({ email: user.email.toLowerCase() });
    // Auto-create counselor profile if it doesn't exist for a counselor user
    if (!c) {
      c = new Counselor({
        email: user.email.toLowerCase(),
        name: user.name,
        bio: "",
        price: 1200,
        prices: { chat: null, call: null, video: null },
        currency: "INR",
        specializations: [],
        languages: ["English"],
        sessionTypes: ["Video Call", "Phone Call", "Chat"],
        image: user.picture || "",
        availability: [],
        active: true,
      });
      await c.save();
    }
    return res.status(200).json(c);
  } catch (e) {
    console.error("getMyCounselorProfile failed:", e);
    return res.status(500).json({ error: "Failed to load counselor profile" });
  }
};

// GET /api/counselors/settings
exports.getCounselorSettings = async (req, res) => {
  try {
    const user = await getCurrentUserFromCookie(req);
    if (!user)
      return res
        .status(401)
        .json({ error: "Not authenticated", code: "AUTH_REQUIRED" });
    if (!user.isCounselor) {
      return res.status(403).json({
        error: "Access denied: Not a counselor",
        code: "NOT_COUNSELOR",
      });
    }
    if (!user.email)
      return res
        .status(400)
        .json({ error: "Missing user email", code: "MISSING_EMAIL" });

    const Counselor = require("../models/Counselor-model");
    const counselor = await Counselor.findOne({
      email: user.email.toLowerCase(),
    });

    if (!counselor) {
      return res.status(404).json({
        error: "Counselor profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    // Return settings from counselor model or default settings
    const settings = {
      notifications: counselor.settings?.notifications || {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        appointmentReminders: true,
        clientMessages: true,
        systemUpdates: false,
      },
      privacy: counselor.settings?.privacy || {
        profileVisibility: "public",
        showOnlineStatus: true,
        allowDirectBooking: true,
        requireApproval: false,
      },
      availability: counselor.settings?.availability || {
        workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        workingHours: {
          start: "09:00",
          end: "17:00",
        },
        timeZone: "Asia/Kolkata",
        bufferTime: 15,
      },
      preferences: counselor.settings?.preferences || {
        language: "english",
        theme: "light",
        autoSave: true,
        sessionDuration: 60,
        maxDailyAppointments: 8,
      },
      security: counselor.settings?.security || {
        twoFactorAuth: false,
        sessionTimeout: 30,
        loginNotifications: true,
      },
    };

    return res.status(200).json(settings);
  } catch (e) {
    console.error("getCounselorSettings failed:", e);
    return res
      .status(500)
      .json({ error: "Failed to load settings", code: "SERVER_ERROR" });
  }
};

// PUT /api/counselors/settings
exports.updateCounselorSettings = async (req, res) => {
  try {
    const user = await getCurrentUserFromCookie(req);
    if (!user)
      return res
        .status(401)
        .json({ error: "Not authenticated", code: "AUTH_REQUIRED" });
    if (!user.isCounselor) {
      return res.status(403).json({
        error: "Access denied: Not a counselor",
        code: "NOT_COUNSELOR",
      });
    }
    if (!user.email)
      return res
        .status(400)
        .json({ error: "Missing user email", code: "MISSING_EMAIL" });

    const Counselor = require("../models/Counselor-model");
    const { broadcastCounselorUpdate } = require("../utils/socket");

    const counselor = await Counselor.findOne({
      email: user.email.toLowerCase(),
    });
    if (!counselor) {
      return res.status(404).json({
        error: "Counselor profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    // Update settings
    counselor.settings = {
      notifications:
        req.body.notifications || counselor.settings?.notifications,
      privacy: req.body.privacy || counselor.settings?.privacy,
      availability: req.body.availability || counselor.settings?.availability,
      preferences: req.body.preferences || counselor.settings?.preferences,
      security: req.body.security || counselor.settings?.security,
    };

    await counselor.save();

    // Broadcast update to connected clients
    broadcastCounselorUpdate(counselor);

    return res
      .status(200)
      .json({ success: true, message: "Settings updated successfully" });
  } catch (e) {
    console.error("updateCounselorSettings failed:", e);
    return res
      .status(500)
      .json({ error: "Failed to update settings", code: "SERVER_ERROR" });
  }
};

// PUT /api/counselors/me
exports.updateMyCounselorProfile = async (req, res) => {
  try {
    const user = await getCurrentUserFromCookie(req);
    if (!user)
      return res
        .status(401)
        .json({ error: "Not authenticated", code: "AUTH_REQUIRED" });
    if (!user.isCounselor) {
      const allow = (process.env.COUNSELOR_ALLOWLIST || "")
        .split(/[\s,]+/)
        .map((s) => s.toLowerCase())
        .filter(Boolean);
      if (user.email && allow.includes(String(user.email).toLowerCase())) {
        user.isCounselor = true;
        await user.save();
      } else {
        return res.status(403).json({
          error: "Access denied: Not a counselor",
          code: "NOT_COUNSELOR",
        });
      }
    }
    if (!user.email)
      return res
        .status(400)
        .json({ error: "Missing user email", code: "MISSING_EMAIL" });

    // Validate required fields
    if (!req.body.name || req.body.name.trim() === "") {
      return res
        .status(400)
        .json({ error: "Name is required", code: "MISSING_NAME" });
    }

    const Counselor = require("../models/Counselor-model");
    const { broadcastCounselorUpdate } = require("../utils/socket");

    const allowed = new Set([
      "name",
      "title",
      "bio",
      "price",
      "prices",
      "currency",
      "specializations",
      "languages",
      "sessionTypes",
      "image",
      "picture",
      "availability",
      "active",
    ]);

    const updates = {};
    for (const k of Object.keys(req.body || {})) {
      if (!allowed.has(k)) continue;

      // Prevent blob URLs from being stored
      if (
        (k === "image" || k === "picture") &&
        req.body[k] &&
        req.body[k].startsWith("blob:")
      ) {
        console.warn(`🚫 Preventing blob URL storage for ${k}:`, req.body[k]);
        continue; // Skip blob URLs
      }

      // Validate price is a number
      if (k === "price" && isNaN(Number(req.body[k]))) {
        return res
          .status(400)
          .json({ error: "Price must be a number", code: "INVALID_PRICE" });
      }

      // Validate prices object
      if (k === "prices") {
        const prices = req.body[k];
        if (prices && typeof prices === "object") {
          for (const type in prices) {
            if (prices[type] && isNaN(Number(prices[type]))) {
              return res.status(400).json({
                error: `Price for ${type} must be a number`,
                code: "INVALID_PRICE_TYPE",
              });
            }
          }
        }
      }

      updates[k] = req.body[k];
    }

    // Add timestamp for tracking
    updates.updatedAt = new Date();

    const c = await Counselor.findOneAndUpdate(
      { email: user.email.toLowerCase() },
      { $set: updates },
      { new: true, upsert: true }
    );

    // Get user's Google profile image
    const User = require("../models/User-model");
    const userRecord = await User.findOne({ email: user.email.toLowerCase() });
    const googleProfileImage = userRecord?.picture || "";

    // Broadcast real-time update
    const updateData = {
      id: c._id?.toString(),
      name: c.name,
      title: c.title || "Counselor",
      email: c.email,
      price: `₹${Number(c.price || 0)}/session`,
      prices: c.prices || {},
      currency: c.currency || "INR",
      sessionTypes:
        Array.isArray(c.sessionTypes) && c.sessionTypes.length
          ? c.sessionTypes
          : ["Video Call", "Phone Call", "Chat"],
      specializations: c.specializations || [],
      languages: c.languages || ["English"],
      rating: c.rating || 4.8,
      reviews: c.reviews || 0,
      image: googleProfileImage || "/avatar1.png", // Use Google profile image
      bio: c.bio || "",
      availability: c.availability || [],
      active: c.active !== false,
      updatedAt: c.updatedAt,
    };

    broadcastCounselorUpdate(updateData);

    return res.status(200).json(c);
  } catch (e) {
    console.error("updateMyCounselorProfile failed:", e);
    return res
      .status(500)
      .json({ error: "Failed to update counselor profile" });
  }
};

// GET /api/auth/google/redirect (initiate OAuth redirect flow)
exports.googleRedirectInitiate = async (_req, res) => {
  try {
    if (!googleRedirectClient)
      return res.status(500).send("Google redirect client not configured");
    const url = googleRedirectClient.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["openid", "email", "profile"],
      redirect_uri: GOOGLE_REDIRECT_URI,
    });
    return res.redirect(url);
  } catch (e) {
    console.error("Redirect initiate failed:", e);
    return res.status(500).send("Redirect initiate failed");
  }
};

// GET /api/auth/google/callback
exports.googleRedirectCallback = async (req, res) => {
  try {
    if (!googleRedirectClient)
      return res.status(500).send("Google redirect client not configured");
    const { code } = req.query;
    if (!code) return res.status(400).send("Missing code");
    const { tokens } = await googleRedirectClient.getToken({
      code,
      redirect_uri: GOOGLE_REDIRECT_URI,
    });
    const idToken = tokens.id_token;
    if (!idToken) return res.status(500).send("No id_token from Google");

    const ticket = await googleRedirectClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const profile = {
      googleId: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
    };
    const user = await findOrCreateUser(profile);

    const token = jwt.sign({ googleId: user.googleId }, JWT_SECRET, {
      expiresIn: "365d",
    });
    res.cookie("auth_token", token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
    // Redirect to profile page after login
    return res.redirect(`${CLIENT_ORIGIN}/profile?auth=1&token=${token}`);
  } catch (e) {
    console.error("Redirect callback failed:", e);
    return res.status(500).send("Redirect callback failed");
  }
};

// GET /api/auth/me -> returns current user using auth_token cookie
exports.me = async (req, res) => {
  try {
    const { getCurrentUser } = require("../utils/auth-helper");
    const user = await getCurrentUser(req);
    
    // DEBUG LOGGING
    if (!user) {
      console.log("❌ Auth failed: No user found from token/cookie", {
        origin: req.headers.origin,
        cookies: req.cookies ? Object.keys(req.cookies) : "None",
        authHeader: req.headers.authorization ? "Present" : "Missing",
        userAgent: req.get('user-agent'),
      });
      return res.status(401).json({ error: "Not authenticated" });
    }

    return res.status(200).json(user);
  } catch (e) {
    console.error("Auth me failed:", e.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};

// POST /api/auth/logout -> clears the auth cookie
exports.logout = async (_req, res) => {
  try {
    res.clearCookie("auth_token", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: true });
  }
};

// PUT /api/user/profile - update user profile
exports.updateProfile = async (req, res) => {
  try {
    const {
      googleId,
      name,
      phone,
      age,
      bio,
      picture,
      parentEmail,
      parentPhone,
    } = req.body;
    if (!googleId) return res.status(400).json({ error: "Missing googleId" });

    // Validate required fields
    if (!parentEmail || !parentPhone) {
      return res.status(400).json({
        error:
          "Parent email and phone are required for emergency notifications",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parentEmail)) {
      return res.status(400).json({ error: "Invalid parent email format" });
    }

    // Validate phone format
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
    if (!phoneRegex.test(parentPhone.replace(/\s/g, ""))) {
      return res.status(400).json({ error: "Invalid parent phone format" });
    }

    const User = require("../models/User-model");
    const updated = await User.findOneAndUpdate(
      { googleId },
      { name, phone, age, bio, picture, parentEmail, parentPhone },
      { new: true, upsert: true }
    );
    res.status(200).json(updated);
  } catch (err) {
    console.error("updateProfile failed:", err);
    res.status(500).json({ error: "Profile update failed" });
  }
};

// GET /api/user/profile?googleId=xxx
exports.getProfile = async (req, res) => {
  try {
    const { googleId } = req.query;
    if (!googleId) return res.status(400).json({ error: "googleId required" });
    const user = await User.findOne({ googleId });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    console.error("Failed to fetch user profile:", err);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
};

// Multer setup removed - using Google profile images only

// Image upload removed - using Google profile images only

// GET /api/counselors/stats - for counselor dashboard
exports.getCounselorStats = async (req, res) => {
  try {
    const user = await getCurrentUserFromCookie(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    if (!user.isCounselor)
      return res.status(403).json({ error: "Access denied: Not a counselor" });

    const Booking = require("../models/Booking-model");
    const Counselor = require("../models/Counselor-model");

    // Get counselor profile to access rating data
    const counselorProfile = await Counselor.findOne({ email: user.email });

    // Date helpers
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );

    const counselorEmail = user.email;

    // Count total bookings for this counselor
    const totalBookings = await Booking.countDocuments({ counselorEmail });

    // Count today's appointments (by scheduledAt when available)
    const todayBookings = await Booking.countDocuments({
      counselorEmail,
      scheduledAt: { $gte: startOfDay, $lte: endOfDay },
    });

    // This month's bookings (confirmed/in_session/completed) for earnings
    const monthlyBookings = await Booking.find({
      counselorEmail,
      scheduledAt: { $gte: startOfMonth },
      status: { $in: ["confirmed", "in_session", "completed"] },
    }).lean();

    // Calculate monthly earnings from bookings
    const monthlyEarnings = monthlyBookings.reduce(
      (total, booking) => total + (booking.price || 0),
      0
    );

    // Count unique clients
    const uniqueClients = await Booking.distinct("googleId", {
      counselorEmail,
    });

    // Count active clients (had booking in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeClients = await Booking.distinct("googleId", {
      counselorEmail,
      scheduledAt: { $gte: thirtyDaysAgo },
    });

    // Get total earnings from counselor profile (updated in real-time)
    const totalEarnings = counselorProfile?.earnings?.total || 0;
    const trackedMonthlyEarnings = counselorProfile?.earnings?.thisMonth || monthlyEarnings;

    const stats = {
      totalClients: uniqueClients.length,
      activeClients: activeClients.length,
      todayAppointments: todayBookings,
      monthlyEarnings: trackedMonthlyEarnings,
      totalEarnings: totalEarnings,
      averageRating: counselorProfile?.rating || 0,
      totalSessions: counselorProfile?.completedSessions || totalBookings,
      lastUpdated: counselorProfile?.earnings?.lastUpdated || new Date(),
    };

    return res.status(200).json(stats);
  } catch (e) {
    console.error("getCounselorStats failed:", e);
    return res.status(500).json({ error: "Failed to load counselor stats" });
  }
};

// GET /api/counselors/activity - for counselor recent activity
exports.getCounselorActivity = async (req, res) => {
  try {
    const user = await getCurrentUserFromCookie(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    if (!user.isCounselor)
      return res.status(403).json({ error: "Access denied: Not a counselor" });

    const Booking = require("../models/Booking-model");
    const ChatMessage = require("../models/ChatMessage-model");

    // Get recent bookings (last 10)
    const recentBookings = await Booking.find({
      counselorEmail: user.email,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get recent chat messages (last 5)
    const recentMessages = await ChatMessage.find({
      counselorEmail: user.email,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Combine and format activities
    const activities = [];

    // Add booking activities
    recentBookings.forEach((booking) => {
      activities.push({
        id: booking._id,
        type: "booking",
        title: `${
          booking.status === "completed" ? "Session completed" : "New booking"
        } - ${booking.sessionType || "Session"}`,
        description: `Client: ${booking.userName || "Anonymous"}`,
        timestamp: booking.createdAt,
        status: booking.status,
        icon: "calendar",
      });
    });

    // Add message activities
    recentMessages.forEach((message) => {
      activities.push({
        id: message._id,
        type: "message",
        title: "New message received",
        description: `From: ${message.userName || "Client"}`,
        timestamp: message.createdAt,
        icon: "message",
      });
    });

    // Sort by timestamp (newest first) and limit to 10
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recentActivity = activities.slice(0, 10);

    return res.status(200).json(recentActivity);
  } catch (e) {
    console.error("getCounselorActivity failed:", e);
    return res.status(500).json({ error: "Failed to load counselor activity" });
  }
};

// GET /api/counselors (DB-driven)
exports.listCounselors = async (_req, res) => {
  try {
    const Counselor = require("../models/Counselor-model");
    const User = require("../models/User-model");

    const items = await Counselor.find({ active: true }).sort({
      updatedAt: -1, // Sort by most recently updated first
      createdAt: -1,
    });

    // Get Google profile images for all counselors
    const counselorEmails = items
      .map((c) => c.email?.toLowerCase())
      .filter(Boolean);
    const users = await User.find({
      email: { $in: counselorEmails },
      isCounselor: true,
    }).select("email picture");
    const userImageMap = {};
    users.forEach((user) => {
      if (user.email) {
        userImageMap[user.email.toLowerCase()] = user.picture;
      }
    });

    const list = items.map((c, idx) => ({
      id: c._id?.toString() || String(idx + 1),
      name: c.name,
      title: c.title || "Counselor",
      email: c.email,
      price: `₹${Number(c.price || 0)}/session`,
      prices: c.prices || {},
      currency: c.currency || "INR",
      sessionTypes:
        Array.isArray(c.sessionTypes) && c.sessionTypes.length
          ? c.sessionTypes
          : ["Video Call", "Phone Call", "Chat"],
      specializations: c.specializations || [],
      languages: c.languages || ["English"],
      rating: c.rating || 4.8,
      reviews: c.reviews || 0,
      image: userImageMap[c.email?.toLowerCase()] || "/avatar1.png", // Use Google profile image
      bio: c.bio || "",
      availability: c.availability || [],
      active: c.active !== false,
      updatedAt: c.updatedAt,
    }));
    return res.status(200).json(list);
  } catch (e) {
    console.error("listCounselors failed:", e);
    return res.status(500).json({ error: "Failed to load counselors" });
  }
};

// GET /api/counselors/clients - distinct clients with last interaction
exports.getCounselorClients = async (req, res) => {
  try {
    const user = await getCurrentUserFromCookie(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    if (!user.isCounselor)
      return res.status(403).json({ error: "Access denied: Not a counselor" });
    const Booking = require("../models/Booking-model");
    const UserModel = require("../models/User-model");
    const bookings = await Booking.find({ counselorEmail: user.email })
      .sort({ scheduledAt: -1, createdAt: -1 })
      .lean();
    const map = new Map();
    for (const b of bookings) {
      const key = b.googleId;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          googleId: key,
          totalSessions: 1,
          lastSession: b.scheduledAt || b.createdAt,
          status: b.status === "completed" ? "active" : b.status || "pending",
        });
      } else {
        const c = map.get(key);
        c.totalSessions += 1;
        if ((b.scheduledAt || b.createdAt) > c.lastSession) {
          c.lastSession = b.scheduledAt || b.createdAt;
          c.status = b.status === "completed" ? "active" : b.status || c.status;
        }
      }
    }
    // Enrich with user profile info
    const clientIds = Array.from(map.keys());
    const users = await UserModel.find({ googleId: { $in: clientIds } })
      .select(
        "googleId name email picture phone age bio parentPhone parentEmail"
      )
      .lean();
    const info = new Map(users.map((u) => [u.googleId, u]));
    const clients = Array.from(map.values()).map((c) => ({
      id: c.googleId,
      googleId: c.googleId,
      name: info.get(c.googleId)?.name || "Client",
      email: info.get(c.googleId)?.email || "",
      picture: info.get(c.googleId)?.picture || null,
      phone: info.get(c.googleId)?.phone || null,
      age: info.get(c.googleId)?.age || null,
      bio: info.get(c.googleId)?.bio || "",
      parentPhone: info.get(c.googleId)?.parentPhone || null,
      parentEmail: info.get(c.googleId)?.parentEmail || null,
      totalSessions: c.totalSessions,
      lastSession: c.lastSession,
      status: c.status,
      riskLevel: "LOW",
    }));
    return res.status(200).json(clients);
  } catch (e) {
    console.error("getCounselorClients failed:", e);
    return res.status(500).json({ error: "Failed to load clients" });
  }
};

// GET /api/counselors/conversations - recent conversations list (aggregated by room)
exports.getCounselorConversations = async (req, res) => {
  try {
    const user = await getCurrentUserFromCookie(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    if (!user.isCounselor)
      return res.status(403).json({ error: "Access denied: Not a counselor" });

    const Booking = require("../models/Booking-model");
    const ChatMessage = require("../models/ChatMessage-model");

    // Get recent bookings for this counselor that have a roomId
    const recentBookings = await Booking.find({
      counselorEmail: user.email,
      roomId: { $exists: true, $ne: null },
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(100)
      .lean();

    const roomIds = Array.from(
      new Set(recentBookings.map((b) => b.roomId).filter(Boolean))
    );
    if (roomIds.length === 0) return res.status(200).json([]);

    // Aggregate last message per roomId
    const pipeline = [
      { $match: { roomId: { $in: roomIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$roomId",
          lastMessage: { $first: "$content" },
          lastSenderId: { $first: "$senderId" },
          lastSenderRole: { $first: "$senderRole" },
          lastCreatedAt: { $first: "$createdAt" },
        },
      },
      { $sort: { lastCreatedAt: -1 } },
      { $limit: 50 },
    ];

    const rooms = await ChatMessage.aggregate(pipeline);

    // Map to UI-friendly conversation objects
    const conversations = rooms.map((r) => ({
      id: r._id,
      clientName: r.lastSenderRole === "student" ? "Client" : "You",
      lastMessage: { content: r.lastMessage, createdAt: r.lastCreatedAt },
      unreadCount: 0,
    }));

    return res.status(200).json(conversations);
  } catch (e) {
    console.error("getCounselorConversations failed:", e);
    return res.status(500).json({ error: "Failed to load conversations" });
  }
};

// GET /api/counselors/appointments - list counselor bookings across states
exports.getCounselorAppointments = async (req, res) => {
  try {
    const user = await getCurrentUserFromCookie(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    if (!user.isCounselor)
      return res.status(403).json({ error: "Access denied: Not a counselor" });

    const Booking = require("../models/Booking-model");
    const UserModel = require("../models/User-model");
    const items = await Booking.find({ counselorEmail: user.email })
      .sort({ scheduledAt: -1, createdAt: -1 })
      .limit(200)
      .lean();

    // Attach client names/emails
    const ids = Array.from(
      new Set(items.map((b) => b.googleId).filter(Boolean))
    );
    const users = await UserModel.find({ googleId: { $in: ids } })
      .select("googleId name email")
      .lean();
    const map = new Map(users.map((u) => [u.googleId, u]));

    const list = items.map((b) => ({
      id: b._id?.toString(),
      clientName: map.get(b.googleId)?.name || "Client",
      clientEmail: map.get(b.googleId)?.email || "",
      date: b.date,
      time: b.time,
      status: b.status,
      sessionType: b.sessionType,
      joinUrl: b.joinUrl,
      feedbackRating: b.feedbackRating,
      feedbackComment: b.feedbackComment,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));

    return res.status(200).json(list);
  } catch (e) {
    console.error("getCounselorAppointments failed:", e);
    return res.status(500).json({ error: "Failed to load appointments" });
  }
};

// GET /api/conversations/:id/messages - fetch messages for a conversation (roomId)
exports.getConversationMessages = async (req, res) => {
  try {
    const user = await getCurrentUserFromCookie(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const roomId = req.params.id;
    if (!roomId)
      return res.status(400).json({ error: "Missing conversation id" });

    const ChatMessage = require("../models/ChatMessage-model");
    const items = await ChatMessage.find({ roomId })
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();

    const list = items.map((m) => ({
      id: m._id?.toString(),
      conversationId: m.roomId,
      senderId: m.senderId,
      senderRole: m.senderRole,
      content: m.content,
      createdAt: m.createdAt,
    }));

    return res.status(200).json(list);
  } catch (e) {
    console.error("getConversationMessages failed:", e);
    return res.status(500).json({ error: "Failed to load messages" });
  }
};

// POST /api/conversations/:id/messages - create a new message in a conversation (roomId)
exports.postConversationMessage = async (req, res) => {
  try {
    const user = await getCurrentUserFromCookie(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const roomId = req.params.id;
    const { content } = req.body || {};
    if (!roomId)
      return res.status(400).json({ error: "Missing conversation id" });
    if (!content || String(content).trim() === "")
      return res.status(400).json({ error: "Message content required" });

    const ChatMessage = require("../models/ChatMessage-model");
    const doc = await ChatMessage.create({
      roomId,
      senderId: user.isCounselor ? user.email : user.googleId,
      senderRole: user.isCounselor ? "counselor" : "student",
      content: String(content).trim(),
    });

    const message = {
      id: doc._id.toString(),
      conversationId: doc.roomId,
      senderId: doc.senderId,
      senderRole: doc.senderRole,
      content: doc.content,
      createdAt: doc.createdAt,
      senderName: user.name || (user.isCounselor ? "Counselor" : "User"),
    };

    // Emit socket event so clients update in real-time
    try {
      const { getIO } = require("../utils/socket");
      const io = getIO();
      io.emit("message:new", message);
    } catch (err) {
      console.warn("Socket emit failed (message:new):", err?.message || err);
    }

    return res.status(201).json(message);
  } catch (e) {
    console.error("postConversationMessage failed:", e);
    return res.status(500).json({ error: "Failed to send message" });
  }
};

// GET /api/counselors/earnings - earnings summary and recent transactions
exports.getCounselorEarnings = async (req, res) => {
  try {
    const user = await getCurrentUserFromCookie(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    if (!user.isCounselor)
      return res.status(403).json({ error: "Access denied: Not a counselor" });

    const Booking = require("../models/Booking-model");
    const Counselor = require("../models/Counselor-model");
    
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    const startOfWeek = new Date(startOfDay); // simple 7-day window
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Consider earnings from confirmed/in_session/completed
    const paidStatuses = ["confirmed", "in_session", "completed"];

    const all = await Booking.find({
      counselorEmail: user.email,
      status: { $in: paidStatuses },
    })
      .sort({ createdAt: -1 })
      .lean();

    const inRange = (d, start) => {
      const dt = new Date(d || now);
      return dt >= start && dt <= now;
    };

    const sum = (list) => list.reduce((acc, b) => acc + (b.price || 0), 0);

    const todayList = all.filter((b) => inRange(b.createdAt, startOfDay));
    const weekList = all.filter((b) => inRange(b.createdAt, startOfWeek));
    const monthList = all.filter((b) => inRange(b.createdAt, startOfMonth));

    // Breakdown by session type (chat, call, video)
    const byType = {
      chat: { count: 0, earnings: 0 },
      call: { count: 0, earnings: 0 },
      video: { count: 0, earnings: 0 },
    };

    all.forEach((b) => {
      const type = (b.sessionType || "video").toLowerCase();
      if (byType[type]) {
        byType[type].count += 1;
        byType[type].earnings += b.price || 0;
      }
    });

    // Get counselor's tracked earnings from model
    const counselor = await Counselor.findOne({ email: user.email }).lean();
    const trackedEarnings = counselor?.earnings || {};

    const summary = {
      today: sum(todayList),
      thisWeek: sum(weekList),
      thisMonth: trackedEarnings.thisMonth || sum(monthList),
      total: trackedEarnings.total || sum(all),
      pendingPayouts: 0,
      completedSessions: counselor?.completedSessions || all.filter((b) => b.status === "completed").length,
      byType,
      lastUpdated: trackedEarnings.lastUpdated || now,
    };

    const transactions = all.slice(0, 20).map((b) => ({
      id: b._id.toString(),
      amount: b.price || 0,
      currency: b.currency || "INR",
      status: b.status,
      date: b.createdAt,
      createdAt: b.createdAt,
      sessionType: b.sessionType,
      clientId: b.googleId,
      clientName: b.userName || "Anonymous",
      counselorEmail: b.counselorEmail,
      description: `${b.sessionType || 'video'} session with ${b.userName || 'client'}`,
      type: "payment",
    }));

    return res.status(200).json({ summary, transactions });
  } catch (e) {
    console.error("getCounselorEarnings failed:", e);
    return res.status(500).json({ error: "Failed to load earnings" });
  }
};

// GET /api/counselors/resources - reuse curated list similar to /api/resources
exports.getCounselorResources = async (_req, res) => {
  try {
    const items = [
      {
        title: "Understanding Anxiety (NIMHANS)",
        description: "Guide by NIMHANS on recognizing and managing anxiety.",
        url: "https://nimhans.ac.in/",
        category: "articles",
        available: "Always",
        tags: ["anxiety", "guide", "india"],
      },
      {
        title: "Vandrevala Foundation Helpline",
        description: "24/7 mental health support across India.",
        url: "https://www.vandrevalafoundation.com/",
        category: "hotlines",
        available: "24/7",
        tags: ["helpline", "crisis", "india"],
      },
      {
        title: "AASRA Helpline",
        description: "Suicide prevention and emotional support.",
        url: "https://aasra.info/",
        category: "hotlines",
        available: "24/7",
        tags: ["helpline", "suicide-prevention", "india"],
      },
      {
        title: "Calm Breathing Timer",
        description: "Simple 4-7-8 breathing exercise tool.",
        url: "https://calm.com/breathe",
        category: "tools",
        available: "Always",
        tags: ["breathing", "calm", "tool"],
      },
    ];
    return res.status(200).json(items);
  } catch (e) {
    console.error("getCounselorResources failed:", e);
    return res.status(500).json({ error: "Failed to load resources" });
  }
};
