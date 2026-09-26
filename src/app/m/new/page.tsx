"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Pencil, UploadCloud, FileUp, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MobileUploadPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const simulateUpload = () => {
    setIsProcessing(true);
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 15;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(() => {
          router.push("/m/results/mock-123");
        }, 1000);
      }
      setProgress(current);
    }, 400);
  };

  return (
    <div className="flex flex-col min-h-full px-6 py-6 relative">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">New Consultation</h1>
        <p className="text-slate-400 text-sm">How would you like to submit the patient report?</p>
      </div>

      <AnimatePresence mode="wait">
        {!isProcessing ? (
          <motion.div 
            key="options"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4 flex-1"
          >
            {/* Camera Option */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={simulateUpload}
              className="w-full relative overflow-hidden bg-gradient-to-br from-[#0F3460] to-[#0D1220] border border-[#0891B2]/30 rounded-3xl p-6 flex flex-col items-start text-left shadow-[0_0_30px_rgba(8,145,178,0.15)] group"
            >
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#0891B2]/20 rounded-full blur-3xl group-hover:bg-[#0891B2]/30 transition-colors" />
              <div className="w-14 h-14 rounded-2xl bg-[#0891B2] flex items-center justify-center shadow-lg mb-4">
                <Camera className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Scan with Camera</h3>
              <p className="text-sm text-slate-300">Take a photo of the physical pathology report for instant OCR extraction.</p>
            </motion.button>

            {/* File Option */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={simulateUpload}
              className="w-full bg-[#0D1220] border border-white/10 rounded-3xl p-6 flex items-center gap-5 text-left group hover:bg-slate-900/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                <FileUp className="w-6 h-6 text-slate-300" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Upload PDF File</h3>
                <p className="text-xs text-slate-400">Select a digital report from your device files.</p>
              </div>
            </motion.button>

            {/* Manual Entry Option */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="w-full bg-[#0D1220] border border-white/10 rounded-3xl p-6 flex items-center gap-5 text-left group hover:bg-slate-900/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                <Pencil className="w-6 h-6 text-slate-300" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Manual Entry</h3>
                <p className="text-xs text-slate-400">Enter biomarker values directly into a form.</p>
              </div>
            </motion.button>
          </motion.div>
        ) : (
          <motion.div 
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center pb-20 mt-12"
          >
            <div className="relative mb-10">
              <motion.div 
                className="w-24 h-24 rounded-full border-4 border-[#0891B2]/20 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-20 h-20 rounded-full border-4 border-transparent border-t-[#0891B2] absolute" />
              </motion.div>
              <div className="absolute inset-0 flex items-center justify-center">
                <UploadCloud className="w-8 h-8 text-[#0891B2] animate-pulse" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Analyzing Report</h3>
            <p className="text-sm text-slate-400 mb-8 typewriter-cursor">Extracting clinical biomarkers...</p>

            <div className="w-full max-w-xs space-y-3">
               <div className="flex items-center justify-between text-xs font-medium">
                 <span className={progress > 20 ? "text-emerald-400" : "text-slate-500 transition-colors"}>ER Status</span>
                 {progress > 20 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <div className="w-2 h-2 rounded-full bg-slate-700 animate-pulse mr-1" />}
               </div>
               <div className="flex items-center justify-between text-xs font-medium">
                 <span className={progress > 50 ? "text-emerald-400" : "text-slate-500 transition-colors"}>PR Status</span>
                 {progress > 50 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <div className="w-2 h-2 rounded-full bg-slate-700 animate-pulse mr-1" />}
               </div>
               <div className="flex items-center justify-between text-xs font-medium">
                 <span className={progress > 80 ? "text-emerald-400" : "text-slate-500 transition-colors"}>HER2 Status</span>
                 {progress > 80 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <div className="w-2 h-2 rounded-full bg-slate-700 animate-pulse mr-1" />}
               </div>
            </div>

            <div className="w-full max-w-xs mt-8">
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#0891B2] to-[#67C9E8]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-right mt-2 text-[10px] text-slate-500 font-mono">{Math.min(100, Math.round(progress))}%</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
