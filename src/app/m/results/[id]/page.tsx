"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, ShieldCheck, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useCasesStore } from "@/store";
import { getSubtypeBg } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function MobileResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { cases } = useCasesStore();
  const caseId = params.id as string;
  
  // Find case or use mock
  const clinicalCase = cases.find(c => c.id === caseId) || cases[0];
  
  if (!clinicalCase) return <div className="p-6 text-white">Loading...</div>;

  return (
    <div className="flex flex-col min-h-full bg-[#07091C]">
      {/* Header */}
      <div className="sticky top-0 z-20 px-6 py-4 bg-[#07091C]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between">
        <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-full bg-white/5">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="font-bold text-white text-sm">{clinicalCase.patientName}</span>
        <button className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white">
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 space-y-6 pb-24">
        {/* Summary Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#0F3460]/40 to-[#0D1220] border border-white/10 rounded-3xl p-5 shadow-lg relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#0891B2]/10 rounded-full blur-2xl pointer-events-none" />
          <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Molecular Subtype</h3>
          <Badge className={`mb-4 ${getSubtypeBg(clinicalCase.subtype)}`}>{clinicalCase.subtype}</Badge>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
               <p className="text-slate-500 text-xs mb-1">Stage</p>
               <p className="text-white font-bold">{clinicalCase.tumour.stage}</p>
            </div>
            <div>
               <p className="text-slate-500 text-xs mb-1">Grade</p>
               <p className="text-white font-bold">{clinicalCase.tumour.grade}</p>
            </div>
          </div>
        </motion.div>

        {/* Biomarker Chips Horizontal Scroll */}
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Biomarker Panel</h3>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {[
              { id: 'ER', val: clinicalCase.biomarkers.er ? '+' : '-', pos: clinicalCase.biomarkers.er },
              { id: 'PR', val: clinicalCase.biomarkers.pr ? '+' : '-', pos: clinicalCase.biomarkers.pr },
              { id: 'HER2', val: clinicalCase.biomarkers.her2, pos: clinicalCase.biomarkers.her2 !== 'Negative' },
              { id: 'Ki67', val: `${clinicalCase.biomarkers.ki67 ?? 0}%`, pos: (clinicalCase.biomarkers.ki67 ?? 0) > 20 }
            ].map(b => (
              <div key={b.id} className="min-w-[70px] h-[70px] shrink-0 bg-[#0D1220] border border-white/5 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-slate-400 text-[10px] font-bold">{b.id}</span>
                <span className={`text-lg font-bold ${b.pos ? 'text-emerald-400' : 'text-slate-300'}`}>{b.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Alerts */}
        <div>
           <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
             Safety Intelligence <ShieldCheck className="w-4 h-4 text-[#0891B2]" />
           </h3>
           <div className="space-y-2">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
                 <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                 <div>
                    <p className="text-xs font-bold text-amber-500 mb-0.5">LVEF 52% — Monitor</p>
                    <p className="text-[10px] text-amber-500/80 leading-relaxed">Anthracycline protocols require close cardiac monitoring.</p>
                 </div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-3">
                 <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                 <div>
                    <p className="text-xs font-bold text-emerald-400 mb-0.5">No BRCA Contraindications</p>
                    <p className="text-[10px] text-emerald-400/80 leading-relaxed">Standard chemotherapy pathways cleared.</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Protocols */}
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Recommended Protocols</h3>
          <div className="space-y-3">
            <div className="bg-[#0D1220] border border-white/10 rounded-2xl p-4 shadow-md">
               <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-white">1. AC-THP → THP</h4>
                  <Badge variant="teal" className="text-[9px] px-1.5 py-0">98% Match</Badge>
               </div>
               <div className="flex gap-2 mb-3">
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">NCCN v2.2024</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">ESMO 2023</span>
               </div>
               <button className="w-full py-2 bg-white/5 hover:bg-white/10 text-[#0891B2] text-xs font-semibold rounded-xl transition-colors">
                  View Rule Chain
               </button>
            </div>

            <div className="bg-[#0D1220] border border-white/5 rounded-2xl p-4 shadow-sm opacity-80">
               <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-slate-300">2. TCHP</h4>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-slate-600 text-slate-400">92% Match</Badge>
               </div>
               <div className="flex gap-2">
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">NCCN</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">St. Gallen</span>
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
