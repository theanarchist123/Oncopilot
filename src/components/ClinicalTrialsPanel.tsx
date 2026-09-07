"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Network, Microscope, ExternalLink, ChevronDown, CheckCircle2, WifiOff, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { useAnalysisResultStore } from "@/store";

interface ClinicalTrialsPanelProps {
    caseId: string | null;
}

export function ClinicalTrialsPanel({ caseId }: ClinicalTrialsPanelProps) {
    const trialsCache = useAnalysisResultStore((s) => s.trialsCache);
    const setTrialsCache = useAnalysisResultStore((s) => s.setTrialsCache);

    // Read from cache first — data persists across page loads / weak network visits
    const cached = caseId ? (trialsCache[caseId] ?? null) : null;

    const [trials, setTrials] = useState<any[]>(cached ?? []);
    const [loading, setLoading] = useState(cached === null && !!caseId); // only load if not cached
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(true);

    useEffect(() => {
        if (!caseId) return;
        if (cached !== null) {
            // Cache hit — no network needed
            setTrials(cached);
            setLoading(false);
            return;
        }
        // Cache miss — fetch once and store permanently
        setLoading(true);
        setError(null);
        api.getTrials(caseId)
            .then(data => {
                const fetched = data.data || [];
                setTrials(fetched);
                setTrialsCache(caseId, fetched); // persist to localStorage
            })
            .catch(err => {
                console.error("Failed to fetch trials", err);
                setError("Could not load trial data. Check your connection and retry.");
            })
            .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [caseId]); // intentionally exclude cached/setTrialsCache — run once per caseId

    const handleRetry = () => {
        if (!caseId) return;
        setLoading(true);
        setError(null);
        api.getTrials(caseId)
            .then(data => {
                const fetched = data.data || [];
                setTrials(fetched);
                setTrialsCache(caseId, fetched);
            })
            .catch(err => {
                console.error("Failed to fetch trials", err);
                setError("Still unable to reach ClinicalTrials.gov. Try again later.");
            })
            .finally(() => setLoading(false));
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
                        {cached !== null && (
                            <span className="text-xs bg-slate-700/50 text-slate-500 border border-slate-600/30 px-2 py-0.5 rounded-full font-mono">
                                cached
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
                            {loading ? (
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
                                    <p className="text-slate-500 text-xs">Trial data will be cached after a successful load — you won&apos;t need internet for this again.</p>
                                    <button
                                        onClick={handleRetry}
                                        className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors border border-indigo-500/30 hover:border-indigo-500/60 px-3 py-1.5 rounded-lg"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Retry
                                    </button>
                                </div>
                            ) : !caseId ? (
                                <div className="py-6 flex flex-col items-center justify-center gap-2 text-center text-slate-500">
                                    <p className="text-sm">Trials unavailable (case not saved)</p>
                                    <p className="text-xs opacity-75">You must be logged in and the case must be saved to the database to fetch live trial matches.</p>
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
