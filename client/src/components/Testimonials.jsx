"use client";
import { motion } from "framer-motion";
import { Card, CardContent } from "./ui/card";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Aryan Tomar",
    age: 21,
    location: "Gwalior",
    text: "JeevanRakshak helped me through my darkest moments. The AI counselor was available 24/7 when I needed support the most.",
    rating: 5,
    image: "/avatar1.png",
  },
  {
    name: "Neha Parihar",
    age: 21,
    location: "Mumbai",
    text: "The daily check-ins helped me track my mood patterns. I finally understood my triggers and learned healthy coping mechanisms.",
    rating: 5,
    image: "/avatar2.png",
  },
  {
    name: "Ram Tomar",
    age: 18,
    location: "gwalior",
    text: "Having my parents involved through the parent dashboard gave them peace of mind while respecting my privacy.",
    rating: 5,
    image: "/avatar3.png",
  },
];

const Testimonials = () => {
  return (
    <section
      id="testimonials"
      className="py-20 bg-gradient-to-br from-green-50 to-blue-50"
    >
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4 text-balance">
            Journeys of Hope and Healing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto text-pretty">
            Real experiences from young people who found support and strength
            through JeevanRakshak
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              whileHover={{ y: -5 }}
              className="h-full"
            >
              <Card className="h-full bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>

                  <Quote className="w-8 h-8 text-green-500 mb-4" />

                  <p className="text-gray-700 mb-6 leading-relaxed text-pretty">
                    "{testimonial.text}"
                  </p>

                  <div className="flex items-center">
                    <img
                      src={testimonial.image || "/placeholder.svg"}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full mr-4 object-cover"
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {testimonial.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Age {testimonial.age}, {testimonial.location}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
