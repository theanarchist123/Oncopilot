"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { HeartPulse, CheckCircle2, Phone, Calendar, User as UserIcon, ShieldCheck, FileText, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";

function PatientPortalContent() {
    const searchParams = useSearchParams();
    const caseId = searchParams.get("caseId");
    
    const [plan, setPlan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!caseId) {
            setError("No case ID provided.");
            setLoading(false);
            return;
        }
        api.getPatientPlan(caseId)
            .then(res => {
                setPlan(res.data);
            })
            .catch(err => {
                setError(err.message || "Failed to load treatment plan. It may not be finalized yet.");
            })
            .finally(() => setLoading(false));
    }, [caseId]);

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error || !plan) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Plan Not Available</h1>
            <p className="text-slate-600 max-w-md">{error}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950/30 to-rose-950/20 text-slate-200 selection:bg-rose-500/30 font-sans">
            {/* Header */}
            <header className="border-b border-white/5 sticky top-0 z-10 backdrop-blur-md bg-slate-900/50">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-rose-500/20">
                            <HeartPulse className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg text-white tracking-tight">OncoPilot <span className="font-medium text-slate-400">Patient Portal</span></span>
                    </div>
                    <button className="flex items-center gap-2 text-sm font-medium text-rose-300 hover:text-rose-200 hover:bg-white/5 px-4 py-2 rounded-full transition-colors border border-white/10">
                        <Phone className="w-4 h-4" /> Contact Clinic
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6 py-10 space-y-8">
                {/* Welcome Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-60"></div>
                    <div className="relative">
                        <div className="flex items-center gap-3 text-rose-400 font-medium mb-3">
                            <ShieldCheck className="w-5 h-5" /> Verified by your care team
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            Good morning, {plan.patient_name?.split(' ')[0] || "Patient"} 👋
                        </h1>
                        <p className="text-slate-300 text-lg max-w-2xl">
                            Your oncologist has reviewed your case. Your personalized treatment plan is ready, designed specifically for your health profile.
                        </p>
                    </div>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Left Column: Summary */}
                    <div className="space-y-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10">
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                🔬 Your Cancer Type
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-slate-200 font-medium text-lg">{plan.subtype}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        This is a specific classification of {plan.diagnosis_summary.toLowerCase()}. Your doctor has carefully reviewed this to tailor your treatment.
                                    </p>
                                    <button className="text-sm text-rose-400 mt-2 hover:text-rose-300 font-medium flex items-center gap-1 transition-colors">
                                        What does this mean? <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10">
                            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Clinical Review
                            </h3>
                            <p className="text-slate-300 text-sm">
                                Your oncologist has reviewed and approved this plan. Based on your profile, the selected pathway provides the optimal approach for your specific case.
                            </p>
                        </motion.div>
                    </div>

                    {/* Right Column: Treatment Plan */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="md:col-span-2 space-y-6">
                        <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/10">
                            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider text-slate-300">
                                YOUR TREATMENT PLAN
                            </h2>
                            
                            {/* Treatment Timeline Stepper */}
                            <div className="mb-8 relative">
                                <div className="absolute top-2.5 left-2 right-2 h-0.5 bg-slate-800"></div>
                                <div className="absolute top-2.5 left-2 w-1/3 h-0.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
                                <div className="flex justify-between relative">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)] animate-pulse"></div>
                                        <span className="text-xs text-rose-400 font-medium">Stage 1: Primary</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-slate-800 border-2 border-slate-700"></div>
                                        <span className="text-xs text-slate-500 font-medium">Stage 2: Follow-up</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-slate-800 border-2 border-slate-700"></div>
                                        <span className="text-xs text-slate-500 font-medium">Stage 3: Review</span>
                                    </div>
                                </div>
                            </div>
                            
                            {plan.treatment_plan && Object.keys(plan.treatment_plan).length > 0 ? (
                                <div className="space-y-6">
                                    <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-rose-400 mb-1 flex items-center gap-2">
                                                    💊 Your Prescribed Treatment
                                                </p>
                                                <h3 className="text-xl font-bold text-white">{plan.treatment_plan.protocol_name || plan.treatment_plan.name || "Custom Protocol"}</h3>
                                            </div>
                                            {plan.treatment_plan.duration_months && (
                                                <div className="flex items-center gap-1 text-sm font-medium text-slate-300 bg-white/10 px-3 py-1 rounded-full border border-white/5">
                                                    <Calendar className="w-4 h-4 text-slate-400" /> {plan.treatment_plan.duration_months} Months
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-white/10">
                                            <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
                                                {plan.treatment_plan.clinical_notes || plan.treatment_plan.description || "Refer to doctor's notes for details."}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-amber-500/10 rounded-2xl p-5 border border-amber-500/20">
                                        <p className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                                            ⚠️ Safety & Adjustments
                                        </p>
                                        <p className="text-amber-200/80 text-sm leading-relaxed">
                                            Your doctor has thoroughly reviewed your health history and noted specific health considerations. Your treatment plan and dosages have been adjusted accordingly to maximize safety and effectiveness.
                                        </p>
                                    </div>

                                    {plan.doctor_notes && (
                                        <div className="bg-indigo-500/10 rounded-2xl p-5 border border-indigo-500/20">
                                            <p className="text-sm font-semibold text-indigo-400 mb-2">Doctor's Direct Notes</p>
                                            <p className="text-indigo-200/80 text-sm leading-relaxed whitespace-pre-wrap">{plan.doctor_notes}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-white/5 rounded-2xl p-8 border border-white/10 text-center">
                                        <p className="text-slate-400">Your doctor has completely customized your treatment path.</p>
                                    </div>
                                    
                                    {plan.doctor_notes && (
                                        <div className="bg-indigo-500/10 rounded-2xl p-5 border border-indigo-500/20">
                                            <p className="text-sm font-semibold text-indigo-400 mb-2">Doctor's Notes</p>
                                            <p className="text-indigo-200/80 text-sm leading-relaxed whitespace-pre-wrap">{plan.doctor_notes}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}

export default function PatientPortalPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
            <PatientPortalContent />
        </Suspense>
    );
}
