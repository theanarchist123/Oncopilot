"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
    Check, ChevronRight, UploadCloud, UserCircle2, ShieldAlert,
    HeartPulse, ActivitySquare, Bone, Droplets, FlaskConical, Stethoscope, Save, Activity, FileText, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAnalysisResultStore } from "@/store";

// ─── Reusable Pill Toggle Group ──────────────────────────────────────────────
const PillToggle = ({ options, value, onChange }: { options: string[], value: string, onChange: (v: string) => void }) => (
    <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
        {options.map(opt => (
            <button
               key={opt} type="button" onClick={() => onChange(opt)}
               className={cn(
                   "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300",
                   value === opt 
                     ? opt === "Positive" ? "bg-rose-500/20 text-rose-500 shadow-sm" 
                       : opt === "Negative" ? "bg-[#0891B2]/20 text-[#0891B2] shadow-sm" 
                       : "bg-slate-700 text-white shadow-sm"
                     : "text-slate-500 hover:text-slate-300"
               )}
            >
                {opt}
            </button>
        ))}
    </div>
);



// ─── Main Form Page ──────────────────────────────────────────────────────────
export default function NewCaseForm() {
    const router = useRouter();
    const setAnalysisResult = useAnalysisResultStore((s) => s.setResult);
    const [step, setStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingStage, setLoadingStage] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadWarning, setUploadWarning] = useState<string | null>(null);

    // Form State (simplified for UI demo)
    const [patient, setPatient] = useState({ name: "", age: 50, sex: "Female", notes: "" });
    const [tumour, setTumour] = useState({ stage: "II", grade: 2, size: 2.5, nodes: false, nodeCount: 0 });
    const [biomarkers, setBiomarkers] = useState({
        er: "Unknown", pr: "Unknown", her2: "Unknown", ki67: 15, ki67Known: false,
        brca1: "Unknown", brca2: "Unknown", tils: 10, oncotype: 15, mammaprint: "Not Done"
    });
    const [health, setHealth] = useState({
        lvef: 60, ecog: 0, comorbidities: [] as string[], medications: [] as string[], mInput: ""
    });

    const handleNext = () => setStep(p => Math.min(5, p + 1));
    const handlePrev = () => setStep(p => Math.max(0, p - 1));

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsUploading(true);
        setError(null);
        setUploadWarning(null);
        try {
            const res = await api.extractReport(file);
            if (res.success && res.data) {
                const data = res.data;
                if (data.patient) {
                    setPatient(p => ({
                        ...p,
                        name: data.patient.name || p.name,
                        age: data.patient.age || p.age,
                        sex: data.patient.sex || p.sex
                    }));
                }
                if (data.tumour) {
                    setTumour(t => ({
                        ...t,
                        stage: data.tumour.stage || t.stage,
                        grade: data.tumour.grade || t.grade,
                        size: data.tumour.size || t.size,
                        nodes: data.tumour.lymph_nodes_involved ?? t.nodes,
                        nodeCount: data.tumour.node_count || t.nodeCount
                    }));
                }
                if (data.biomarkers) {
                    setBiomarkers(b => ({
                        ...b,
                        er: data.biomarkers.er_status || b.er,
                        pr: data.biomarkers.pr_status || b.pr,
                        her2: data.biomarkers.her2_status || b.her2,
                        ki67: data.biomarkers.ki67_percent || b.ki67,
                        ki67Known: !!data.biomarkers.ki67_percent,
                        brca1: data.biomarkers.brca1_status || b.brca1,
                        brca2: data.biomarkers.brca2_status || b.brca2,
                        tils: data.biomarkers.tils_percent || b.tils,
                        oncotype: data.biomarkers.oncotype_dx_score || b.oncotype
                    }));
                }
                if (data.health) {
                    setHealth(h => ({
                        ...h,
                        lvef: data.health.lvef_percent || h.lvef,
                        ecog: data.health.ecog_score || h.ecog,
                        comorbidities: data.health.comorbidities || h.comorbidities,
                        medications: data.health.medications || h.medications
                    }));
                }
                setUploadSuccess(true);
                if (res.warning) {
                    // LLM failed — stay on step 0, show the warning banner, let user continue manually
                    setUploadWarning(res.warning);
                } else {
                    // Clean extraction — auto-advance after 2s
                    setTimeout(() => {
                        setUploadSuccess(false);
                        setStep(1);
                    }, 2000);
                }
            } else {
                setError(res.error || "Failed to extract report data.");
            }
        } catch (err: any) {
            console.error("Upload error:", err);
            setError(err.message || "An error occurred during upload.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);

        // CRITICAL: Clear old persisted result so stale data never shows
        useAnalysisResultStore.getState().clearResult();

        const payload = {
            patient_name: patient.name || "Unknown Patient",
            patient_age: patient.age || 0,
            save_case: true,
            clinical_data: {
                stage: tumour.stage,
                grade: tumour.grade,
                tumour_size: tumour.size,
                lymph_nodes_involved: tumour.nodes,
                lymph_node_count: tumour.nodes ? tumour.nodeCount : 0,
                er_status: biomarkers.er,
                pr_status: biomarkers.pr,
                her2_status: biomarkers.her2,
                ki67_percent: biomarkers.ki67Known ? biomarkers.ki67 : null,
                brca1_status: biomarkers.brca1,
                brca2_status: biomarkers.brca2,
                tils_percent: biomarkers.tils,
                oncotype_dx_score: biomarkers.oncotype,
                mammaprint: biomarkers.mammaprint === "Not Done" ? null : biomarkers.mammaprint,
                lvef_percent: health.lvef,
                ecog_score: health.ecog,
                comorbidities: health.comorbidities.reduce((a: any, c) => ({ ...a, [c]: true }), {}),
                medications: health.medications.join(", "),
            },
        };

        // Debug: confirm exact values being sent
        console.log("[OncoPilot] Submitting analysis payload:", JSON.stringify(payload, null, 2));

        const stages = [
            "Classifying molecular subtype...",
            "Running guideline evaluation engine...",
            "Checking algorithmic contraindications...",
            "Generating AI clinical recommendations...",
        ];

        const animateStages = async () => {
            for (let i = 0; i < stages.length; i++) {
                setLoadingStage(i);
                await new Promise(r => setTimeout(r, 1100));
            }
        };

        try {
            const [, result] = await Promise.all([
                animateStages(),
                api.instantAnalysis(payload),
            ]);

            console.log("[OncoPilot] Analysis result:", result.molecular_subtype, `(${Math.round(result.subtype_confidence * 100)}%)`, `${result.recommendations?.length} paths`);

            setAnalysisResult({
                ...result,
                analyzed_at: new Date().toISOString(),
            });

            router.push("/dashboard/results");
        } catch (err: any) {
            console.error("[OncoPilot] Analysis failed:", err);
            setError(err.message || "Analysis failed — please check your connection and try again.");
            setIsSubmitting(false);
        }
    };



    // ─── Step 0: Upload Report ────────────────────────────────────────────
    const renderStep0 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 text-center flex flex-col items-center justify-center min-h-[400px]">
            <h2 className="text-3xl font-bold text-white mb-2">Upload Pathology Report</h2>
            <p className="text-slate-400 max-w-lg mb-8">Upload a PDF or image of the patient's pathology report. Our AI will automatically extract clinical markers and pre-fill the case form.</p>

            {/* Upload error — shown inline on step 0 */}
            {error && !uploadWarning && (
                <div className="w-full max-w-xl flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-left">
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-rose-300 font-semibold text-sm">Upload failed</p>
                        <p className="text-rose-400/80 text-xs mt-0.5">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-rose-400/60 hover:text-rose-300 text-xs mt-0.5">✕</button>
                </div>
            )}

            <label className={cn(
                "w-full max-w-xl h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group",
                error ? "border-rose-500/50 bg-rose-500/5" : uploadSuccess ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 bg-slate-900 hover:border-[#0891B2] hover:bg-[#0891B2]/5"
            )}>
                <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} disabled={isUploading || uploadSuccess} />
                
                {isUploading ? (
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-[#0891B2] border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-[#0891B2] font-semibold text-lg">Extracting Data...</p>
                        <p className="text-sm text-slate-500">OCR + AI analysis — may take up to 30s</p>
                    </div>
                ) : uploadSuccess ? (
                    <div className="flex flex-col items-center text-emerald-400">
                        <CheckCircle2 className="w-16 h-16 mb-4" />
                        <p className="font-semibold text-lg">Extraction Successful!</p>
                        <p className="text-sm text-emerald-500/80">Auto-filling form fields...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-slate-400 group-hover:text-[#0891B2] transition-colors">
                        <UploadCloud className="w-16 h-16 mb-4" />
                        <p className="font-semibold text-lg mb-2">Drag & Drop report here</p>
                        <p className="text-sm text-slate-500">or click to browse files</p>
                    </div>
                )}
            </label>

            {/* LLM degradation warning — stays on step 0, user must click to continue */}
            {uploadWarning ? (
                <div className="w-full max-w-xl bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-4 mt-3 text-left space-y-3">
                    <div className="flex items-start gap-3">
                        <TriangleAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-amber-300 font-semibold text-sm">AI extraction failed — Gemini quota exhausted</p>
                            <p className="text-amber-400/80 text-xs mt-1">OCR ran but the AI could not parse the report. Please enter the clinical fields manually.</p>
                        </div>
                    </div>
                    <Button
                        className="w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold"
                        onClick={() => { setUploadWarning(null); setUploadSuccess(false); setStep(1); }}
                    >
                        Continue — Enter Manually →
                    </Button>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-4 mt-8 w-full max-w-xl">
                        <div className="flex-1 h-px bg-slate-800" />
                        <span className="text-slate-500 text-sm font-medium">OR</span>
                        <div className="flex-1 h-px bg-slate-800" />
                    </div>
                    <Button variant="outline" className="mt-8 border-slate-700 bg-slate-900/50 text-slate-300" onClick={() => setStep(1)}>
                        Skip &amp; Enter Manually
                    </Button>
                </>
            )}
        </motion.div>
    );

    // ─── Step 1: Patient ──────────────────────────────────────────────────
    const renderStep1 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <h2 className="text-2xl font-bold text-white mb-6">Patient Demographics</h2>
            
            <div className="flex gap-8 items-start">
               <div className="w-32 h-32 shrink-0 rounded-full border-2 border-dashed border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center text-slate-500 hover:text-[#0891B2] hover:border-[#0891B2] transition-colors cursor-pointer relative overflow-hidden group">
                  <UserCircle2 className="w-10 h-10 mb-2 opacity-50" />
                  <span className="text-xs font-medium">Upload Photo</span>
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <UploadCloud className="w-6 h-6 text-white" />
                  </div>
               </div>
               
               <div className="flex-1 space-y-6">
                  <Input label="Full Name" placeholder="Jane Doe" value={patient.name} onChange={e => setPatient({...patient, name: e.target.value})} />
                  <div className="flex gap-4">
                     <div className="w-1/3"><Input type="number" label="Age" value={patient.age} onChange={e => setPatient({...patient, age: parseInt(e.target.value)})} /></div>
                     <div className="w-2/3">
                         <label className="text-xs font-medium text-slate-400 mb-2 block">Sex Assigned at Birth</label>
                         <PillToggle options={["Female", "Male", "Other"]} value={patient.sex} onChange={v => setPatient({...patient, sex: v})} />
                     </div>
                  </div>
               </div>
            </div>

            <div>
               <label className="text-xs font-medium text-slate-400 mb-2 block">Clinical Notes</label>
               <textarea 
                  className="w-full h-40 resize-none rounded-xl p-4 notepad focus:outline-none focus:ring-2 focus:ring-[#0891B2] border border-white/10"
                  placeholder="Enter preliminary clinical observations here..."
                  value={patient.notes}
                  onChange={e => setPatient({...patient, notes: e.target.value})}
               />
               <p className="text-xs text-slate-500 mt-2 flex items-center justify-end font-mono"><Save className="w-3 h-3 mr-1" /> Auto-saved</p>
            </div>
        </motion.div>
    );

    // ─── Step 2: Tumour ───────────────────────────────────────────────────
    const renderStep2 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
            <h2 className="text-2xl font-bold text-white mb-6">Tumour & Staging</h2>
            
            <div className="space-y-4">
               <label className="text-sm font-medium text-slate-300">Clinical Stage Diagram</label>
               <div className="flex justify-between items-end gap-2 p-6 rounded-2xl bg-slate-900 border border-slate-800">
                  {["I", "II", "III", "IV"].map((s, i) => (
                      <div key={s} 
                           onClick={() => setTumour({...tumour, stage: s})}
                           className={cn("flex flex-col items-center cursor-pointer group transition-all", tumour.stage === s ? "opacity-100 scale-110" : "opacity-40 hover:opacity-80")}
                      >
                         <svg width="60" height="60" viewBox="0 0 100 100" className="mb-3">
                             {/* Abstract tumour SVG sizing up per stage */}
                             <circle cx="50" cy="50" r={20 + (i * 10)} fill={tumour.stage === s ? "#0891B2" : "#334155"} className="transition-all duration-300" />
                             {i > 1 && <circle cx={70 + (i*5)} cy={30 - (i*2)} r={5 + i} fill={tumour.stage === s ? "#e11d48" : "#334155"} />}
                             {i === 3 && <circle cx="20" cy="80" r="12" fill={tumour.stage === s ? "#e11d48" : "#334155"} />}
                         </svg>
                         <span className={cn("font-bold", tumour.stage === s ? "text-[#0891B2]" : "text-slate-500")}>Stage {s}</span>
                      </div>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-2 gap-8 bg-slate-900/50 p-6 rounded-xl border border-white/5">
                <div className="col-span-2">
                    <label className="flex justify-between text-sm font-medium text-slate-300 mb-6">
                        Tumour Size <span className="text-[#0891B2] font-mono bg-[#0891B2]/10 px-2 py-0.5 rounded">{tumour.size.toFixed(1)} cm</span>
                    </label>
                    <Slider 
                        value={[tumour.size]} 
                        min={0.1} max={10} step={0.1} 
                        onValueChange={v => setTumour({...tumour, size: v[0]})}
                    />
                </div>

                <div className="col-span-2 md:col-span-1">
                    <label className="text-sm font-medium text-slate-300 mb-4 block">Histological Grade</label>
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3].map(g => (
                            <button
                                key={g} type="button" onClick={() => setTumour({...tumour, grade: g})}
                                className={cn(
                                    "flex justify-between items-center px-4 py-3 rounded-xl border transition-all text-left",
                                    tumour.grade === g 
                                     ? "border-amber-500 bg-amber-500/10 text-white" 
                                     : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
                                )}
                            >
                                <span className="font-bold">Grade {g}</span>
                                <span className="text-xs opacity-70">
                                    {g === 1 ? 'Well differentiated' : g === 2 ? 'Moderately differentiated' : 'Poorly differentiated'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="col-span-2 md:col-span-1 flex flex-col justify-center items-center bg-slate-900 rounded-xl border border-slate-800 p-6 text-center">
                    <label className="text-sm font-medium text-slate-300 mb-4 block">Lymph Node Involvement</label>
                    <div className="flex items-center gap-4 mb-4">
                        <span className={tumour.nodes ? "text-slate-500" : "text-white font-medium"}>Negative</span>
                        <Switch checked={tumour.nodes} onCheckedChange={c => setTumour({...tumour, nodes: c})} />
                        <span className={tumour.nodes ? "text-rose-500 font-medium" : "text-slate-500"}>Positive</span>
                    </div>
                    <AnimatePresence>
                        {tumour.nodes && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden w-full">
                                <Input type="number" placeholder="Positive Node Count" className="text-center mt-2" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );

    // ─── Step 3: Biomarkers ───────────────────────────────────────────────
    const renderStep3 = () => {
        const ki67Color = biomarkers.ki67 < 14 ? "text-emerald-400" : biomarkers.ki67 < 20 ? "text-amber-400" : "text-rose-500";
        const ki67Label = biomarkers.ki67 < 14 ? "Low proliferation" : biomarkers.ki67 < 20 ? "Intermediate" : "High proliferation risk";

        return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <h2 className="text-2xl font-bold text-white mb-6">Biomarker Contol Panel</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                   <h3 className="text-[#0891B2] font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2"><FlaskConical className="w-4 h-4"/> Receptor Status</h3>
                   <div className="flex justify-between items-center"><span className="text-slate-300">ER Status</span><PillToggle options={["Positive", "Negative", "Unknown"]} value={biomarkers.er} onChange={v => setBiomarkers({...biomarkers, er: v})} /></div>
                   <div className="flex justify-between items-center"><span className="text-slate-300">PR Status</span><PillToggle options={["Positive", "Negative", "Unknown"]} value={biomarkers.pr} onChange={v => setBiomarkers({...biomarkers, pr: v})} /></div>
                   <div className="flex justify-between items-center"><span className="text-slate-300">HER2 Status</span><PillToggle options={["Positive", "Negative", "Unknown"]} value={biomarkers.her2} onChange={v => setBiomarkers({...biomarkers, her2: v})} /></div>
               </div>

               <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 relative overflow-hidden">
                   {biomarkers.brca1 === "Positive" || biomarkers.brca2 === "Positive" ? (
                       <motion.div initial={{ y: -50 }} animate={{ y: 0 }} className="absolute top-0 left-0 right-0 bg-amber-500/20 border-b border-amber-500/40 p-2 flex items-center justify-center gap-2 text-amber-500 text-xs font-bold">
                           <ShieldAlert className="w-4 h-4" /> BRCA mutation — PARP inhibitor eligible
                       </motion.div>
                   ) : null}
                   <h3 className="text-rose-500 font-semibold text-sm uppercase tracking-wider mb-4 mt-2">Mutations</h3>
                   <div className="flex justify-between items-center"><span className="text-slate-300">BRCA1</span><PillToggle options={["Positive", "Negative", "Unknown"]} value={biomarkers.brca1} onChange={v => setBiomarkers({...biomarkers, brca1: v})} /></div>
                   <div className="flex justify-between items-center"><span className="text-slate-300">BRCA2</span><PillToggle options={["Positive", "Negative", "Unknown"]} value={biomarkers.brca2} onChange={v => setBiomarkers({...biomarkers, brca2: v})} /></div>
               </div>

               <div className="col-span-1 md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-amber-500 font-semibold text-sm uppercase tracking-wider mb-6">Proliferation & Genomic Assays</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div>
                          <div className="flex justify-between items-end mb-4">
                              <div>
                                  <span className="text-slate-300 block">Ki-67 Index</span>
                                  <div className="flex items-center gap-2 mt-1">
                                      <Switch checked={biomarkers.ki67Known} onCheckedChange={c => setBiomarkers({...biomarkers, ki67Known: c})} />
                                      <span className="text-xs text-slate-500">Value Known</span>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <span className={`font-mono font-bold text-xl ${!biomarkers.ki67Known ? 'text-slate-600' : ki67Color}`}>{biomarkers.ki67Known ? `${biomarkers.ki67}%` : '--'}</span>
                                  <p className={`text-xs ${!biomarkers.ki67Known ? 'text-slate-600' : ki67Color} opacity-80`}>{biomarkers.ki67Known ? ki67Label : 'Unknown'}</p>
                              </div>
                          </div>
                          <Slider 
                             disabled={!biomarkers.ki67Known}
                             value={[biomarkers.ki67]} max={100} step={1}
                             onValueChange={v => setBiomarkers({...biomarkers, ki67: v[0]})}
                             zoneColors={[{threshold: 0, color: "bg-emerald-500"}, {threshold: 20, color: "bg-amber-500"}, {threshold: 30, color: "bg-rose-500"}]}
                          />
                      </div>

                      <div>
                          <div className="flex justify-between items-end mb-4">
                              <span className="text-slate-300">Oncotype DX</span>
                              <div className="text-right">
                                  <span className="font-mono font-bold text-xl text-purple-400">{biomarkers.oncotype}</span>
                                  <p className="text-xs text-purple-400/80">Recurrence Score</p>
                              </div>
                          </div>
                          <Slider 
                             value={[biomarkers.oncotype]} max={100} step={1}
                             onValueChange={v => setBiomarkers({...biomarkers, oncotype: v[0]})}
                             zoneColors={[{threshold: 0, color: "bg-emerald-500"}, {threshold: 26, color: "bg-rose-500"}]}
                          />
                      </div>
                  </div>
               </div>
            </div>
        </motion.div>
    )};

    // ─── Step 4: Health Profile ───────────────────────────────────────────
    const renderStep4 = () => {
        const lvefRotation = (health.lvef / 100) * 180;
        const lvefColor = health.lvef < 50 ? "stop-color: #e11d48;" : health.lvef < 55 ? "stop-color: #d97706;" : "stop-color: #059669;";
        const isContraindicated = health.lvef < 50;

        const toggleComorbidity = (c: string) => {
            if (health.comorbidities.includes(c)) setHealth({...health, comorbidities: health.comorbidities.filter(x => x !== c)});
            else setHealth({...health, comorbidities: [...health.comorbidities, c]});
        };

        const addMed = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && health.mInput) {
                e.preventDefault();
                setHealth({...health, medications: [...health.medications, health.mInput], mInput: ""});
            }
        };

        const removeMed = (m: string) => setHealth({...health, medications: health.medications.filter(x => x !== m)});

        return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <h2 className="text-2xl font-bold text-white mb-6">Systemic Health Profile</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center relative overflow-hidden">
                    <h3 className="text-slate-300 font-semibold mb-6">LVEF (Ejection Fraction)</h3>
                    
                    {/* SVG Half Circle Gauge */}
                    <div className="relative w-48 h-24 overflow-hidden mb-6 flex justify-center mt-4">
                        <svg viewBox="0 0 200 100" className="w-full h-full">
                            <defs>
                                <linearGradient id="lvefGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#e11d48" />
                                    <stop offset="45%" stopColor="#d97706" />
                                    <stop offset="55%" stopColor="#059669" />
                                    <stop offset="100%" stopColor="#059669" />
                                </linearGradient>
                            </defs>
                            <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="url(#lvefGrad)" strokeWidth="20" strokeLinecap="round" />
                            {/* Needle */}
                            <motion.g 
                                className="gauge-needle"
                                animate={{ rotate: lvefRotation }}
                                style={{ transformOrigin: "100px 100px" }}
                            >
                                <path d="M 95 100 L 100 20 L 105 100 Z" fill="#fff" />
                                <circle cx="100" cy="100" r="8" fill="#fff" />
                            </motion.g>
                        </svg>
                        <div className="absolute bottom-0 text-3xl font-bold font-mono text-white bg-slate-900 border border-slate-800 rounded-xl px-4 py-1 translate-y-2">{health.lvef}%</div>
                    </div>

                    <Slider max={100} min={10} step={1} value={[health.lvef]} onValueChange={v => setHealth({...health, lvef: v[0]})} className="mt-4" />

                    <div className="w-full mt-6">
                        <label className="text-sm font-medium text-slate-300 block mb-2 text-left">ECOG Performance Status</label>
                        <PillToggle options={["0", "1", "2", "3", "4"]} value={health.ecog.toString()} onChange={v => setHealth({...health, ecog: parseInt(v)})} />
                        <p className="text-xs text-slate-500 mt-2 text-left">
                            {health.ecog === 0 ? "0 - Fully active" : health.ecog === 1 ? "1 - Restricted in physically strenuous activity" : health.ecog === 2 ? "2 - Ambulatory, capable of selfcare" : health.ecog === 3 ? "3 - Capable of only limited selfcare" : "4 - Completely disabled"}
                        </p>
                    </div>

                    <AnimatePresence>
                        {isContraindicated && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full mt-6 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-center text-xs text-rose-500 flex items-center justify-center gap-2">
                                <ShieldAlert className="w-4 h-4" /> Anthracycline formulation contraindicated.
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="col-span-2 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-slate-300 font-semibold mb-4">Comorbidities</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[ 
                                { id: "Cardiac", icon: HeartPulse, color: "text-rose-500 focus-rose-500/20" },
                                { id: "Diabetes", icon: Droplets, color: "text-sky-400" },
                                { id: "Hypertension", icon: ActivitySquare, color: "text-amber-500" },
                                { id: "Osteoporosis", icon: Bone, color: "text-slate-300" },
                            ].map(c => {
                                const active = health.comorbidities.includes(c.id);
                                const Icon = c.icon;
                                return (
                                    <div 
                                      key={c.id} onClick={() => toggleComorbidity(c.id)}
                                      className={cn("p-4 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all", active ? "bg-slate-800 border-[#0891B2] shadow-[0_0_15px_rgba(8,145,178,0.2)]" : "bg-slate-900/50 border-slate-800 hover:border-slate-700")}
                                    >
                                        <Icon className={cn("w-6 h-6", active ? c.color.split(' ')[0] : "text-slate-600")} />
                                        <span className={cn("text-xs font-medium", active ? "text-white" : "text-slate-500")}>{c.id}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-slate-300 font-semibold mb-4">Current Medications</h3>
                        <div className="tag-container mb-2">
                             {health.medications.map(m => (
                                 <span key={m} className="tag-item">{m} <button onClick={() => removeMed(m)} className="ml-1 opacity-60 hover:opacity-100">&times;</button></span>
                             ))}
                             {health.medications.length === 0 && <span className="text-xs text-slate-500 my-auto ml-2">No active medications logged...</span>}
                        </div>
                        <Input 
                           placeholder="Type medication and press Enter..." 
                           value={health.mInput} onChange={e => setHealth({...health, mInput: e.target.value})}
                           onKeyDown={addMed}
                           className="bg-black/50 border-slate-800"
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    )};

    // ─── Step 5: Final Review ─────────────────────────────────────────────
    const renderStep5 = () => {
        if (isSubmitting) {
            return (
                <div className="flex flex-col items-center justify-center p-20 text-center space-y-8">
                     <div className="relative w-32 h-32 flex items-center justify-center hexagon bg-[#0891B2]/10 border-2 border-[#0891B2]">
                         <Activity className="w-12 h-12 text-[#0891B2] status-ongoing" />
                     </div>
                     <div className="space-y-3">
                         <h3 className="text-2xl font-bold text-white">Generating Treatment Protocol</h3>
                         <p className="text-xs text-slate-500">Powered by clinical AI + Ollama LLM</p>
                         <div className="h-8 max-w-sm mx-auto flex items-center justify-center bg-slate-900 rounded-full px-6 border border-slate-800">
                             <AnimatePresence mode="wait">
                                 <motion.span key={loadingStage} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-[#0891B2] text-sm font-mono">
                                     {["Classifying molecular subtype...", "Running guideline evaluation engine...", "Checking algorithmic contraindications...", "Generating AI clinical recommendations..."][loadingStage]}
                                 </motion.span>
                             </AnimatePresence>
                         </div>
                     </div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center p-20 text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                        <ShieldAlert className="w-8 h-8 text-rose-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Analysis Failed</h3>
                        <p className="text-slate-400 text-sm max-w-md">{error}</p>
                    </div>
                    <Button variant="teal" onClick={() => setError(null)}>Try Again</Button>
                </div>
            );
        }

        const compFields = [
            { id: "er", name: "ER Status", complete: biomarkers.er !== "Unknown", step: 3 },
            { id: "pr", name: "PR Status", complete: biomarkers.pr !== "Unknown", step: 3 },
            { id: "her2", name: "HER2 Status", complete: biomarkers.her2 !== "Unknown", step: 3 },
            { id: "ki67", name: "Ki-67", complete: biomarkers.ki67Known, step: 3, warnText: "Ki-67 is missing. The system will default to a conservative classification. Results may be less precise." },
            { id: "size", name: "Tumour Size", complete: tumour.size > 0, step: 2 },
            { id: "nodes", name: "Lymph Nodes", complete: true, step: 2 },
            { id: "stage", name: "Stage", complete: !!tumour.stage, step: 2 },
            { id: "ecog", name: "ECOG Score", complete: true, step: 4 }
        ];
        const completedCount = compFields.filter(f => f.complete).length;
        const totalCount = compFields.length;
        const compPct = Math.round((completedCount / totalCount) * 100);
        const r = 36, circ = 2 * Math.PI * r;
        const offset = circ - (compPct / 100) * circ;
        const isComplete = compPct === 100;

        return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Final Clinical Review</h2>

            {/* Data Completeness Radar */}
            <div className={`p-6 rounded-2xl border transition-all ${isComplete ? "bg-emerald-950/20 border-emerald-500/30" : "bg-slate-900 border-slate-800"}`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        📋 CLINICAL DATA COMPLETENESS
                    </h3>
                    <div className="flex items-center gap-4">
                        <span className={`text-xl font-mono font-bold ${isComplete ? "text-emerald-400" : "text-white"}`}>{compPct}%</span>
                        <div className="relative w-12 h-12">
                            <svg className="rotate-[-90deg] w-full h-full" viewBox="0 0 80 80">
                                <circle cx="40" cy="40" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
                                <motion.circle cx="40" cy="40" r={r} fill="none" stroke={isComplete ? "#10b981" : "#f59e0b"} strokeWidth="8"
                                    strokeLinecap="round" strokeDasharray={circ}
                                    initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {compFields.map(f => (
                        <div key={f.id} 
                             onClick={() => !f.complete && setStep(f.step)}
                             className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${f.complete ? "text-slate-300" : "text-amber-500 bg-amber-500/10 cursor-pointer hover:bg-amber-500/20 border border-amber-500/30"}`}>
                            {f.complete ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <div className="w-4 h-4 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />}
                            <span className="text-sm font-medium">{f.name} {f.complete ? "" : "(MISSING)"}</span>
                        </div>
                    ))}
                </div>

                {compFields.filter(f => !f.complete).map(f => (
                    <div key={f.id} className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                        <TriangleAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm text-slate-300">{f.warnText || `${f.name} is missing. Please provide a value for accurate analysis.`}</p>
                            <button onClick={() => setStep(f.step)} className="text-[#0891B2] text-sm mt-1 hover:underline font-medium">
                                [Enter {f.name} →]
                            </button>
                        </div>
                    </div>
                ))}
                {isComplete && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-sm font-medium">
                        <CheckCircle2 className="w-5 h-5" /> Complete Data — Analysis Ready
                    </motion.div>
                )}
            </div>
            
            <Accordion type="multiple" defaultValue={["item-1", "item-2", "item-3"]} className="w-full space-y-4">
                <AccordionItem value="item-1" className="bg-slate-900 border border-slate-800 rounded-xl px-6 data-[state=open]:pb-2">
                   <AccordionTrigger className="hover:no-underline py-4 text-white">Tumour & Diagnostics</AccordionTrigger>
                   <AccordionContent className="text-slate-400">
                       <ul className="grid grid-cols-2 gap-y-2 list-disc pl-4 text-sm">
                           <li>Stage {tumour.stage}</li><li>Grade {tumour.grade}</li>
                           <li>Size: {tumour.size.toFixed(1)} cm</li><li>Lymph Nodes: {tumour.nodes ? "Positive" : "Negative"}</li>
                       </ul>
                   </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="bg-slate-900 border border-slate-800 rounded-xl px-6 data-[state=open]:pb-2">
                   <AccordionTrigger className="hover:no-underline py-4 text-white hover:text-white">Molecular Profile</AccordionTrigger>
                   <AccordionContent className="text-slate-400">
                       <div className="flex flex-wrap gap-2 text-sm mt-2">
                           {Object.entries(biomarkers).filter(([_, v]) => v !== "Unknown" && v !== "Not Done").map(([k,v]) => (
                               <span key={k} className="bg-slate-800 px-2 py-1 rounded-md text-slate-300 border border-slate-700">
                                   <strong className="uppercase">{k}:</strong> {v}
                               </span>
                           ))}
                       </div>
                   </AccordionContent>
                </AccordionItem>
            </Accordion>
        </motion.div>
    )};

    return (
        <div className="max-w-4xl mx-auto p-8 py-12 min-h-[calc(100vh-4rem)] flex flex-col">
           {/* Top Progress Indicator */}
           <div className="mb-12 relative flex justify-between items-center w-full max-w-2xl mx-auto">
               <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -z-10 -translate-y-1/2 rounded-full overflow-hidden">
                   <motion.div 
                     className="h-full bg-[#0891B2]" 
                     initial={{ width: 0 }} 
                     animate={{ width: `${((step - 1) / (isSubmitting ? 4 : 4)) * 100}%` }} 
                     transition={{ duration: 0.5 }}
                   />
               </div>
               
               {[1, 2, 3, 4, 5].map(s => (
                   <div key={s} className="relative group">
                       <div className={cn(
                           "w-12 h-12 hexagon flex items-center justify-center transition-all duration-500",
                           step > s ? "bg-[#059669] text-white glow-emerald shadow-lg" : 
                           step === s ? "bg-[#0891B2] text-white glow-teal scale-110 shadow-xl" : 
                           "bg-slate-800 text-slate-500"
                       )}>
                           {step > s ? <Check className="w-5 h-5" /> : <span className="font-bold text-sm tracking-tighter">{s}</span>}
                       </div>
                   </div>
               ))}
           </div>

           {/* Floating Upload Button (visible in steps 1-4) */}
           <AnimatePresence>
               {step > 0 && step < 5 && (
                   <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 right-8 z-40 hidden lg:block">
                       <label className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:border-[#0891B2] hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-full shadow-lg cursor-pointer transition-all">
                           <Upload className="w-4 h-4 text-[#0891B2]" />
                           <span className="text-sm font-medium">{isUploading ? 'Extracting...' : 'Upload Report to Auto-fill'}</span>
                           <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} disabled={isUploading} />
                       </label>
                   </motion.div>
               )}
           </AnimatePresence>

           {/* Form Content Area */}
           <div className="flex-1">
               <AnimatePresence mode="wait">
                   {step === 0 && <div key="step0">{renderStep0()}</div>}
                   {step === 1 && <div key="step1">{renderStep1()}</div>}
                   {step === 2 && <div key="step2">{renderStep2()}</div>}
                   {step === 3 && <div key="step3">{renderStep3()}</div>}
                   {step === 4 && <div key="step4">{renderStep4()}</div>}
                   {step === 5 && <div key="step5">{renderStep5()}</div>}
               </AnimatePresence>
           </div>

           {/* Bottom Navigation */}
           {!isSubmitting && step > 0 && (
               <div className="mt-12 pt-6 border-t border-slate-800 flex justify-between">
                   <Button variant="outline" onClick={handlePrev} disabled={step === 0} className="w-32 border-slate-700 bg-slate-900 text-slate-300">
                       Back
                   </Button>
                   
                   {step < 5 ? (
                       <Button variant="teal" onClick={handleNext} className="w-40 group">
                           Next Phase <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                       </Button>
                   ) : (
                       <Button variant="teal" onClick={handleSubmit} className="w-48 group shadow-[0_0_20px_rgba(8,145,178,0.4)] relative overflow-hidden bg-gradient-to-r from-[#0891B2] to-[#0F3460]">
                           <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300"/>
                           <Stethoscope className="w-5 h-5 mr-2 relative z-10" /> 
                           <span className="relative z-10 font-bold">Initiate Analysis</span>
                       </Button>
                   )}
               </div>
           )}
        </div>
    );
}
