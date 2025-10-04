"use client";
import { motion } from "framer-motion";
import { Users, MessageCircle, Clock, Heart } from "lucide-react";

const stats = [
  {
    icon: Users,
    number: "50,000+",
    label: "Lives Supported",
    description: "Young people helped through our platform",
  },
  {
    icon: MessageCircle,
    number: "1M+",
    label: "Conversations",
    description: "Supportive interactions with AI counselor",
  },
  {
    icon: Clock,
    number: "24/7",
    label: "Always Available",
    description: "Round-the-clock crisis support and available anytime",
  },
  {
    icon: Heart,
    number: "95%",
    label: "Positive Impact",
    description: "Users report improved mental wellness",
  },
];

const Statistics = () => {
  return (
    <section className="py-20 bg-black text-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4 text-balance">
            Making a Real Difference
          </h2>
          <p className="text-xl text-green-100 max-w-3xl mx-auto text-pretty">
            Our impact in numbers - transforming mental health support for young
            people across India
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="text-center group"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/20 transition-all duration-300">
                <stat.icon className="w-12 h-12 mx-auto mb-4 text-green-200 group-hover:text-white transition-colors" />
                <div className="text-4xl font-bold mb-2 text-white">
                  {stat.number}
                </div>
                <div className="text-xl font-semibold mb-2 text-green-100">
                  {stat.label}
                </div>
                <p className="text-sm text-green-200 text-pretty">
                  {stat.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Statistics;
