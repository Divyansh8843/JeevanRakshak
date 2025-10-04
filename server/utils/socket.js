let _io = null;

function init(server) {
  if (_io) return _io;
  const { Server } = require("socket.io");
  const corsOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  _io = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });
  _io.on("connection", (socket) => {
    // Client can optionally join a room for their googleId to receive targeted events
    socket.on("join:user", (googleId) => {
      if (googleId) socket.join(`user:${googleId}`);
    });
    // Counselors can join a room for their email
    socket.on("join:counselor", (email) => {
      if (email) socket.join(`counselor:${String(email).toLowerCase()}`);
    });
    // Join counselors list room for real-time updates
    socket.on("join:counselors_list", () => {
      socket.join('counselors_list');
    });
  });
  return _io;
}

function io() {
  return _io;
}

function emitToUser(googleId, event, payload) {
  if (!_io || !googleId) return;
  _io.to(`user:${googleId}`).emit(event, payload);
}

function emitToCounselor(email, event, payload) {
  if (!_io || !email) return;
  _io.to(`counselor:${String(email).toLowerCase()}`).emit(event, payload);
}

// Broadcast counselor profile updates
function broadcastCounselorUpdate(counselorData) {
  if (!_io) return;
  
  // Emit to all clients viewing counselors list
  _io.to('counselors_list').emit('counselor:updated', counselorData);
  
  // Emit to the specific counselor
  if (counselorData.email) {
    _io.to(`counselor:${String(counselorData.email).toLowerCase()}`).emit('counselor:profile_updated', counselorData);
  }
}

module.exports = { init, io, emitToUser, emitToCounselor, broadcastCounselorUpdate };
