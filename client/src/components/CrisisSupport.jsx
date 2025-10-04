"use client";
import { motion } from "framer-motion";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Phone, MessageSquare, Shield, Clock } from "lucide-react";

const CrisisSupport = () => {
  return (
    <section className="py-20 bg-red-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex text-lg items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-full mb-4">
            <Shield className="w-4 h-4 text-xl" />
            <span className="font-semibold">Crisis Support</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4 text-balance">
            Immediate Help When You Need It Most
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto text-pretty">
            If you're in crisis or having thoughts of self-harm, help is
            available right now
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="bg-white border-2 border-red-200 hover:border-red-300 transition-colors">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-red-100 p-3 rounded-full">
                    <Phone className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Emergency Helpline
                    </h3>
                    <p className="text-gray-600">
                      Speak to a trained counselor immediately
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between text-black  p-3 bg-gray-50 rounded-lg">
                    <span className="font-semibold">
                      National Suicide Prevention
                    </span>
                    <span className="text-red-600 font-bold">
                      1-800-273-8255
                    </span>
                  </div>
                  <div className="flex items-center  text-black justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-semibold">Crisis Text Line</span>
                    <span className="text-red-600 font-bold">
                      Text HOME to 741741
                    </span>
                  </div>
                  <div className="flex text-black items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-semibold">Vandrevala Foundation</span>
                    <span className="text-red-600 font-bold">
                      +919999666555.
                    </span>
                  </div>
                </div>

                <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                  <Phone className="w-4 h-4 mr-2" />
                  Call Now
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="bg-white border-2 border-blue-200 hover:border-blue-300 transition-colors">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      24/7 AI Support
                    </h3>
                    <p className="text-gray-600">
                      Immediate support through our AI counselor
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="text-black  flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span>Available 24/7, no waiting</span>
                  </div>
                  <div className="text-black flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <span>Completely confidential</span>
                  </div>
                  <div className="text-black flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    <span>Trained in crisis intervention</span>
                  </div>
                </div>

                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat Now
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CrisisSupport;
