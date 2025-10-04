"use client";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Shield,
  Brain,
  Users,
  Heart,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui/button";

const Hero = ({ navigateTo, onStartAuth, isAuthenticated }) => {
  return (
    <section
      id="home"
      className="relative min-h-screen w-screen h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image */}
      <img
        src="/hero.png"
        alt="Hero Background"
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{ minHeight: "100vh", minWidth: "100vw" }}
      />
      {/* Main Content */}
      <div className="relative z-10 text-center px-4 max-w-auto mx-auto rounded-xl py-12 md:py-24 w-full flex flex-col justify-center items-center bg-black/50">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1
            className="text-4xl md:text-6xl lg:text-8xl font-black text-white mb-6 text-balance leading-tight"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="bg-gradient-to-r from-lime-300 to-emerald-300 bg-clip-text text-transparent">
              Saving Lives
            </span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl lg:text-2xl text-white/90 mb-10 max-w-3xl mx-auto text-pretty font-light leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            AI-powered mental health support that detects early warning signs
            and provides{" "}
            <span className="font-semibold text-lime-300">
              24/7 compassionate care
            </span>{" "}
            when you need it most.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Button
              size="lg"
              onClick={() =>
                isAuthenticated
                  ? navigateTo && navigateTo("dashboard")
                  : onStartAuth && onStartAuth()
              }
              className="text-lg px-10 py-5 bg-lime-500 hover:bg-lime-400 text-gray-900 font-bold rounded-full shadow-2xl hover:shadow-lime-500/25 transition-all duration-300 group transform hover:scale-105"
            >
              {isAuthenticated ? "Go to Dashboard" : "Get Support Now"}
              <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="text-lg px-10 py-5 bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm rounded-full font-semibold transition-all duration-300 hover:scale-105"
            >
              <a href="#features">Learn More</a>
            </Button>
          </motion.div>

          {/* Enhanced Stats */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10 border-t border-white/20"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <motion.div
              className="text-center group cursor-pointer bg-white/20 py-2 rounded-xl"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-lime-300 to-emerald-300 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">
                24/7
              </div>
              <div className="text-white/80 font-medium text-lg">
                AI Support Available
              </div>
            </motion.div>

            <motion.div
              className="text-center group cursor-pointer bg-white/20 py-2 rounded-xl"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-lime-300 to-emerald-300 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">
                95%
              </div>
              <div className="text-white/80 font-medium text-lg">
                Early Detection Rate
              </div>
            </motion.div>

            <motion.div
              className="text-center group cursor-pointer bg-white/20 py-2 rounded-xl"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-lime-300 to-emerald-300 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">
                10K+
              </div>
              <div className="text-white/80 font-medium text-lg">
                Lives Supported
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Number.POSITIVE_INFINITY,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;
