"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, Users, CheckCircle, Bell, ArrowUpRight } from "lucide-react";
import { useCasesStore } from "@/store";
import { getSubtypeBg, formatRelativeTime } from "@/lib/utils";

// Mobile Stat Card component
const MobileStatCard = ({ title, value, icon: Icon, delay }: { title: string, value: number, icon: any, delay: number }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4, delay }}
    className="min-w-[140px] p-4 rounded-2xl border border-white/5 bg-[#0D1220] flex flex-col justify-between shadow-sm mr-3"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="w-8 h-8 rounded-xl bg-[#0891B2]/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-[#0891B2]" />
      </div>
    </div>
    <div>
      <h3 className="text-2xl font-bold text-white mb-0.5">{value}</h3>
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{title}</p>
    </div>
  </motion.div>
);

export default function MobileDashboardHome() {
  const { cases, fetchCases, isLoading } = useCasesStore();

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  return (
    <div className="flex flex-col min-h-full">
      {/* Welcome Banner */}
      <div className="px-6 py-6 bg-mesh">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back, Dr. Sharma</h1>
          <p className="text-sm text-slate-400">You have 3 pending reviews today.</p>
        </motion.div>
      </div>

      {/* Horizontal Stats Scroll */}
      <div className="pl-6 pb-6 overflow-x-auto scrollbar-hide flex">
        <MobileStatCard title="Active Cases" value={142} icon={Activity} delay={0.1} />
        <MobileStatCard title="Total Patients" value={860} icon={Users} delay={0.2} />
        <MobileStatCard title="Completed" value={105} icon={CheckCircle} delay={0.3} />
        <MobileStatCard title="Review" value={18} icon={Bell} delay={0.4} />
      </div>

      {/* Recent Cases */}
      <div className="px-6 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Recent Cases</h2>
          <Link href="/m/cases" className="text-sm text-[#0891B2] font-medium hover:underline">
            View All
          </Link>
        </div>

        <div className="space-y-3 pb-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#0891B2] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            cases.slice(0, 5).map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Link href={`/m/results/${c.id}`} className="block relative bg-[#0D1220] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors p-4">
                  {/* Color bar */}
                  <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${getSubtypeBg(c.subtype).split(' ')[1]}`} style={{ backgroundColor: getSubtypeBg(c.subtype).split(' ').find(cls => cls.startsWith('text-'))?.replace('text-', '') }} />
                  
                  <div className="flex items-start justify-between pl-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-base text-white mb-0.5">{c.patientName}</h4>
                      <p className="text-[11px] text-slate-400 mb-2">{c.patientAge}y • {c.patientSex} • {c.subtype}</p>
                      
                      {/* Status pill */}
                      <div className="inline-flex items-center gap-1.5 bg-[#0F3460]/40 text-[#0891B2] px-2 py-1 rounded-md border border-[#0F3460]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0891B2] status-analyzing" />
                        <span className="text-[10px] font-semibold">{c.status}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[10px] text-slate-500">{formatRelativeTime(c.updatedAt)}</span>
                      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
