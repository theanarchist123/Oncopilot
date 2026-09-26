"use client";

import React from "react";
import { PieChart, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function MobileAnalyticsPage() {
  return (
    <div className="flex flex-col min-h-full px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Analytics</h1>
        <p className="text-slate-400 text-sm">Clinical insights from your active cases.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-[#0D1220] border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-lg"
      >
        <div className="w-48 h-48 rounded-full border-[16px] border-[#0F3460] border-t-[#0891B2] border-r-emerald-500 flex items-center justify-center mb-6 relative shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
           <div className="text-center">
             <h3 className="text-3xl font-bold text-white">142</h3>
             <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total Cases</p>
           </div>
        </div>
        
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#0891B2]" /> HR+/HER2-</div>
            <span className="font-bold text-white">65%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> HER2-Enriched</div>
            <span className="font-bold text-white">20%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#0F3460]" /> Triple Negative</div>
            <span className="font-bold text-white">15%</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
