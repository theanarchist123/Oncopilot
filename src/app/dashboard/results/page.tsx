"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { 
    Activity, ChevronLeft, HeartPulse, Dna, FileText, CheckCircle2,
    Share2, Download, Check, AlertCircle, ShieldAlert,
    Network, ArrowRight, X, FlaskConical, Stethoscope, Beaker, Pill, ChevronRight, ChevronDown,
    Brain, TrendingUp, Info, Microscope, BookOpen, Zap, Star, TriangleAlert, Gauge, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalysisResultStore } from "@/store";
import { api } from "@/lib/api";

// ─── Colour config per subtype ────────────────────────────────────────────────
const SUBTYPE_CFG: Record<string, { color: string; bg: string; border: string; glow: string; short: string }> = {
    "Luminal A":         { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", glow: "shadow-emerald-500/20", short: "HR+/HER2-/Ki67-Low" },
    "Luminal B (HER2-)": { color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   glow: "shadow-amber-500/20",   short: "HR+/HER2-/Ki67-High" },
    "Luminal B (HER2+)": { color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30",  glow: "shadow-orange-500/20",  short: "HR+/HER2+" },
    "HER2-Enriched":     { color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/30",  glow: "shadow-purple-500/20",  short: "HR-/HER2+" },
    "Triple-Negative":   { color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/30",    glow: "shadow-rose-500/20",    short: "ER-/PR-/HER2-" },
};
const DEFAULT_CFG = { color: "text-[#0891B2]", bg: "bg-[#0891B2]/10", border: "border-[#0891B2]/30", glow: "shadow-[#0891B2]/20", short: "See report" };

// ─── Confidence Ring ──────────────────────────────────────────────────────────
function ConfidenceRing({ value }: { value: number }) {
    const pct = Math.round(value * 100);
    const r = 52, circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    const color = pct >= 80 ? "#059669" : pct >= 60 ? "#d97706" : "#e11d48";
    return (
        <div className="relative flex items-center justify-center group cursor-help">
            <svg className="rotate-[-90deg]" width="130" height="130">
                <circle cx="65" cy="65" r={r} fill="none" stroke="#1e293b" strokeWidth="12" />
                <motion.circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="12"
                    strokeLinecap="round" strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                />
            </svg>
            <div className="absolute flex flex-col items-center mt-1">
                <div className="flex items-center gap-1 -ml-2">
                    <span className="text-2xl font-bold font-mono text-white">{pct}%</span>
                    <Info className="w-3 h-3 text-slate-500 -mt-2" />
                </div>
                <span className="text-xs text-slate-400">confidence</span>
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 w-64 p-3 bg-slate-800 text-xs text-slate-300 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center border border-slate-700">
                Confidence based on NCCN Evidence Category 1 (uniform expert consensus across Phase III trials). Higher confidence indicates stronger guideline support, not outcome guarantee.
            </div>
        </div>
    );
}

// ─── NCCN Category badge ──────────────────────────────────────────────────────
function NccnBadge({ text }: { text: string }) {
    const cat = text?.includes("1") ? "1" : text?.includes("2A") ? "2A" : text?.includes("2B") ? "2B" : "3";
    const colors: Record<string, string> = { "1": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", "2A": "bg-[#0891B2]/20 text-[#0891B2] border-[#0891B2]/30", "2B": "bg-amber-500/20 text-amber-400 border-amber-500/30", "3": "bg-slate-700 text-slate-300 border-slate-600" };
    return <span className={`text-xs px-2 py-0.5 rounded-full border font-mono font-bold ${colors[cat] ?? colors["2A"]}`}>NCCN Cat {cat}</span>;
}

function EsmoBadge({ text }: { text: string }) {
    const grade = text?.includes("Grade A") ? "A" : text?.includes("Grade B") ? "B" : "C";
    const colors: Record<string, string> = { A: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", B: "bg-amber-500/20 text-amber-400 border-amber-500/30", C: "bg-slate-700 text-slate-300 border-slate-600" };
    return <span className={`text-xs px-2 py-0.5 rounded-full border font-mono font-bold ${colors[grade] ?? colors["B"]}`}>ESMO {grade}</span>;
}

// ─── Simulation / Treatment Path Card ────────────────────────────────────────
function PathCard({ rec, rank, isExpanded, onToggle }: {
    rec: Record<string, any>; rank: number; isExpanded: boolean; onToggle: () => void;
}) {
    const g = rec.guideline_explainability ?? {};
    const confPct = Math.round((rec.confidence_score ?? 0) * 100);
    const isPrimary = rank === 1;

    const rankLabel = ["PRIMARY", "ALTERNATIVE", "ESCALATION", "SALVAGE"][rank - 1] ?? `PATH ${rank}`;
    const rankColors = [
        "bg-[#0891B2] text-white",
        "bg-purple-500/20 text-purple-400 border border-purple-500/30",
        "bg-amber-500/20 text-amber-400 border border-amber-500/30",
        "bg-slate-700 text-slate-300 border border-slate-600",
    ];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: rank * 0.07 }}
            className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                isPrimary
                    ? "border-[#0891B2]/40 shadow-xl shadow-[#0891B2]/10"
                    : "border-slate-800 hover:border-slate-700"
            }`}
        >
            {/* Header row — always visible */}
            <button onClick={onToggle} className="w-full p-5 flex items-start gap-4 text-left bg-black/20 hover:bg-black/30 transition-colors">
                {/* Rank number */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                    isPrimary ? "bg-[#0891B2] text-white" : "bg-slate-800 text-slate-400"
                }`}>
                    {rank}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${rankColors[rank - 1]}`}>{rankLabel}</span>
                        <span className="text-xs text-slate-500 font-mono">{rec.guideline_source}</span>
                    </div>
                    <h3 className="font-bold text-white text-base leading-tight">{rec.protocol_name}</h3>
                    <p className="text-slate-400 text-sm mt-0.5 line-clamp-1">{rec.clinical_notes}</p>

                    {/* Drug tags */}
                    {(rec.drug_names || rec.drugs)?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {(rec.drug_names || rec.drugs).slice(0, 4).map((d: string, i: number) => (
                                <span key={i} className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                                    {d}
                                </span>
                            ))}
                            {(rec.drug_names || rec.drugs).length > 4 && (
                                <span className="text-xs text-slate-500">+{(rec.drug_names || rec.drugs).length - 4} more</span>
                            )}
                        </div>
                    )}
                </div>

                <div className="text-right shrink-0 flex flex-col items-end gap-2">
                    <div>
                        <div className={`text-xl font-black font-mono ${confPct >= 85 ? "text-emerald-400" : confPct >= 70 ? "text-amber-400" : "text-slate-300"}`}>
                            {confPct}%
                        </div>
                        <div className="text-xs text-slate-500">protocol fit</div>
                    </div>

                    {g.nccn_category && <NccnBadge text={g.nccn_category} />}
                    {g.esmo_grade && <EsmoBadge text={g.esmo_grade} />}

                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
            </button>

            {/* Expanded guideline explainability */}
            <AnimatePresence>
                {isExpanded && g && Object.keys(g).length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 pt-2 border-t border-slate-800 bg-slate-900/60 space-y-5">
                            {/* Guideline evidence row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">NCCN Recommendation</p>
                                    <p className="text-sm text-slate-300">{g.nccn_category}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">ESMO Evidence Grade</p>
                                    <p className="text-sm text-slate-300">{g.esmo_grade}</p>
                                </div>
                            </div>

                            {/* Clinical trial evidence */}
                            {g.trial_evidence && (
                                <div className="flex gap-3 p-3 rounded-xl bg-[#0891B2]/5 border border-[#0891B2]/20">
                                    <BookOpen className="w-4 h-4 text-[#0891B2] shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-[#0891B2] font-bold uppercase tracking-wider mb-1">Supporting Trial Evidence</p>
                                        <p className="text-sm text-slate-300">{g.trial_evidence}</p>
                                    </div>
                                </div>
                            )}

                            {/* Mechanism */}
                            {g.mechanism && (
                                <div className="flex gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                                    <FlaskConical className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-1">Drug Mechanism</p>
                                        <p className="text-sm text-slate-300">{g.mechanism}</p>
                                    </div>
                                </div>
                            )}

                            {/* Bottom 3-col grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {g.who_benefits_most && (
                                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                        <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <Star className="w-3 h-3" /> Who Benefits Most
                                        </p>
                                        <p className="text-xs text-slate-300">{g.who_benefits_most}</p>
                                    </div>
                                )}
                                {g.monitoring && (
                                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                        <p className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <Activity className="w-3 h-3" /> Monitoring
                                        </p>
                                        <p className="text-xs text-slate-300">{g.monitoring}</p>
                                    </div>
                                )}
                                {g.alternative_if_intolerant && (
                                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <ChevronRight className="w-3 h-3" /> If Intolerant
                                        </p>
                                        <p className="text-xs text-slate-300">{g.alternative_if_intolerant}</p>
                                    </div>
                                )}
                            </div>

                            {/* Rule trace if present */}
                            {rec.rule_trace?.length > 0 && (
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">Biomarker Rationale</p>
                                    <div className="flex flex-wrap gap-2">
                                        {rec.rule_trace.map((r: any, i: number) => (
                                            <span key={i} className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded-lg font-mono">
                                                <span className="text-[#0891B2] font-bold">{r.biomarker}:</span> {r.implication ?? r.conclusion}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

const PrognosticScores = ({ scores }: { scores: any }) => {
    if (!scores || (!scores.npi && !scores.cts5)) return null;

    const renderGauge = (title: string, data: any, min: number, max: number) => {
        if (!data) return null;
        const pct = Math.min(Math.max((data.score - min) / (max - min), 0), 1);
        const rotation = pct * 180;
        let color = "#10b981"; // green
        if (pct > 0.4) color = "#f59e0b"; // amber
        if (pct > 0.7) color = "#ef4444"; // red

        return (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center">
                <h3 className="text-slate-300 font-semibold mb-6 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-[#0891B2]" /> {title}
                </h3>
                <div className="relative w-48 h-24 overflow-hidden mb-6 flex justify-center mt-4">
                    <svg viewBox="0 0 200 100" className="w-full h-full">
                        <defs>
                            <linearGradient id={`${title.replace(/\s+/g,'')}Grad`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#10b981" />
                                <stop offset="50%" stopColor="#f59e0b" />
                                <stop offset="100%" stopColor="#ef4444" />
                            </linearGradient>
                        </defs>
                        <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke={`url(#${title.replace(/\s+/g,'')}Grad)`} strokeWidth="20" strokeLinecap="round" />
                        <motion.g 
                            initial={{ rotate: 0 }}
                            animate={{ rotate: rotation }}
                            transition={{ duration: 1, delay: 0.5 }}
                            style={{ transformOrigin: "100px 100px" }}
                        >
                            <path d="M 95 100 L 100 20 L 105 100 Z" fill="#fff" />
                            <circle cx="100" cy="100" r="8" fill="#fff" />
                        </motion.g>
                    </svg>
                    <div className="absolute bottom-0 text-3xl font-bold font-mono text-white bg-slate-900 border border-slate-800 rounded-xl px-4 py-1 translate-y-2">
                        {data.score}
                    </div>
                </div>
                <div className="mt-4 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider border" style={{ borderColor: color, color: color, backgroundColor: `${color}1A` }}>
                    {data.category}
                </div>
            </div>
        );
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="space-y-4">
            <h2 className="font-semibold text-white">Prognostic Risk Scores</h2>
            <div className="grid md:grid-cols-2 gap-6">
                {renderGauge("Nottingham Prognostic Index (NPI)", scores.npi, 2.0, 7.0)}
                {renderGauge("CTS5 Risk Score", scores.cts5, 1.0, 6.0)}
            </div>
        </motion.div>
    );
};

const DoctorFinalizationPanel = ({ caseId, recommendations }: { caseId: string | null, recommendations: any[] }) => {
    const [decision, setDecision] = useState<string>("accept");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [finalized, setFinalized] = useState(false);

    if (!caseId) return null; // Can't finalize if case is not saved
    if (finalized) return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-2xl flex items-center justify-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
            <span className="font-bold">Treatment Plan Finalized Successfully</span>
        </motion.div>
    );

    const submit = async () => {
        setLoading(true);
        try {
            await api.finalizeCase(caseId, {
                decision,
                final_treatment_plan: decision === "override" ? {} : recommendations[0],
                override_reason: reason
            });
            setFinalized(true);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="p-6 rounded-2xl bg-slate-900 border border-[#0891B2]/30 space-y-6 mt-8">
            <h2 className="font-bold text-white flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-[#0891B2]" /> Doctor Finalization
            </h2>
            <div className="flex flex-col md:flex-row gap-4">
                <label className={`flex-1 p-4 rounded-xl border cursor-pointer transition-all ${decision === 'accept' ? 'bg-[#0891B2]/10 border-[#0891B2] text-[#0891B2]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                    <input type="radio" name="decision" value="accept" checked={decision === 'accept'} onChange={() => setDecision('accept')} className="hidden" />
                    <CheckCircle2 className="w-5 h-5 mb-2" />
                    <div className="font-bold text-sm">Accept Primary Path</div>
                </label>
                <label className={`flex-1 p-4 rounded-xl border cursor-pointer transition-all ${decision === 'modify' ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                    <input type="radio" name="decision" value="modify" checked={decision === 'modify'} onChange={() => setDecision('modify')} className="hidden" />
                    <Activity className="w-5 h-5 mb-2" />
                    <div className="font-bold text-sm">Accept with Modifications</div>
                </label>
                <label className={`flex-1 p-4 rounded-xl border cursor-pointer transition-all ${decision === 'override' ? 'bg-rose-500/10 border-rose-500 text-rose-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                    <input type="radio" name="decision" value="override" checked={decision === 'override'} onChange={() => setDecision('override')} className="hidden" />
                    <X className="w-5 h-5 mb-2" />
                    <div className="font-bold text-sm">Override Completely</div>
                </label>
            </div>
            {decision !== 'accept' && (
                <textarea 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#0891B2] resize-none h-24"
                    placeholder={`Provide clinical rationale for ${decision === 'modify' ? 'modifications' : 'override'}...`}
                    value={reason} onChange={e => setReason(e.target.value)}
                />
            )}
            <Button onClick={submit} disabled={loading || (decision !== 'accept' && !reason)} variant="teal" className="w-full h-12">
                {loading ? "Finalizing..." : "Sign & Finalize Treatment Plan"}
            </Button>
        </motion.div>
    );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
function ResultsContent() {
    const router = useRouter();
    const result = useAnalysisResultStore((s) => s.result);
    const setResult = useAnalysisResultStore((s) => s.setResult);
    const search = useSearchParams();
    const caseId = search?.get("caseId");
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [expandedPaths, setExpandedPaths] = useState<Record<number, boolean>>({ 0: true }); // first path open by default
    const [simulationOpen, setSimulationOpen] = useState(true);

    useEffect(() => {
        if (!result && caseId) {
            setLoadingAnalysis(true);
            api.runAnalysis(caseId).then((res) => {
                // backend already returns full analysis result shape expected by the UI
                setResult({ ...res, analyzed_at: new Date().toISOString() });
            }).catch((err) => {
                console.error("Failed to load analysis for case", caseId, err);
                // If analysis failed, fall back to case detail page
                router.replace(`/dashboard/cases/${caseId}`);
            }).finally(() => setLoadingAnalysis(false));
        } else if (!result && !caseId) {
            if (typeof window !== "undefined") router.replace("/dashboard/cases/new");
        }
    }, [caseId, result, setResult, router]);

    if (!result && loadingAnalysis) {
        return <div className="p-20 text-center">Loading AI report...</div>;
    }

    if (!result) {
        return null;
    }

    const cfg = SUBTYPE_CFG[result.molecular_subtype] ?? DEFAULT_CFG;
    const ai = result.ai_reasoning ?? {};
    const recs = result.recommendations ?? [];

    const togglePath = (i: number) =>
        setExpandedPaths(prev => ({ ...prev, [i]: !prev[i] }));

    return (
        <div className="max-w-6xl mx-auto p-6 py-10 space-y-8">

            {/* Breadcrumb */}
            <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {/* ── Hero: Subtype + Confidence ── */}
            <motion.div
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className={`relative p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border ${cfg.border} overflow-hidden`}
            >
                <div className={`absolute -top-20 -right-20 w-80 h-80 rounded-full ${cfg.bg} blur-3xl opacity-60`} />
                <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Molecular Classification</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} ${cfg.border} border font-mono`}>
                                AI-Enhanced · {recs[0]?.guideline_source ?? "NCCN"} Aligned
                            </span>
                        </div>
                        <h1 className={`text-4xl md:text-5xl font-black ${cfg.color} mb-1`}>{result.molecular_subtype}</h1>
                        <p className="text-slate-400 text-sm font-mono">{cfg.short}</p>
                        {result.patient_name && (
                            <p className="text-slate-300 mt-3 font-medium">
                                Patient: <span className="text-white">{result.patient_name}</span>
                                {result.patient_age && <span className="text-slate-400">, {result.patient_age} yrs</span>}
                            </p>
                        )}
                        <p className="text-xs text-slate-600 mt-1">
                            Analyzed {new Date(result.analyzed_at).toLocaleString()}
                        </p>
                    </div>
                    <ConfidenceRing value={result.subtype_confidence} />
                </div>
            </motion.div>

            {/* ── AI Rationale + Prognosis row ── */}
            <div className="grid md:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                    className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#0891B2]/10 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-[#0891B2]" />
                        </div>
                        <h2 className="font-semibold text-white">Guideline-Based Rationale</h2>
                        <span className="ml-auto text-xs text-[#0891B2] bg-[#0891B2]/10 border border-[#0891B2]/30 px-2 py-0.5 rounded-full font-mono">NCCN/ESMO Rules-Based</span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        {ai.subtype_rationale ?? "Classification based on NCCN/St. Gallen biomarker criteria."}
                    </p>
                    {(ai.key_biomarkers?.length ?? 0) > 0 && (
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Key Biomarkers</p>
                            <div className="flex flex-wrap gap-2">
                                {ai.key_biomarkers?.map((b: string, i: number) => (
                                    <span key={i} className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded-lg font-mono">{b}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                    className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                        </div>
                        <h2 className="font-semibold text-white">Prognosis & Confidence</h2>
                    </div>
                    <div className={`p-4 rounded-xl ${cfg.bg} ${cfg.border} border`}>
                        <p className={`text-sm font-medium ${cfg.color} mb-1`}>Clinical Outlook</p>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            {ai.prognosis_summary ?? "Prognosis aligned with standard-of-care treatment for identified molecular subtype."}
                        </p>
                    </div>
                    {ai.confidence_explanation && (
                        <div className="flex gap-2 text-xs text-slate-400 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                            <Info className="w-4 h-4 text-[#0891B2] shrink-0 mt-0.5" />
                            <span>{ai.confidence_explanation}</span>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* ── Prognostic Scores ── */}
            <PrognosticScores scores={result.risk_scores} />

            {/* ══ AI SIMULATION PANEL ══════════════════════════════════════════════ */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                {/* Panel header with toggle */}
                <button
                    onClick={() => setSimulationOpen(p => !p)}
                    className="w-full flex items-center gap-4 p-5 rounded-t-2xl bg-gradient-to-r from-[#0F3460] to-slate-900 border border-[#0891B2]/30 hover:border-[#0891B2]/60 transition-all"
                >
                    <div className="w-10 h-10 rounded-xl bg-[#0891B2]/20 border border-[#0891B2]/30 flex items-center justify-center">
                        <Beaker className="w-5 h-5 text-[#0891B2]" />
                    </div>
                    <div className="flex-1 text-left">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            AI Treatment Simulation
                            <span className="text-xs bg-[#0891B2]/20 text-[#0891B2] border border-[#0891B2]/30 px-2 py-0.5 rounded-full font-mono">
                                {recs.length} path{recs.length !== 1 ? "s" : ""} generated
                            </span>
                        </h2>
                        <p className="text-slate-400 text-sm">
                            {recs.length} ranked treatment pathways with NCCN Category &amp; ESMO Grade explainability
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 hidden md:block">Click any path to expand guideline reasoning</span>
                        <ChevronDown className={`w-5 h-5 text-[#0891B2] transition-transform ${simulationOpen ? "" : "rotate-180"}`} />
                    </div>
                </button>

                <AnimatePresence>
                    {simulationOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35 }}
                            className="overflow-hidden"
                        >
                            <div className="rounded-b-2xl border-x border-b border-[#0891B2]/20 bg-slate-900/40 p-4 space-y-3">
                                {recs.length === 0 ? (
                                    <p className="text-slate-500 text-sm text-center py-6">No treatment paths generated for this profile.</p>
                                ) : (
                                    recs.map((rec, i) => (
                                        <PathCard
                                            key={i}
                                            rec={rec}
                                            rank={rec.rank ?? i + 1}
                                            isExpanded={!!expandedPaths[i]}
                                            onToggle={() => togglePath(i)}
                                        />
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* ── Alerts + Rule Trace row ── */}
            <div className="grid md:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                    className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                            <ShieldAlert className="w-4 h-4 text-rose-400" />
                        </div>
                        <h2 className="font-semibold text-white">Safety Alerts</h2>
                        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-mono ${
                            result.alerts.filter((a: any) => a.alert_type !== "DDI").length === 0
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                            {result.alerts.filter((a: any) => a.alert_type !== "DDI").length === 0 ? "✓ None" : `${result.alerts.filter((a: any) => a.alert_type !== "DDI").length} alert${result.alerts.filter((a: any) => a.alert_type !== "DDI").length > 1 ? "s" : ""}`}
                        </span>
                    </div>
                    {result.alerts.filter((a: any) => a.alert_type !== "DDI").length === 0 ? (
                        <div className="flex items-center gap-3 text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-sm">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            No contraindications or safety alerts for this patient profile.
                        </div>
                    ) : (
                        result.alerts.filter((a: any) => a.alert_type !== "DDI").map((a: any, i: number) => (
                            <div key={i} className="flex gap-3 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl text-sm">
                                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-rose-400 font-medium">{a.alert_type}</p>
                                    <p className="text-slate-300 font-medium mt-0.5">{a.trigger}</p>
                                    <p className="text-slate-400 mt-1">{a.recommended_action}</p>
                                </div>
                            </div>
                        ))
                    )}
                    {ai.clinical_considerations && (
                        <div className="text-xs text-slate-400 bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex gap-2">
                            <HeartPulse className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            <span>{ai.clinical_considerations}</span>
                        </div>
                    )}
                </motion.div>

                {/* Drug-Drug Interactions */}
                {result.alerts.filter((a: any) => a.alert_type === "DDI").length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
                        className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 md:col-span-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                <Pill className="w-4 h-4 text-orange-400" />
                            </div>
                            <h2 className="font-semibold text-white">Drug-Drug Interactions (DDI)</h2>
                            <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                {result.alerts.filter((a: any) => a.alert_type === "DDI").length} DDI{result.alerts.filter((a: any) => a.alert_type === "DDI").length > 1 ? "s" : ""}
                            </span>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            {result.alerts.filter((a: any) => a.alert_type === "DDI").map((a: any, i: number) => (
                                <div key={i} className="flex gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 text-[10px] font-bold tracking-widest text-orange-500/50 uppercase">{a.severity}</div>
                                    <Pill className="w-5 h-5 text-orange-400 shrink-0 mt-1" />
                                    <div className="flex-1 pr-6">
                                        <p className="text-orange-400 font-bold mb-1">{a.trigger}</p>
                                        <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">{a.recommended_action}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Dna className="w-4 h-4 text-amber-400" />
                        </div>
                        <h2 className="font-semibold text-white">Classification Logic</h2>
                    </div>
                    {result.rule_trace.map((r, i) => (
                        <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-800 last:border-0">
                            <div className="w-5 h-5 rounded-full bg-[#0891B2]/10 border border-[#0891B2]/30 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs text-[#0891B2] font-bold">{i + 1}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold text-slate-300">{r.label}</span>
                                    {r.value && <span className="text-xs font-mono text-[#0891B2] bg-[#0891B2]/10 px-1.5 py-0.5 rounded">{r.value}</span>}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{r.conclusion}</p>
                                {r.label === "Ki-67" && parseFloat(r.value || "0") >= 15 && parseFloat(r.value || "0") <= 25 && (
                                    <div className="mt-2 text-xs text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                                        ⚠️ Borderline Ki-67 — genomic assay (OncotypeDX/MammaPrint) recommended for confirmation
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Doctor Finalization */}
            {result.case_id && <DoctorFinalizationPanel caseId={result.case_id} recommendations={recs} />}

            {/* Footer */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="flex flex-wrap gap-3 justify-end pt-4 border-t border-slate-800">
                {result.case_id && (
                    <Button variant="outline" onClick={() => window.open(`/patient?caseId=${result.case_id}`, '_blank')} className="border-slate-700 bg-slate-900 text-slate-300 gap-2 mr-auto">
                        <Share2 className="w-4 h-4 text-[#0891B2]" /> Open Patient Portal
                    </Button>
                )}
                <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-300 gap-2">
                    <Download className="w-4 h-4" /> Export PDF
                </Button>
                <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-300 gap-2">
                    <Share2 className="w-4 h-4" /> Second Opinion
                </Button>
                <Button variant="teal" onClick={() => router.push("/dashboard/cases/new")} className="gap-2">
                    <Activity className="w-4 h-4" /> New Analysis
                </Button>
            </motion.div>
        </div>
    );
}

export default function AnalysisResultsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>}>
            <ResultsContent />
        </Suspense>
    );
}
