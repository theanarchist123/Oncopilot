"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { FlaskConical, ShieldCheck, Activity, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const SLIDES = [
  {
    id: 1,
    title: "AI-Powered Report Extraction",
    desc: "Upload pathology reports — AI extracts ER, PR, HER2, Ki-67, and 12+ biomarkers in seconds.",
    icon: FlaskConical,
    image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: 2,
    title: "Explainable Treatment Plans",
    desc: "120+ clinical rules evaluate your profile against NCCN, ESMO, ABC, and St. Gallen guidelines.",
    icon: ShieldCheck,
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: 3,
    title: "Real-Time Safety Intelligence",
    desc: "LVEF thresholds, BRCA flags, contraindications — every recommendation safety-checked.",
    icon: Activity,
    image: "https://images.unsplash.com/photo-1581093588401-fbb62a02f120?q=80&w=800&auto=format&fit=crop"
  }
];

export default function MobileOnboarding() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      router.push("/mobile/login");
    }
  };

  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="relative h-[100dvh] w-full bg-[#07091C] overflow-hidden flex flex-col">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <img 
            src={slide.image} 
            alt={slide.title}
            className="w-full h-full object-cover object-center opacity-40 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#07091C]/60 to-[#07091C] pt-20" />
        </motion.div>
      </AnimatePresence>

      {/* Skip Button */}
      <div className="absolute top-10 right-6 z-20">
        <Link href="/mobile/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
          Skip
        </Link>
      </div>

      {/* Main Content Card */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="glass-dark p-8 rounded-3xl w-full border border-white/10 relative overflow-hidden"
          >
            {/* Ambient inner glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#0891B2]/20 rounded-full blur-3xl" />
            
            <div className="hexagon w-14 h-14 bg-[#0891B2] flex items-center justify-center mb-6 shadow-lg shadow-[#0891B2]/30">
              <Icon className="w-6 h-6 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3 leading-tight">
              {slide.title}
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              {slide.desc}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Indicators and Next Button Row */}
        <div className="flex items-center justify-between mt-8">
          <div className="flex items-center gap-2">
            {SLIDES.map((s, i) => (
              <div 
                key={s.id}
                className={`transition-all duration-300 rounded-full ${i === currentSlide ? 'w-6 h-2 bg-[#0891B2]' : 'w-2 h-2 bg-slate-700'}`}
              />
            ))}
          </div>

          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {currentSlide === SLIDES.length - 1 ? (
              <Button 
                onClick={handleNext}
                className="rounded-full px-6 h-12 bg-[#0891B2] hover:bg-[#0680a0] text-white shadow-lg shadow-[#0891B2]/30"
              >
                Get Started <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                onClick={handleNext}
                className="w-12 h-12 rounded-full bg-white/5 border border-white/10 p-0 flex items-center justify-center text-white"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
