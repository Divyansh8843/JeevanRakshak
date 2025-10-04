require("dotenv").config();
// Prefer IPv4 to avoid potential IPv6 socket issues on Windows (wsarecv aborted)
require("dns").setDefaultResultOrder && require("dns").setDefaultResultOrder("ipv4first");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./utils/database");
const paymentRoutes = require("./routes/Payment-routes");
const userRoutes = require("./routes/User-routes");
const aiRoutes = require("./routes/Ai-routes");
const bookingRoutes = require("./routes/Booking-routes");
const notifyController = require("./controllers/notify-controller");
const path = require("path");
const { startScheduler } = require("./services/scheduler");
const http = require("http");
const { init: initSocket } = require("./utils/socket");

const app = express();
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
// Stripe webhook needs raw body, but other routes can use JSON
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

connectDB();

app.use("/uploads", require("express").static(path.join(__dirname, "uploads")));

app.use("/api", userRoutes);
app.use("/api", aiRoutes);
app.use("/api", bookingRoutes);
app.use("/api", paymentRoutes);

// Notifications (SMS/Email)
app.post("/api/notify/appointment", notifyController.notifyAppointment);
app.post("/api/notify/report", notifyController.notifyReport);

// Minimal curated resources endpoint for client Resources panel
app.get("/api/resources", (_req, res) => {
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
  res.json(items);
});

// Global error handler to ensure consistent JSON responses
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 8080;
// Create HTTP server and attach socket.io
const server = http.createServer(app);
initSocket(server);
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Start background scheduler (non-blocking)
  try { startScheduler(); } catch (e) { console.warn('Scheduler failed to start:', e?.message || e); }
});
