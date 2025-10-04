"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";
import {
  Heart,
  MessageCircle,
  Calendar,
  Phone,
  User,
  Settings,
  Bell,
  Activity,
  BookOpen,
  Users,
  TrendingUp,
  Award,
  Target,
  Clock,
  Battery,
  Moon,
  Zap,
  AlertTriangle,
  Send,
  Bot,
  Lightbulb,
  Shield,
  Headphones,
  Smile,
  Frown,
  Meh,
  PhoneCall,
  MessageSquare,
  MapPin,
  AlertCircle,
  ExternalLink,
  Copy,
  CheckCircle,
  Home,
  Menu,
  ArrowRight,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

// Backend server URL for realtime/socket connection (fallback to localhost:8080 in dev)
const SERVER_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_SERVER_URL) ||
  "http://localhost:8080";
// Toggle websockets via env: set VITE_ENABLE_WS=false to disable in dev
const ENABLE_WS = !(
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  String(import.meta.env.VITE_ENABLE_WS || "true").toLowerCase() === "false"
);

const Dashboard = ({ user, onLogout, navigateTo }) => {
  // Persist active tab across refresh and deep link via ?tab=
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const url = new URL(window.location.href);
      const fromUrl = url.searchParams.get("tab");
      const valid = new Set([
        "overview",
        "checkin",
        "chat",
        "human-counselor",
        "resources",
        "emergency",
        "settings",
      ]);
      if (fromUrl && valid.has(fromUrl)) return fromUrl;
      const fromStorage = localStorage.getItem("dashboardActiveTab");
      if (fromStorage && valid.has(fromStorage)) return fromStorage;
    } catch (_) {}
    return "overview";
  });

  // Whenever tab changes, update URL (without reload) and localStorage
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", activeTab);
      window.history.replaceState(
        {},
        "",
        url.pathname + "?" + url.searchParams.toString() + url.hash
      );
      localStorage.setItem("dashboardActiveTab", activeTab);
    } catch (_) {}
  }, [activeTab]);

  const menuItems = [
    { id: "overview", name: "Overview", icon: Activity },
    { id: "checkin", name: "Daily Check-in", icon: Calendar },
    { id: "chat", name: "AI Counselor", icon: MessageCircle },
    { id: "human-counselor", name: "Human Support", icon: Users },
    { id: "resources", name: "Resources", icon: BookOpen },
    { id: "emergency", name: "Emergency", icon: Phone },
    { id: "settings", name: "Settings", icon: Settings },
  ];
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewContent user={user} />;
      case "checkin":
        return <CheckinContent user={user} />;
      case "chat":
        return <AIChatContent />;
      case "human-counselor":
        return <HumanCounselorContent user={user} />;
      case "resources":
        return <ResourcesContent />;
      case "emergency":
        return <EmergencyContent />;
      case "settings":
        return <SettingsContent user={user} />;
      default:
        return <OverviewContent user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 dark:text-neutral-100 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mobile top bar */}
        <div className="lg:hidden mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <button
              aria-label="Toggle navigation"
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100"
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
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
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

        <div className="flex gap-8 min-h-0">
          {/* Sidebar (desktop only) */}
          <div className="w-64 flex-shrink-0 hidden lg:block">
            <nav className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === item.id
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-h-0">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
};

