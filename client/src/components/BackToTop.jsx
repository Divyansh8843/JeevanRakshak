import { useEffect, useRef, useState } from "react";

export default function BackToTop({ showAt = 300 }) {
  const [visible, setVisible] = useState(false);
  // Keep animation state across renders
  const rafIdRef = useRef(null);
  const cancelActiveRef = useRef(false);

  const getScrollTop = () => {
    if (typeof window === "undefined") return 0;
    return (
      window.pageYOffset ||
      (document.documentElement && document.documentElement.scrollTop) ||
      (document.body && document.body.scrollTop) ||
      0
    );
  };

  const prefersReducedMotion = () => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  const supportsNativeSmoothScroll = () => {
    if (typeof window === "undefined") return false;
    try {
      const hasStyleProp = "scrollBehavior" in (document.documentElement && document.documentElement.style || {});
      const hasCssSupports = typeof window.CSS !== "undefined" && typeof window.CSS.supports === "function" && (CSS.supports("scroll-behavior", "smooth") || CSS.supports("scroll-behavior: smooth"));
      return hasStyleProp || hasCssSupports;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Throttle scroll handler using rAF for performance
    let ticking = false;
    const update = () => {
      ticking = false;
      setVisible(getScrollTop() > showAt);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    // initialize once
    setVisible(getScrollTop() > showAt);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [showAt]);

  // Easing function for smoothness
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const cancelUserEvents = ["wheel", "touchstart", "keydown", "mousedown"]; // cancel on user intent
  const cancelOnUserInput = () => {
    cancelActiveRef.current = true;
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    // Remove temporary listeners
    cancelUserEvents.forEach((evt) => window.removeEventListener(evt, cancelOnUserInput));
  };

  const animateScrollToTop = (duration = 800) => {
    if (typeof window === "undefined") return;

    const start = getScrollTop();
    if (start <= 0) return; // already at top

    const startTime = performance.now();
    cancelActiveRef.current = false;

    // Add temporary listeners to detect user interruption
    cancelUserEvents.forEach((evt) => window.addEventListener(evt, cancelOnUserInput, { passive: true }));

    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeInOutCubic(t);
      const nextY = Math.round(start * (1 - eased));
      window.scrollTo(0, nextY);
      if (!cancelActiveRef.current && t < 1 && getScrollTop() > 0) {
        rafIdRef.current = requestAnimationFrame(step);
      } else {
        // cleanup
        cancelUserEvents.forEach((evt) => window.removeEventListener(evt, cancelOnUserInput));
        rafIdRef.current = null;
      }
    };

    rafIdRef.current = requestAnimationFrame(step);
  };

  const handleClick = () => {
    if (typeof window === "undefined") return;

    // Respect reduced motion preferences
    if (prefersReducedMotion()) {
      window.scrollTo(0, 0);
      return;
    }

    // If Lenis (or any compatible smooth-scrolling lib) is present, prefer it
    if (window.lenis && typeof window.lenis.scrollTo === "function") {
      // Adaptive duration based on distance for ultra-smooth feel
      const dist = Math.max(0, getScrollTop());
      const duration = Math.max(0.9, Math.min(1.35, 0.9 + (dist / 5000) * 0.45));
      window.lenis.scrollTo(0, { duration });
      return;
    }

    // Fallback to native smooth if available; otherwise, custom rAF animation
    if (supportsNativeSmoothScroll()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      animateScrollToTop(800);
    }
  };

  // Cleanup on unmount: cancel any ongoing animation and listeners
  useEffect(() => {
    return () => {
      cancelActiveRef.current = true;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      // Just in case animation was mid-flight, remove temp listeners
      cancelUserEvents.forEach((evt) => window.removeEventListener(evt, cancelOnUserInput));
    };
  }, []);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Back to top"
      className={`fixed bottom-6 right-6 z-50 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      } bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg rounded-full w-12 h-12 flex items-center justify-center`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="w-5 h-5"
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
}

