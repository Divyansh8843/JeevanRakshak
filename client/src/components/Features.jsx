"use client";
import { motion } from "framer-motion";
import {
  Brain,
  MessageCircle,
  Shield,
  Users,
  Phone,
  Heart,
  Clock,
  Globe,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

const Features = () => {
  const features = [
    {
      icon: Brain,
      title: "AI Risk Detection",
      description:
        "Advanced machine learning algorithms analyze behavioral patterns and text sentiment to detect early warning signs of mental health crises.",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      icon: MessageCircle,
      title: "24/7 AI Counselor",
      description:
        "Empathetic conversational AI trained on counseling datasets provides immediate support in multiple languages including Hindi and regional dialects.",
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      icon: Shield,
      title: "Smart Daily Check-ins",
      description:
        "Gamified mood tracking with voice-to-text journaling helps build healthy habits while monitoring your mental wellness journey.",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
    {
      icon: Users,
      title: "Human Counselor Network",
      description:
        "Seamless escalation to professional counselors when AI detects moderate to high risk, with priority booking for urgent cases.",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
    {
      icon: Phone,
      title: "Emergency SOS System",
      description:
        "Instant access to helplines and emergency contacts with geo-location support for nearest mental health centers.",
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    {
      icon: Heart,
      title: "Family Integration",
      description:
        "Consent-based parent notifications and weekly wellness summaries help families stay connected and supportive.",
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      borderColor: "border-pink-200",
    },
    {
      icon: Clock,
      title: "Offline Support",
      description:
        "Works in rural areas with SMS-based check-ins and offline sync capabilities, ensuring no one is left behind.",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
    },
    {
      icon: Globe,
      title: "Cultural Sensitivity",
      description:
        "Designed for Indian youth with multilingual NLP, cultural context awareness, and region-specific mental health resources.",
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-200",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
      },
    },
  };

  return (
    <section
      id="features"
      className="py-20 bg-gradient-to-br from-slate-50 to-blue-50 relative overflow-hidden"
    >
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-4 text-balance">
            Adanced Features
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
            An AI-powered platform offering personalized mental health support
            for Indian youth
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card
                className={`h-full hover:shadow-xl transition-all duration-300 group hover:-translate-y-3 ${feature.bgColor} ${feature.borderColor} border-2 hover:border-opacity-50 backdrop-blur-sm`}
              >
                <CardHeader className="text-center pb-4">
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className={`mx-auto mb-4 p-4 ${feature.bgColor} rounded-2xl w-fit shadow-lg group-hover:shadow-xl transition-shadow`}
                  >
                    <feature.icon className={`h-8 w-8 ${feature.color}`} />
                  </motion.div>
                  <CardTitle className="text-lg font-bold  text-black">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-sm leading-relaxed text-pretty">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
