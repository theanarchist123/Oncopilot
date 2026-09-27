"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, TrendingUp, Users, Activity, CheckCircle, Bell, Folders, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCasesStore } from "@/store";
import { getSubtypeBg, animateCounter, formatRelativeTime } from "@/lib/utils";

const StatCard = ({ title, value, trend, icon: Icon, delay }: { title: string, value: number, trend: string, icon: any, delay: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => { animateCounter(0, value, 2000, setDisplayValue); }, [value]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}
      className="p-4 rounded-2xl border border-white/5 bg-slate-900/50 glass-dark flex flex-col justify-between min-h-[100px]"
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{title}</p>
        <div className="w-7 h-7 rounded-lg bg-[#0891B2]/10 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-[#0891B2]" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">{displayValue.toLocaleString()}</h3>
      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/50">
        <TrendingUp className="w-3 h-3 text-emerald-400" />
        <span className="text-emerald-400 text-[11px] font-medium">{trend}</span>
        <span className="text-[11px] text-slate-500">vs last week</span>
      </div>
    </motion.div>
  );
};

export default function MobileDashboardHome() {
  const { cases, fetchCases, isLoading } = useCasesStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const filteredCases = (cases || []).filter(c => {
    if (filter !== "All" && c.status !== filter && c.subtype !== filter) return false;
    if (search && !c.patientName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-full p-4 space-y-5 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-0.5">Overview</h1>
          <p className="text-slate-400 text-xs">Welcome back, Dr. Sharma. 3 pending reviews.</p>
        </div>
        <Link href="/m/new">
          <Button variant="teal" className="h-9 px-3 text-xs shadow-[0_0_15px_rgba(8,145,178,0.3)]">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Case
          </Button>
        </Link>
      </div>

      {/* Stats — 2×2 grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Active Cases" value={142} trend="+12%" icon={Activity} delay={0.1} />
        <StatCard title="Total Patients" value={860} trend="+5%" icon={Users} delay={0.2} />
        <StatCard title="Completed" value={105} trend="+22%" icon={CheckCircle} delay={0.3} />
        <StatCard title="Pending Review" value={18} trend="-2%" icon={Bell} delay={0.4} />
      </div>

      {/* Search + Filters */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input
            placeholder="Search patients..."
            className="pl-8 h-10 text-sm bg-slate-900 border-white/10 text-white placeholder:text-slate-500 rounded-xl"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {["All", "Under Analysis", "Treatment Decided", "Pending Review", "HER2-Enriched"].map(f => (
            <Badge
              key={f} onClick={() => setFilter(f)}
              variant={filter === f ? "teal" : "outline"}
              className={`cursor-pointer shrink-0 rounded-lg px-2.5 py-1 text-[11px] transition-colors ${filter !== f ? 'border-white/10 text-slate-400 bg-transparent' : ''}`}
            >{f}</Badge>
          ))}
        </div>
      </div>

      {/* Case List */}
      <div className="space-y-2.5">
        <AnimatePresence>
          {filteredCases.map((c, i) => (
            <motion.div
              key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2, delay: i * 0.04 }}
              className="relative bg-slate-900 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors"
            >
              <div className={`absolute top-0 bottom-0 left-0 w-1.5 rounded-l-2xl`}
                style={{ background: getSubtypeBg(c.subtype).includes('emerald') ? '#059669' : getSubtypeBg(c.subtype).includes('amber') ? '#d97706' : getSubtypeBg(c.subtype).includes('purple') ? '#9333ea' : getSubtypeBg(c.subtype).includes('rose') ? '#e11d48' : '#0891B2' }}
              />
              <Link href={`/m/results/${c.id}`} className="flex items-start gap-3 p-3.5 pl-5">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-white text-xs shrink-0 mt-0.5">
                  {c.patientName.split(" ").map((n: string) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-bold text-sm text-white truncate">{c.patientName}</h4>
                    <span className="text-[10px] text-slate-500 shrink-0">{formatRelativeTime(c.updatedAt)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">{c.patientAge}y • {c.patientSex} • {c.id.slice(0,8).toUpperCase()}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-[10px] py-0 px-2 ${getSubtypeBg(c.subtype)}`}>{c.subtype}</Badge>
                    <span className="text-[11px] text-slate-400">Stage {c.tumour?.stage}</span>
                    {c.status === "Under Analysis" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-[#0F3460]/40 text-[#0891B2] px-2 py-0.5 rounded-full border border-[#0F3460]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0891B2] status-analyzing inline-block" />Under Analysis
                      </span>
                    ) : c.status === "Treatment Decided" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Treatment Decided
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />{c.status}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-600 shrink-0 mt-1" />
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredCases.length === 0 && (
          <div className="py-14 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl">
            {isLoading ? (
              <><div className="w-8 h-8 border-4 border-[#0891B2] border-t-transparent rounded-full animate-spin mb-3" /><p className="text-slate-400 text-sm">Loading cases...</p></>
            ) : (
              <><Folders className="w-10 h-10 text-slate-600 mb-3 opacity-50" /><p className="text-slate-300 font-medium mb-1">No cases found</p><p className="text-slate-500 text-xs text-center px-8 mb-4">Adjust filters or create a new case.</p><Link href="/m/new"><Button variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 text-xs h-8">Start New Case</Button></Link></>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
