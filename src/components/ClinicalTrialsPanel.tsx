"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Network, Microscope, ExternalLink, ChevronDown, CheckCircle2, WifiOff, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

interface ClinicalTrialsPanelProps {
    caseId: string | null;
}

export function ClinicalTrialsPanel({ caseId }: ClinicalTrialsPanelProps) {
    const [trials, setTrials] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(true);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        if (!caseId) return; // no case saved yet — stay in "offline" state
        setLoading(true);
        setError(null);
        api.getTrials(caseId)
            .then(data => {
                setTrials(data.data || []);
            })
            .catch(err => {
                console.error("Failed to fetch trials", err);
                setError("Could not load trial data. Check your connection and retry.");
            })
            .finally(() => setLoading(false));
    }, [caseId, retryCount]);

    const handleRetry = () => {
        setRetryCount(c => c + 1);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-8">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-4 p-5 rounded-t-2xl bg-gradient-to-r from-indigo-900/50 to-slate-900 border border-indigo-500/30 hover:border-indigo-500/60 transition-all"
            >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Microscope className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="flex-1 text-left">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        Clinical Trial Matches
                        {!loading && !error && caseId && (
                            <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                                {trials.length} matches
                            </span>
                        )}
                        {!caseId && (
                            <span className="text-xs bg-slate-700/50 text-slate-400 border border-slate-600/30 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                                <WifiOff className="w-3 h-3" /> Not saved
                            </span>
                        )}
                    </h2>
                    <p className="text-slate-400 text-sm">
                        Live queries to ClinicalTrials.gov matched to the patient&apos;s molecular subtype and biomarkers.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <ChevronDown className={`w-5 h-5 text-indigo-400 transition-transform ${open ? "" : "rotate-180"}`} />
                </div>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35 }}
                        className="overflow-hidden"
                    >
                        <div className="rounded-b-2xl border-x border-b border-indigo-500/20 bg-slate-900/40 p-5 space-y-4">
                            {/* No case_id — case was not saved to DB (weak network during analysis) */}
                            {!caseId ? (
                                <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                                        <WifiOff className="w-6 h-6 text-slate-500" />
                                    </div>
                                    <p className="text-slate-400 text-sm font-medium">
                                        Clinical trial matching requires this case to be saved.
                                    </p>
                                    <p className="text-slate-500 text-xs max-w-sm">
                                        This case was not saved to the database — likely due to a weak network connection during analysis. Re-run the analysis on a stronger connection to enable this feature.
                                    </p>
                                </div>
                            ) : loading ? (
                                <div className="py-8 flex flex-col items-center justify-center text-indigo-400/70 gap-3">
                                    <Network className="w-8 h-8 animate-pulse" />
                                    <p className="text-sm font-mono tracking-widest uppercase">Querying ClinicalTrials.gov...</p>
                                </div>
                            ) : error ? (
                                <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                                    <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                                        <WifiOff className="w-6 h-6 text-rose-400" />
                                    </div>
                                    <p className="text-slate-400 text-sm font-medium">{error}</p>
                                    <button
                                        onClick={handleRetry}
                                        className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors border border-indigo-500/30 hover:border-indigo-500/60 px-3 py-1.5 rounded-lg"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Retry
                                    </button>
                                </div>
                            ) : trials.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center py-6">No recruiting trials matched the current patient profile.</p>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-4">
                                    {trials.map((trial, i) => (
                                        <a
                                            key={i}
                                            href={`https://clinicaltrials.gov/study/${trial.nct_id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block p-5 rounded-xl border border-slate-800 bg-slate-900 hover:border-indigo-500/50 hover:bg-indigo-900/10 transition-all group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-3">
                                                <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                            </div>

                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                                    {trial.nct_id}
                                                </span>
                                                {trial.phases && trial.phases.length > 0 && (
                                                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                        {trial.phases.join(", ").replace("PHASE", "Phase ")}
                                                    </span>
                                                )}
                                                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Recruiting
                                                </span>
                                            </div>

                                            <h3 className="font-bold text-slate-200 text-sm leading-snug mb-3 pr-6 group-hover:text-white transition-colors line-clamp-2">
                                                {trial.title}
                                            </h3>

                                            {trial.interventions && trial.interventions.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-auto">
                                                    {trial.interventions.map((intr: string, idx: number) => (
                                                        <span key={idx} className="text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded truncate max-w-full">
                                                            {intr}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
