"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowUpRight, Folders } from "lucide-react";
import { useCasesStore } from "@/store";
import { getSubtypeBg, formatRelativeTime } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function MobileCasesPage() {
  const { cases, fetchCases, isLoading } = useCasesStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const filteredCases = (cases || []).filter(c => {
     if (filter !== "All" && c.status !== filter && c.subtype !== filter) return false;
     if (search && !c.patientName?.toLowerCase().includes(search.toLowerCase())) return false;
     return true;
  });

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-6 py-4 sticky top-0 bg-[#07091C]/90 backdrop-blur-md z-10 border-b border-white/5">
        <h1 className="text-xl font-bold text-white mb-4">Patient Cases</h1>
        
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Search patients..." 
            className="pl-9 bg-[#0D1220] border-white/10 text-white placeholder:text-slate-500 rounded-xl h-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {["All", "Under Analysis", "Treatment Decided", "Pending Review", "HER2-Enriched", "TNBC"].map(f => (
             <Badge
               key={f} 
               variant={filter === f ? "teal" : "outline"}
               className={`cursor-pointer shrink-0 rounded-lg px-3 py-1.5 transition-colors ${filter !== f ? 'border-white/10 text-slate-400 hover:text-white bg-[#0D1220]' : ''}`}
               onClick={() => setFilter(f)}
             >
               {f}
             </Badge>
          ))}
        </div>
      </div>

      <div className="px-6 pt-4 pb-20 space-y-3">
        <AnimatePresence>
          {filteredCases.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
            >
              <Link href={`/m/results/${c.id}`} className="block relative bg-[#0D1220] border border-white/5 rounded-2xl overflow-hidden active:border-white/20 transition-colors p-4">
                <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${getSubtypeBg(c.subtype).split(' ')[1]}`} style={{ backgroundColor: getSubtypeBg(c.subtype).split(' ').find(cls => cls.startsWith('text-'))?.replace('text-', '') }} />
                
                <div className="flex items-start justify-between pl-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-base text-white mb-0.5">{c.patientName}</h4>
                    <p className="text-[11px] text-slate-400 mb-2">{c.patientAge}y • {c.patientSex} • {c.subtype}</p>
                    
                    <div className="inline-flex items-center gap-1.5 bg-[#0F3460]/40 text-[#0891B2] px-2 py-1 rounded-md border border-[#0F3460]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0891B2]" />
                      <span className="text-[10px] font-semibold">{c.status}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end justify-between h-full min-h-[60px]">
                    <span className="text-[10px] text-slate-500">{formatRelativeTime(c.updatedAt)}</span>
                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredCases.length === 0 && !isLoading && (
          <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-[#0D1220]">
             <Folders className="w-12 h-12 text-slate-600 mb-4 opacity-50" />
             <h3 className="text-xl font-medium text-slate-300 mb-2">No cases found</h3>
             <p className="text-slate-500 text-sm">Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
