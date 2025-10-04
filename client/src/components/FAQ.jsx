"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "How does JeevanRakshak detect mental health risks?",
      answer:
        "Our AI system uses advanced natural language processing (NLP) and machine learning algorithms to analyze text sentiment, behavioral patterns, and time-series data from your daily check-ins. It's trained on mental health datasets and can detect early warning signs like sudden mood drops, sleep pattern changes, and concerning language patterns.",
    },
    {
      question: "Is my personal data safe and private?",
      answer:
        "Absolutely. We use end-to-end encryption for all user data, and you have complete control over what information is shared. Parent notifications require your explicit consent, and we offer anonymous journaling options. Your privacy and trust are our top priorities.",
    },
    {
      question: "What happens if the AI detects I'm at high risk?",
      answer:
        "If high risk is detected, the system immediately connects you with our AI counselor for immediate support, automatically books you with an available human counselor, and (with your consent) notifies your emergency contacts. We also provide direct access to helplines and nearby mental health centers.",
    },
    {
      question: "Can I use JeevanRakshak without internet access?",
      answer:
        "Yes! JeevanRakshak works offline in rural areas with SMS-based check-ins and syncs your data when internet becomes available. We believe mental health support should be accessible to everyone, regardless of connectivity.",
    },
    {
      question: "Is the AI counselor available in regional languages?",
      answer:
        "Yes, our AI counselor supports multiple languages including Hindi, English, Hinglish, and several regional Indian languages like Marathi, Bengali, Tamil, and more. We use IndicBERT and other specialized models for accurate multilingual support.",
    },
    {
      question: "How much does JeevanRakshak cost?",
      answer:
        "We offer a freemium model with basic AI support available at no cost. Premium features like human counselor sessions and advanced analytics are available through affordable subscription plans. We also provide free access for students and low-income users.",
    },
    {
      question: "Can parents access my information?",
      answer:
        "Parents can only access your information with your explicit consent. You control what they see - this might include weekly wellness summaries or emergency alerts. We believe in empowering youth while keeping families connected and supportive.",
    },
    {
      question:
        "What makes JeevanRakshak different from other mental health apps?",
      answer:
        "JeevanRakshak uniquely combines AI-powered early detection, 24/7 multilingual support, human counselor integration, family involvement, and cultural sensitivity specifically designed for Indian youth. Our hybrid AI + human model ensures both immediate and deep care.",
    },
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            FAQ'S
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
            Get answers to common questions about how our AI-powered mental
            health platform works.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="mb-4"
            >
              <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-card-foreground pr-4">
                    {faq.question}
                  </h3>
                  <motion.div
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-shrink-0"
                  >
                    {openIndex === index ? (
                      <Minus className="h-5 w-5 text-primary" />
                    ) : (
                      <Plus className="h-5 w-5 text-primary" />
                    )}
                  </motion.div>
                </button>

                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-4">
                        <p className="text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
