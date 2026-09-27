"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, HeartPulse, Dna, CheckCircle2, AlertCircle,
  ShieldAlert, ChevronDown, FlaskConical, BookOpen, Stethoscope,
  Zap, Star, Info, TrendingUp, Gauge, Pill, Activity, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalysisResultStore } from "@/store";
import { api } from "@/lib/api";

// ── Colour config (same as desktop) ──────────────────────────────────────────
const SUBTYPE_CFG: Record<string, { color: string; bg: string; border: string; short: string }> = {
  "Luminal A":         { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", short: "HR+/HER2-/Ki67-Low" },
  "Luminal B (HER2-)": { color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   short: "HR+/HER2-/Ki67-High" },
  "Luminal B (HER2+)": { color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30",  short: "HR+/HER2+" },
  "HER2-Enriched":     { color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/30",  short: "HR-/HER2+" },
  "Triple-Negative":   { color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/30",    short: "ER-/PR-/HER2-" },
};
const DEFAULT_CFG = { color: "text-[#0891B2]", bg: "bg-[#0891B2]/10", border: "border-[#0891B2]/30", short: "See report" };

function NccnBadge({ text }: { text: string }) {
  const cat = text?.includes("1") ? "1" : text?.includes("2A") ? "2A" : text?.includes("2B") ? "2B" : "3";
  const colors: Record<string, string> = { "1": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", "2A": "bg-[#0891B2]/20 text-[#0891B2] border-[#0891B2]/30", "2B": "bg-amber-500/20 text-amber-400 border-amber-500/30", "3": "bg-slate-700 text-slate-300 border-slate-600" };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-bold ${colors[cat] ?? colors["2A"]}`}>NCCN Cat {cat}</span>;
}

function PathCard({ rec, rank, isExpanded, onToggle }: { rec: any; rank: number; isExpanded: boolean; onToggle: () => void }) {
  const g = rec.guideline_explainability ?? {};
  const confPct = Math.round((rec.confidence_score ?? 0) * 100);
  const isPrimary = rank === 1;
  const rankLabel = ["PRIMARY", "ALTERNATIVE", "ESCALATION", "SALVAGE"][rank - 1] ?? `PATH ${rank}`;
  const rankColors = ["bg-[#0891B2] text-white", "bg-purple-500/20 text-purple-400 border border-purple-500/30", "bg-amber-500/20 text-amber-400 border border-amber-500/30", "bg-slate-700 text-slate-300 border border-slate-600"];

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: rank * 0.06 }}
      className={`rounded-2xl border overflow-hidden transition-all ${isPrimary ? "border-[#0891B2]/40 shadow-lg shadow-[#0891B2]/10" : "border-slate-800"}`}
    >
      <button onClick={onToggle} className="w-full p-4 flex items-start gap-3 text-left bg-black/20 hover:bg-black/30 transition-colors">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${isPrimary ? "bg-[#0891B2] text-white" : "bg-slate-800 text-slate-400"}`}>{rank}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${rankColors[rank - 1]}`}>{rankLabel}</span>
            <span className="text-[10px] text-slate-500 font-mono">{rec.guideline_source}</span>
          </div>
          <h3 className="font-bold text-white text-sm leading-tight">{rec.protocol_name}</h3>
          <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{rec.clinical_notes}</p>
          {(rec.drug_names || rec.drugs)?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {(rec.drug_names || rec.drugs).slice(0, 3).map((d: string, i: number) => (
                <span key={i} className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">{d}</span>
              ))}
              {(rec.drug_names || rec.drugs).length > 3 && <span className="text-[10px] text-slate-500">+{(rec.drug_names || rec.drugs).length - 3}</span>}
            </div>
          )}
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
          <div className={`text-base font-black font-mono ${confPct >= 85 ? "text-emerald-400" : confPct >= 70 ? "text-amber-400" : "text-slate-300"}`}>{confPct}%</div>
          <div className="text-[10px] text-slate-500">protocol fit</div>
          {g.nccn_category && <NccnBadge text={g.nccn_category} />}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && g && Object.keys(g).length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-2 border-t border-slate-800 bg-slate-900/60 space-y-3">
              {g.trial_evidence && (
                <div className="flex gap-2 p-3 rounded-xl bg-[#0891B2]/5 border border-[#0891B2]/20">
                  <BookOpen className="w-4 h-4 text-[#0891B2] shrink-0 mt-0.5" />
                  <div><p className="text-[10px] text-[#0891B2] font-bold uppercase tracking-wider mb-1">Supporting Trial Evidence</p><p className="text-xs text-slate-300">{g.trial_evidence}</p></div>
                </div>
              )}
              {g.mechanism && (
                <div className="flex gap-2 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                  <FlaskConical className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div><p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1">Drug Mechanism</p><p className="text-xs text-slate-300">{g.mechanism}</p></div>
                </div>
              )}
              {g.who_benefits_most && (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Star className="w-3 h-3" />Who Benefits Most</p>
                  <p className="text-xs text-slate-300">{g.who_benefits_most}</p>
                </div>
              )}
              {rec.rule_trace?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Biomarker Rationale</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rec.rule_trace.map((r: any, i: number) => (
                      <span key={i} className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded-lg font-mono">
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

function ConfidenceRing({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const r = 38, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 80 ? "#059669" : pct >= 60 ? "#d97706" : "#e11d48";
  return (
    <div className="relative flex items-center justify-center">
      <svg className="rotate-[-90deg]" width="92" height="92">
        <circle cx="46" cy="46" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <motion.circle cx="46" cy="46" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-bold font-mono text-white">{pct}%</span>
        <span className="text-[10px] text-slate-400">confidence</span>
      </div>
    </div>
  );
}

export default function MobileResultsPage() {
  const params = useParams();
  const router = useRouter();
  const result = useAnalysisResultStore((s) => s.result);
  const setResult = useAnalysisResultStore((s) => s.setResult);
  const caseId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Record<number, boolean>>({ 0: true });
  const [simulationOpen, setSimulationOpen] = useState(true);
  const [finalized, setFinalized] = useState(false);
  const [decision, setDecision] = useState("accept");
  const [reason, setReason] = useState("");
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    if (!result && caseId && caseId !== "new") {
      setLoading(true);
      api.runAnalysis(caseId).then(res => {
        const data = res?.data || res;
        setResult({ ...data, alerts: Array.isArray(data?.alerts) ? data.alerts : [], rule_trace: Array.isArray(data?.rule_trace) ? data.rule_trace : [], recommendations: Array.isArray(data?.recommendations) ? data.recommendations : [], analyzed_at: data?.analyzed_at || new Date().toISOString() });
      }).catch(() => router.replace(`/m/cases`)).finally(() => setLoading(false));
    } else if (!result) {
      router.replace("/m/new");
    }
  }, [caseId, result, setResult, router]);

  if (loading || !result) return (
    <div className="flex flex-col items-center justify-center min-h-full py-20 gap-4">
      <div className="w-10 h-10 border-4 border-[#0891B2] border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">Loading AI report...</p>
    </div>
  );

  const currentResult: any = (result as any)?.data && typeof (result as any).data === "object"
    ? { ...(result as any).data, analyzed_at: result.analyzed_at || (result as any).data.analyzed_at }
    : result;

  const cfg = SUBTYPE_CFG[currentResult.molecular_subtype] ?? DEFAULT_CFG;
  const ai = currentResult.ai_reasoning ?? {};
  const recs: any[] = Array.isArray(currentResult.recommendations) ? currentResult.recommendations : [];
  const alerts: any[] = Array.isArray(currentResult.alerts) ? currentResult.alerts : [];
  const ruleTrace: any[] = Array.isArray(currentResult.rule_trace) ? currentResult.rule_trace : [];
  const safetyAlerts = alerts.filter((a: any) => a?.alert_type !== "DDI");
  const ddiAlerts = alerts.filter((a: any) => a?.alert_type === "DDI");
  const scores = currentResult.risk_scores;

  const handleFinalize = async () => {
    if (!caseId || caseId === "new") return;
    setFinalizing(true);
    try { await api.finalizeCase(caseId, { decision, final_treatment_plan: decision === "override" ? {} : recs[0], override_reason: reason }); setFinalized(true); }
    catch (e) { console.error(e); } finally { setFinalizing(false); }
  };

  return (
    <div className="min-h-full pb-28">
      {/* Sticky back header */}
      <div className="sticky top-0 z-20 bg-[#0D1220]/95 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-full bg-white/5">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Analysis Result</p>
          {currentResult.patient_name && <p className="text-sm font-bold text-white truncate">{currentResult.patient_name}</p>}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Hero: Subtype + Confidence */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className={`relative p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border ${cfg.border} overflow-hidden`}
        >
          <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full ${cfg.bg} blur-3xl opacity-60`} />
          <div className="relative flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Molecular Classification</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} ${cfg.border} border font-mono`}>
                  AI-Enhanced · {recs[0]?.guideline_source ?? "NCCN"} Aligned
                </span>
              </div>
              <h1 className={`text-2xl font-black ${cfg.color} mb-0.5 leading-tight`}>{currentResult.molecular_subtype || "Analysis Complete"}</h1>
              <p className="text-slate-400 text-xs font-mono">{cfg.short}</p>
              {currentResult.patient_name && (
                <p className="text-slate-300 mt-2 text-xs">Patient: <span className="text-white font-medium">{currentResult.patient_name}</span>
                  {currentResult.patient_age && <span className="text-slate-400">, {currentResult.patient_age} yrs</span>}
                </p>
              )}
              <p className="text-[10px] text-slate-600 mt-1">Analyzed {currentResult.analyzed_at ? new Date(currentResult.analyzed_at).toLocaleString() : new Date().toLocaleString()}</p>
            </div>
            <ConfidenceRing value={currentResult.subtype_confidence ?? 0} />
          </div>
        </motion.div>

        {/* AI Rationale */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0891B2]/10 flex items-center justify-center"><BookOpen className="w-3.5 h-3.5 text-[#0891B2]" /></div>
            <h2 className="font-semibold text-white text-sm">Guideline-Based Rationale</h2>
            <span className="ml-auto text-[10px] text-[#0891B2] bg-[#0891B2]/10 border border-[#0891B2]/30 px-2 py-0.5 rounded-full font-mono">NCCN/ESMO</span>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">{ai.subtype_rationale ?? "Classification based on NCCN/St. Gallen biomarker criteria."}</p>
          {(ai.key_biomarkers?.length ?? 0) > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Key Biomarkers</p>
              <div className="flex flex-wrap gap-1.5">
                {ai.key_biomarkers?.map((b: string, i: number) => (<span key={i} className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded-lg font-mono">{b}</span>))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Prognosis */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /></div>
            <h2 className="font-semibold text-white text-sm">Prognosis & Confidence</h2>
          </div>
          <div className={`p-3 rounded-xl ${cfg.bg} ${cfg.border} border`}>
            <p className={`text-xs font-medium ${cfg.color} mb-1`}>Clinical Outlook</p>
            <p className="text-slate-300 text-xs leading-relaxed">{ai.prognosis_summary ?? "Prognosis aligned with standard-of-care treatment."}</p>
          </div>
          {ai.confidence_explanation && (
            <div className="flex gap-2 text-xs text-slate-400 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
              <Info className="w-4 h-4 text-[#0891B2] shrink-0 mt-0.5" /><span>{ai.confidence_explanation}</span>
            </div>
          )}
        </motion.div>

        {/* Prognostic Risk Scores */}
        {scores && (scores.npi || scores.cts5) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="space-y-3">
            <h2 className="font-semibold text-white text-sm">Prognostic Risk Scores</h2>
            <div className="grid grid-cols-2 gap-3">
              {[{ title: "NPI", data: scores.npi, min: 2.0, max: 7.0 }, { title: "CTS5", data: scores.cts5, min: 1.0, max: 6.0 }].filter(s => s.data).map(({ title, data, min, max }) => {
                const pct = Math.min(Math.max((data.score - min) / (max - min), 0), 1);
                const color = pct > 0.7 ? "#ef4444" : pct > 0.4 ? "#f59e0b" : "#10b981";
                return (
                  <div key={title} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col items-center">
                    <div className="flex items-center gap-1 mb-2"><Gauge className="w-3.5 h-3.5 text-[#0891B2]" /><h3 className="text-slate-300 font-semibold text-xs">{title}</h3></div>
                    <div className="relative w-28 h-14 flex justify-center">
                      <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
                        <defs><linearGradient id={`${title}Grad`} x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" /><stop offset="50%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#ef4444" /></linearGradient></defs>
                        <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke={`url(#${title}Grad)`} strokeWidth="20" strokeLinecap="round" />
                        <motion.g initial={{ rotate: 0 }} animate={{ rotate: pct * 180 }} transition={{ duration: 1, delay: 0.5 }} style={{ transformOrigin: "100px 100px" }}>
                          <path d="M 95 100 L 100 20 L 105 100 Z" fill="#fff" /><circle cx="100" cy="100" r="10" fill="#fff" />
                        </motion.g>
                      </svg>
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">{data.score}</div>
                    <div className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border" style={{ borderColor: color, color, backgroundColor: `${color}1A` }}>{data.category}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* AI Treatment Simulation */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <button onClick={() => setSimulationOpen(p => !p)} className="w-full flex items-center gap-3 p-4 rounded-t-2xl bg-gradient-to-r from-[#0F3460] to-slate-900 border border-[#0891B2]/30 hover:border-[#0891B2]/60 transition-all">
            <div className="w-9 h-9 rounded-xl bg-[#0891B2]/20 border border-[#0891B2]/30 flex items-center justify-center"><Zap className="w-4 h-4 text-[#0891B2]" /></div>
            <div className="flex-1 text-left">
              <h2 className="text-sm font-bold text-white">AI Treatment Simulation <span className="text-[10px] bg-[#0891B2]/20 text-[#0891B2] border border-[#0891B2]/30 px-1.5 py-0.5 rounded-full font-mono ml-1">{recs.length} paths</span></h2>
              <p className="text-slate-400 text-xs mt-0.5">Ranked pathways with NCCN & ESMO explainability</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-[#0891B2] transition-transform ${simulationOpen ? "" : "rotate-180"}`} />
          </button>
          <AnimatePresence>
            {simulationOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="rounded-b-2xl border-x border-b border-[#0891B2]/20 bg-slate-900/40 p-3 space-y-2.5">
                  {recs.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">No treatment paths generated.</p>
                  ) : recs.map((rec: any, i: number) => (
                    <PathCard key={i} rec={rec} rank={rec.rank ?? i + 1} isExpanded={!!expandedPaths[i]} onToggle={() => setExpandedPaths(prev => ({ ...prev, [i]: !prev[i] }))} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Safety Alerts */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center"><ShieldAlert className="w-3.5 h-3.5 text-rose-400" /></div>
            <h2 className="font-semibold text-white text-sm">Safety Alerts</h2>
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-mono ${safetyAlerts.length === 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
              {safetyAlerts.length === 0 ? "✓ None" : `${safetyAlerts.length} alert${safetyAlerts.length > 1 ? "s" : ""}`}
            </span>
          </div>
          {safetyAlerts.length === 0 ? (
            <div className="flex items-center gap-2.5 text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />No contraindications or safety alerts.
            </div>
          ) : safetyAlerts.map((a: any, i: number) => (
            <div key={i} className="flex gap-2.5 p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div><p className="text-rose-400 font-medium">{a.alert_type}</p><p className="text-slate-300 font-medium mt-0.5">{a.trigger}</p><p className="text-slate-400 mt-1">{a.recommended_action}</p></div>
            </div>
          ))}
          {ai.clinical_considerations && (
            <div className="text-xs text-slate-400 bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex gap-2">
              <HeartPulse className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" /><span>{ai.clinical_considerations}</span>
            </div>
          )}
        </motion.div>

        {/* DDI Alerts */}
        {ddiAlerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center"><Pill className="w-3.5 h-3.5 text-orange-400" /></div>
              <h2 className="font-semibold text-white text-sm">Drug-Drug Interactions (DDI)</h2>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20">{ddiAlerts.length} DDI</span>
            </div>
            {ddiAlerts.map((a: any, i: number) => (
              <div key={i} className="flex gap-2.5 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-xs">
                <Pill className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div><p className="text-orange-400 font-bold mb-1">{a.trigger}</p><p className="text-slate-300 leading-relaxed">{a.recommended_action}</p></div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Classification Logic */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center"><Dna className="w-3.5 h-3.5 text-amber-400" /></div>
            <h2 className="font-semibold text-white text-sm">Classification Logic</h2>
          </div>
          {ruleTrace.length === 0 ? (
            <p className="text-xs text-slate-500">No classification rules recorded.</p>
          ) : ruleTrace.map((r: any, i: number) => (
            <div key={i} className="flex items-start gap-2.5 py-2 border-b border-slate-800 last:border-0">
              <div className="w-5 h-5 rounded-full bg-[#0891B2]/10 border border-[#0891B2]/30 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] text-[#0891B2] font-bold">{i + 1}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono font-bold text-slate-300">{r.label || r.biomarker}</span>
                  {r.value && <span className="text-[10px] font-mono text-[#0891B2] bg-[#0891B2]/10 px-1.5 py-0.5 rounded">{r.value}</span>}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">{r.conclusion || r.implication}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Doctor Finalization */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="p-4 rounded-2xl bg-slate-900 border border-[#0891B2]/30 space-y-4">
          <h2 className="font-bold text-white text-sm flex items-center gap-2"><Stethoscope className="w-4 h-4 text-[#0891B2]" />Doctor Finalization</h2>
          {finalized ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" /><span className="font-bold text-sm">Treatment Plan Finalized</span>
            </div>
          ) : !caseId || caseId === "new" ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center"><Stethoscope className="w-5 h-5 text-amber-400" /></div>
              <p className="text-slate-300 text-xs font-medium">Finalization unavailable</p>
              <p className="text-slate-500 text-[11px] max-w-xs">Analysis not saved to DB. Re-run with login to enable finalization.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2.5">
                {[
                  { value: "accept", label: "Accept Primary Path", activeClass: "bg-[#0891B2]/10 border-[#0891B2] text-[#0891B2]", Icon: CheckCircle2 },
                  { value: "modify", label: "Accept with Modifications", activeClass: "bg-amber-500/10 border-amber-500 text-amber-500", Icon: Activity },
                  { value: "override", label: "Override Completely", activeClass: "bg-rose-500/10 border-rose-500 text-rose-500", Icon: X }
                ].map(opt => (
                  <label key={opt.value} className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 text-sm font-bold ${decision === opt.value ? opt.activeClass : "bg-slate-800 border-slate-700 text-slate-400"}`}>
                    <input type="radio" name="decision" value={opt.value} checked={decision === opt.value} onChange={() => setDecision(opt.value)} className="hidden" />
                    <opt.Icon className="w-4 h-4" />{opt.label}
                  </label>
                ))}
              </div>
              {decision !== "accept" && (
                <textarea className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#0891B2] resize-none h-20" placeholder={`Provide clinical rationale for ${decision === "modify" ? "modifications" : "override"}...`} value={reason} onChange={e => setReason(e.target.value)} />
              )}
              <Button onClick={handleFinalize} disabled={finalizing || (decision !== "accept" && !reason)} variant="teal" className="w-full h-11 text-sm font-bold">
                {finalizing ? "Finalizing..." : "Sign & Finalize Treatment Plan"}
              </Button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
