"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, X, Heart, LogOut, Users } from "lucide-react";
import { Button } from "./ui/button";

const Header = ({
  navigateTo,
  isAuthenticated,
  onLogout,
  user,
  onStartAuth,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    // Default to dark mode
    return localStorage.getItem("theme") || "dark";
  });
  // PWA install prompt handling
  const [installEvent, setInstallEvent] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Listen for PWA install events
  useEffect(() => {
    const onBeforeInstall = (e) => {
      // Prevent mini-infobar on mobile, save the event for triggering later
      e.preventDefault();
      setInstallEvent(e);
    };
    const onAppInstalled = () => {
      setIsInstalled(true);
      setInstallEvent(null);
      setShowInstallModal(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);
    // iOS Safari doesn't support beforeinstallprompt; detect installed via matchMedia
    try {
      // On iOS standalone mode can be detected
      if (window.navigator.standalone) setIsInstalled(true);
    } catch (_) {}
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const canInstall = !!installEvent && !isInstalled;

  const handleInstallClick = () => {
    if (!installEvent) {
      // Fallback guidance if event not available
      alert(
        "Install is not supported in this browser or context. You can add to home screen from your browser menu."
      );
      return;
    }
    setShowInstallModal(true);
  };

  const confirmInstall = async () => {
    try {
      if (!installEvent) return;
      setShowInstallModal(false);
      installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      setInstallEvent(null);
      if (outcome !== "accepted") {
        // user dismissed; no further action
      }
    } catch (e) {
      console.error("Install prompt failed", e);
    }
  };

  const navItems = [
    { name: "Home", href: "#home" },
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Testimonials", href: "#testimonials" },
    { name: "FAQ", href: "#faq" },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-sm border-b border-primary/20"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2"
            >
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="Logo"
                width={40}
                height={40}
                className="h-10 w-10 object-contain rounded-lg shadow"
                decoding="async"
                fetchpriority="high"
              />
              <span className="text-xl font-bold text-primary-foreground">
                JeevanRakshak
              </span>
            </motion.div>

            {/* Centered Navigation Links */}
            <nav className="hidden md:flex flex-1 justify-center items-center space-x-8">
              {/* Show section anchors only when NOT authenticated */}
              {!isAuthenticated && (
                <>
                  {navItems.map((item, index) => (
                    <motion.a
                      key={item.name}
                      href={item.href}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="text-primary-foreground hover:text-secondary transition-colors duration-200"
                    >
                      {item.name}
                    </motion.a>
                  ))}
                </>
              )}
              {/* Dedicated Home route */}
              <button
                onClick={() => navigateTo("home")}
                className="text-primary-foreground hover:text-secondary transition-colors duration-200"
              >
                Home
              </button>
              {/* Authenticated app links */}
              {isAuthenticated && (
                <>
                  <button
                    onClick={() => navigateTo("dashboard")}
                    className="text-primary-foreground hover:text-secondary transition-colors duration-200"
                  >
                    {user?.isCounselor ? "Counselor Dashboard" : "Dashboard"}
                  </button>
                  <button
                    onClick={() => navigateTo("profile")}
                    className="text-primary-foreground hover:text-secondary transition-colors duration-200"
                  >
                    Profile
                  </button>
                </>
              )}
            </nav>

            {/* End-aligned Action Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              {canInstall && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleInstallClick}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  Install App
                </Button>
              )}
              <button
                aria-label="Toggle theme"
                onClick={toggleTheme}
                className="px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                {theme === "dark" ? "🌙" : "☀️"}
              </button>
              {isAuthenticated ? (
                <>
                  <button
                    aria-label="Profile"
                    onClick={() => navigateTo("profile")}
                    className="rounded-full border-2 border-emerald-500 hover:scale-105 transition"
                    style={{
                      width: 40,
                      height: 40,
                      overflow: "hidden",
                      padding: 0,
                      background: "none",
                    }}
                  >
                    <img
                      src={
                        user?.picture ||
                        `https://ui-avatars.com/api/?name=${
                          user?.name || "U"
                        }&background=10b981&color=fff&size=40`
                      }
                      alt="Profile"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onLogout}
                    className="bg-red-600 hover:bg-red-700 text-white border-transparent shadow-md"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => onStartAuth && onStartAuth()}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  Sign in
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-primary-foreground"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-4 pb-4"
            >
              {/* Section links only for guests */}
              {!isAuthenticated && (
                <>
                  {navItems.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="block py-2 text-primary-foreground hover:text-secondary transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </a>
                  ))}
                </>
              )}
              {/* Home route on mobile */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  navigateTo("home");
                  setIsMenuOpen(false);
                }}
              >
                Home
              </Button>
              {canInstall && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white mt-2"
                  onClick={() => {
                    handleInstallClick();
                    setIsMenuOpen(false);
                  }}
                >
                  Install App
                </Button>
              )}
              {isAuthenticated ? (
                <div className="mt-4 space-y-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      navigateTo("dashboard");
                      setIsMenuOpen(false);
                    }}
                  >
                    {user?.isCounselor ? "Counselor Dashboard" : "Dashboard"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary bg-transparent"
                    onClick={() => {
                      navigateTo("profile");
                      setIsMenuOpen(false);
                    }}
                  >
                    Profile
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full bg-red-600 hover:bg-red-700 text-white border-transparent shadow-md"
                    onClick={() => {
                      onLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                  <button
                    aria-label="Toggle theme"
                    onClick={toggleTheme}
                    className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    {theme === "dark" ? "🌙" : "☀️"}
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full bg-red-500 hover:bg-red-600 text-white"
                    onClick={() => {
                      onStartAuth && onStartAuth();
                      setIsMenuOpen(false);
                    }}
                  >
                    Sign in with Google
                  </Button>
                </div>
              )}
            </motion.nav>
          )}
        </div>
      </motion.header>
      {/* Install Guidance Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-[90%] max-w-sm text-center">
            <div className="flex items-center justify-center mb-4">
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="App icon"
                width={72}
                height={72}
                className="rounded-lg shadow"
                decoding="async"
                fetchpriority="high"
              />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Install JeevanRakshak
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Add the app to your device for a faster, full-screen experience.
              Click "Install" in the next step.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={confirmInstall}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Install now
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowInstallModal(false)}
                className="border-gray-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
