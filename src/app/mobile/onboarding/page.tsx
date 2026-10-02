"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { FlaskConical, ShieldCheck, Activity, ChevronRight, ArrowUpRight } from "lucide-react";
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
    <div className="relative h-[100dvh] w-full mobile-atmosphere overflow-hidden flex flex-col">
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
          <div className="absolute inset-0 mobile-image-wash" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute top-9 left-6 z-20 flex items-center gap-2">
        <Activity className="w-5 h-5 text-[#67C9E8]" />
        <span className="text-white font-bold tracking-tight">On<span className="text-[#67C9E8]">Copilot</span></span>
      </div>

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
            className="mobile-surface p-7 rounded-[1.75rem] w-full relative overflow-hidden"
          >
            {/* Ambient inner glow */}
            <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-b from-[#0891B2]/12 to-transparent pointer-events-none" />
            
            <div className="hexagon w-14 h-14 bg-[#0891B2] flex items-center justify-center mb-6 shadow-lg shadow-[#0891B2]/30">
              <Icon className="w-6 h-6 text-white" />
            </div>
            
            <div className="flex items-center gap-2 text-[#67C9E8] text-[10px] font-semibold uppercase tracking-[0.2em] mb-3"><span>0{currentSlide + 1}</span><span className="h-px w-8 bg-[#67C9E8]/60" /></div>
            <h2 className="text-[1.65rem] font-bold text-white mb-3 leading-[1.08] tracking-[-0.03em]">
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
                Get Started <ArrowUpRight className="w-4 h-4 ml-1" />
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
