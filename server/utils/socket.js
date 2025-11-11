const socketIO = require("socket.io");
let io;

// Initialize socket.io with the HTTP server
exports.init = (server) => {
  io = socketIO(server, {
    cors: {
      // Align with app.js CORS: prefer CLIENT_ORIGIN and default to Vite 5173
      origin:
        process.env.CLIENT_ORIGIN ||
        process.env.CLIENT_URL ||
        "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("New client connected");

    // Join user-specific room for targeted messages
    socket.on("join:user", (googleId) => {
      if (googleId) {
        socket.join(`user:${googleId}`);
        console.log(`User ${googleId} joined their room`);
        // Store user ID in socket for reference
        socket.userData = { googleId };
      }
    });

    // Join counselor-specific room for targeted messages
    socket.on("join:counselor", (email) => {
      if (email) {
        const normalizedEmail = email.toLowerCase();
        socket.join(`counselor:${normalizedEmail}`);
        console.log(`Counselor ${normalizedEmail} joined their room`);
        // Store counselor email in socket for reference
        socket.counselorData = { email: normalizedEmail };
      }
    });

    // Join counselor list room for broadcasts
    socket.on("join:counselors_list", () => {
      socket.join("counselors_list");
      console.log("Client joined counselors_list room");
    });

    // Join booking-specific room for real-time booking updates
    socket.on("join:booking", (bookingId) => {
      if (bookingId) {
        socket.join(`booking:${bookingId}`);
        console.log(`Client joined booking room: ${bookingId}`);
        // Store booking ID in socket for reference
        socket.bookingData = { ...(socket.bookingData || {}), bookingId };
      }
    });

    // Join session-specific room for real-time session updates
    socket.on("join:session", async (data) => {
      try {
        // Accept either string ID or object with ID and role
        const sessionId = typeof data === "string" ? data : data.sessionId;
        const role = typeof data === "object" ? data.role : null;

        if (!sessionId) return;

        socket.join(`session:${sessionId}`);
        console.log(
          `Client joined session room: ${sessionId}, role: ${role || "unknown"}`
        );

        // Store session data in socket for reference
        socket.sessionData = {
          sessionId,
          role,
          joinTime: new Date(),
        };

        // Update booking connection status if role is provided
        if (role && (role === "user" || role === "counselor")) {
          const Booking = require("../models/Booking-model");
          const booking = await Booking.findById(sessionId);

          if (booking) {
            if (role === "user") {
              booking.userConnected = true;
              booking.lastUserActivity = new Date();
            } else if (role === "counselor") {
              booking.counselorConnected = true;
              booking.lastCounselorActivity = new Date();
            }

            await booking.save();

            // Emit connection status update
            exports.emitBookingUpdate(booking);
          }
        }
      } catch (error) {
        console.error("Error in join:session handler:", error);
      }
    });

    const SessionHandler = require("./session-handler");

    // Handle session join requests by category (call, chat, video call)
    socket.on("session:join-request", (data) => {
      if (data && data.bookingId && data.sessionType) {
        SessionHandler.handleJoinRequest(socket, data);
      }
    });

    // Handle session join acceptance from user
    socket.on("session:join-accept", (data) => {
      if (data && data.bookingId) {
        SessionHandler.handleJoinAccept(socket, data);
      }
    });

    // Handle session feedback
    socket.on("session:feedback", (data) => {
      if (data && data.bookingId && data.rating) {
        SessionHandler.handleFeedback(socket, data);
      }
    });

    // Handle session acceptance
    socket.on("session:accept", (data) => {
      if (data && data.bookingId) {
        const roomName = `session:${data.bookingId}`;
        io.to(roomName).emit("session:started", {
          bookingId: data.bookingId,
          startTime: new Date(),
          sessionType: data.sessionType,
        });
      }
    });

    socket.on("disconnect", async () => {
      console.log("Client disconnected");

      try {
        // Handle session disconnection if this socket was in a session
        if (socket.sessionData && socket.sessionData.sessionId) {
          const { sessionId, role } = socket.sessionData;

          // Update booking connection status
          if (role && (role === "user" || role === "counselor")) {
            const Booking = require("../models/Booking-model");
            const booking = await Booking.findById(sessionId);

            if (booking) {
              if (role === "user") {
                booking.userConnected = false;
                booking.lastUserActivity = new Date();
              } else if (role === "counselor") {
                booking.counselorConnected = false;
                booking.lastCounselorActivity = new Date();
              }

              await booking.save();

              // Emit connection status update
              exports.emitBookingUpdate(booking);

              // Notify the other party about disconnection
              const roomName = `session:${sessionId}`;
              io.to(roomName).emit("session:participant_disconnected", {
                sessionId,
                role,
                timestamp: new Date(),
              });
            }
          }
        }
      } catch (error) {
        console.error("Error handling disconnect:", error);
      }
    });
  });

  return io;
};

// Get the io instance
exports.getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

// Emit event to a specific user
exports.emitToUser = (googleId, event, data) => {
  if (!io) return;
  io.to(`user:${googleId}`).emit(event, data);
};

// Emit event to a specific counselor
exports.emitToCounselor = (email, event, data) => {
  if (!io || !email) return;
  io.to(`counselor:${email.toLowerCase()}`).emit(event, data);
};

// Broadcast counselor update to all clients in the counselors_list room
exports.broadcastCounselorUpdate = (counselor) => {
  if (!io) return;

  // Create a sanitized version with only public fields
  const publicCounselor = {
    _id: counselor._id,
    name: counselor.name,
    email: counselor.email,
    profilePicture: counselor.profilePicture,
    specialties: counselor.specialties,
    languages: counselor.languages,
    experience: counselor.experience,
    rating: counselor.rating,
    reviewCount: counselor.reviewCount,
    availability: counselor.availability,
    sessionTypes: counselor.sessionTypes,
    bio: counselor.bio,
    isOnline: counselor.isOnline,
    lastActive: counselor.lastActive,
  };

  io.to("counselors_list").emit("counselor:updated", publicCounselor);

  // Emit to the specific counselor
  if (counselor.email) {
    io.to(`counselor:${String(counselor.email).toLowerCase()}`).emit(
      "counselor:profile_updated",
      publicCounselor
    );
  }
};

// Emit booking updates to both user and counselor
exports.emitBookingUpdate = (booking) => {
  if (!io || !booking) return;

  const bookingData = {
    id: booking._id.toString(),
    status: booking.status,
    sessionType: booking.sessionType,
    date: booking.date,
    time: booking.time,
    duration: booking.durationMinutes,
    price: booking.price,
    counselorName: booking.counselorName,
    counselorEmail: booking.counselorEmail,
    lastUpdated: new Date(),
    joinUrl: booking.joinUrl,
    roomId: booking.roomId,
    // Include session timing information
    sessionStartTime: booking.sessionStartTime,
    sessionEndTime: booking.sessionEndTime,
    // Include connection status
    userConnected: booking.userConnected,
    counselorConnected: booking.counselorConnected,
    // Include join request/accept times
    lastJoinRequestTime: booking.lastJoinRequestTime,
    joinAcceptedTime: booking.joinAcceptedTime,
  };

  try {
    // Emit to the specific booking room
    io.to(`booking:${booking._id.toString()}`).emit(
      "booking:updated",
      bookingData
    );

    // Also emit to user and counselor rooms for backward compatibility
    if (booking.googleId) {
      exports.emitToUser(booking.googleId, "booking:updated", bookingData);
      // Also emit appointment update for UI consistency
      exports.emitToUser(booking.googleId, "appointment:updated", bookingData);
    }

    if (booking.counselorEmail) {
      exports.emitToCounselor(
        booking.counselorEmail,
        "booking:updated",
        bookingData
      );
      // Also emit appointment update for UI consistency
      exports.emitToCounselor(
        booking.counselorEmail,
        "appointment:updated",
        bookingData
      );
    }

    // Emit to session room if session is active
    if (booking.status === "in_session") {
      io.to(`session:${booking._id.toString()}`).emit("session:status", {
        bookingId: booking._id.toString(),
        status: booking.status,
        startTime: booking.sessionStartTime,
        userConnected: booking.userConnected,
        counselorConnected: booking.counselorConnected,
        timestamp: new Date(),
      });
    }
  } catch (error) {
    console.error("Error emitting booking update:", error);
    // Continue execution even if socket emission fails
  }
};

// Emit session join request by category (call, chat, video call)
exports.emitSessionJoinRequest = (data) => {
  if (!io || !data || !data.bookingId) return;

  const joinRequestData = {
    bookingId: data.bookingId,
    sessionType: data.sessionType || "chat", // Default to chat if not specified
    requestTime: new Date(),
    counselorName: data.counselorName,
    counselorEmail: data.counselorEmail,
    userGoogleId: data.userGoogleId,
    userName: data.userName,
  };

  // Emit to the specific booking room
  io.to(`booking:${data.bookingId}`).emit(
    "session:join_request",
    joinRequestData
  );

  // Also emit to user and counselor individually
  if (data.userGoogleId) {
    exports.emitToUser(
      data.userGoogleId,
      "session:join_request",
      joinRequestData
    );
  }

  if (data.counselorEmail) {
    exports.emitToCounselor(
      data.counselorEmail,
      "session:join_request",
      joinRequestData
    );
  }
};

// Emit session updates (status, remaining time)
exports.emitSessionUpdate = (sessionId, data) => {
  if (!io || !sessionId) return;

  io.to(`session:${sessionId}`).emit("session:status", {
    sessionId,
    ...data,
    timestamp: new Date(),
  });
};
