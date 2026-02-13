import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { toast } from "react-hot-toast";
import { getAuthHeaders } from "../lib/auth";

export default function StudentSession({ user }) {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("loading");
  const [joinUrl, setJoinUrl] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [requestTime, setRequestTime] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [remaining, setRemaining] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const socketRef = useRef(null);

  const SERVER_URL = useMemo(() => (
    import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
  ), []);

  // Connect socket and join rooms
  useEffect(() => {
    if (!user?.googleId || !bookingId) return;
    if (socketRef.current) return;

    const socket = io(SERVER_URL, {
      withCredentials: true,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join:user", user.googleId);
      socket.emit("join:booking", bookingId);
      socket.emit("join:session", { sessionId: bookingId, role: "user" });
    });

    socket.on("disconnect", () => setConnected(false));

    // Counselor requested to join
    const onJoinReq = (payload) => {
      const pid = payload?.id || payload?.bookingId;
      if (!payload || pid !== bookingId) return;
      setJoinUrl(payload.joinUrl || "");
      setSessionType(payload.sessionType || payload.category || "");
      setRequestTime(payload.requestTime || new Date());
      setStatus("join_requested");
      toast.success("Counselor is ready to start the session");
    };
    socket.on("booking:join_request", onJoinReq);
    socket.on("session:join_request", onJoinReq);

    // Ready to join
    socket.on("booking:join_ready", (payload) => {
      if (!payload || payload.id !== bookingId) return;
      setJoinUrl(payload.joinUrl || "");
      setSessionType(payload.sessionType || "");
      setStatus("in_session");
    });

    // Session status/ended
    socket.on("session:starting", (msg) => {
      if (!msg || msg.bookingId !== bookingId) return;
      setStatus("in_session");
    });

    socket.on("session:ended", (msg) => {
      if (!msg || msg.bookingId !== bookingId) return;
      setStatus("completed");
      setShowFeedback(true);
      toast.success("Session completed");
    });

    // Feedback request
    socket.on("session:feedback_request", (msg) => {
      const pid = msg?.bookingId;
      if (!pid || pid !== bookingId) return;
      setShowFeedback(true);
    });

    // Booking generic updates
    socket.on("booking:updated", (b) => {
      if (!b || b.id !== bookingId) return;
      if (b.joinUrl) setJoinUrl(b.joinUrl);
      if (b.sessionType) setSessionType(b.sessionType);
      if (typeof b.duration === 'number') setDurationMinutes(b.duration);
      if (b.sessionStartTime) setSessionStartTime(b.sessionStartTime);
      if (b.status === "confirmed" && status === "loading") setStatus("confirmed");
      if (b.status === "in_session") setStatus("in_session");
      if (b.status === "completed") setStatus("completed");
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off("booking:join_request");
        socketRef.current.off("session:join_request");
        socketRef.current.off("booking:join_ready");
        socketRef.current.off("session:starting");
        socketRef.current.off("session:ended");
        socketRef.current.off("session:feedback_request");
        socketRef.current.off("booking:updated");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [SERVER_URL, user?.googleId, bookingId, status]);

  // Accept join request
  const acceptJoin = async () => {
    if (!bookingId) return;
    try {
      setAccepting(true);
      const res = await fetch(`${SERVER_URL}/api/bookings/${encodeURIComponent(bookingId)}/accept-join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...getAuthHeaders() },
        body: JSON.stringify({})
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setJoinUrl(data.joinUrl || "");
      setSessionType(data.sessionType || "");
      setStatus(data.status || "in_session");
      toast.success("Session starting...");
      if (data.joinUrl) {
        // Open in new tab to avoid popup blockers
        window.open(data.joinUrl, "_blank");
      }
    } catch (e) {
      console.error("Accept join failed:", e);
      toast.error("Failed to accept join");
    } finally {
      setAccepting(false);
    }
  };

  // Fallback: if counselor hasn't sent explicit join request, student can poll join info
  const requestJoinInfo = async () => {
    if (!bookingId) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/bookings/${encodeURIComponent(bookingId)}/join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ acceptJoinRequest: true })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.joinUrl) setJoinUrl(data.joinUrl);
        if (data.sessionType) setSessionType(data.sessionType);
        setStatus("in_session");
        window.open(data.joinUrl, "_blank");
      }
    } catch (_) {}
  };

  const goBack = () => navigate("/dashboard");

  const submitFeedback = async () => {
    if (!bookingId || !feedbackRating) {
      toast.error("Please select a rating");
      return;
    }
    try {
      setSubmittingFeedback(true);
      const res = await fetch(`${SERVER_URL}/api/bookings/${encodeURIComponent(bookingId)}/feedback`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ rating: feedbackRating, comment: feedbackComment })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFeedbackSubmitted(true);
      setShowFeedback(false);
      toast.success("Thanks for your feedback!");
    } catch (e) {
      console.error("Submit feedback failed:", e);
      toast.error("Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Countdown for remaining time when in_session
  useEffect(() => {
    let timerId;
    const compute = () => {
      try {
        if (status !== 'in_session' || !durationMinutes) {
          setRemaining("");
          return;
        }
        const startMs = sessionStartTime ? new Date(sessionStartTime).getTime() : Date.now();
        const endMs = startMs + Number(durationMinutes) * 60000;
        const diff = endMs - Date.now();
        if (diff <= 0) {
          setRemaining("00:00");
          return;
        }
        const mm = Math.floor(diff / 60000);
        const ss = Math.floor((diff % 60000) / 1000);
        setRemaining(`${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`);
      } catch (_) { setRemaining(""); }
    };
    compute();
    timerId = setInterval(compute, 1000);
    return () => clearInterval(timerId);
  }, [status, durationMinutes, sessionStartTime]);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          Session
          {status === 'in_session' && (
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Live
              {remaining && <span className="ml-1 opacity-90">• {remaining}</span>}
            </span>
          )}
        </h1>
        <div className={`px-3 py-1 rounded-full text-sm ${connected ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"}`}>
          {connected ? "Connected" : "Offline"}
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg border">
        <p className="text-gray-700"><strong>Status:</strong> {status}</p>
        {sessionType && <p className="text-gray-700"><strong>Type:</strong> {sessionType}</p>}
        {requestTime && <p className="text-gray-500 text-sm">Requested at: {new Date(requestTime).toLocaleTimeString()}</p>}
      </div>

      {status === "join_requested" && (
        <div className="flex gap-2">
          <button onClick={acceptJoin} disabled={accepting} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
            {accepting ? "Accepting..." : "Accept & Join"}
          </button>
          <button onClick={goBack} className="px-4 py-2 rounded border">Back</button>
        </div>
      )}

      {status === "in_session" && joinUrl && (
        <div className="space-y-2">
          <p className="text-gray-700">If the session tab didn't open, use the button below:</p>
          <a href={joinUrl} target="_blank" rel="noreferrer" className="inline-block px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white">Open Session</a>
        </div>
      )}

      {status === "confirmed" && (
        <div className="space-y-2">
          <p className="text-gray-700">Waiting for your counselor to request join at the scheduled time.</p>
          <button onClick={requestJoinInfo} className="px-4 py-2 rounded border">Check Join</button>
        </div>
      )}

      {status === "completed" && (
        <div className="space-y-4">
          <p className="text-gray-700">Your session has been completed. Thank you!</p>
          {!feedbackSubmitted && (showFeedback ? (
            <div className="p-4 border rounded-lg bg-white space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map((r) => (
                    <button key={r} onClick={() => setFeedbackRating(r)} className={`px-2 py-1 rounded border ${feedbackRating>=r? 'bg-yellow-200 border-yellow-400':'border-gray-300'}`}>{r}★</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
                <textarea value={feedbackComment} onChange={(e)=>setFeedbackComment(e.target.value)} rows={3} className="w-full border rounded px-3 py-2" placeholder="Share your experience..." />
              </div>
              <div className="flex gap-2">
                <button onClick={submitFeedback} disabled={submittingFeedback} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
                  {submittingFeedback? 'Submitting...':'Submit Feedback'}
                </button>
                <button onClick={()=>setShowFeedback(false)} className="px-4 py-2 rounded border">Skip</button>
              </div>
            </div>
          ) : (
            <button onClick={()=>setShowFeedback(true)} className="px-4 py-2 rounded border">Leave Feedback</button>
          ))}
          <button onClick={goBack} className="px-4 py-2 rounded border">Back to Dashboard</button>
        </div>
      )}
    </div>
  );
}
