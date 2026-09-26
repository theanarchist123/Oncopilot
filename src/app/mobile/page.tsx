"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { getAuthToken } from "@/lib/api";

export default function MobileSplash() {
  const router = useRouter();

  useEffect(() => {
    // Check if logged in, otherwise go to onboarding
    const timer = setTimeout(() => {
      const token = getAuthToken();
      if (token) {
        router.push("/m");
      } else {
        router.push("/mobile/onboarding");
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#07091C] text-white z-50 overflow-hidden">
      {/* Background Mesh (from globals.css) */}
      <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <motion.div 
          className="w-16 h-16 rounded-2xl bg-[#0891B2] flex items-center justify-center shadow-[0_0_30px_rgba(8,145,178,0.4)] mb-4"
          animate={{ boxShadow: ["0 0 15px rgba(8,145,178,0.3)", "0 0 40px rgba(8,145,178,0.7)", "0 0 15px rgba(8,145,178,0.3)"] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Activity className="w-8 h-8 text-white" />
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-3xl font-bold tracking-tight mb-2"
        >
          On<span className="text-[#0891B2]">Copilot</span>
        </motion.h1>

        <motion.div 
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 64 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="h-0.5 bg-gradient-to-r from-transparent via-[#0891B2] to-transparent shimmer mb-8"
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="text-slate-400 font-medium tracking-widest uppercase text-xs"
        >
          Clinical Decision Intelligence
        </motion.p>
      </motion.div>

      {/* Loading Dots at bottom */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-[#0891B2]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}
