import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";
import {
  Users,
  Calendar,
  MessageCircle,
  Settings,
  TrendingUp,
  Clock,
  Award,
  Phone,
  Video,
  DollarSign,
  Star,
  Activity,
  BookOpen,
  Menu,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  AlertCircle,
  CheckCircle,
  Send,
  Shield,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

const CounselorDashboard = ({ user, onLogout, navigateTo }) => {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const url = new URL(window.location.href);
      const fromUrl = url.searchParams.get("tab");
      const valid = new Set([
        "overview",
        "clients",
        "appointments",
        "messages",
        "earnings",
        "resources",
        "settings",
      ]);
      if (fromUrl && valid.has(fromUrl)) return fromUrl;
      const fromStorage = localStorage.getItem("counselorDashboardActiveTab");
      if (fromStorage && valid.has(fromStorage)) return fromStorage;
    } catch (_) {}
    return "overview";
  });

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const v = localStorage.getItem("counselorSidebarOpen");
      return v !== "0"; // default open
    } catch (_) {
      return true;
    }
  });
  useEffect(() => {
    try { localStorage.setItem("counselorSidebarOpen", sidebarOpen ? "1" : "0"); } catch (_) {}
  }, [sidebarOpen]);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", activeTab);
      window.history.replaceState(
        {},
        "",
        url.pathname + "?" + url.searchParams.toString() + url.hash
      );
      localStorage.setItem("counselorDashboardActiveTab", activeTab);
    } catch (_) {}
  }, [activeTab]);

  const menuItems = [
    { id: "overview", name: "Overview", icon: Activity },
    { id: "clients", name: "Clients", icon: Users },
    { id: "appointments", name: "Appointments", icon: Calendar },
    { id: "messages", name: "Messages", icon: MessageCircle },
    { id: "earnings", name: "Earnings", icon: DollarSign },
    { id: "resources", name: "Resources", icon: BookOpen },
    { id: "settings", name: "Settings", icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <CounselorOverviewContent user={user} />;
      case "clients":
        return <ClientsContent user={user} />;
      case "appointments":
        return <AppointmentsContent user={user} />;
      case "messages":
        return <MessagesContent user={user} />;
      case "earnings":
        return <EarningsContent user={user} />;
      case "resources":
        return <CounselorResourcesContent />;
      case "settings":
        return <CounselorSettingsContent user={user} />;
      default:
        return <CounselorOverviewContent user={user} />;
    }
  };

  // Accept a pending booking
  const acceptPending = async (bookingId) => {
    try {
      const res = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
        }/api/bookings/${encodeURIComponent(bookingId)}/accept`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({}),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Booking accepted");
      await loadPendingBookings();
      await loadStats();
    } catch (e) {
      console.error("Failed to accept booking:", e);
      toast.error("Failed to accept booking");
    }
  };

  // Reject a pending booking
  const rejectPending = async (bookingId) => {
    try {
      const res = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
        }/api/bookings/${encodeURIComponent(bookingId)}/reject`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ reason: "Not available" }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Booking declined");
      await loadPendingBookings();
      await loadStats();
    } catch (e) {
      console.error("Failed to decline booking:", e);
      toast.error("Failed to decline booking");
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Fixed Header Spacer */}
      <div className="h-16 lg:h-20 flex-shrink-0"></div>
      
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-6 lg:gap-8 h-full">
          {/* Mobile top bar */}
          <div className="lg:hidden fixed top-16 left-0 right-0 bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 z-30 px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">Counselor Dashboard</h1>
              <button
                aria-label="Toggle navigation"
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 dark:border-neutral-600 dark:hover:bg-neutral-700"
                onClick={() => setMobileNavOpen((s) => !s)}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
            {/* Horizontal scrollable nav */}
            <div className={`${mobileNavOpen ? "block" : "hidden"} mt-3`}>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-2 px-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileNavOpen(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 whitespace-nowrap rounded-lg border text-sm flex-shrink-0 ${
                        isActive
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-neutral-700 dark:text-neutral-200 dark:border-neutral-600"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Desktop sidebar toggle button */}
          <div className="hidden lg:block fixed top-20 left-4 z-40">
            <button
              aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 dark:bg-neutral-800 dark:border-neutral-600 dark:hover:bg-neutral-700 shadow"
              onClick={() => setSidebarOpen((s) => !s)}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Fixed Sidebar (desktop only) */}
          {sidebarOpen && (
            <aside className="w-64 flex-shrink-0 hidden lg:block">
              <div className="h-full py-6">
                <nav className="space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          activeTab === item.id
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.name}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>
          )}

          {/* Main Scrollable Content - Prevents scroll chaining */}
          <main 
            className="flex-1 overflow-y-scroll nice-scroll mt-24 lg:mt-0"
            onWheel={(e) => e.stopPropagation()}
            style={{ 
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className="min-h-full py-6">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

const CounselorOverviewContent = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    todayAppointments: 0,
    monthlyEarnings: 0,
    averageRating: 0,
    totalSessions: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Enhanced data loading with real-time updates
  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
        }/api/counselors/stats`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setLastUpdate(new Date());
        console.log("📊 Stats updated:", data);
      } else if (res.status === 403) {
        console.error("Access denied: Not authorized as counselor");
        toast.error("Access denied: Not authorized as counselor");
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Failed to load counselor stats:", e);
      toast.error("Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async () => {
    try {
      setActivityLoading(true);
      const res = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
        }/api/counselors/activity`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setRecentActivity(Array.isArray(data) ? data : []);
        console.log("📅 Activity updated:", data);
      } else if (res.status === 403) {
        console.error("Access denied: Not authorized as counselor");
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Failed to load counselor activity:", e);
    } finally {
      setActivityLoading(false);
    }
  };

  const loadPendingBookings = async () => {
    try {
      const res = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
        }/api/bookings/pending`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setPendingBookings(Array.isArray(data) ? data : []);
        console.log("🔔 Pending bookings updated:", data);
      }
    } catch (e) {
      console.error("Failed to load pending bookings:", e);
    }
  };

  useEffect(() => {
    loadStats();
    loadActivity();
    loadPendingBookings();

    // Set up periodic refresh
    const statsInterval = setInterval(loadStats, 60000); // Every minute
    const activityInterval = setInterval(loadActivity, 30000); // Every 30 seconds
    const bookingsInterval = setInterval(loadPendingBookings, 15000); // Every 15 seconds

    return () => {
      clearInterval(statsInterval);
      clearInterval(activityInterval);
      clearInterval(bookingsInterval);
    };
  }, []);

  // Real-time WebSocket connection for counselor dashboard (StrictMode-safe)
  const overviewSocketRef = useRef(null);
  useEffect(() => {
    if (!user?.email) return;
    if (overviewSocketRef.current) return; // avoid double-connect in StrictMode

    const SERVER_URL =
      import.meta.env.VITE_SERVER_URL || "http://localhost:8080";
    const socket = io(SERVER_URL, {
      withCredentials: true,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    overviewSocketRef.current = socket;

    // Join counselor room
    socket.emit("join:counselor", user.email);

    socket.on("connect", () => {
      console.log("✅ Counselor socket connected");
      setSocketConnected(true);
      toast.success("Real-time updates connected");
    });

    socket.on("disconnect", () => {
      console.log("❌ Counselor socket disconnected");
      setSocketConnected(false);
      toast.error("Real-time connection lost");
    });

    // Listen for real-time events
    socket.on("booking:new", (booking) => {
      console.log("🔔 New booking received:", booking);
      toast.success(`New booking from ${booking.userName || "Client"}`);
      loadPendingBookings();
      loadStats();

      // Add to notifications
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: "booking",
          title: "New Booking Request",
          message: `${booking.userName || "A client"} has requested a ${
            booking.sessionType
          } session`,
          timestamp: new Date(),
          booking: booking,
        },
        ...prev.slice(0, 9),
      ]);
    });

    socket.on("booking:cancelled", (booking) => {
      console.log("❌ Booking cancelled:", booking);
      toast.info(`Booking cancelled by ${booking.userName || "Client"}`);
      loadPendingBookings();
      loadStats();
    });

    socket.on("stats:update", (newStats) => {
      console.log("📊 Stats update received:", newStats);
      setStats((prev) => ({ ...prev, ...newStats }));
      setLastUpdate(new Date());
    });

    socket.on("booking:feedback_received", (data) => {
      console.log("⭐ Feedback received:", data);
      if (data.newAverageRating) {
        setStats((prev) => ({
          ...prev,
          averageRating: data.newAverageRating,
        }));
        setLastUpdate(new Date());
        toast.success(`New rating: ${data.rating}⭐ - Avg: ${data.newAverageRating.toFixed(1)}`);
      }
    });

    socket.on("booking:awaiting_confirmation", (booking) => {
      console.log("⏳ Booking awaiting confirmation:", booking);
      toast.info(`Payment received for ${booking.sessionType} session`);
      loadPendingBookings();
      loadStats();
    });

    socket.on("booking:join_accepted", (data) => {
      console.log("✅ User accepted join request:", data);
      toast.success("User accepted join request - session starting");
    });

    socket.on("session:ended", (data) => {
      console.log("🏁 Session ended:", data);
      toast.info("Session completed");
      loadStats();
    });

    // Live earnings updates
    socket.on("earnings:updated", (payload) => {
      try {
        setStats((prev) => ({
          ...prev,
          monthlyEarnings:
            typeof payload?.thisMonth === "number" ? payload.thisMonth : prev.monthlyEarnings,
          totalEarnings:
            typeof payload?.total === "number" ? payload.total : prev.totalEarnings,
          totalSessions:
            typeof payload?.completedSessionsDelta === "number" 
              ? (prev.totalSessions || 0) + payload.completedSessionsDelta
              : prev.totalSessions,
        }));
        setLastUpdate(new Date());
        toast.success(`Earnings updated! +₹${payload?.thisMonthDelta || 0}`);
      } catch (_) {}
    });

    socket.on("activity:new", (activity) => {
      console.log("📅 New activity:", activity);
      setRecentActivity((prev) => [activity, ...prev.slice(0, 9)]);
    });

    return () => {
      if (overviewSocketRef.current) {
        overviewSocketRef.current.off("booking:new");
        overviewSocketRef.current.off("booking:cancelled");
        overviewSocketRef.current.off("booking:awaiting_confirmation");
        overviewSocketRef.current.off("booking:join_accepted");
        overviewSocketRef.current.off("session:ended");
        overviewSocketRef.current.off("stats:update");
        overviewSocketRef.current.off("earnings:updated");
        overviewSocketRef.current.off("booking:feedback_received");
        overviewSocketRef.current.off("activity:new");
        overviewSocketRef.current.disconnect();
        overviewSocketRef.current = null;
      }
    };
  }, [user?.email]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 w-32 bg-gray-200 rounded mb-4 animate-pulse" />
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, Dr. {user.name}!
          </h2>
          <p className="text-gray-600 mt-1">
            Your counseling practice overview
          </p>
        </div>

        {/* Real-time status and controls */}
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              socketConnected
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            {socketConnected ? (
              <>
                <Wifi className="h-4 w-4" /> Live
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" /> Offline
              </>
            )}
          </div>

          {/* Last Update */}
          {lastUpdate && (
            <div className="text-xs text-gray-500">
              Updated {new Date(lastUpdate).toLocaleTimeString()}
            </div>
          )}

          {/* Manual Refresh */}
          <button
            onClick={() => {
              loadStats();
              loadActivity();
              loadPendingBookings();
              toast.success("Data refreshed");
            }}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-300 hover:border-emerald-300 hover:bg-emerald-50 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats.totalClients}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.activeClients} active this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Today's Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.todayAppointments}
            </div>
            <p className="text-xs text-gray-500 mt-2">Scheduled appointments</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Monthly Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              ₹{(stats.monthlyEarnings || 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-2">This month's revenue</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              ₹{(stats.totalEarnings || 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-2">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Star className="h-4 w-4 mr-2" />
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {(stats.averageRating || 0).toFixed(1)}
            </div>
            <div className="flex items-center mt-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(stats.averageRating || 0)
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">
              {stats.totalSessions || 0}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Lifetime sessions completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {stats.activeClients > 0 && stats.totalClients > 0
                ? `+${Math.round(
                    (stats.activeClients / stats.totalClients) * 100
                  )}%`
                : "0%"}
            </div>
            <p className="text-xs text-gray-500 mt-2">Active client ratio</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Bookings Alert */}
      {pendingBookings.length > 0 && (
        <Card className="border-l-4 border-l-orange-500 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Pending Booking Requests ({pendingBookings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingBookings.slice(0, 3).map((booking) => (
                <div
                  key={booking._id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {booking.userName || "Anonymous"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {booking.sessionType} • {booking.date} at {booking.time}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-300 hover:bg-green-50"
                      onClick={() => acceptPending(booking._id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => rejectPending(booking._id)}
                    >
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
              {pendingBookings.length > 3 && (
                <p className="text-sm text-gray-500 text-center">
                  +{pendingBookings.length - 3} more pending requests
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Activity</span>
              {socketConnected && (
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  Live Updates
                </span>
              )}
            </CardTitle>
            <CardDescription>Your latest client interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-16 bg-gray-200 rounded-lg" />
                  <div className="h-16 bg-gray-200 rounded-lg" />
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-8">
                  No recent activity yet. Activity will appear here when you
                  have client interactions.
                </div>
              ) : (
                recentActivity.map((activity) => {
                  const timeAgo = new Date(activity.timestamp).toLocaleString();
                  const IconComponent =
                    activity.icon === "message" ? MessageCircle : Calendar;
                  const bgColor =
                    activity.icon === "message"
                      ? "bg-blue-100"
                      : "bg-green-100";
                  const iconColor =
                    activity.icon === "message"
                      ? "text-blue-600"
                      : "text-green-600";

                  return (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className={`${bgColor} p-2 rounded-full`}>
                        <IconComponent className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-600">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{timeAgo}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => setActiveTab("appointments")}
              >
                <Calendar className="h-6 w-6 mb-2" />
                <span className="text-sm">View Schedule</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => setActiveTab("messages")}
              >
                <MessageCircle className="h-6 w-6 mb-2" />
                <span className="text-sm">Messages</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => setActiveTab("clients")}
              >
                <Users className="h-6 w-6 mb-2" />
                <span className="text-sm">Client List</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => setActiveTab("earnings")}
              >
                <DollarSign className="h-6 w-6 mb-2" />
                <span className="text-sm">Earnings</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Enhanced Clients Panel with Real-time Data
const ClientsContent = ({ user }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [lastUpdate, setLastUpdate] = useState(null);

  // Load clients data
  const loadClients = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
        }/api/counselors/clients`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setClients(Array.isArray(data) ? data : []);
        setLastUpdate(new Date());
        console.log("👥 Clients data updated:", data);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Failed to load clients:", e);
      setError("Failed to load clients data");
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  // Real-time WebSocket connection (StrictMode-safe) for Clients panel
  const clientsSocketRef = useRef(null);
  useEffect(() => {
    if (!user?.email) return;
    if (clientsSocketRef.current) return;

    const SERVER_URL =
      import.meta.env.VITE_SERVER_URL || "http://localhost:8080";
    const socket = io(SERVER_URL, {
      withCredentials: true,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    clientsSocketRef.current = socket;

    socket.emit("join:counselor", user.email);

    socket.on("connect", () => {
      setSocketConnected(true);
      console.log("✅ Clients panel socket connected");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    // Listen for client updates
    socket.on("client:new", (client) => {
      console.log("👤 New client:", client);
      setClients((prev) => [client, ...prev]);
      toast.success(`New client: ${client.name}`);
    });

    socket.on("client:updated", (updatedClient) => {
      console.log("👤 Client updated:", updatedClient);
      setClients((prev) =>
        prev.map((c) =>
          c.id === updatedClient.id ? { ...c, ...updatedClient } : c
        )
      );
    });

    socket.on("client:status_changed", (data) => {
      console.log("👤 Client status changed:", data);
      setClients((prev) =>
        prev.map((c) =>
          c.id === data.clientId
            ? { ...c, status: data.status, lastActive: data.timestamp }
            : c
        )
      );
    });

    return () => {
      if (clientsSocketRef.current) {
        clientsSocketRef.current.off("client:new");
        clientsSocketRef.current.off("client:updated");
        clientsSocketRef.current.off("client:status_changed");
        clientsSocketRef.current.disconnect();
        clientsSocketRef.current = null;
      }
    };
  }, [user?.email]);

  // Load data on mount and set up refresh
  useEffect(() => {
    loadClients();
    const interval = setInterval(loadClients, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Filter clients based on search and status
  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || client.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with real-time status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Client Management
          </h2>
          <p className="text-gray-600">
            Manage your clients and their sessions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              socketConnected
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            {socketConnected ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            {socketConnected ? "Live" : "Offline"}
          </div>

          {lastUpdate && (
            <div className="text-xs text-gray-500">
              Updated {new Date(lastUpdate).toLocaleTimeString()}
            </div>
          )}

          <button
            onClick={loadClients}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-300 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search clients by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Clients</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No clients found
            </h3>
            <p className="text-gray-600">
              {searchQuery || filterStatus !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Your clients will appear here once you start accepting appointments"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const isOnline =
              client.lastActive &&
              new Date() - new Date(client.lastActive) < 5 * 60 * 1000; // 5 minutes

            return (
              <Card
                key={client.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                          <span className="text-emerald-700 font-medium">
                            {client.name?.charAt(0)?.toUpperCase() || "C"}
                          </span>
                        </div>
                        {isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {client.name || "Anonymous"}
                        </h3>
                        <p className="text-sm text-gray-600">{client.email}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        client.status === "active"
                          ? "bg-green-100 text-green-700"
                          : client.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {client.status || "active"}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Total Sessions:</span>
                      <span className="font-medium">
                        {client.totalSessions || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <span className="font-medium">{client.phone || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>City:</span>
                      <span className="font-medium">{client.city || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Age / Gender:</span>
                      <span className="font-medium">
                        {(client.age ? client.age + " yrs" : "—") +
                          (client.gender ? " • " + client.gender : "")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Session:</span>
                      <span className="font-medium">
                        {client.lastSession
                          ? new Date(client.lastSession).toLocaleDateString()
                          : "Never"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Risk Level:</span>
                      <span
                        className={`font-medium ${
                          client.riskLevel === "HIGH"
                            ? "text-red-600"
                            : client.riskLevel === "MEDIUM"
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        {client.riskLevel || "LOW"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                    {/* Only show Schedule action for new clients (no sessions yet) */}
                    {(client.totalSessions || 0) === 0 ? (
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Schedule
                      </Button>
                    ) : (
                      <div className="flex-1" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Enhanced Appointments Panel with Real-time Data
const AppointmentsContent = ({ user }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [filterDate, setFilterDate] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all"); // chat | call | video | all
  const [filterSearch, setFilterSearch] = useState("");
  const [sortBy, setSortBy] = useState("date"); // date | status | price
  const [order, setOrder] = useState("asc"); // asc | desc
  const [lastUpdate, setLastUpdate] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Load appointments data (server-side filtering)
  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError("");

      // Build query params to match backend API
      const params = new URLSearchParams();

      // Status mapping
      if (filterStatus && filterStatus !== "all") {
        if (filterStatus === "pending") {
          params.set("status", "pending_payment,paid_pending_counselor");
        } else {
          params.set("status", filterStatus);
        }
      }

      // Session type/category
      if (filterType && filterType !== "all") {
        params.set("sessionType", filterType);
      }

      // Date range
      const today = new Date();
      const fmt = (d) => d.toISOString().slice(0, 10);
      if (filterDate === "today") {
        params.set("dateFrom", fmt(today));
        params.set("dateTo", fmt(today));
      } else if (filterDate === "tomorrow") {
        const t = new Date(today);
        t.setDate(t.getDate() + 1);
        params.set("dateFrom", fmt(t));
        params.set("dateTo", fmt(t));
      } else if (filterDate === "week") {
        const week = new Date(today);
        week.setDate(week.getDate() + 7);
        params.set("dateFrom", fmt(today));
        params.set("dateTo", fmt(week));
      }

      // Search
      if (filterSearch.trim()) params.set("search", filterSearch.trim());

      // Sort
      if (sortBy) params.set("sortBy", sortBy);
      if (order) params.set("order", order);

      // Pagination
      params.set("page", String(page));
      params.set("limit", String(limit));
      const url = `${import.meta.env.VITE_SERVER_URL || "http://localhost:8080"}/api/bookings/counselor-appointments?${params.toString()}`;
      const res = await fetch(url, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.appointments)
          ? data.appointments
          : [];
        // Normalize to have id field
        const normalized = list.map((a) => ({
          id: a._id || a.id,
          ...a,
          status: String(a.status || '').toLowerCase(),
        }));
        setAppointments(normalized);
        if (data && data.pagination) setPagination({ total: data.pagination.total, pages: data.pagination.pages });
        setLastUpdate(new Date());
        console.log("📅 Appointments data updated:", data);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Failed to load appointments:", e);
      setError("Failed to load appointments data");
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  // Handle appointment actions mapped to booking endpoints
  const handleAppointmentAction = async (appointmentId, action) => {
    try {
      let path = "";
      switch (action) {
        case "confirm":
          // Align with API: confirm payment and book
          path = `/api/bookings/${encodeURIComponent(appointmentId)}/confirm-payment`;
          break;
        case "reject":
          path = `/api/bookings/${encodeURIComponent(appointmentId)}/reject`;
          break;
        case "request-join":
          path = `/api/bookings/${encodeURIComponent(
            appointmentId
          )}/request-join`;
          break;
        case "start-session":
          path = `/api/bookings/${encodeURIComponent(
            appointmentId
          )}/start-session`;
          break;
        case "end-session":
          path = `/api/bookings/${encodeURIComponent(
            appointmentId
          )}/end-session`;
          break;
        case "reschedule":
          path = `/api/bookings/${encodeURIComponent(
            appointmentId
          )}/reschedule`;
          break;
        case "schedule":
          path = `/api/bookings/${encodeURIComponent(
            appointmentId
          )}/reschedule`;
          break;
        default:
          throw new Error("Unknown action");
      }
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL || "http://localhost:8080"}${path}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body:
            action === "reschedule" || action === "schedule"
              ? JSON.stringify({
                  date: window.prompt("New date (YYYY-MM-DD):"),
                  time: window.prompt("New time (HH:MM):"),
                })
              : JSON.stringify({}),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(`Action completed: ${action}`);
      loadAppointments();
    } catch (e) {
      console.error(`Failed to ${action}:`, e);
      toast.error(`Failed to ${action}`);
    }
  };

  // Specialized schedule handler: reschedule then (if paid) accept
  const handleSchedule = async (appointment) => {
    try {
      const newDate = window.prompt(
        "Enter scheduled date (YYYY-MM-DD):",
        appointment.date
      );
      if (!newDate) return;
      const newTime = window.prompt(
        "Enter scheduled time (HH:MM):",
        appointment.time
      );
      if (!newTime) return;

      // call reschedule
      const res1 = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
        }/api/bookings/${encodeURIComponent(appointment.id)}/reschedule`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ date: newDate, time: newTime }),
        }
      );
      if (!res1.ok) {
        toast.error("Failed to schedule appointment");
        return;
      }

      // If booking already paid and awaiting counselor, try to accept
      if (appointment.status === "paid_pending_counselor") {
        const res2 = await fetch(
          `${
            import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
          }/api/bookings/${encodeURIComponent(appointment.id)}/accept`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({}),
          }
        );
        if (!res2.ok) {
          toast.warn(
            "Scheduled but auto-accept failed; please Accept manually"
          );
        } else {
          toast.success("Scheduled and accepted");
        }
      } else {
        toast.success("Scheduled (awaiting payment or counselor action)");
      }

      loadAppointments();
    } catch (e) {
      console.error("Schedule failed", e);
      toast.error("Schedule failed");
    }
  };

  // Real-time WebSocket connection (StrictMode-safe)
  const appointmentsSocketRef = useRef(null);
  useEffect(() => {
    if (!user?.email) return;
    if (appointmentsSocketRef.current) return;

    const SERVER_URL =
      import.meta.env.VITE_SERVER_URL || "http://localhost:8080";
    const socket = io(SERVER_URL, {
      withCredentials: true,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    appointmentsSocketRef.current = socket;

    socket.emit("join:counselor", user.email);

    socket.on("connect", () => {
      setSocketConnected(true);
      console.log("✅ Appointments panel socket connected");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    // Listen for booking/appointment updates and refresh list for accuracy
    const refresh = () => {
      loadAppointments();
    };

    socket.on("appointment:updated", (updated) => {
      console.log("📅 Appointment updated:", updated);
      refresh();
    });

    socket.on("appointment:cancelled", (data) => {
      console.log("📅 Appointment cancelled:", data);
      refresh();
      toast.info(`Appointment cancelled`);
    });

    socket.on("booking:new", () => {
      console.log("🆕 Booking new (counselor)");
      refresh();
    });

    socket.on("booking:awaiting_confirmation", () => {
      console.log("⏳ Awaiting counselor confirmation");
      refresh();
    });

    socket.on("booking:updated", () => {
      console.log("🔄 Booking updated");
      refresh();
    });

    socket.on("booking:confirmed", () => {
      console.log("✅ Booking confirmed");
      refresh();
    });

    socket.on("booking:rejected", () => {
      console.log("❌ Booking rejected");
      refresh();
    });

    socket.on("session:started", () => {
      console.log("▶️ Session started");
      refresh();
    });

    socket.on("session:ended", () => {
      console.log("🏁 Session ended");
      refresh();
    });

    return () => {
      if (appointmentsSocketRef.current) {
        appointmentsSocketRef.current.off("appointment:updated");
        appointmentsSocketRef.current.off("appointment:cancelled");
        appointmentsSocketRef.current.off("booking:new");
        appointmentsSocketRef.current.off("booking:awaiting_confirmation");
        appointmentsSocketRef.current.off("booking:updated");
        appointmentsSocketRef.current.off("booking:confirmed");
        appointmentsSocketRef.current.off("booking:rejected");
        appointmentsSocketRef.current.off("session:started");
        appointmentsSocketRef.current.off("session:ended");
        appointmentsSocketRef.current.disconnect();
        appointmentsSocketRef.current = null;
      }
    };
  }, [user?.email]);

  // Load data on mount and set up refresh
  useEffect(() => {
    loadAppointments();
    const interval = setInterval(loadAppointments, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, [page, limit]);

  // Filter appointments
  const filteredAppointments = appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let matchesDate = true;
    if (filterDate === "today") {
      matchesDate = appointmentDate.toDateString() === today.toDateString();
    } else if (filterDate === "tomorrow") {
      matchesDate = appointmentDate.toDateString() === tomorrow.toDateString();
    } else if (filterDate === "week") {
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      matchesDate = appointmentDate >= today && appointmentDate <= weekFromNow;
    }

    // Normalize and support grouped filters
    const s = String(appointment.status || "").toLowerCase();
    let matchesStatus = false;
    if (filterStatus === "all") matchesStatus = true;
    else if (filterStatus === "pending")
      matchesStatus = [
        "pending_payment",
        "paid_pending_counselor",
        "pending",
      ].includes(s);
    else if (filterStatus === "paid_pending_counselor")
      matchesStatus = s === "paid_pending_counselor";
    else if (filterStatus === "pending_payment")
      matchesStatus = s === "pending_payment";
    else if (filterStatus === "in_session") matchesStatus = s === "in_session";
    else matchesStatus = s === filterStatus;
    return matchesDate && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with real-time status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Appointments</h2>
          <p className="text-gray-600">Manage your appointment schedule</p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              socketConnected
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            {socketConnected ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            {socketConnected ? "Live" : "Offline"}
          </div>

          {lastUpdate && (
            <div className="text-xs text-gray-500">
              Updated {new Date(lastUpdate).toLocaleTimeString()}
            </div>
          )}

          <button
            onClick={loadAppointments}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-300 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <select
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
        >
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="week">This Week</option>
          <option value="all">All Upcoming</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending (payment/awaiting)</option>
          <option value="paid_pending_counselor">Paid (awaiting counselor)</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_session">In Session</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Types</option>
          <option value="video">Video</option>
          <option value="call">Call</option>
          <option value="chat">Chat</option>
        </select>

        <input
          type="text"
          placeholder="Search notes or user ID..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
        >
          <option value="date">Sort by Date</option>
          <option value="status">Sort by Status</option>
          <option value="price">Sort by Price</option>
        </select>
        <select
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
        >
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>

        <button
          onClick={() => {
            setPage(1);
            loadAppointments();
          }}
          className="px-3 py-2 border rounded-lg"
          title="Apply filters"
        >Apply</button>
      </div>

      {/* Pagination controls */}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <div className="text-sm text-gray-600">Total: {pagination.total}</div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >Prev</button>
          <span className="text-sm">Page {page} / {pagination.pages || 1}</span>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.min((pagination.pages||1), p + 1))}
            disabled={page >= (pagination.pages || 1)}
          >Next</button>
        </div>
        <select
          value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          className="px-2 py-1 border rounded"
        >
          {[10,20,50].map(n => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <button
          onClick={loadAppointments}
          className="px-3 py-1 border rounded"
        >Go</button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No appointments found
            </h3>
            <p className="text-gray-600">
              {filterDate !== "all" || filterStatus !== "all"
                ? "Try adjusting your filter criteria"
                : "Your appointments will appear here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => {
            const appointmentDateTime = new Date(
              `${appointment.date}T${appointment.time}`
            );
            const isToday =
              appointmentDateTime.toDateString() === new Date().toDateString();
            const isSoon =
              appointmentDateTime.getTime() - Date.now() < 60 * 60 * 1000; // Within 1 hour
            const atOrAfterStart = appointmentDateTime.getTime() <= Date.now(); // Enable join at scheduled time or after

            return (
              <Card
                key={appointment.id}
                className={`${
                  isToday ? "border-emerald-300 bg-emerald-50" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">
                          {appointment.clientName || "Anonymous"}
                        </h3>
                        {isSoon && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                            Starting Soon
                          </span>
                        )}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            appointment.status === "confirmed"
                              ? "bg-green-100 text-green-700"
                              : appointment.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : appointment.status === "completed"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {appointment.status || "pending"}
                        </span>
                      </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(appointment.date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{appointment.time}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            <span>{appointment.sessionType || "Video Call"}</span>
                          </div>
                          {appointment.riskLabel && (
                            <div className="flex items-center gap-1">
                              <Shield className={`h-4 w-4 ${appointment.riskLabel==='RISK_HIGH'?'text-red-600':appointment.riskLabel==='RISK_LOW'?'text-orange-500':appointment.riskLabel==='AMBIGUOUS'?'text-yellow-500':'text-gray-400'}`} />
                              <span className={`px-2 py-0.5 rounded-full text-xs ${appointment.riskLabel==='RISK_HIGH'?'bg-red-100 text-red-700':appointment.riskLabel==='RISK_LOW'?'bg-orange-100 text-orange-700':appointment.riskLabel==='AMBIGUOUS'?'bg-yellow-100 text-yellow-700':'bg-gray-100 text-gray-600'}`}>
                                {appointment.riskLabel.replace('_',' ').toLowerCase()}
                              </span>
                            </div>
                          )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const canConfirm = appointment.status === "paid_pending_counselor" || appointment.status === "pending_payment";
                        const canSendJoin = appointment.status === "confirmed" && atOrAfterStart;
                        return (
                          <>
                            {/* Confirm Booking (only primary action) */}
                            <Button
                              size="sm"
                              variant="outline"
                              className={`border-green-300 ${canConfirm ? 'text-green-600 hover:bg-green-50' : 'text-gray-400'} disabled:opacity-50`}
                              disabled={!canConfirm}
                              title={canConfirm ? 'Confirm booking & credit earnings' : 'Available after user payment'}
                              onClick={() => handleAppointmentAction(appointment.id, "confirm")}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Confirm Booking
                            </Button>

                            {/* Send Join Request (only primary action) */}
                            <Button
                              size="sm"
                              variant="outline"
                              className={`border-emerald-300 ${canSendJoin ? 'text-emerald-700 hover:bg-emerald-50' : 'text-gray-400'} disabled:opacity-50`}
                              disabled={!canSendJoin}
                              title={canSendJoin ? 'Send join request now' : 'Enabled at the scheduled session time'}
                              onClick={() => handleAppointmentAction(appointment.id, "request-join")}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Send Join Request
                            </Button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Enhanced Messages Panel with Real-time Data
const MessagesContent = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);
  const messagesSocketRef = useRef(null);
  const selectedConvRef = useRef(null);

  // Load conversations data
  const loadConversations = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
        }/api/counselors/conversations`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setConversations(Array.isArray(data) ? data : []);
        setLastUpdate(new Date());
        console.log("💬 Conversations data updated:", data);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Failed to load conversations:", e);
      setError("Failed to load conversations data");
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  // Load messages for selected conversation
  const loadMessages = async (conversationId) => {
    try {
      const res = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
        }/api/conversations/${conversationId}/messages`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
        console.log("💬 Messages loaded:", data);
      }
    } catch (e) {
      console.error("Failed to load messages:", e);
      toast.error("Failed to load messages");
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const res = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
        }/api/conversations/${selectedConversation.id}/messages`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newMessage.trim() }),
        }
      );

      if (res.ok) {
        setNewMessage("");
        loadMessages(selectedConversation.id);
      } else {
        throw new Error("Failed to send message");
      }
    } catch (e) {
      console.error("Failed to send message:", e);
      toast.error("Failed to send message");
    }
  };

  // Keep a ref of the currently selected conversation
  useEffect(() => {
    selectedConvRef.current = selectedConversation;
  }, [selectedConversation]);

  // Real-time WebSocket connection (StrictMode-safe, single connect)
  useEffect(() => {
    if (!user?.email) return;
    if (messagesSocketRef.current) return; // already connected

    const SERVER_URL =
      import.meta.env.VITE_SERVER_URL || "http://localhost:8080";
    const socket = io(SERVER_URL, {
      withCredentials: true,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    messagesSocketRef.current = socket;

    socket.emit("join:counselor", user.email);

    socket.on("connect", () => {
      setSocketConnected(true);
      console.log("✅ Messages panel socket connected");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    // Listen for message updates
    socket.on("message:new", (message) => {
      console.log("💬 New message:", message);
      const sel = selectedConvRef.current;
      if (sel && message.conversationId === sel.id) {
        setMessages((prev) => [...prev, message]);
      }
      // Update conversation list
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === message.conversationId
            ? {
                ...conv,
                lastMessage: message,
                unreadCount: (conv.unreadCount || 0) + 1,
              }
            : conv
        )
      );
      toast.success(`New message from ${message.senderName}`);
    });

    socket.on("conversation:updated", (conversation) => {
      console.log("💬 Conversation updated:", conversation);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversation.id ? { ...conv, ...conversation } : conv
        )
      );
    });

    return () => {
      if (messagesSocketRef.current) {
        messagesSocketRef.current.off("message:new");
        messagesSocketRef.current.off("conversation:updated");
        messagesSocketRef.current.disconnect();
        messagesSocketRef.current = null;
      }
    };
  }, [user?.email]);

  // Load data on mount
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
          <div className="bg-gray-200 rounded animate-pulse" />
          <div className="lg:col-span-2 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
          <p className="text-gray-600">Communicate with your clients</p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              socketConnected
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            {socketConnected ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            {socketConnected ? "Live" : "Offline"}
          </div>

          {lastUpdate && (
            <div className="text-xs text-gray-500">
              Updated {new Date(lastUpdate).toLocaleTimeString()}
            </div>
          )}

          <button
            onClick={loadConversations}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-300 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
        {/* Conversations List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No conversations yet</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedConversation?.id === conversation.id
                        ? "bg-emerald-50 border-emerald-200"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <span className="text-emerald-700 font-medium">
                            {conversation.clientName
                              ?.charAt(0)
                              ?.toUpperCase() || "C"}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {conversation.clientName || "Anonymous"}
                          </h4>
                          <p className="text-sm text-gray-600 truncate">
                            {conversation.lastMessage?.content ||
                              "No messages yet"}
                          </p>
                        </div>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-emerald-600 text-white text-xs rounded-full px-2 py-1">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Messages Area */}
        <Card className="lg:col-span-2">
          {selectedConversation ? (
            <>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedConversation.clientName || "Anonymous"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-64 overflow-y-auto p-4 space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderId === user.id
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderId === user.id
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-200 text-gray-900"
                        }`}
                      >
                        <p>{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.senderId === user.id
                              ? "text-emerald-100"
                              : "text-gray-500"
                          }`}
                        >
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="p-8 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-600">
                Choose a conversation from the list to start messaging
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

// Enhanced Earnings Panel with Real-time Data
const EarningsContent = ({ user }) => {
  const [earnings, setEarnings] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: 0,
    pendingPayouts: 0,
    completedSessions: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState("month");
  const [lastUpdate, setLastUpdate] = useState(null);

  // Load earnings data
  const loadEarnings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
        }/api/counselors/earnings`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setEarnings(data.summary || {});
        setTransactions(
          Array.isArray(data.transactions) ? data.transactions : []
        );
        setLastUpdate(new Date());
        console.log("💰 Earnings data updated:", data);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Failed to load earnings:", e);
      setError("Failed to load earnings data");
      toast.error("Failed to load earnings");
    } finally {
      setLoading(false);
    }
  };

  // Real-time WebSocket connection
  useEffect(() => {
    if (!user?.email) return;

    const SERVER_URL =
      import.meta.env.VITE_SERVER_URL || "http://localhost:8080";
    const socket = io(SERVER_URL, { withCredentials: true });

    socket.emit("join:counselor", user.email);

    socket.on("connect", () => {
      setSocketConnected(true);
      console.log("✅ Earnings panel socket connected");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    // Listen for earnings updates
    socket.on("earnings:updated", (data) => {
      console.log("💰 Earnings updated:", data);
      // Reload full earnings data for accuracy
      loadEarnings();
      toast.success(`Earnings updated! +₹${data.thisMonthDelta || data.totalDelta || 0}`);
    });

    socket.on("transaction:new", (transaction) => {
      console.log("💰 New transaction:", transaction);
      setTransactions((prev) => [transaction, ...prev]);
      toast.success(`New payment: ₹${transaction.amount}`);
    });

    socket.on("payout:processed", (payout) => {
      console.log("💰 Payout processed:", payout);
      loadEarnings(); // Refresh all data
      toast.success(`Payout processed: ₹${payout.amount}`);
    });

    return () => {
      socket.off("earnings:updated");
      socket.off("transaction:new");
      socket.off("payout:processed");
      socket.disconnect();
    };
  }, [user?.email]);

  // Load data on mount
  useEffect(() => {
    loadEarnings();
    const interval = setInterval(loadEarnings, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Earnings & Analytics
          </h2>
          <p className="text-gray-600">
            Track your income and financial performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              socketConnected
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            {socketConnected ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            {socketConnected ? "Live" : "Offline"}
          </div>

          {lastUpdate && (
            <div className="text-xs text-gray-500">
              Updated {new Date(lastUpdate).toLocaleTimeString()}
            </div>
          )}

          <button
            onClick={loadEarnings}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-300 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Today's Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ₹{earnings.today?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              ₹{earnings.thisWeek?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              ₹{earnings.thisMonth?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Award className="h-4 w-4 mr-2" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">
              ₹{earnings.total?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-gray-500 mt-2">Lifetime revenue</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Completed Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {earnings.completedSessions?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-gray-500 mt-2">Total completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Breakdown by Session Type */}
      {earnings.byType && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Earnings by Session Type
            </CardTitle>
            <CardDescription>
              Your earnings breakdown across different session categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Video Sessions */}
              <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="h-5 w-5 text-emerald-600" />
                  <h4 className="font-medium text-emerald-900">Video Sessions</h4>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-emerald-700">
                    ₹{earnings.byType.video?.earnings?.toLocaleString() || 0}
                  </div>
                  <p className="text-sm text-emerald-600">
                    {earnings.byType.video?.count || 0} sessions
                  </p>
                </div>
              </div>

              {/* Call Sessions */}
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-5 w-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">Call Sessions</h4>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-blue-700">
                    ₹{earnings.byType.call?.earnings?.toLocaleString() || 0}
                  </div>
                  <p className="text-sm text-blue-600">
                    {earnings.byType.call?.count || 0} sessions
                  </p>
                </div>
              </div>

              {/* Chat Sessions */}
              <div className="p-4 rounded-lg border border-purple-200 bg-purple-50">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="h-5 w-5 text-purple-600" />
                  <h4 className="font-medium text-purple-900">Chat Sessions</h4>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-purple-700">
                    ₹{earnings.byType.chat?.earnings?.toLocaleString() || 0}
                  </div>
                  <p className="text-sm text-purple-600">
                    {earnings.byType.chat?.count || 0} sessions
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <DollarSign
                        className={`h-5 w-5 ${
                          transaction.type === "payment"
                            ? "text-green-600"
                            : "text-blue-600"
                        }`}
                      />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {transaction.description || "Session Payment"}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {transaction.clientName || "Anonymous"} •{" "}
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-bold ${
                        transaction.type === "payment"
                          ? "text-green-600"
                          : "text-blue-600"
                      }`}
                    >
                      ₹{transaction.amount?.toLocaleString()}
                    </div>
                    <div
                      className={`text-xs px-2 py-1 rounded-full ${
                        transaction.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : transaction.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {transaction.status || "completed"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Enhanced Resources Panel with Real-time Data
const CounselorResourcesContent = ({ user }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [lastUpdate, setLastUpdate] = useState(null);

  // Load resources data
  const loadResources = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
        }/api/counselors/resources`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setResources(Array.isArray(data) ? data : []);
        setLastUpdate(new Date());
        console.log("📚 Resources data updated:", data);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Failed to load resources:", e);
      setError("Failed to load resources data");
      toast.error("Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  // Real-time WebSocket connection (StrictMode-safe)
  const resourcesSocketRef = useRef(null);
  useEffect(() => {
    if (!user?.email) return;
    if (resourcesSocketRef.current) return;

    const SERVER_URL =
      import.meta.env.VITE_SERVER_URL || "http://localhost:8080";
    const socket = io(SERVER_URL, {
      withCredentials: true,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    resourcesSocketRef.current = socket;

    socket.emit("join:counselor", user.email);

    socket.on("connect", () => {
      setSocketConnected(true);
      console.log("✅ Resources panel socket connected");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    // Listen for resource updates
    socket.on("resource:new", (resource) => {
      console.log("📚 New resource:", resource);
      setResources((prev) => [resource, ...prev]);
      toast.success(`New resource: ${resource.title}`);
    });

    socket.on("resource:updated", (updatedResource) => {
      console.log("📚 Resource updated:", updatedResource);
      setResources((prev) =>
        prev.map((r) =>
          r.id && updatedResource.id && r.id === updatedResource.id
            ? { ...r, ...updatedResource }
            : r
        )
      );
    });

    return () => {
      if (resourcesSocketRef.current) {
        resourcesSocketRef.current.off("resource:new");
        resourcesSocketRef.current.off("resource:updated");
        resourcesSocketRef.current.disconnect();
        resourcesSocketRef.current = null;
      }
    };
  }, [user?.email]);

  // Load data on mount
  useEffect(() => {
    loadResources();
    const interval = setInterval(loadResources, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Filter resources
  const filteredResources = resources.filter(
    (resource) =>
      filterCategory === "all" || resource.category === filterCategory
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Professional Resources
          </h2>
          <p className="text-gray-600">
            Access training materials and professional development content
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              socketConnected
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            {socketConnected ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            {socketConnected ? "Live" : "Offline"}
          </div>

          {lastUpdate && (
            <div className="text-xs text-gray-500">
              Updated {new Date(lastUpdate).toLocaleTimeString()}
            </div>
          )}

          <button
            onClick={loadResources}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-300 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Categories</option>
          <option value="training">Training Materials</option>
          <option value="guidelines">Clinical Guidelines</option>
          <option value="research">Research Papers</option>
          <option value="tools">Assessment Tools</option>
        </select>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No resources found
            </h3>
            <p className="text-gray-600">
              {filterCategory !== "all"
                ? "Try selecting a different category"
                : "Professional resources will appear here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource, idx) => (
            <Card
              key={resource.id || `${resource.title}-${resource.url || idx}`}
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {resource.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {resource.category}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      resource.type === "video"
                        ? "bg-blue-100 text-blue-700"
                        : resource.type === "pdf"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {resource.type || "document"}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  {resource.description}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>Duration: {resource.duration || "N/A"}</span>
                  <span>
                    Updated: {new Date(resource.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => window.open(resource.url, "_blank")}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Access Resource
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Settings Panel - Simplified to match Student Dashboard
const CounselorSettingsContent = ({ user }) => {
  const [theme, setTheme] = useState(() => {
    try {
      const t = localStorage.getItem("theme");
      return t === "dark" ? "dark" : "light";
    } catch (_) {
      return "light";
    }
  });
  const [notifyEmail, setNotifyEmail] = useState(() => {
    try {
      return localStorage.getItem("notifyEmail") === "1";
    } catch (_) {
      return false;
    }
  });
  const [notifySMS, setNotifySMS] = useState(() => {
    try {
      return localStorage.getItem("notifySMS") === "1";
    } catch (_) {
      return false;
    }
  });
  const [socketStatus, setSocketStatus] = useState("disconnected");

  useEffect(() => {
    // Apply theme to <html>
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem("theme", theme);
    } catch (_) {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("notifyEmail", notifyEmail ? "1" : "0");
    } catch (_) {}
  }, [notifyEmail]);
  
  useEffect(() => {
    try {
      localStorage.setItem("notifySMS", notifySMS ? "1" : "0");
    } catch (_) {}
  }, [notifySMS]);

  // Lightweight realtime indicator: connect and join counselor room
  useEffect(() => {
    if (!user?.email) return;
    const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:8080";
    const socket = io(SERVER_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });
    socket.on("connect", () => {
      setSocketStatus("connected");
      socket.emit("join:counselor", user.email);
    });
    socket.on("disconnect", () => setSocketStatus("disconnected"));
    socket.on("connect_error", () => setSocketStatus("error"));
    return () => socket.disconnect();
  }, [user?.email]);

  const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:8080";

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account</CardTitle>
          <CardDescription>Your basic account information</CardDescription>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-800">
          <div>
            <div className="text-sm text-gray-500">Name</div>
            <div className="font-medium">{user?.name || "-"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Email</div>
            <div className="font-medium">{user?.email || "-"}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appearance</CardTitle>
          <CardDescription>Switch between light and dark modes</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setTheme("light")}
              className={`${
                theme === "light"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-800"
              }`}
            >
              Light
            </Button>
            <Button
              onClick={() => setTheme("dark")}
              className={`${
                theme === "dark"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-800"
              }`}
            >
              Dark
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notifications</CardTitle>
          <CardDescription>Control how you receive updates</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4 text-slate-800">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.checked)}
            />
            <span>
              Email notifications for appointments and messages
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifySMS}
              onChange={(e) => setNotifySMS(e.target.checked)}
            />
            <span>SMS notifications (requires server configuration)</span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Realtime</CardTitle>
          <CardDescription>Connection to live updates</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-sm">
            Status:{" "}
            <span
              className={`font-medium ${
                socketStatus === "connected"
                  ? "text-emerald-600"
                  : socketStatus === "error"
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              {socketStatus}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Server: {SERVER_URL}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CounselorDashboard;
