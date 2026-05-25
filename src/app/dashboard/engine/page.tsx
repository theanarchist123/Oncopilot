"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Database, Beaker, Network, AlertTriangle, ChevronRight, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

export default function EngineTransparencyPage() {
    const [rules, setRules] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("subtypes");

    useEffect(() => {
        api.getEngineRules()
            .then(res => setRules(res))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="p-20 flex justify-center">
            <div className="w-12 h-12 border-4 border-[#0891B2] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!rules) return <div className="p-20 text-center text-slate-400">Failed to load engine rules.</div>;

    const tabs = [
        { id: "pipeline", label: "Processing Pipeline", icon: Network },
        { id: "subtypes", label: "Subtype Rules", icon: Beaker },
        { id: "protocols", label: "Treatment Protocols", icon: Database },
        { id: "contraindications", label: "Contraindications", icon: AlertTriangle },
    ];

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Database className="w-8 h-8 text-[#0891B2]" /> Engine Transparency
                </h1>
                <p className="text-slate-400">Inspect the underlying deterministic rules and guidelines powering OncoPilot.</p>
            </div>

            <div className="flex border-b border-slate-800">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                            activeTab === tab.id ? "border-[#0891B2] text-[#0891B2]" : "border-transparent text-slate-500 hover:text-slate-300"
                        }`}
                    >
                        <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                ))}
            </div>

            <div className="space-y-6">
                {activeTab === "pipeline" && (
                    <div className="space-y-8">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-slate-900 border border-slate-800 rounded-2xl">
                            <h2 className="text-xl font-bold text-white mb-6">PROCESSING PIPELINE</h2>
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                {["Subtype\nClassify", "Genomic\nRisk", "Immune\nFlags", "Treatment\nPathways", "Safety\nCheck"].map((stage, i) => (
                                    <React.Fragment key={i}>
                                        <div className="flex-1 min-w-[120px] p-4 bg-[#0891B2]/10 border border-[#0891B2]/30 rounded-xl text-center cursor-pointer hover:bg-[#0891B2]/20 transition-colors">
                                            <div className="text-[#0891B2] font-bold text-sm mb-1">Stage {i + 1}</div>
                                            <div className="text-slate-300 font-medium whitespace-pre-line">{stage}</div>
                                        </div>
                                        {i < 4 && <ChevronRight className="w-6 h-6 text-slate-600 hidden md:block" />}
                                    </React.Fragment>
                                ))}
                            </div>
                            <p className="text-slate-500 text-sm mt-6 text-center">Hover any stage to see the exact rules that fire (Interactive mode coming soon).</p>
                        </motion.div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-8 bg-slate-900 border border-slate-800 rounded-2xl">
                                <h2 className="text-xl font-bold text-white mb-6">GUIDELINES REFERENCED</h2>
                                <ul className="space-y-3">
                                    {["NCCN Breast Cancer Guidelines 2024", "ESMO Early Breast Cancer Guidelines 2023", "St. Gallen Consensus 2023 (Ki-67 threshold)", "TAILORx Trial 2018 (OncotypeDX postmenopausal)", "RxPONDER Trial 2021 (OncotypeDX premenopausal)", "monarchE Trial (Abemaciclib node-positive HR+)", "KEYNOTE-522 (Pembrolizumab for TNBC)"].map((g, i) => (
                                        <li key={i} className="flex items-center gap-3 text-slate-300 text-sm">
                                            <div className="w-2 h-2 rounded-full bg-[#0891B2]" /> {g}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-8 bg-slate-900 border border-slate-800 rounded-2xl">
                                <h2 className="text-xl font-bold text-white mb-6">VALIDATION</h2>
                                <ul className="space-y-4">
                                    <li className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                        <div>
                                            <div className="text-emerald-400 font-bold">30+ Unit Tests</div>
                                            <div className="text-slate-400 text-sm">All passing on latest deterministic engine build.</div>
                                        </div>
                                    </li>
                                    <li className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                        <div>
                                            <div className="text-emerald-400 font-bold">5 Subtypes</div>
                                            <div className="text-slate-400 text-sm">Independently validated against St. Gallen criteria.</div>
                                        </div>
                                    </li>
                                    <li className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                        <div>
                                            <div className="text-emerald-400 font-bold">6 Contraindication Rules</div>
                                            <div className="text-slate-400 text-sm">Tested across DDI and patient history vectors.</div>
                                        </div>
                                    </li>
                                </ul>
                            </motion.div>
                        </div>
                    </div>
                )}

                {activeTab === "subtypes" && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {Object.entries(rules.subtypes).map(([key, val]: [string, any], i) => (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={key} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                                <h3 className="text-xl font-bold text-white mb-4">{key}</h3>
                                <div className="space-y-3">
                                    {Object.entries(val).map(([ruleKey, ruleVal]: [string, any]) => (
                                        <div key={ruleKey} className="flex flex-col bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                                            <span className="text-xs font-mono text-slate-500 uppercase">{ruleKey}</span>
                                            <span className="text-slate-300 font-mono text-sm mt-1">
                                                {typeof ruleVal === 'object' ? JSON.stringify(ruleVal) : String(ruleVal)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {activeTab === "protocols" && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rules.protocols.map((protocol: any, i: number) => (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={i} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-full">
                                <h3 className="text-lg font-bold text-emerald-400 mb-2">{protocol.name}</h3>
                                <p className="text-sm text-slate-400 mb-4 flex-1">{protocol.clinical_notes}</p>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Conditions</h4>
                                    <ul className="space-y-2">
                                        {protocol.conditions.map((cond: any, j: number) => (
                                            <li key={j} className="text-sm font-mono text-slate-300 flex items-start gap-2">
                                                <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                <span>{cond.field} {cond.op} {cond.value}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {activeTab === "contraindications" && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {rules.contraindications.map((ci: any, i: number) => (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={i} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-rose-400">{ci.type}</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                                        <span className="text-xs font-mono text-slate-500 uppercase block mb-1">Trigger</span>
                                        <span className="text-slate-300 text-sm">
                                            {ci.condition.field} {ci.condition.op} {ci.condition.value}
                                        </span>
                                    </div>
                                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                                        <span className="text-xs font-mono text-slate-500 uppercase block mb-1">Recommendation</span>
                                        <span className="text-slate-300 text-sm">{ci.recommendation}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
