import "./globals.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Features from "./components/Features";
import HowItWorks from "./components/HowItWorks";
import FAQ from "./components/FAQ";
import Footer from "./components/Footer";
import Statistics from "./components/Statistics";
import CrisisSupport from "./components/CrisisSupport";
import Dashboard from "./pages/Dashboard";
import CounselorDashboard from "./pages/CounselorDashboard";
import StudentSession from "./pages/StudentSession";
import Profile from "./pages/Profile";
// Redirect-based OAuth flow (server-side)
import { Toaster, toast } from "react-hot-toast";
import BackToTop from "./components/BackToTop";
import { setAuthToken, clearAuthToken, getAuthHeaders } from "./lib/auth";

function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const onStartAuth = useCallback(() => {
    // Use redirect flow handled by the server
    window.location.href = `${
      import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
    }/api/auth/google/redirect`;
  }, []);

  // PWA install prompt handler (capture and expose a manual trigger)
  useEffect(() => {
    const onBeforeInstall = (e) => {
      // Prevent automatic mini-infobar and store for a manual, user-initiated prompt
      e.preventDefault();
      try {
        window.deferredInstallPrompt = e;
      } catch (_) {}
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    // Expose a manual trigger (call this from a user gesture, e.g., button click)
    window.promptInstall = async () => {
      const ev = window.deferredInstallPrompt;
      if (!ev) return false;
      try {
        ev.prompt();
        await ev.userChoice;
      } catch (_) {}
      window.deferredInstallPrompt = null;
      return true;
    };
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  // After redirect back (server sets auth_token cookie), fetch current user
  useEffect(() => {
    const url = new URL(window.location.href);
    const justAuthed = url.searchParams.get("auth") === "1";
    const token = url.searchParams.get("token");
    
    if (token) {
      setAuthToken(token);
      url.searchParams.delete("token");
    }
    
    if (justAuthed || token) {
      // Clean the URL
      url.searchParams.delete("auth");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      
      (async () => {
        try {
          const res = await fetch(
            `${
              import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
            }/api/auth/me`,
            { credentials: "include", headers: { ...getAuthHeaders() } }
          );
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
              clearAuthToken();
              throw new Error("Session expired or invalid. Please sign in again.");
            }
            throw new Error(`Failed to fetch user: ${res.status}`);
          }
          const me = await res.json();
          setIsAuthenticated(true);
          setUser(me);
          // Go to Profile first
          navigate("/profile", { replace: true });
          // Then transition to appropriate Dashboard based on role
          setTimeout(() => {
            if (me.isCounselor) {
              navigate("/counselor-dashboard", { replace: true });
            } else {
              navigate("/dashboard", { replace: true });
            }
          }, 1200);
          toast.success("Signed in successfully");
        } catch (e) {
          console.error("Post-redirect auth fetch failed:", e);
          if (e.message.includes("401") || e.message.includes("Unauthorized")) {
             clearAuthToken();
          }
          toast.error("Authentication failed. Please try again.");
          navigate("/", { replace: true });
        }
      })();
    }
  }, [navigate]);

  // Initialize theme (light/dark) from storage or system preference
  useEffect(() => {
    const root = document.documentElement; // html element
    const applyTheme = (t) => {
      if (t === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
      try {
        localStorage.setItem("theme", t);
      } catch (_) {}
    };

    let theme = "light";
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "dark" || saved === "light") theme = saved;
      else if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      )
        theme = "dark";
    } catch (_) {}
    applyTheme(theme);

    // Expose a global setter (optional) so headers/toggles can use it
    window.setTheme = (t) => applyTheme(t === "dark" ? "dark" : "light");

    // React to system changes if user hasn't set an explicit theme
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => {
      try {
        if (!localStorage.getItem("theme"))
          applyTheme(e.matches ? "dark" : "light");
      } catch (_) {}
    };
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  // Initialize Lenis smooth scrolling (dynamic import for robustness)
  useEffect(() => {
    let lenis = null;
    let frameId = null;
    let removeAnchorListener = null;
    let media = null;
    let mediaChangeHandler = null;

    const prefersReducedMotion = () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const startLenis = async () => {
      const mod = await import("@studio-freight/lenis");
      const Lenis = mod.default || mod;
      lenis = new Lenis({
        // Lerp provides ultra-smooth interpolation for wheel/touch
        // Keep duration for programmatic scrollTo calls
        lerp: 0.075,
        duration: 1.2,
        easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)), // easeOutExpo
        smoothWheel: true,
        smoothTouch: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.05,
        gestureOrientation: "vertical",
      });
      window.lenis = lenis;

      const raf = (time) => {
        lenis.raf(time);
        frameId = requestAnimationFrame(raf);
      };
      frameId = requestAnimationFrame(raf);

      const getHeaderOffset = () => {
        const header = document.querySelector("header");
        return header ? -Math.max(0, header.offsetHeight) : -80;
      };

      const onAnchorClick = (e) => {
        const anchor = e.target.closest('a[href^="#"]');
        if (!anchor) return;
        const id = anchor.getAttribute("href");
        if (!id || id === "#") return;
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { duration: 1.15, offset: getHeaderOffset() });
        }
      };
      document.addEventListener("click", onAnchorClick);
      removeAnchorListener = () =>
        document.removeEventListener("click", onAnchorClick);
    };

    const stopLenis = () => {
      if (frameId) cancelAnimationFrame(frameId);
      if (removeAnchorListener) removeAnchorListener();
      if (lenis && typeof lenis.destroy === "function") lenis.destroy();
      frameId = null;
      removeAnchorListener = null;
      lenis = null;
      window.lenis = null;
    };

    (async () => {
      try {
        if (!prefersReducedMotion()) {
          await startLenis();
        } else {
          document.documentElement?.classList?.remove("lenis");
          window.lenis = null;
        }
        // React to changes in reduced-motion preference
        media =
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)");
        if (media && media.addEventListener) {
          mediaChangeHandler = async (e) => {
            stopLenis();
            if (!e.matches) await startLenis();
          };
          media.addEventListener("change", mediaChangeHandler);
        }
      } catch (_) {
        // Lenis not available; graceful fallback
      }
    })();

    return () => {
      stopLenis();
      if (media && media.removeEventListener && mediaChangeHandler) {
        media.removeEventListener("change", mediaChangeHandler);
      }
    };
  }, []);

  // Smoothly scroll to top on route changes using Lenis (SPA navigation)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const l = window.lenis;
    if (!l || typeof l.scrollTo !== "function") return;
    // Small timeout allows layout to settle before scrolling
    const id = setTimeout(() => {
      l.scrollTo(0, { duration: 0.95 });
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Persist session across refreshes: try to fetch current user if cookie exists
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${
            import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
          }/api/auth/me`,
          { credentials: "include", headers: { ...getAuthHeaders() } }
        );
        if (res.ok) {
          const me = await res.json();
          setIsAuthenticated(true);
          setUser(me);
        }
      } catch (_) {
        // If 401 or failed, assume not authenticated
        if (localStorage.getItem("auth_token")) {
           // clearAuthToken(); // Optional: only clear if we are sure it's invalid
        }
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  // Handle profile update from Profile page
  const handleProfileEdit = (updatedUser) => {
    setUser(updatedUser);
  };

  const handleLogout = async () => {
    try {
      await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:8080"
        }/api/auth/logout`,
        {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        }
      );
    } catch (_) {}
    clearAuthToken();
    // Clear any client-side residues
    try {
      sessionStorage.removeItem("pendingBooking");
    } catch (_) {}
    try {
      // Do not clear entire localStorage in case user preferences exist
      // Clear only auth-related cache if any was stored in the future
    } catch (_) {}
    setIsAuthenticated(false);
    setUser(null);
    navigate("/", { replace: true });
  };

  const navigateTo = (page) => {
    // Map legacy keys to routes with role-based dashboard routing
    const map = {
      home: "/",
      dashboard: user?.isCounselor ? "/counselor-dashboard" : "/dashboard",
      profile: "/profile",
    };
    navigate(map[page] || "/");
  };

  const Home = useMemo(
    () => () =>
      (
        <>
          <Hero
            navigateTo={navigateTo}
            onStartAuth={onStartAuth}
            isAuthenticated={isAuthenticated}
          />
          <Features />

          <HowItWorks />

          <CrisisSupport />
          <Statistics />
          <FAQ />
        </>
      ),
    [navigateTo, onStartAuth]
  );

  const Protected = ({ children }) => {
    if (!authChecked) return null; // or a skeleton/loader
    if (!isAuthenticated) return <Navigate to="/" replace />;
    return children;
  };

  return (
    <div className="min-h-screen overflow-hidden">
      <Toaster position="top-right" />
      <Header
        navigateTo={navigateTo}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        user={user}
        onStartAuth={onStartAuth}
      />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/profile"
            element={
              <Protected>
                <Profile user={user} onEdit={handleProfileEdit} />
              </Protected>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <Dashboard
                  user={user}
                  onLogout={handleLogout}
                  navigateTo={navigateTo}
                />
              </Protected>
            }
          />
          <Route
            path="/session/:bookingId"
            element={
              <Protected>
                <StudentSession user={user} />
              </Protected>
            }
          />
          <Route
            path="/counselor-dashboard"
            element={
              <Protected>
                <CounselorDashboard
                  user={user}
                  onLogout={handleLogout}
                  navigateTo={navigateTo}
                />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {location.pathname === "/" && <BackToTop showAt={300} />}
      </main>
      <Footer />
    </div>
  );
}

export default App;