const OverviewContent = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trend, setTrend] = useState(null); // { period, days, distribution, series }
  const [routines, setRoutines] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        // Fetch last 7-day risk trend
        const tRes = await fetch(
          `${SERVER_URL}/api/risk/trend?googleId=${encodeURIComponent(
            user.googleId
          )}&period=daily&days=7`
        );
        const tJson = tRes.ok ? await tRes.json() : null;
        // Fetch recent routines
        const rRes = await fetch(
          `${SERVER_URL}/api/routines?googleId=${encodeURIComponent(
            user.googleId
          )}`
        );
        const rJson = rRes.ok ? await rRes.json() : [];
        if (!mounted) return;
        setTrend(tJson);
        setRoutines(Array.isArray(rJson) ? rJson : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load dashboard data");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user.googleId]);

  // Optional realtime updates for trend/routines
  useEffect(() => {
    if (!ENABLE_WS) return;
    let socket;
    try {
      socket = io(SERVER_URL, {
        transports: ["websocket"],
        withCredentials: true,
      });
      socket.on("connect", () => setSocketConnected(true));
      socket.on("disconnect", () => setSocketConnected(false));
      if (user?.googleId) socket.emit("join:user", user.googleId);
      socket.on("risk:trend:update", (payload) => {
        if (payload && typeof payload === "object") setTrend(payload);
      });
      socket.on("routines:update", (items) => {
        if (Array.isArray(items)) setRoutines(items);
      });
    } catch (_) {}
    return () => {
      try {
        socket && socket.disconnect();
      } catch (_) {}
    };
  }, [user?.googleId]);

  // Compute metrics from real data
  const riskSeries = Array.isArray(trend?.series) ? trend.series : [];
  const latestRisk = riskSeries.length
    ? riskSeries[riskSeries.length - 1]?.risk
    : "LOW";
  const distribution = trend?.distribution || { LOW: 0, MEDIUM: 0, HIGH: 0 };

  // Wellness score: simple heuristic from last 7 days (LOW=9, MEDIUM=7, HIGH=4)
  const riskScoreMap = { LOW: 9, MEDIUM: 7, HIGH: 4 };
  const scores = riskSeries.map((r) => riskScoreMap[r.risk] || 6);
  const wellness = scores.length
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 8;
  const wellnessPct = Math.round((wellness / 10) * 100);

  // Small inline sparkline for risk trend (no extra deps)
  const RiskSparkline = ({ series }) => {
    try {
      const data = (series || []).map((r) => riskScoreMap[r.risk] || 6);
      const width = 220;
      const height = 48;
      const pad = 4;
      if (data.length <= 1) {
        return <div className="text-xs text-gray-500">Not enough data</div>;
      }
      const min = 0;
      const max = 10;
      const stepX = (width - pad * 2) / (data.length - 1);
      const toY = (v) =>
        height - pad - ((v - min) / (max - min)) * (height - pad * 2);
      const points = data
        .map((v, i) => `${pad + i * stepX},${toY(v).toFixed(1)}`)
        .join(" ");
      return (
        <svg width={width} height={height} className="overflow-visible">
          <polyline
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            points={points}
          />
          {data.map((v, i) => (
            <circle
              key={i}
              cx={pad + i * stepX}
              cy={toY(v)}
              r="2"
              fill="#10B981"
            />
          ))}
        </svg>
      );
    } catch (_) {
      return null;
    }
  };

  // Simple distribution bars
  const DistributionBars = ({ dist }) => {
    const total = (dist.LOW || 0) + (dist.MEDIUM || 0) + (dist.HIGH || 0);
    const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
    const Row = ({ label, value, color }) => (
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>{label}</span>
          <span>{pct(value)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded h-2">
          <div
            className={`${color} h-2 rounded`}
            style={{ width: `${pct(value)}%` }}
          />
        </div>
      </div>
    );
    return (
      <div>
        <Row label="LOW" value={dist.LOW || 0} color="bg-green-500" />
        <Row label="MEDIUM" value={dist.MEDIUM || 0} color="bg-yellow-500" />
        <Row label="HIGH" value={dist.HIGH || 0} color="bg-red-500" />
      </div>
    );
  };

  // Streak: count consecutive days with at least one routine (from newest backwards)
  const byDay = new Map();
  for (const it of routines) {
    const d = new Date(it.createdAt);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, true);
  }
  let streak = 0;
  let cur = new Date();
  for (let i = 0; i < 60; i++) {
    const key = cur.toISOString().slice(0, 10);
    if (byDay.has(key)) streak += 1;
    else break;
    cur.setDate(cur.getDate() - 1);
  }

  // Recent activity from routines (latest 5)
  const recent = routines.slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.name}!
        </h2>
        <p className="text-gray-600 mt-1">
          Your real-time mental wellness overview
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Wellness Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {wellness.toFixed(1)}/10
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div
                className="bg-emerald-500 h-2 rounded-full"
                style={{ width: `${wellnessPct}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Based on last 7 days of AI risk
            </div>
            <div className="mt-4">
              <RiskSparkline series={riskSeries} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Award className="h-4 w-4 mr-2" />
              Check-in Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {streak} {streak === 1 ? "day" : "days"}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Consecutive days with a check-in
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <MessageCircle className="h-4 w-4 mr-2" />
              Check-ins (last 30)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {routines.length}
            </div>
            <p className="text-xs text-gray-500 mt-2">Stored in your account</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Risk Distribution (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionBars dist={distribution} />
            <div className="text-xs mt-3 text-gray-600">
              Latest:{" "}
              <span
                className={`font-semibold ${
                  latestRisk === "HIGH"
                    ? "text-red-600"
                    : latestRisk === "MEDIUM"
                    ? "text-yellow-700"
                    : "text-emerald-700"
                }`}
              >
                {latestRisk}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your latest check-ins</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recent.length === 0 && (
                  <div className="text-sm text-gray-500">
                    No recent check-ins yet.
                  </div>
                )}
                {recent.map((it) => {
                  const d = new Date(it.createdAt);
                  const mood = it?.data?.mood ?? "-";
                  const energy = it?.data?.energy ?? "-";
                  const risk = it?.risk || "LOW";
                  return (
                    <div
                      key={it._id}
                      className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="bg-emerald-100 p-2 rounded-full">
                        <Calendar className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          Check-in • {d.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600">
                          Mood: {mood} • Energy: {energy} • Risk:{" "}
                          <span
                            className={`${
                              risk === "HIGH"
                                ? "text-red-600"
                                : risk === "MEDIUM"
                                ? "text-yellow-700"
                                : "text-emerald-700"
                            }`}
                          >
                            {risk}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Emergency</span>
                {ENABLE_WS && (
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full border text-xs ${
                      socketConnected
                        ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                        : "border-gray-300 text-gray-600 bg-gray-50"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full mr-2 ${
                        socketConnected ? "bg-emerald-500" : "bg-gray-400"
                      }`}
                    />
                    {socketConnected ? "Live" : "Offline"}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Need urgent help? Open the Emergency panel for fast actions.
              </p>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white w-full"
                onClick={() => {
                  try {
                    const url = new URL(window.location.href);
                    url.searchParams.set("tab", "emergency");
                    window.history.replaceState(
                      {},
                      "",
                      url.pathname +
                        "?" +
                        url.searchParams.toString() +
                        url.hash
                    );
                    // Soft navigate by dispatching a popstate so our Dashboard picks it up if needed
                    window.dispatchEvent(new PopStateEvent("popstate"));
                  } catch (_) {}
                }}
              >
                Open Emergency Panel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const CheckinContent = ({ user }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [checkinData, setCheckinData] = useState({
    mood: null,
    energy: null,
    sleep: null,
    stress: null,
    notes: "",
    activities: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [period, setPeriod] = useState("daily");
  const [analysis, setAnalysis] = useState(null); // { risk, tips }
  const [submitError, setSubmitError] = useState("");

  const moodOptions = [
    {
      value: 1,
      label: "Very Bad",
      icon: <Frown className="h-6 w-6" />,
      color: "text-red-500",
    },
    {
      value: 2,
      label: "Bad",
      icon: <Frown className="h-6 w-6" />,
      color: "text-orange-500",
    },
    {
      value: 3,
      label: "Okay",
      icon: <Meh className="h-6 w-6" />,
      color: "text-yellow-500",
    },
    {
      value: 4,
      label: "Good",
      icon: <Smile className="h-6 w-6" />,
      color: "text-green-500",
    },
    {
      value: 5,
      label: "Great",
      icon: <Smile className="h-6 w-6" />,
      color: "text-emerald-500",
    },
  ];

  const energyOptions = [
    {
      value: 1,
      label: "Very Low",
      icon: <Battery className="h-6 w-6" />,
      color: "text-red-500",
    },
    {
      value: 2,
      label: "Low",
      icon: <Battery className="h-6 w-6" />,
      color: "text-orange-500",
    },
    {
      value: 3,
      label: "Moderate",
      icon: <Battery className="h-6 w-6" />,
      color: "text-yellow-500",
    },
    {
      value: 4,
      label: "High",
      icon: <Zap className="h-6 w-6" />,
      color: "text-green-500",
    },
    {
      value: 5,
      label: "Very High",
      icon: <Zap className="h-6 w-6" />,
      color: "text-emerald-500",
    },
  ];

  const sleepOptions = [
    { value: 1, label: "Very Poor", hours: "< 4 hours" },
    { value: 2, label: "Poor", hours: "4-5 hours" },
    { value: 3, label: "Fair", hours: "6-7 hours" },
    { value: 4, label: "Good", hours: "7-8 hours" },
    { value: 5, label: "Excellent", hours: "8+ hours" },
  ];

  const stressOptions = [
    { value: 1, label: "Very Low", color: "bg-green-500" },
    { value: 2, label: "Low", color: "bg-emerald-400" },
    { value: 3, label: "Moderate", color: "bg-yellow-500" },
    { value: 4, label: "High", color: "bg-orange-500" },
    { value: 5, label: "Very High", color: "bg-red-500" },
  ];

  const activityOptions = [
    "Exercise",
    "Meditation",
    "Reading",
    "Social Time",
    "Work/Study",
    "Creative Activities",
    "Outdoor Time",
    "Music",
    "Gaming",
    "Cooking",
  ];

  const handleSubmit = async () => {
    try {
      setSubmitError("");
      setIsSubmitting(true);
      if (!user?.googleId) throw new Error("Missing user id");
      const payload = {
        googleId: user.googleId,
        period,
        data: {
          mood: checkinData.mood,
          energy: checkinData.energy,
          sleep: checkinData.sleep,
          stress: checkinData.stress,
          notes: checkinData.notes,
          activities: checkinData.activities,
        },
      };
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to analyze data");
      const json = await res.json();
      setAnalysis({ risk: json.risk, tips: json.tips || [] });
      // Optional: notify parent via SMS/Email if configured in Settings
      try {
        const parentPhone = localStorage.getItem("parentPhone") || "";
        const parentEmail = localStorage.getItem("parentEmail") || "";
        if (parentPhone || parentEmail) {
          fetch(`${SERVER_URL}/api/notify/report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              parentPhone: parentPhone || undefined,
              parentEmail: parentEmail || undefined,
              userName: user?.name,
              risk: json.risk,
              tips: Array.isArray(json.tips) ? json.tips.slice(0, 5) : [],
            }),
          }).catch(() => {});
        }
      } catch (_) {}
      setIsCompleted(true);
      toast.success("Check-in analyzed successfully");
    } catch (e) {
      setSubmitError(e.message || "Submit failed");
      toast.error(e?.message || "Failed to analyze check-in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCheckinData = (field, value) => {
    setCheckinData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleActivity = (activity) => {
    setCheckinData((prev) => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter((a) => a !== activity)
        : [...prev.activities, activity],
    }));
  };

  if (isCompleted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="text-center">
          <CardContent className="p-8">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 mt-4">
              <Activity className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Check-in Complete!
            </h3>
            <p className="text-gray-600 mb-6">
              Thank you for taking time to check in with yourself today. Your
              wellness journey matters.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-2">
                Today's Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Mood:</span>
                  <span className="ml-2 font-medium">
                    {
                      moodOptions.find((m) => m.value === checkinData.mood)
                        ?.label
                    }
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Energy:</span>
                  <span className="ml-2 font-medium">
                    {
                      energyOptions.find((e) => e.value === checkinData.energy)
                        ?.label
                    }
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Sleep:</span>
                  <span className="ml-2 font-medium">
                    {
                      sleepOptions.find((s) => s.value === checkinData.sleep)
                        ?.label
                    }
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Stress:</span>
                  <span className="ml-2 font-medium">
                    {
                      stressOptions.find((s) => s.value === checkinData.stress)
                        ?.label
                    }
                  </span>
                </div>
              </div>
            </div>

            {analysis && (
              <div className="bg-emerald-50 rounded-lg p-4 mb-6 text-left">
                <h4 className="font-medium text-emerald-900 mb-2 flex items-center gap-2">
                  <AlertTriangle
                    className={`h-5 w-5 ${
                      analysis.risk === "HIGH"
                        ? "text-red-600"
                        : analysis.risk === "MEDIUM"
                        ? "text-yellow-600"
                        : "text-emerald-600"
                    }`}
                  />
                  AI Assessment
                </h4>
                <div className="mb-3">
                  <span className="text-sm text-gray-700 mr-2">Risk:</span>
                  <span
                    className={`text-sm font-semibold px-2 py-1 rounded-full ${
                      analysis.risk === "HIGH"
                        ? "bg-red-100 text-red-700"
                        : analysis.risk === "MEDIUM"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {analysis.risk || "LOW"}
                  </span>
                </div>
                {Array.isArray(analysis.tips) && analysis.tips.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-800 mb-1">
                      Tips for you:
                    </div>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {analysis.tips.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <Button
              onClick={() => {
                setIsCompleted(false);
                setCurrentStep(1);
                setCheckinData({
                  mood: null,
                  energy: null,
                  sleep: null,
                  stress: null,
                  notes: "",
                  activities: [],
                });
                setAnalysis(null);
              }}
            >
              Start New Check-in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Daily/Weekly Check-in
        </h2>
        <p className="text-gray-600">
          Take a moment to reflect on how you're feeling today
        </p>

        {/* Period selector */}
        <div className="mt-4 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Period:</label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="period"
                value="daily"
                checked={period === "daily"}
                onChange={() => setPeriod("daily")}
              />
              Daily
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="period"
                value="weekly"
                checked={period === "weekly"}
                onChange={() => setPeriod("weekly")}
              />
              Weekly
            </label>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Step {currentStep} of 5</span>
            <span>{Math.round((currentStep / 5) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  How are you feeling today?
                </h3>
                <p className="text-gray-600">
                  Select the option that best describes your current mood
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {moodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateCheckinData("mood", option.value)}
                    className={`p-4 rounded-lg border-2 transition-all text-center ${
                      checkinData.mood === option.value
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-3xl mb-2">{option.icon}</div>
                    <div className="text-sm font-medium text-gray-900">
                      {option.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  What's your energy level?
                </h3>
                <p className="text-gray-600">
                  How energetic do you feel right now?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {energyOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateCheckinData("energy", option.value)}
                    className={`p-4 rounded-lg border-2 transition-all text-center ${
                      checkinData.energy === option.value
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className={`mb-2 ${option.color}`}>{option.icon}</div>
                    <div className="text-sm font-medium text-gray-900">
                      {option.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  How did you sleep last night?
                </h3>
                <p className="text-gray-600">
                  Quality sleep is essential for mental wellness
                </p>
              </div>

              <div className="space-y-3">
                {sleepOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateCheckinData("sleep", option.value)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center justify-between ${
                      checkinData.sleep === option.value
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {option.label}
                      </div>
                      <div className="text-sm text-gray-500">
                        {option.hours}
                      </div>
                    </div>
                    <Moon className="h-5 w-5 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  What's your stress level?
                </h3>
                <p className="text-gray-600">
                  Understanding your stress helps us provide better support
                </p>
              </div>

              <div className="space-y-3">
                {stressOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateCheckinData("stress", option.value)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center justify-between ${
                      checkinData.stress === option.value
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-4 h-4 rounded-full ${option.color}`}
                      ></div>
                      <div className="font-medium text-gray-900">
                        {option.label}
                      </div>
                    </div>
                    <AlertTriangle className="h-5 w-5 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  What activities did you do today?
                </h3>
                <p className="text-gray-600">
                  Select all that apply (optional)
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {activityOptions.map((activity) => (
                  <button
                    key={activity}
                    onClick={() => toggleActivity(activity)}
                    className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                      checkinData.activities.includes(activity)
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    {activity}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Additional notes (optional)
                </label>
                <textarea
                  value={checkinData.notes}
                  onChange={(e) => updateCheckinData("notes", e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={3}
                  placeholder="How are you feeling? Any thoughts you'd like to share?"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              Previous
            </Button>

            {currentStep < 5 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={
                  (currentStep === 1 && !checkinData.mood) ||
                  (currentStep === 2 && !checkinData.energy) ||
                  (currentStep === 3 && !checkinData.sleep) ||
                  (currentStep === 4 && !checkinData.stress)
                }
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Next
              </Button>
            ) : (
              <div className="flex flex-col items-end gap-2">
                {submitError && (
                  <div className="text-sm text-red-600">{submitError}</div>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmitting ? "Submitting..." : "Complete Check-in"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const AIChatContent = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "ai",
      content:
        "Hello! I'm your AI counselor. I'm here to listen and support you. How are you feeling today?",
      timestamp: new Date(Date.now() - 5000),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showCrisis, setShowCrisis] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Auto-scroll to bottom when messages change or when typing starts/stops
  useEffect(() => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (_) {}
  }, [messages, isTyping, showCrisis]);

  // Lightweight, on-device risk phrase detection to surface crisis support quickly
  const crisisKeywords = useMemo(
    () => [
      "suicide",
      "kill myself",
      "end my life",
      "hurt myself",
      "self harm",
      "self-harm",
      "cut myself",
      "no reason to live",
      "want to die",
      "not want to live",
      "ending it",
      "take my life",
    ],
    []
  );
  const detectCrisis = (text = "") => {
    const t = String(text).toLowerCase();
    return crisisKeywords.some((k) => t.includes(k));
  };

  const conversationStarters = [
    {
      id: "stress",
      title: "Managing Stress",
      description: "Talk about stress and coping strategies",
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "bg-orange-100 text-orange-700 border-orange-200",
    },
    {
      id: "anxiety",
      title: "Anxiety Support",
      description: "Discuss anxiety and calming techniques",
      icon: <Shield className="h-5 w-5" />,
      color: "bg-blue-100 text-blue-700 border-blue-200",
    },
    {
      id: "mood",
      title: "Mood & Emotions",
      description: "Explore your feelings and emotions",
      icon: <Heart className="h-5 w-5" />,
      color: "bg-pink-100 text-pink-700 border-pink-200",
    },
    {
      id: "sleep",
      title: "Sleep Issues",
      description: "Get help with sleep problems",
      icon: <Moon className="h-5 w-5" />,
      color: "bg-purple-100 text-purple-700 border-purple-200",
    },
    {
      id: "relationships",
      title: "Relationships",
      description: "Talk about social connections",
      icon: <Users className="h-5 w-5" />,
      color: "bg-green-100 text-green-700 border-green-200",
    },
    {
      id: "motivation",
      title: "Motivation & Goals",
      description: "Find motivation and set goals",
      icon: <Target className="h-5 w-5" />,
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
  ];

  const aiResponses = {
    stress: [
      "I understand that stress can feel overwhelming. Can you tell me what's been causing you the most stress lately?",
      "Stress is a natural response, but there are ways to manage it. What situations tend to trigger your stress the most?",
      "Let's work together to identify some coping strategies. What usually helps you feel calmer?",
    ],
    anxiety: [
      "Anxiety can be really challenging to deal with. You're not alone in this. What does anxiety feel like for you?",
      "I'm here to help you through this. Can you describe what triggers your anxiety most often?",
      "Breathing exercises can be very helpful for anxiety. Would you like me to guide you through a simple technique?",
    ],
    mood: [
      "Thank you for sharing how you're feeling. Your emotions are valid and important. What's been on your mind lately?",
      "It's okay to have ups and downs with your mood. Can you tell me more about what you've been experiencing?",
      "I'm here to listen without judgment. What would help you feel supported right now?",
    ],
    sleep: [
      "Sleep issues can really affect how we feel during the day. What's been making it hard for you to sleep?",
      "Good sleep is so important for mental health. Can you tell me about your current sleep routine?",
      "There are several techniques that can help improve sleep. What have you tried so far?",
    ],
    relationships: [
      "Relationships can be both rewarding and challenging. What's been on your mind about your connections with others?",
      "Social support is really important for wellbeing. How are you feeling about your relationships right now?",
      "It's normal to have ups and downs in relationships. What would you like to talk about?",
    ],
    motivation: [
      "Finding motivation can be tough sometimes. What goals or activities used to excite you?",
      "It's okay to feel unmotivated sometimes. What small step could you take today that might help?",
      "Let's think about what gives your life meaning. What matters most to you right now?",
    ],
    general: [
      "I hear you. Can you tell me more about that?",
      "That sounds really difficult. How are you coping with this?",
      "Thank you for sharing that with me. What would be most helpful for you right now?",
      "I'm here to support you. What's been the hardest part about this situation?",
      "Your feelings are completely valid. What do you think might help you feel better?",
    ],
  };

  const sendMessage = async (content, isStarter = false) => {
    if (!content.trim() && !isStarter) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Immediate safety-first handling
    if (detectCrisis(content)) {
      setShowCrisis(true);
      const supportive =
        "I'm really sorry you're going through this. You matter and you deserve support. " +
        "If you're thinking about harming yourself, please consider reaching out right now. " +
        "You can call 988 (in many regions) or text HOME to 741741 for immediate help. " +
        "I'm here to listen—would you like to talk about what's making things feel this hard?";
      const aiMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: supportive,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
      return;
    }

    // Call backend chatbot (Gemini)
    try {
      const history = [...messages, { type: "user", content }].map((m) =>
        m.type === "user" ? `User: ${m.content}` : `Assistant: ${m.content}`
      );
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error("Chatbot failed");
      const data = await res.json();
      const aiMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: data.reply || "I'm here for you. Could you share a bit more?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (e) {
      // Fallback to local canned reply
      const responses =
        selectedTopic && aiResponses[selectedTopic]
          ? aiResponses[selectedTopic]
          : aiResponses.general;
      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];
      const aiMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: randomResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic.id);
    sendMessage(`I'd like to talk about ${topic.title.toLowerCase()}`, true);
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-[70vh] flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Counselor</h2>
        <p className="text-gray-600">
          Get instant, confidential support anytime you need it
        </p>
      </div>

      <div className="flex-1 min-h-0 flex gap-6 flex-col lg:flex-row overscroll-contain">
        {/* Chat Interface */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden overscroll-contain">
          <Card className="flex flex-col h-[80vh] lg:h-[90vh] overflow-hidden overscroll-contain">
            {/* Chat Header */}
            <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-100 p-2 rounded-full">
                  <Bot className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">AI Counselor</CardTitle>
                  <CardDescription className="text-emerald-600">
                    Online • Always here to help
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            {/* Crisis banner (inline, above messages) */}
            {showCrisis && (
              <div className="px-4 pt-4">
                <div className="border border-red-200 bg-red-50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="text-sm text-red-800">
                      You are not alone. If you are in immediate danger or
                      thinking about self-harm, please reach out for help now.
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a
                          href="tel:988"
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 text-red-700 rounded bg-white hover:bg-red-100"
                        >
                          <Phone className="h-4 w-4 mr-1" /> Call 988
                        </a>
                        <a
                          href="sms:741741"
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 text-red-700 rounded bg-white hover:bg-red-100"
                        >
                          <MessageCircle className="h-4 w-4 mr-1" /> Text HOME
                          to 741741
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <CardContent
              ref={messagesContainerRef}
              className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 nice-scroll overscroll-contain touch-pan-y pt-4"
              onWheelCapture={(e) => {
                // Prevent scroll chaining to background
                e.stopPropagation();
              }}
              onTouchMoveCapture={(e) => {
                // Prevent scroll chaining on touch devices
                e.stopPropagation();
              }}
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.type === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === "user"
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.type === "user"
                          ? "text-emerald-100"
                          : "text-gray-500"
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            {/* Message Input */}
            <div className="border-t p-4 flex-shrink-0">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && sendMessage(inputMessage)
                  }
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  aria-label="Type your message to the AI counselor"
                />
                <Button
                  onClick={() => sendMessage(inputMessage)}
                  disabled={!inputMessage.trim() || isTyping}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-6">
          {/* Conversation Starters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Lightbulb className="h-5 w-5 mr-2" />
                Conversation Starters
              </CardTitle>
              <CardDescription>
                Choose a topic to begin discussing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {conversationStarters.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => handleTopicSelect(topic)}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left hover:shadow-sm ${topic.color}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">{topic.icon}</div>
                    <div>
                      <div className="font-medium">{topic.title}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {topic.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Crisis Support */}
      <div className="flex gap-6 items-center mt-4">
        <div className="w-full">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-lg text-red-800 flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                Need Immediate Help?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-red-700">
                If you're having thoughts of self-harm or suicide, please reach
                out for immediate support.
              </p>
              <div className="space-y-2">
                <a
                  href="tel:988"
                  className="inline-flex w-full items-center justify-start text-left px-3 py-2 border rounded-lg text-red-700 border-red-300 hover:bg-red-100 bg-white"
                >
                  <Phone className="h-4 w-4 mr-2" /> Crisis Helpline: 988
                </a>
                <a
                  href="sms:741741"
                  className="inline-flex w-full items-center justify-start text-left px-3 py-2 border rounded-lg text-red-700 border-red-300 hover:bg-red-100 bg-white"
                >
                  <MessageCircle className="h-4 w-4 mr-2" /> Text: HOME to
                  741741
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Counselor Info */}
        <div className="w-full">
          <Card className="bg-emerald-50 border-emerald-200 py-4">
            <CardHeader>
              <CardTitle className="text-lg text-emerald-800 flex items-center">
                <Headphones className="h-5 w-5 mr-2" />
                About AI Counselor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-emerald-700">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                  <p>Available 24/7 for immediate support</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                  <p>Completely confidential and private</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                  <p>Evidence-based therapeutic techniques</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                  <p>Complements but doesn't replace human therapy</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const HumanCounselorContent = ({ user }) => {
  const [activeView, setActiveView] = useState(() => {
    try {
      const url = new URL(window.location.href);
      const v = url.searchParams.get("view");
      const valid = new Set(["browse", "booking", "appointments"]);
      if (v && valid.has(v)) return v;
      const stored = localStorage.getItem("hcActiveView");
      if (stored && valid.has(stored)) return stored;
    } catch (_) {}
    return "browse";
  });
  const [selectedCounselor, setSelectedCounselor] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedSessionType, setSelectedSessionType] = useState("");
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingError, setBookingError] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [filterSpec, setFilterSpec] = useState({
    specialization: "All Specializations",
    language: "All Languages",
  });
  const [loadingCounselors, setLoadingCounselors] = useState(true);
  const [errorCounselors, setErrorCounselors] = useState("");
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [errorAppointments, setErrorAppointments] = useState("");
  const [socketReady, setSocketReady] = useState(false);
  const [imageErrors, setImageErrors] = useState(new Set());

  // Helper function to generate avatar URL
  const generateAvatarUrl = (name, size = 150) => {
    const cleanName = (name || "User").replace(/[^a-zA-Z0-9\s]/g, "").trim();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      cleanName
    )}&background=10b981&color=fff&size=${size}&rounded=true`;
  };

  // Enhanced image URL resolver with fallback and blob URL prevention
  const getImageUrl = (img, name, size = 150) => {
    const imageKey = `${img}-${name}`;

    // If this image has failed before, return avatar directly
    if (imageErrors.has(imageKey)) {
      return generateAvatarUrl(name, size);
    }

    if (!img) return generateAvatarUrl(name, size);

    // Prevent blob URLs which cause ERR_FILE_NOT_FOUND
    if (img.startsWith("blob:")) {
      console.warn(`🚫 Preventing blob URL for ${name}:`, img);
      console.warn(`🔄 Using avatar fallback for ${name}`);
      return generateAvatarUrl(name, size);
    }

    // Google profile images and other HTTP URLs
    if (img.startsWith("http")) return img;

    // Legacy uploaded images (if any exist)
    if (img.startsWith("/uploads/")) return `${SERVER_URL}${img}`;

    // Fallback for any other format
    return generateAvatarUrl(name, size);
  };

  // Handle image load errors
  const handleImageError = (img, name, event) => {
    const imageKey = `${img}-${name}`;
    setImageErrors((prev) => new Set([...prev, imageKey]));
    event.target.src = generateAvatarUrl(name);
  };

  // Preload images to reduce failed requests
  const preloadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => reject(src);
      img.src = src;
    });
  };

  // Enhanced counselor data processing with image validation
  const processcounselorData = async (counselorList) => {
    const processedCounselors = counselorList.map(async (c, idx) => {
      const counselor = {
        id: c.id || c._id || idx + 1,
        name: c.name || "Counselor",
        title: c.title || "Counselor",
        specializations: Array.isArray(c.specializations)
          ? c.specializations
          : ["General"],
        experience: c.experience || "",
        rating: Math.min(Math.max(Number(c.rating) || 4.8, 0), 5),
        reviews: Math.max(Number(c.reviews) || 0, 0),
        image: c.image || c.picture || null, // Use Google profile image from server
        bio: c.bio || "",
        availability: Array.isArray(c.availability) ? c.availability : [],
        languages: Array.isArray(c.languages) ? c.languages : ["English"],
        sessionTypes: Array.isArray(c.sessionTypes)
          ? c.sessionTypes
          : ["Video Call", "Phone Call", "Chat"],
        price: c.price || "₹1200/session",
        prices: c.prices || {},
        currency: c.currency || "INR",
        email: c.email,
        active: c.active !== false,
      };

      // Validate image URL if present
      if (counselor.image) {
        try {
          const imageUrl = getImageUrl(counselor.image, counselor.name, 150);
          await preloadImage(imageUrl);
        } catch {
          // Image failed to load, mark it as errored
          const imageKey = `${counselor.image}-${counselor.name}`;
          setImageErrors((prev) => new Set([...prev, imageKey]));
        }
      }

      return counselor;
    });

    return Promise.all(processedCounselors);
  };

  // Enhanced real-time updates for booking and counselor data
  useEffect(() => {
    if (!user?.googleId || !ENABLE_WS) return;
    const socket = io(SERVER_URL, { withCredentials: true });

    // Join both user room and counselors list room
    socket.emit("join:user", user.googleId);
    socket.emit("join:counselors_list");

    const onConnect = () => setSocketReady(true);
    const onDisconnect = () => setSocketReady(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    const refresh = () => {
      loadAppointments();
    };

    const onPaidPending = (payload) => {
      toast.success("Payment received. Awaiting counselor confirmation.");
      refresh();
    };

    const onConfirmed = (payload) => {
      toast.success("Session confirmed! Join link is ready.");
      try {
        // Notify parent (if configured) about appointment details
        const parentPhone = localStorage.getItem("parentPhone") || "";
        const parentEmail = localStorage.getItem("parentEmail") || "";
        if (parentPhone || parentEmail) {
          const details = {
            userName: user?.name,
            counselorName: payload?.counselorName || selectedCounselor?.name,
            date: payload?.date || selectedDate,
            time: payload?.time || selectedTime,
            type: payload?.sessionType || selectedSessionType,
          };
          fetch(`${SERVER_URL}/api/notify/appointment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              parentPhone: parentPhone || undefined,
              parentEmail: parentEmail || undefined,
              ...details,
            }),
          }).catch(() => {});
        }
      } catch (_) {}
      refresh();
    };

    const onRejected = (payload) => {
      toast.error("Session was not confirmed by counselor");
      refresh();
    };

    // Real-time counselor updates (optimized to prevent loops)
    const onCounselorUpdated = (updatedCounselor) => {
      console.log("🔄 Received counselor update:", updatedCounselor.name);
      console.log("📸 Counselor image URL:", updatedCounselor.image);

      setCounselors((prev) => {
        const updated = prev.map((c) => {
          if (
            c.id === updatedCounselor.id ||
            c.email === updatedCounselor.email
          ) {
            // Only update if data has actually changed
            const hasChanges =
              JSON.stringify(c) !==
              JSON.stringify({ ...c, ...updatedCounselor });
            if (hasChanges) {
              console.log("📸 Updating counselor data:", updatedCounselor.name);
              return { ...c, ...updatedCounselor, updatedAt: new Date() };
            }
            return c;
          }
          return c;
        });
        return updated;
      });

      // Update selected counselor if it's the one being updated
      if (
        selectedCounselor &&
        (selectedCounselor.id === updatedCounselor.id ||
          selectedCounselor.email === updatedCounselor.email)
      ) {
        setSelectedCounselor((prev) => {
          const hasChanges =
            JSON.stringify(prev) !==
            JSON.stringify({ ...prev, ...updatedCounselor });
          if (hasChanges) {
            return { ...prev, ...updatedCounselor };
          }
          return prev;
        });
      }

      // Clear any cached image errors for this counselor
      if (updatedCounselor.image) {
        setImageErrors((prev) => {
          const newSet = new Set(prev);
          // Remove any old error entries for this counselor
          for (const key of newSet) {
            if (key.includes(updatedCounselor.name)) {
              newSet.delete(key);
            }
          }
          return newSet;
        });
      }
    };

    socket.on("booking:paid_pending_counselor", onPaidPending);
    socket.on("booking:confirmed", onConfirmed);
    socket.on("booking:rejected", onRejected);
    socket.on("counselor:updated", onCounselorUpdated);

    return () => {
      try {
        socket.off("booking:paid_pending_counselor", onPaidPending);
        socket.off("booking:confirmed", onConfirmed);
        socket.off("booking:rejected", onRejected);
        socket.off("counselor:updated", onCounselorUpdated);
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.disconnect();
      } catch (_) {}
    };
  }, [user?.googleId]);

  // Persist sub-view into URL/localStorage so refresh stays in panel/sub-panel
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("view", activeView);
      // Also ensure tab is set when in Human Support
      url.searchParams.set("tab", "human-counselor");
      window.history.replaceState(
        {},
        "",
        url.pathname + "?" + url.searchParams.toString() + url.hash
      );
      localStorage.setItem("hcActiveView", activeView);
    } catch (_) {}
  }, [activeView]);

  useEffect(() => {
    const loadCounselors = async () => {
      try {
        setLoadingCounselors(true);
        setErrorCounselors("");

        console.log(
          "Loading counselors from:",
          `${
            import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
          }/api/counselors`
        );

        const res = await fetch(
          `${
            import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
          }/api/counselors`,
          {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Failed to load counselors:", res.status, errorText);
          throw new Error(`Failed to load counselors: ${res.status}`);
        }

        const list = await res.json();
        console.log("Received counselors data:", list);

        if (!Array.isArray(list)) {
          console.warn("Counselors data is not an array:", list);
          throw new Error("Invalid counselors data format");
        }

        // Process counselor data with image validation
        const mapped = await processcounselorData(list);
        const activeCounselors = mapped.filter((c) => c.active);

        console.log("Processed counselors:", activeCounselors);
        setCounselors(activeCounselors);

        if (activeCounselors.length === 0) {
          setErrorCounselors("No active counselors available at the moment");
        }
      } catch (e) {
        console.error("Error loading counselors:", e);
        setErrorCounselors(e?.message || "Unable to load counselors");
        setCounselors([]);
      } finally {
        setLoadingCounselors(false);
      }
    };

    loadCounselors();

    // Set up periodic refresh for real-time data (reduced frequency since we have WebSocket)
    const refreshInterval = setInterval(() => {
      if (!loadingCounselors && !socketReady) {
        // Only auto-refresh if WebSocket is not connected
        console.log("🔄 Auto-refresh (WebSocket offline)");
        loadCounselors();
      }
    }, 60000); // Refresh every 60 seconds, and only when socket is offline

    return () => clearInterval(refreshInterval);
  }, [socketReady]);

  // Derive time slots from counselor availability for the selected date; fallback to defaults
  const derivedTimeSlots = useMemo(() => {
    const fallback = [
      "9:00 AM",
      "10:00 AM",
      "11:00 AM",
      "2:00 PM",
      "3:00 PM",
      "4:00 PM",
      "5:00 PM",
      "6:00 PM",
    ];
    if (!selectedCounselor || !selectedDate) return fallback;
    const avail = Array.isArray(selectedCounselor.availability)
      ? selectedCounselor.availability
      : [];
    if (!avail.length) return fallback;
    // Try formats like "YYYY-MM-DD HH:MM-HH:MM" or "Mon 09:00-12:00" or "2025-09-14 14:00"
    const dayStr = selectedDate; // YYYY-MM-DD
    const weekday = new Date(selectedDate + "T00:00:00").toLocaleDateString(
      undefined,
      { weekday: "short" }
    );
    const slots = new Set();
    for (const entry of avail) {
      const s = String(entry);
      if (s.includes(dayStr) || s.startsWith(weekday)) {
        // Find segments like HH:MM-HH:MM or HH:MM
        const match = s.match(/(\d{1,2}:\d{2})(?:\s*-\s*(\d{1,2}:\d{2}))?/);
        if (match) {
          const start = match[1];
          const end = match[2];
          const toLabel = (h, m) => {
            const d = new Date();
            d.setHours(h, m);
            return d.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            });
          };
          const [sh, sm] = start.split(":").map(Number);
          if (end) {
            const [eh, em] = end.split(":").map(Number);
            // generate every 60 minutes between start and end
            let curH = sh;
            let curM = sm;
            while (curH < eh || (curH === eh && curM <= em)) {
              slots.add(toLabel(curH, curM));
              curH += 1;
            }
          } else {
            slots.add(toLabel(sh, sm));
          }
        }
      }
    }
    const arr = Array.from(slots);
    return arr.length ? arr : fallback;
  }, [selectedCounselor, selectedDate]);

  // Enhanced appointment loading with real-time updates
  const loadAppointments = async () => {
    if (!user?.googleId) return;
    try {
      setLoadingAppointments(true);
      setErrorAppointments("");

      console.log("Loading appointments for user:", user.googleId);

      const res = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
        }/api/bookings?googleId=${encodeURIComponent(user.googleId)}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (res.ok) {
        const items = await res.json();
        console.log("Received appointments:", items);

        const mapped = (Array.isArray(items) ? items : []).map((b) => {
          // Enhanced appointment mapping with validation
          const appointment = {
            id: b._id || b.id,
            counselor: b.counselorName || "Unknown Counselor",
            date: b.date,
            time: b.time,
            status: (() => {
              const s = String(b.status || "").toLowerCase();
              return s === "completed" ? "completed" : "upcoming";
            })(),
            type: (() => {
              const sessionType = (b.sessionType || "").toLowerCase();
              if (sessionType.includes("chat")) return "Chat";
              if (sessionType.includes("call")) return "Phone Call";
              return "Video Call";
            })(),
            joinUrl: b.joinUrl,
            specialization: b.specialization || "General",
            createdAt: b.createdAt,
            updatedAt: b.updatedAt,
          };

          // Validate appointment data
          if (!appointment.date || !appointment.time) {
            console.warn("Invalid appointment data:", b);
          }

          return appointment;
        });

        // Sort appointments by date and time
        mapped.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
          const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
          return dateB.getTime() - dateA.getTime();
        });

        console.log("Processed appointments:", mapped);
        setAppointments(mapped);
      } else {
        const errorText = await res.text();
        console.error("Failed to load appointments:", res.status, errorText);
        setErrorAppointments(`Failed to load appointments: ${res.status}`);
      }
    } catch (e) {
      console.error("Error loading appointments:", e);
      setErrorAppointments(e?.message || "Failed to load appointments");
    } finally {
      setLoadingAppointments(false);
    }
  };

  // Load appointments on mount and set up refresh
  useEffect(() => {
    loadAppointments();

    // Set up periodic refresh for real-time updates
    const refreshInterval = setInterval(() => {
      if (!loadingAppointments) {
        loadAppointments();
      }
    }, 15000); // Refresh every 15 seconds

    return () => clearInterval(refreshInterval);
  }, [user?.googleId]);

  // Real-time: subscribe to booking confirmations for this user (StrictMode-safe)
  const userSocketRef = useRef(null);
  useEffect(() => {
    if (!user?.googleId || !ENABLE_WS) return;
    if (userSocketRef.current) return;
    const socket = io(SERVER_URL, {
      transports: ["websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    userSocketRef.current = socket;
    socket.emit("join:user", user.googleId);
    socket.on("booking:confirmed", (b) => {
      try {
        toast.success("Your session has been confirmed");
      } catch (_) {}
      setAppointments((prev) => {
        const item = {
          id: b.id,
          counselor: b.counselorName,
          date: b.date,
          time: b.time,
          status: "upcoming",
          type:
            b.sessionType === "chat"
              ? "Chat"
              : b.sessionType === "call"
              ? "Phone Call"
              : "Video Call",
          joinUrl: b.joinUrl,
          specialization: "General",
        };
        const idx = prev.findIndex((p) => p.id === item.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], ...item };
          return copy;
        }
        return [item, ...prev];
      });
      setActiveView("appointments");
    });
    socket.on("booking:join_request", async (payload) => {
      try {
        toast.success("Your counselor invited you to join the session");
        const id = payload?.id;
        if (!id) return;
        // Auto-accept join to streamline UX
        const res = await fetch(`${SERVER_URL}/api/bookings/${encodeURIComponent(id)}/accept-join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({})
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const joinUrl = data?.joinUrl || payload?.joinUrl;
          if (joinUrl) {
            window.open(joinUrl, '_blank');
          }
          // Ensure appointment status refresh
          loadAppointments();
          setActiveView('appointments');
        }
      } catch (_) {}
    });
    socket.on("appointment:updated", async (u) => {
      if (!u?.id) return;
      const isCompleted = String(u.status || "").toLowerCase() === "completed";
      const mappedStatus = isCompleted ? "completed" : "upcoming";
      setAppointments((prev) => prev.map((a) => a.id === u.id ? { ...a, status: mappedStatus } : a));
      try {
        if (isCompleted) {
          // Lightweight feedback prompt
          const want = window.confirm("Session completed. Would you like to give a quick rating?");
          if (want) {
            let ratingStr = window.prompt("Rate your session (1-5):", "5");
            if (ratingStr != null) {
              const rating = Math.max(1, Math.min(5, parseInt(ratingStr, 10) || 5));
              const comment = window.prompt("Any feedback? (optional)", "");
              try {
                const res = await fetch(`/api/bookings/${encodeURIComponent(u.id)}/feedback`, {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                  body: JSON.stringify({ rating, comment })
                });
                if (res.ok) {
                  toast.success("Thanks for your feedback!");
                }
              } catch (_) {}
            }
          }
        }
      } catch (_) {}
    });
    return () => {
      try {
        if (userSocketRef.current) {
          userSocketRef.current.off("booking:confirmed");
          userSocketRef.current.off("booking:join_request");
          userSocketRef.current.off("appointment:updated");
          userSocketRef.current.disconnect();
          userSocketRef.current = null;
        }
      } catch (_) {}
    };
  }, [user?.googleId]);

  // After Stripe success, refresh bookings
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("payment") === "success") {
      toast.success("Payment successful. Awaiting counselor confirmation.");
      url.searchParams.delete("payment");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      // reload bookings
      (async () => {
        try {
          const res = await fetch(
            `${
              import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
            }/api/bookings?googleId=${encodeURIComponent(user.googleId)}`
          );
          if (res.ok) {
            const items = await res.json();
            const mapped = items.map((b) => ({
              id: b._id,
              counselor: b.counselorName,
              date: b.date,
              time: b.time,
              status: (() => {
                const s = String(b.status || "").toLowerCase();
                return s === "completed" ? "completed" : "upcoming";
              })(),
              type:
                b.sessionType === "chat"
                  ? "Chat"
                  : b.sessionType === "call"
                  ? "Phone Call"
                  : "Video Call",
              specialization:
                selectedCounselor?.specializations?.[0] || "General",
            }));
            setAppointments(mapped);
            setActiveView("appointments");
          }
        } catch (_) {}
      })();
    }
  }, [user?.googleId]);

  const handleBookAppointment = async () => {
    try {
      setBookingError("");
      setIsBooking(true);

      // Comprehensive validation
      if (!user?.googleId) {
        throw new Error("Please sign in first");
      }

      if (!selectedCounselor) {
        throw new Error("Please select a counselor");
      }

      if (!selectedDate) {
        throw new Error("Please select a date");
      }

      if (!selectedTime) {
        throw new Error("Please select a time");
      }

      if (!selectedSessionType) {
        throw new Error("Please select a session type");
      }

      // Validate counselor has required information
      if (!selectedCounselor.email) {
        throw new Error(
          "Counselor information is incomplete. Please try another counselor."
        );
      }

      // Validate date is not in the past
      const selectedDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const now = new Date();
      if (selectedDateTime <= now) {
        throw new Error("Please select a future date and time");
      }

      // Determine session type to book
      const mapType = (t) => {
        const v = String(t || "").toLowerCase();
        if (v.includes("chat")) return "chat";
        if (v.includes("phone") || v.includes("call")) return "call";
        if (v.includes("video")) return "video";
        return "video";
      };

      const sessionType = mapType(selectedSessionType);

      // Validate session type is supported by counselor
      if (
        !selectedCounselor.sessionTypes.some(
          (type) => mapType(type) === sessionType
        )
      ) {
        throw new Error(
          "Selected session type is not available for this counselor"
        );
      }

      console.log("Creating booking with data:", {
        googleId: user.googleId,
        counselorName: selectedCounselor.name,
        counselorEmail: selectedCounselor.email,
        sessionType,
        date: selectedDate,
        time: selectedTime,
      });

      const payload = {
        googleId: user.googleId,
        counselorName: selectedCounselor.name,
        counselorEmail: selectedCounselor.email,
        sessionType,
        date: selectedDate,
        time: selectedTime,
        notes: "",
        successUrl: `${window.location.origin}/dashboard?payment=success&tab=human-counselor&view=appointments`,
        cancelUrl: `${window.location.origin}/dashboard?payment=cancel&tab=human-counselor`,
      };

      const res = await fetch("/api/payments/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Payment creation failed:", res.status, errorData);
        throw new Error(
          errorData.error || `Failed to start payment: ${res.status}`
        );
      }

      const data = await res.json();
      console.log("Payment session created:", data);

      if (!data?.url) {
        throw new Error("Payment session not created. Please try again.");
      }

      // Store booking details for success page
      sessionStorage.setItem(
        "pendingBooking",
        JSON.stringify({
          counselor: selectedCounselor.name,
          date: selectedDate,
          time: selectedTime,
          type: selectedSessionType,
        })
      );

      // Show success message before redirect
      toast.success("Redirecting to payment...");

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (e) {
      console.error("Booking error:", e);
      const errorMessage = e.message || "Booking failed. Please try again.";
      setBookingError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsBooking(false);
    }
  };

  const renderBrowseCounselors = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-responsive header */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg md:text-xl font-semibold text-gray-900">
            Available Counselors
          </h3>
          <p className="text-sm md:text-base text-gray-600">
            Choose from our licensed mental health professionals
          </p>
        </div>

        {/* Mobile-responsive filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
          <select
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
            value={filterSpec.specialization}
            onChange={(e) =>
              setFilterSpec((p) => ({ ...p, specialization: e.target.value }))
            }
          >
            <option>All Specializations</option>
            <option>Anxiety</option>
            <option>Depression</option>
            <option>Trauma</option>
            <option>Relationships</option>
            <option>Stress Management</option>
            <option>Family Counseling</option>
          </select>
          <select
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
            value={filterSpec.language}
            onChange={(e) =>
              setFilterSpec((p) => ({ ...p, language: e.target.value }))
            }
          >
            <option>All Languages</option>
            <option>English</option>
            <option>Hindi</option>
            <option>Marathi</option>
            <option>Bengali</option>
            <option>Tamil</option>
          </select>
        </div>
      </div>

      {/* Mobile-responsive status indicator */}
      <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full border text-xs ${
            socketReady
              ? "border-emerald-300 text-emerald-700 bg-emerald-50"
              : "border-gray-300 text-gray-600 bg-gray-50"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full mr-1.5 ${
              socketReady ? "bg-emerald-500" : "bg-gray-400"
            }`}
          />
          <span className="hidden sm:inline">
            {socketReady ? "Live updates connected" : "Connecting..."}
          </span>
          <span className="sm:hidden">{socketReady ? "Live" : "Offline"}</span>
        </span>

        {counselors.length > 0 && (
          <span className="text-gray-500 text-xs">
            {counselors.length} counselor{counselors.length !== 1 ? "s" : ""}{" "}
            available
          </span>
        )}
      </div>

      {/* Mobile-responsive loading states */}
      {loadingCounselors && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse border rounded-lg p-4 md:p-6 shadow-md"
            >
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 rounded-full w-16" />
                  <div className="h-6 bg-gray-200 rounded-full w-20" />
                </div>
                <div className="h-8 bg-gray-200 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      )}
      {!!errorCounselors && !loadingCounselors && (
        <div className="border border-red-200 bg-red-50 text-red-700 text-sm rounded-lg p-3">
          {errorCounselors}
        </div>
      )}
      {!loadingCounselors && !errorCounselors && counselors.length === 0 && (
        <div className="border border-gray-200 bg-white rounded-lg p-6 text-center text-gray-600">
          No counselors available right now. Please try again later.
        </div>
      )}

      {(() => {
        const visible = counselors.filter((c) => {
          const bySpec =
            filterSpec.specialization === "All Specializations" ||
            (c.specializations || []).some(
              (s) =>
                String(s).toLowerCase() ===
                String(filterSpec.specialization).toLowerCase()
            );
          const byLang =
            filterSpec.language === "All Languages" ||
            (c.languages || []).some(
              (l) =>
                String(l).toLowerCase() ===
                String(filterSpec.language).toLowerCase()
            );
          return bySpec && byLang;
        });
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {visible.map((counselor) => {
              // Use the enhanced image URL resolver

              return (
                <Card
                  key={counselor.id}
                  className="hover:shadow-lg transition-all duration-200 border-0 shadow-md"
                >
                  <CardContent className="p-4 md:p-6">
                    {/* Mobile-optimized layout */}
                    <div className="space-y-4">
                      {/* Header with image and basic info */}
                      <div className="flex items-start space-x-3 md:space-x-4">
                        <div className="relative flex-shrink-0">
                          <img
                            src={getImageUrl(
                              counselor.image,
                              counselor.name,
                              150
                            )}
                            alt={counselor.name}
                            className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-emerald-100 transition-all duration-300"
                            onError={(e) =>
                              handleImageError(
                                counselor.image,
                                counselor.name,
                                e
                              )
                            }
                            onLoad={() => {
                              // Clear any error state for this image when it loads successfully
                              const imageKey = `${counselor.image}-${counselor.name}`;
                              setImageErrors((prev) => {
                                const newSet = new Set(prev);
                                newSet.delete(imageKey);
                                return newSet;
                              });
                            }}
                          />
                          {/* Online status indicator */}
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                          {/* Real-time update indicator */}
                          {counselor.updatedAt &&
                            new Date() - new Date(counselor.updatedAt) <
                              30000 && (
                              <div
                                className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full animate-pulse"
                                title="Recently updated"
                              ></div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                                {counselor.name}
                              </h4>
                              <p className="text-xs md:text-sm text-gray-600 truncate">
                                {counselor.title}
                              </p>
                            </div>

                            <div className="flex-shrink-0">
                              <div className="flex items-center space-x-1 mb-1">
                                <span className="text-yellow-400 text-sm">
                                  ★
                                </span>
                                <span className="text-xs md:text-sm font-medium">
                                  {counselor.rating}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({counselor.reviews})
                                </span>
                              </div>
                              <p className="text-xs md:text-sm font-semibold text-emerald-600">
                                {counselor.price}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Specializations */}
                      <div className="flex flex-wrap gap-1">
                        {(counselor.specializations || [])
                          .slice(0, 3)
                          .map((spec, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full"
                            >
                              {spec}
                            </span>
                          ))}
                        {counselor.specializations?.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{counselor.specializations.length - 3}
                          </span>
                        )}
                      </div>

                      {/* Bio - mobile optimized */}
                      <p className="text-xs md:text-sm text-gray-600 line-clamp-2 leading-relaxed">
                        {counselor.bio ||
                          "Experienced mental health professional dedicated to helping you achieve your wellness goals."}
                      </p>

                      {/* Languages and session types */}
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Languages:</span>
                          <span>
                            {(counselor.languages || []).slice(0, 2).join(", ")}
                          </span>
                          {counselor.languages?.length > 2 && (
                            <span>+{counselor.languages.length - 2}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Available:</span>
                          <span>
                            {(counselor.sessionTypes || []).length} session
                            types
                          </span>
                        </div>
                      </div>

                      {/* Action button */}
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedCounselor(counselor);
                          setSelectedSessionType("");
                          setSelectedDate("");
                          setSelectedTime("");
                          setBookingStep(1);
                          setActiveView("booking");
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-sm py-2"
                      >
                        Book Session
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      })()}
    </div>
  );

  const renderBookingFlow = () => (
    <div className="max-w-2xl mx-auto px-4 sm:px-0">
      <div className="mb-4 md:mb-6">
        <Button
          variant="ghost"
          onClick={() => setActiveView("browse")}
          className="mb-3 md:mb-4 text-sm"
          size="sm"
        >
          ← Back to Counselors
        </Button>
        <h3 className="text-lg md:text-xl font-semibold text-gray-900">
          Book Session with {selectedCounselor?.name}
        </h3>
        <p className="text-sm md:text-base text-gray-600">
          Schedule your appointment
        </p>
      </div>

      <Card className="shadow-lg border-0">
        <CardContent className="p-4 md:p-6">
          {bookingStep === 1 && (
            <div className="space-y-4 md:space-y-6">
              {/* Mobile-optimized counselor info */}
              <div className="text-center">
                <div className="relative inline-block">
                  <img
                    src={getImageUrl(
                      selectedCounselor?.image,
                      selectedCounselor?.name,
                      150
                    )}
                    alt={selectedCounselor?.name}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full mx-auto mb-3 md:mb-4 object-cover border-2 border-emerald-100"
                    onError={(e) =>
                      handleImageError(
                        selectedCounselor?.image,
                        selectedCounselor?.name,
                        e
                      )
                    }
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <h4 className="font-semibold text-gray-900 text-base md:text-lg">
                  {selectedCounselor?.name}
                </h4>
                <p className="text-sm text-gray-600">
                  {selectedCounselor?.title}
                </p>
                <div className="flex justify-center items-center space-x-2 mt-2">
                  <span className="text-yellow-400">★</span>
                  <span className="text-sm">{selectedCounselor?.rating}</span>
                  <span className="text-xs text-gray-500">
                    ({selectedCounselor?.reviews} reviews)
                  </span>
                </div>
              </div>

              {/* Mobile-responsive session type selection */}
              <div>
                <h5 className="font-medium text-gray-900 mb-3 text-sm md:text-base">
                  Select Session Type
                </h5>
                <div className="grid grid-cols-1 gap-3">
                  {selectedCounselor?.sessionTypes.map((type) => {
                    const getTypeIcon = (sessionType) => {
                      const t = sessionType.toLowerCase();
                      if (t.includes("video")) return "📹";
                      if (t.includes("phone") || t.includes("call"))
                        return "📞";
                      if (t.includes("chat")) return "💬";
                      return "📹";
                    };

                    const getTypeDescription = (sessionType) => {
                      const t = sessionType.toLowerCase();
                      if (t.includes("video"))
                        return "Face-to-face video session";
                      if (t.includes("phone") || t.includes("call"))
                        return "Voice-only phone call";
                      if (t.includes("chat")) return "Text-based messaging";
                      return "Professional counseling session";
                    };

                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedSessionType(type)}
                        className={`p-3 md:p-4 border-2 rounded-lg transition-all duration-200 text-left ${
                          selectedSessionType === type
                            ? "border-emerald-500 bg-emerald-50 shadow-md"
                            : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-25"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{getTypeIcon(type)}</span>
                          <div className="flex-1">
                            <div className="text-sm md:text-base font-medium text-gray-900">
                              {type}
                            </div>
                            <div className="text-xs md:text-sm text-gray-600">
                              {getTypeDescription(type)}
                            </div>
                          </div>
                          {selectedSessionType === type && (
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile-responsive date selection */}
              <div>
                <h5 className="font-medium text-gray-900 mb-3 text-sm md:text-base">
                  Select Date
                </h5>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  max={
                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0]
                  } // 30 days from now
                  className="w-full p-3 md:p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm md:text-base"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Available for booking up to 30 days in advance
                </p>
              </div>

              <div className="space-y-3">
                {/* Validation feedback */}
                {(!selectedSessionType || !selectedDate) && (
                  <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        {!selectedSessionType && !selectedDate
                          ? "Please select session type and date to continue"
                          : !selectedSessionType
                          ? "Please select a session type"
                          : "Please select a date"}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => setBookingStep(2)}
                  disabled={!selectedDate || !selectedSessionType}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>Continue to Time Selection</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Button>
              </div>
            </div>
          )}

          {bookingStep === 2 && (
            <div className="space-y-4 md:space-y-6">
              {/* Mobile-responsive time selection */}
              <div>
                <h5 className="font-medium text-gray-900 mb-3 text-sm md:text-base">
                  Select Time
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                  {derivedTimeSlots.map((time) => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-2 md:p-3 border-2 rounded-lg transition-all duration-200 text-sm md:text-base font-medium ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md"
                            : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-25 text-gray-700"
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span>{time}</span>
                          {isSelected && (
                            <CheckCircle className="h-4 w-4 text-emerald-600 mt-1" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {derivedTimeSlots.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">
                      No available time slots for this date
                    </p>
                    <p className="text-xs mt-1">
                      Please select a different date
                    </p>
                  </div>
                )}
              </div>

              {/* Mobile-responsive booking summary */}
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-4 md:p-6 rounded-lg border border-emerald-100">
                <h5 className="font-medium text-gray-900 mb-3 text-sm md:text-base flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-emerald-600" />
                  Booking Summary
                </h5>
                <div className="space-y-2 md:space-y-3">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs md:text-sm text-gray-600">
                      Counselor:
                    </span>
                    <span className="text-xs md:text-sm font-medium text-gray-900">
                      {selectedCounselor?.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs md:text-sm text-gray-600">
                      Date:
                    </span>
                    <span className="text-xs md:text-sm font-medium text-gray-900">
                      {selectedDate
                        ? new Date(selectedDate).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs md:text-sm text-gray-600">
                      Time:
                    </span>
                    <span className="text-xs md:text-sm font-medium text-gray-900">
                      {selectedTime || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs md:text-sm text-gray-600">
                      Session Type:
                    </span>
                    <span className="text-xs md:text-sm font-medium text-gray-900">
                      {selectedSessionType || "—"}
                    </span>
                  </div>
                  <div className="border-t border-emerald-200 pt-2 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm md:text-base font-medium text-gray-900">
                        Total Price:
                      </span>
                      <span className="text-sm md:text-base font-bold text-emerald-600">
                        {(() => {
                          if (!selectedCounselor) return "—";
                          const symbol =
                            selectedCounselor.currency === "INR" ? "₹" : "";
                          const mapType = (t) => {
                            const v = String(t || "").toLowerCase();
                            if (v.includes("chat")) return "chat";
                            if (v.includes("phone")) return "call";
                            if (v.includes("video")) return "video";
                            return "video";
                          };
                          const key = mapType(selectedSessionType);
                          const amount =
                            selectedCounselor.prices?.[key] ||
                            Number(
                              String(selectedCounselor.price).replace(
                                /[^0-9.]/g,
                                ""
                              )
                            ) ||
                            0;
                          return amount
                            ? `${symbol}${amount}`
                            : selectedCounselor.price;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile-responsive action buttons */}
              <div className="space-y-3">
                {bookingError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-700">{bookingError}</div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setBookingStep(1)}
                    className="w-full sm:w-auto order-2 sm:order-1"
                    disabled={isBooking}
                  >
                    ← Back
                  </Button>

                  <Button
                    onClick={handleBookAppointment}
                    disabled={!selectedTime || isBooking}
                    className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed order-1 sm:order-2"
                  >
                    {isBooking ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <span>Confirm & Pay</span>
                        <ExternalLink className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderAppointments = () => (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h3 className="text-lg md:text-xl font-semibold text-gray-900">
          My Appointments
        </h3>
        <p className="text-sm md:text-base text-gray-600">
          Manage your counseling sessions
        </p>
      </div>

      {/* Loading / Error / Empty states */}
      {loadingAppointments && (
        <div className="border border-gray-200 rounded-lg p-6 bg-white">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      )}
      {!!errorAppointments && !loadingAppointments && (
        <div className="border border-red-200 bg-red-50 text-red-700 text-sm rounded-lg p-3">
          {errorAppointments}
        </div>
      )}
      {!loadingAppointments &&
        !errorAppointments &&
        appointments.length === 0 && (
          <div className="border border-gray-200 rounded-lg p-6 bg-white text-gray-600">
            You don't have any appointments yet. Book a session from the Browse
            tab.
          </div>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Upcoming Appointments - Mobile Responsive */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-emerald-600" />
              Upcoming Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:space-y-4">
              {appointments
                .filter((apt) => apt.status === "upcoming")
                .map((appointment) => {
                  const appointmentDate = new Date(
                    `${appointment.date}T${appointment.time || "09:00"}`
                  );
                  const isToday =
                    appointmentDate.toDateString() ===
                    new Date().toDateString();
                  const isSoon =
                    appointmentDate.getTime() - Date.now() < 60 * 60 * 1000; // Within 1 hour

                  return (
                    <div
                      key={appointment.id}
                      className={`border-2 rounded-lg p-3 md:p-4 transition-all ${
                        isToday
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-gray-900 text-sm md:text-base truncate">
                            {appointment.counselor}
                          </h4>
                          <p className="text-xs md:text-sm text-gray-600">
                            {appointment.specialization}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSoon && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                              Starting Soon
                            </span>
                          )}
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            {appointment.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs md:text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>{appointment.date}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{appointment.time}</span>
                        </div>
                        <div className="flex items-center">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          <span>{appointment.type}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:flex-1 text-xs md:text-sm"
                        >
                          Reschedule
                        </Button>
                        <Button
                          size="sm"
                          className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs md:text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                          disabled={
                            !appointment.joinUrl ||
                            appointment.status !== "upcoming"
                          }
                          onClick={() => {
                            if (appointment.joinUrl) {
                              console.log(
                                "Joining session:",
                                appointment.joinUrl
                              );

                              // Validate URL before opening
                              try {
                                const url = new URL(appointment.joinUrl);
                                if (
                                  url.protocol === "http:" ||
                                  url.protocol === "https:"
                                ) {
                                  window.open(
                                    appointment.joinUrl,
                                    "_blank",
                                    "noopener,noreferrer,width=1200,height=800"
                                  );

                                  // Show success message
                                  toast.success(
                                    "Opening session in new window..."
                                  );
                                } else {
                                  throw new Error("Invalid URL protocol");
                                }
                              } catch (error) {
                                console.error("Invalid session URL:", error);
                                toast.error(
                                  "Invalid session link. Please contact support."
                                );
                              }
                            } else {
                              toast.info(
                                "Session link not yet available. Please wait for counselor confirmation."
                              );
                            }
                          }}
                        >
                          {appointment.joinUrl ? (
                            <div className="flex items-center justify-center space-x-1">
                              <ExternalLink className="h-3 w-3" />
                              <span>Join Session</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>Awaiting Link</span>
                            </div>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}

              {appointments.filter((apt) => apt.status === "upcoming")
                .length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No upcoming sessions</p>
                  <p className="text-xs mt-1">Book a session to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Past Appointments - Mobile Responsive */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center">
              <Clock className="h-5 w-5 mr-2 text-gray-600" />
              Session History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:space-y-4">
              {appointments
                .filter((apt) => apt.status === "completed")
                .map((appointment) => (
                  <div
                    key={appointment.id}
                    className="border border-gray-200 rounded-lg p-3 md:p-4 bg-gray-50"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 text-sm md:text-base truncate">
                          {appointment.counselor}
                        </h4>
                        <p className="text-xs md:text-sm text-gray-600">
                          {appointment.specialization}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full self-start">
                        {appointment.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs md:text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{appointment.date}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{appointment.time}</span>
                      </div>
                      <div className="flex items-center">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        <span>{appointment.type}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:flex-1 text-xs md:text-sm"
                      >
                        View Notes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:flex-1 text-xs md:text-sm"
                        onClick={() => {
                          // Pre-fill booking with same counselor
                          const counselor = counselors.find(
                            (c) => c.name === appointment.counselor
                          );
                          if (counselor) {
                            setSelectedCounselor(counselor);
                            setSelectedSessionType("");
                            setSelectedDate("");
                            setSelectedTime("");
                            setBookingStep(1);
                            setActiveView("booking");
                          }
                        }}
                      >
                        Book Again
                      </Button>
                    </div>
                  </div>
                ))}

              {appointments.filter((apt) => apt.status === "completed")
                .length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No completed sessions yet</p>
                  <p className="text-xs mt-1">
                    Your session history will appear here
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-responsive header */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Human Counselor Support
          </h2>
          <p className="text-sm md:text-base text-gray-600">
            Connect with licensed mental health professionals
          </p>
        </div>

        {/* Mobile-responsive navigation tabs */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant={activeView === "browse" ? "default" : "outline"}
            onClick={() => setActiveView("browse")}
            className={`w-full sm:w-auto text-sm md:text-base ${
              activeView === "browse"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : ""
            }`}
            size="sm"
          >
            <Users className="h-4 w-4 mr-2" />
            Browse Counselors
          </Button>
          <Button
            variant={activeView === "appointments" ? "default" : "outline"}
            onClick={() => setActiveView("appointments")}
            className={`w-full sm:w-auto text-sm md:text-base ${
              activeView === "appointments"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : ""
            }`}
            size="sm"
          >
            <Calendar className="h-4 w-4 mr-2" />
            My Appointments
            {appointments.filter((apt) => apt.status === "upcoming").length >
              0 && (
              <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                {appointments.filter((apt) => apt.status === "upcoming").length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {activeView === "browse" && renderBrowseCounselors()}
      {activeView === "booking" && renderBookingFlow()}
      {activeView === "appointments" && renderAppointments()}
    </div>
  );
};

const ResourcesContent = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [copiedUrl, setCopiedUrl] = useState("");
  const [sortBy, setSortBy] = useState("relevance"); // relevance | category | alpha
  const [socketConnected, setSocketConnected] = useState(false);

  const categories = ["all", "articles", "hotlines", "tools", "videos"];

  // Safe curated fallback
  const fallback = [
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

  // Fetch helper and initial load
  const fetchResources = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${SERVER_URL}/api/resources`);
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : fallback);
      } else {
        setItems(fallback);
        setError("Live feed unavailable. Showing curated resources.");
      }
    } catch (e) {
      setItems(fallback);
      setError("Live feed unavailable. Showing curated resources.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  // Real-time updates via websocket (optional support from server)
  useEffect(() => {
    if (!ENABLE_WS) return;
    let socket;
    try {
      socket = io(SERVER_URL, {
        transports: ["websocket"],
        withCredentials: true,
        reconnectionAttempts: 2,
        timeout: 3000,
      });
      socket.on("connect", () => setSocketConnected(true));
      socket.on("disconnect", () => setSocketConnected(false));
      socket.on("resources:update", (payload) => {
        if (Array.isArray(payload)) setItems(payload);
      });
      socket.on("connect_error", () => {
        // Suppress noisy errors and rely on fallback list
      });
      socket.on("error", () => {});
    } catch (_) {}
    return () => {
      try {
        socket && socket.disconnect();
      } catch (_) {}
    };
  }, []);

  const normalized = (s = "") => String(s).toLowerCase();
  const filtered = items.filter((it) => {
    const byCat = category === "all" || normalized(it.category) === category;
    const q = normalized(query);
    const byQuery =
      !q ||
      normalized(
        `${it.title} ${it.description} ${(it.tags || []).join(" ")}`
      ).includes(q);
    return byCat && byQuery;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    const na = normalized(a.title);
    const nb = normalized(b.title);
    if (sortBy === "alpha") return na.localeCompare(nb);
    if (sortBy === "category")
      return normalized(a.category).localeCompare(normalized(b.category));
    // relevance: simple heuristic puts query matches earlier
    const q = normalized(query);
    if (!q) return 0;
    const score = (it) =>
      normalized(
        `${it.title} ${it.description} ${(it.tags || []).join(" ")}`
      ).indexOf(q);
    const sa = score(a) === -1 ? Infinity : score(a);
    const sb = score(b) === -1 ? Infinity : score(b);
    return sa - sb;
  });

  const getFavicon = (url = "") => {
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?sz=64&domain=${u.hostname}`;
    } catch (_) {
      return "/favicon.ico";
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-gray-900">
            Wellness Resources
          </h2>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full border text-sm ${
                socketConnected
                  ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                  : "border-gray-300 text-gray-600 bg-gray-50"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full mr-2 ${
                  socketConnected ? "bg-emerald-500" : "bg-gray-400"
                }`}
              />
              {socketConnected ? "Live" : "Offline"}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchResources}
              className="border-gray-300"
            >
              Refresh
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded-full text-sm border transition ${
                category === c
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {c[0].toUpperCase() + c.slice(1)}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 text-sm"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="alpha">Sort: A–Z</option>
              <option value="category">Sort: Category</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-5 w-40 bg-gray-200 rounded mb-3 animate-pulse" />
                <div className="h-4 w-full bg-gray-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((it, idx) => (
            <Card key={idx} className="h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <img
                    src={getFavicon(it.url)}
                    alt=""
                    className="w-5 h-5 rounded"
                  />
                  <span>{it.title}</span>
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {it.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                  <span className="capitalize">
                    {normalized(it.category) || "general"}
                  </span>
                  <span className="text-emerald-700">
                    {it.available || "Always"}
                  </span>
                </div>
                {Array.isArray(it.tags) && it.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {it.tags.slice(0, 4).map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs border"
                      >
                        #{t}
                      </span>
                    ))}
                    {it.tags.length > 4 && (
                      <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full text-xs border">
                        +{it.tags.length - 4} more
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.open(it.url, "_blank", "noopener,noreferrer")
                    }
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" /> Visit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(it.url);
                      setCopiedUrl(it.url);
                      setTimeout(() => setCopiedUrl(""), 1500);
                    }}
                  >
                    {copiedUrl === it.url ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-gray-600">
              No resources match your filters.
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3">
          {error}
        </div>
      )}
    </div>
  );
};

const EmergencyContent = () => {
  const [copiedNumber, setCopiedNumber] = useState("");

  // Configurable helplines via env (set in client/.env)
  const EMERGENCY_CALL =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_EMERGENCY_CALL) ||
    "112"; // India unified emergency; adjust per region
  const CRISIS_CALL =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_CRISIS_CALL) ||
    "988"; // Suicide & Crisis Lifeline (US). Replace via env for region
  const CRISIS_TEXT =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_CRISIS_TEXT) ||
    "741741"; // Crisis Text Line (US). Replace via env for region
  const DV_CALL =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_DV_CALL) ||
    ""; // Domestic violence hotline (optional)

  // Optional second local support (e.g., city crisis center)
  const LOCAL_SUPPORT_NAME =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_LOCAL_SUPPORT_NAME) ||
    "";
  const LOCAL_SUPPORT_NUMBER =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_LOCAL_SUPPORT_NUMBER) ||
    "";
  const LOCAL_SUPPORT_DESC =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_LOCAL_SUPPORT_DESC) ||
    "";

  const emergencyContacts = [
    {
      name: "Suicide & Crisis Helpline",
      number: CRISIS_CALL,
      description: "24/7 confidential support. You matter.",
      type: "call",
      priority: "high",
    },
    {
      name: "Crisis Text Line",
      number: CRISIS_TEXT,
      description: "Text HOME for immediate text-based support",
      type: "text",
      priority: "high",
    },
  ].concat(
    DV_CALL
      ? [
          {
            name: "Domestic Violence Helpline",
            number: DV_CALL,
            description: "24/7 support for domestic violence situations",
            type: "call",
            priority: "high",
          },
        ]
      : []
  );

  // Local resources: only include configured numbers, avoid placeholders
  const localResources = [
    {
      name: "Local Emergency Services",
      number: EMERGENCY_CALL,
      description: "Immediate emergency medical/police response",
      type: "call",
      priority: "critical",
    },
    LOCAL_SUPPORT_NAME && LOCAL_SUPPORT_NUMBER
      ? {
          name: LOCAL_SUPPORT_NAME,
          number: LOCAL_SUPPORT_NUMBER,
          description:
            LOCAL_SUPPORT_DESC || "Community mental health crisis intervention",
          type: "call",
          priority: "high",
        }
      : null,
  ].filter((r) => Boolean(r && r.number));

  const onlineResources = [
    {
      name: "Crisis Chat",
      url: "https://suicidepreventionlifeline.org/chat/",
      description: "Online chat with crisis counselors",
      available: "24/7",
    },
    {
      name: "NAMI Support",
      url: "https://nami.org/help",
      description: "National Alliance on Mental Illness resources",
      available: "Always",
    },
    {
      name: "Mental Health America",
      url: "https://mhanational.org/finding-help",
      description: "Find local mental health resources",
      available: "Always",
    },
  ];

  const warningSignsData = [
    {
      category: "Immediate Danger Signs",
      signs: [
        "Talking about wanting to die or kill oneself",
        "Looking for ways to kill oneself",
        "Talking about feeling hopeless or having no purpose",
        "Talking about feeling trapped or in unbearable pain",
        "Talking about being a burden to others",
        "Increasing use of alcohol or drugs",
        "Acting anxious, agitated, or reckless",
        "Sleeping too little or too much",
        "Withdrawing or feeling isolated",
        "Showing rage or talking about seeking revenge",
        "Displaying extreme mood swings",
      ],
      color: "border-red-500 bg-red-50",
    },
    {
      category: "Warning Signs to Watch",
      signs: [
        "Persistent sadness or hopelessness",
        "Loss of interest in activities",
        "Significant changes in appetite or sleep",
        "Difficulty concentrating",
        "Increased irritability or anger",
        "Social withdrawal",
        "Declining academic or work performance",
        "Giving away possessions",
        "Saying goodbye to loved ones",
      ],
      color: "border-orange-500 bg-orange-50",
    },
  ];

  const safetyPlanSteps = [
    {
      step: 1,
      title: "Recognize Warning Signs",
      description:
        "Identify thoughts, feelings, or situations that might lead to a crisis",
      icon: <AlertTriangle className="h-5 w-5" />,
    },
    {
      step: 2,
      title: "Use Coping Strategies",
      description: "Practice healthy ways to manage difficult emotions",
      icon: <Shield className="h-5 w-5" />,
    },
    {
      step: 3,
      title: "Contact Support People",
      description: "Reach out to trusted friends, family, or counselors",
      icon: <Users className="h-5 w-5" />,
    },
    {
      step: 4,
      title: "Contact Professionals",
      description: "Call your therapist, doctor, or crisis hotline",
      icon: <Phone className="h-5 w-5" />,
    },
    {
      step: 5,
      title: "Make Environment Safe",
      description: "Remove or secure items that could be used for self-harm",
      icon: <Home className="h-5 w-5" />,
    },
    {
      step: 6,
      title: "Emergency Contacts",
      description: "Call 911 or go to the nearest emergency room",
      icon: <AlertCircle className="h-5 w-5" />,
    },
  ];

  const copyToClipboard = (number) => {
    navigator.clipboard.writeText(number);
    setCopiedNumber(number);
    setTimeout(() => setCopiedNumber(""), 2000);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "critical":
        return "border-red-600 bg-red-50";
      case "high":
        return "border-red-400 bg-red-50";
      case "medium":
        return "border-orange-400 bg-orange-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Emergency Resources
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          If you're in crisis or having thoughts of self-harm, please reach out
          for help immediately. You are not alone, and support is available
          24/7.
        </p>
      </div>

      {/* Crisis Alert Banner */}
      <Card className="border-red-500 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-1 p-2">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-red-800 mb-2">
                <AlertCircle className="h-6 w-6 text-red-600" />
                In Immediate Danger?
              </h3>
              <p className="text-red-700 mb-4">
                If you are in immediate danger or having thoughts of suicide,
                please call 911 or go to your nearest emergency room right away.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => window.open(`tel:${EMERGENCY_CALL}`)}
                >
                  <PhoneCall className="h-4 w-4 mr-2" />
                  Call {EMERGENCY_CALL}
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => window.open(`tel:${CRISIS_CALL}`)}
                >
                  <PhoneCall className="h-4 w-4 mr-2" />
                  Call {CRISIS_CALL} (Crisis)
                </Button>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100 bg-transparent"
                  onClick={() => window.open(`sms:${CRISIS_TEXT}?body=HOME`)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Text HOME to {CRISIS_TEXT}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* National Crisis Hotlines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Phone className="h-6 w-6 mr-2 text-red-600" />
              National Crisis Hotlines
            </CardTitle>
            <CardDescription>24/7 professional crisis support</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {emergencyContacts.map((contact, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${getPriorityColor(
                  contact.priority
                )}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900">
                    {contact.name}
                  </h4>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(contact.number)}
                      variant="ghost"
                      className="h-8 w-8 p-0"
                    >
                      {copiedNumber === contact.number ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {contact.description}
                </p>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => window.open(`tel:${contact.number}`)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Call {contact.number}
                  </Button>
                  {contact.type === "text" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(`sms:${contact.number}?body=HOME`)
                      }
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Text
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Local Emergency Resources */}
        {localResources.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <MapPin className="h-6 w-6 mr-2 text-blue-600" />
                Local Emergency Resources
              </CardTitle>
              <CardDescription>Community-based crisis support</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {localResources.map((resource, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${getPriorityColor(
                    resource.priority
                  )}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">
                      {resource.name}
                    </h4>
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(resource.number)}
                      variant="ghost"
                      className="h-8 w-8 p-0"
                    >
                      {copiedNumber === resource.number ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {resource.description}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => window.open(`tel:${resource.number}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Call {resource.number}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Minimal, essential content only: Online resources and educational sections removed */}

      {/* Additional resources removed for a focused, action-first panel */}
    </div>
  );
};

const SettingsContent = ({ user }) => {
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
  const [parentPhone, setParentPhone] = useState(() => {
    try {
      return localStorage.getItem("parentPhone") || "";
    } catch (_) {
      return "";
    }
  });
  const [parentEmail, setParentEmail] = useState(() => {
    try {
      return localStorage.getItem("parentEmail") || "";
    } catch (_) {
      return "";
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

  // Lightweight realtime indicator: connect and join user room
  useEffect(() => {
    if (!user?.googleId) return;
    const socket = io(SERVER_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });
    socket.on("connect", () => {
      setSocketStatus("connected");
      socket.emit("join:user", user.googleId);
    });
    socket.on("disconnect", () => setSocketStatus("disconnected"));
    socket.on("connect_error", () => setSocketStatus("error"));
    return () => socket.disconnect();
  }, [user?.googleId]);

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
              Email notifications (parent alerts still depend on server SMTP)
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifySMS}
              onChange={(e) => setNotifySMS(e.target.checked)}
            />
            <span>SMS notifications (requires Twilio env on server)</span>
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

export default Dashboard;
