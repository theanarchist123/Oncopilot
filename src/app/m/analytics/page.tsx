"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar
} from "recharts";
import { mockAnalytics } from "@/lib/mock-data";

export default function MobileAnalyticsPage() {
  const subtypeData = Object.entries(mockAnalytics.subtypeDistribution).map(([name, value]) => ({ name, value }));
  const SUBTYPE_COLORS = ["#059669", "#0891B2", "#D97706", "#E11D48", "#64748b"];
  const stageData = Object.entries(mockAnalytics.casesByStage).map(([name, value]) => ({ name: `Stage ${name}`, value }));
  const biomarkerData = Object.entries(mockAnalytics.biomarkerPositivity).map(([name, value], i) => ({ name, value, x: i % 5, y: Math.floor(i / 5), z: value }));

  return (
    <div className="min-h-full p-4 space-y-5 pb-28">
      <div className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-0.5 font-mono uppercase">Clinical Command Center</h1>
        <p className="text-[#0891B2] font-semibold tracking-wider text-[11px] uppercase">Real-time Oncology Analytics</p>
      </div>

      {/* 1. Subtype Distribution Donut */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-slate-900 border border-white/10 rounded-2xl p-4 glass-dark relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#0891B2]/5 to-transparent pointer-events-none rounded-2xl" />
        <h3 className="text-white font-bold mb-3 font-mono text-sm">1. Subtype Distribution</h3>
        <div className="h-[220px] w-full">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={subtypeData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" stroke="rgba(255,255,255,0.1)">
                {subtypeData.map((_, index) => <Cell key={`cell-${index}`} fill={SUBTYPE_COLORS[index % SUBTYPE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff", fontSize: 11 }} itemStyle={{ color: "#fff" }} />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* 2. Monthly Volume Area */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-slate-900 border border-white/10 rounded-2xl p-4 glass-dark"
      >
        <h3 className="text-white font-bold mb-3 font-mono text-sm">2. Case Volume Trending</h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer>
            <AreaChart data={mockAnalytics.monthlyVolume} margin={{ left: -10, right: 5 }}>
              <defs>
                <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0891B2" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0891B2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff", fontSize: 11 }} />
              <Area type="monotone" dataKey="cases" stroke="#0891B2" strokeWidth={2} fillOpacity={1} fill="url(#colorCases)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* 3. Tumour Staging Bar */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-slate-900 border border-white/10 rounded-2xl p-4 glass-dark"
      >
        <h3 className="text-white font-bold mb-3 font-mono text-sm">3. Tumour Staging</h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer>
            <BarChart data={stageData} layout="vertical" margin={{ left: 10, right: 10 }}>
              <defs>
                {stageData.map((_, i) => (
                  <linearGradient key={`barGrad-${i}`} id={`barGrad-${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0F3460" />
                    <stop offset="100%" stopColor="#0891B2" />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis dataKey="name" type="category" stroke="#cbd5e1" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", fontSize: 11 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {stageData.map((_, index) => <Cell key={`cell-${index}`} fill={`url(#barGrad-${index})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* 4. Biomarker Positivity Bubbles */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-slate-900 border border-white/10 rounded-2xl p-4 glass-dark"
      >
        <h3 className="text-white font-bold mb-3 font-mono text-sm border-l-4 border-amber-500 pl-3">4. Biomarker Positivity Density</h3>
        <div className="h-[220px] w-full relative flex items-center justify-center">
          {biomarkerData.map((bm, i) => (
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + (i * 0.05) }}
              key={bm.name}
              className="absolute rounded-full border border-rose-500/50 flex flex-col items-center justify-center bg-rose-500/10 hover:bg-rose-500/30 transition-colors"
              style={{
                width: Math.max(36, bm.value * 1.2),
                height: Math.max(36, bm.value * 1.2),
                left: `${8 + (bm.x * 19)}%`,
                top: `${8 + (bm.y * 35)}%`,
              }}
            >
              <span className="text-[9px] font-bold text-white text-center leading-tight px-1">{bm.name}</span>
              <span className="text-[10px] font-mono text-rose-400">{bm.value}%</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 5. Safety Alert Velocity */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-slate-900 border border-white/10 rounded-2xl p-4 glass-dark"
      >
        <h3 className="text-rose-500 font-bold mb-3 font-mono text-sm">5. Safety Alert Velocity</h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer>
            <BarChart data={mockAnalytics.alertFrequency} margin={{ left: -10, right: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="type" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 9 }} angle={-35} textAnchor="end" height={50} />
              <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: "#0f172a", borderColor: "#e11d48", color: "#e11d48", fontSize: 11 }} />
              <Bar dataKey="count" fill="#e11d48" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
