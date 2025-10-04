"use client";
import { motion } from "framer-motion";
import {
  UserPlus,
  MessageSquare,
  Brain,
  AlertTriangle,
  Users,
  CheckCircle,
} from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: UserPlus,
      title: "Sign Up & Setup",
      description:
        "Create your secure account and complete a brief wellness assessment to personalize your experience.",
      step: "01",
    },
    {
      icon: MessageSquare,
      title: "Daily Check-ins",
      description:
        "Share your mood, sleep patterns, and thoughts through our gamified daily check-in system.",
      step: "02",
    },
    {
      icon: Brain,
      title: "AI Analysis",
      description:
        "Our advanced AI analyzes your patterns using NLP and behavioral data to assess your mental wellness.",
      step: "03",
    },
    {
      icon: AlertTriangle,
      title: "Risk Assessment",
      description:
        "The system generates a risk score and determines the appropriate level of intervention needed.",
      step: "04",
    },
    {
      icon: Users,
      title: "Intervention & Support",
      description:
        "Receive AI counseling, human counselor connection, or emergency support based on your needs.",
      step: "05",
    },
    {
      icon: CheckCircle,
      title: "Continuous Care",
      description:
        "Ongoing monitoring and personalized wellness recommendations help maintain your mental health.",
      step: "06",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            How <span className="text-primary">JeevanRakshak</span> Works
          </h2>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`flex items-center mb-12 ${
                index % 2 === 0 ? "flex-row" : "flex-row-reverse"
              }`}
            >
              {/* Step Content */}
              <div className={`flex-1 ${index % 2 === 0 ? "pr-8" : "pl-8"}`}>
                <div
                  className={`${index % 2 === 0 ? "text-left" : "text-right"}`}
                >
                  <div className="flex items-center mb-4">
                    <span
                      className={`text-6xl font-black text-primary/20 ${
                        index % 2 === 0 ? "mr-4" : "ml-4 order-2"
                      }`}
                    >
                      {step.step}
                    </span>
                    <div className={index % 2 === 0 ? "order-2" : "order-1"}>
                      <h3 className="text-2xl font-bold text-foreground mb-2">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step Icon */}
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="flex-shrink-0 w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg"
              >
                <step.icon className="h-10 w-10 text-primary-foreground" />
              </motion.div>

              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 transform -translate-x-1/2 w-px h-12 bg-primary/30 mt-32 hidden md:block" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
