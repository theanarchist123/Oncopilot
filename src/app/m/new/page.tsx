"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Check, UploadCloud, UserCircle2, ShieldAlert,
  HeartPulse, ActivitySquare, Bone, Droplets, FlaskConical, Stethoscope, Save, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAnalysisResultStore } from "@/store";

const PillToggle = ({ options, value, onChange }: { options: string[], value: string, onChange: (v: string) => void }) => (
  <div className="flex p-0.5 bg-slate-900 border border-slate-800 rounded-xl w-full">
    {options.map(opt => (
      <button
        key={opt} type="button" onClick={() => onChange(opt)}
        className={cn(
          "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-300",
          value === opt
            ? opt === "Positive" ? "bg-rose-500/20 text-rose-500 shadow-sm"
              : opt === "Negative" ? "bg-[#0891B2]/20 text-[#0891B2] shadow-sm"
              : "bg-slate-700 text-white shadow-sm"
            : "text-slate-500 hover:text-slate-300"
        )}
      >{opt}</button>
    ))}
  </div>
);

const STEPS = ["Upload", "Patient", "Tumour", "Biomarkers", "Health", "Review"];

export default function MobileNewCase() {
  const router = useRouter();
  const setAnalysisResult = useAnalysisResultStore((s) => s.setResult);
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

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
    setIsUploading(true); setError(null); setUploadWarning(null);
    try {
      const res = await api.extractReport(file);
      if (res.success && res.data) {
        const data = res.data;
        if (data.patient) setPatient(p => ({ ...p, name: data.patient.name || p.name, age: data.patient.age || p.age, sex: data.patient.sex || p.sex }));
        if (data.tumour) setTumour(t => ({ ...t, stage: data.tumour.stage || t.stage, grade: data.tumour.grade || t.grade, size: data.tumour.size || t.size, nodes: data.tumour.lymph_nodes_involved ?? t.nodes, nodeCount: data.tumour.node_count || t.nodeCount }));
        if (data.biomarkers) setBiomarkers(b => ({ ...b, er: data.biomarkers.er_status || b.er, pr: data.biomarkers.pr_status || b.pr, her2: data.biomarkers.her2_status || b.her2, ki67: data.biomarkers.ki67_percent || b.ki67, ki67Known: !!data.biomarkers.ki67_percent, brca1: data.biomarkers.brca1_status || b.brca1, brca2: data.biomarkers.brca2_status || b.brca2, tils: data.biomarkers.tils_percent || b.tils, oncotype: data.biomarkers.oncotype_dx_score || b.oncotype }));
        if (data.health) setHealth(h => ({ ...h, lvef: data.health.lvef_percent || h.lvef, ecog: data.health.ecog_score || h.ecog, comorbidities: data.health.comorbidities || h.comorbidities, medications: data.health.medications || h.medications }));
        setUploadSuccess(true);
        if (res.warning) { setUploadWarning(res.warning); }
        else { setTimeout(() => { setUploadSuccess(false); setStep(1); }, 2000); }
      } else { setError(res.error || "Failed to extract report data."); }
    } catch (err: any) { setError(err.message || "An error occurred during upload."); }
    finally { setIsUploading(false); }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true); setError(null);
    useAnalysisResultStore.getState().clearResult();
    const payload = {
      patient_name: patient.name || "Unknown Patient", patient_age: patient.age || 0, save_case: true,
      clinical_data: {
        stage: tumour.stage, grade: tumour.grade, tumour_size: tumour.size,
        lymph_nodes_involved: tumour.nodes, lymph_node_count: tumour.nodes ? tumour.nodeCount : 0,
        er_status: biomarkers.er, pr_status: biomarkers.pr, her2_status: biomarkers.her2,
        ki67_percent: biomarkers.ki67Known ? biomarkers.ki67 : null,
        brca1_status: biomarkers.brca1, brca2_status: biomarkers.brca2,
        tils_percent: biomarkers.tils, oncotype_dx_score: biomarkers.oncotype,
        mammaprint: biomarkers.mammaprint === "Not Done" ? null : biomarkers.mammaprint,
        lvef_percent: health.lvef, ecog_score: health.ecog,
        comorbidities: health.comorbidities.reduce((a: any, c) => ({ ...a, [c]: true }), {}),
        medications: health.medications.join(", "),
      },
    };
    const stages = ["Classifying molecular subtype...", "Running guideline evaluation engine...", "Checking algorithmic contraindications...", "Generating AI clinical recommendations..."];
    const animateStages = async () => { for (let i = 0; i < stages.length; i++) { setLoadingStage(i); await new Promise(r => setTimeout(r, 1100)); } };
    try {
      const [, result] = await Promise.all([animateStages(), api.instantAnalysis(payload)]);
      const data = (result as any)?.data || result;
      setAnalysisResult({ ...data, alerts: Array.isArray(data?.alerts) ? data.alerts : [], rule_trace: Array.isArray(data?.rule_trace) ? data.rule_trace : [], recommendations: Array.isArray(data?.recommendations) ? data.recommendations : [], analyzed_at: data?.analyzed_at || new Date().toISOString() });
      router.push("/m/results/new");
    } catch (err: any) { setError(err.message || "Analysis failed."); setIsSubmitting(false); }
  };

  // ── Step 0: Upload ──────────────────────────────────────────────────────────
  const renderStep0 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5 flex flex-col items-center">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-1">Upload Pathology Report</h2>
        <p className="text-slate-400 text-sm">Upload a PDF or image — AI extracts biomarkers automatically.</p>
      </div>
      {error && !uploadWarning && (
        <div className="w-full flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1"><p className="text-rose-300 font-semibold text-xs">Upload failed</p><p className="text-rose-400/80 text-xs mt-0.5">{error}</p></div>
        </div>
      )}
      <label className={cn(
        "w-full h-52 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden",
        error ? "border-rose-500/50 bg-rose-500/5" : uploadWarning ? "border-amber-500/50 bg-amber-500/5" : uploadSuccess ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 bg-slate-900 hover:border-[#0891B2] hover:bg-[#0891B2]/5"
      )}>
        <input type="file" className="hidden" accept=".pdf,.txt,image/*" onChange={handleFileUpload} disabled={isUploading || uploadSuccess || !!uploadWarning} />
        {isUploading ? (
          <div className="flex flex-col items-center"><div className="w-10 h-10 border-4 border-[#0891B2] border-t-transparent rounded-full animate-spin mb-3" /><p className="text-[#0891B2] font-semibold text-sm">Extracting Data...</p><p className="text-xs text-slate-500">OCR + AI — may take 30s</p></div>
        ) : uploadWarning ? (
          <div className="flex flex-col items-center text-amber-500/80"><TriangleAlert className="w-12 h-12 mb-3 opacity-50" /><p className="font-semibold text-amber-400 text-sm">Manual Entry Required</p></div>
        ) : uploadSuccess ? (
          <div className="flex flex-col items-center text-emerald-400"><CheckCircle2 className="w-12 h-12 mb-3" /><p className="font-semibold text-sm">Extraction Successful!</p></div>
        ) : (
          <div className="flex flex-col items-center text-slate-400"><UploadCloud className="w-12 h-12 mb-3" /><p className="font-semibold text-sm mb-1">Tap to upload report</p><p className="text-xs text-slate-500">PDF, image, or text</p></div>
        )}
      </label>
      {uploadWarning ? (
        <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3"><TriangleAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" /><div><p className="text-amber-300 font-semibold text-xs">AI extraction failed</p><p className="text-amber-400/80 text-xs mt-1">{uploadWarning}</p></div></div>
          <Button className="w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold text-sm" onClick={() => { setUploadWarning(null); setUploadSuccess(false); setStep(1); }}>Continue — Enter Manually →</Button>
        </div>
      ) : (
        <Button variant="outline" className="w-full border-slate-700 bg-slate-900/50 text-slate-300 text-sm" onClick={() => setStep(1)}>Skip & Enter Manually</Button>
      )}
    </motion.div>
  );

  // ── Step 1: Patient ─────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
      <h2 className="text-xl font-bold text-white">Patient Demographics</h2>
      <div className="flex gap-4 items-center">
        <div className="w-16 h-16 shrink-0 rounded-full border-2 border-dashed border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center text-slate-500">
          <UserCircle2 className="w-7 h-7 opacity-50" /><span className="text-[9px] mt-0.5">Photo</span>
        </div>
        <div className="flex-1 space-y-3">
          <Input label="Full Name" placeholder="Jane Doe" value={patient.name} onChange={e => setPatient({ ...patient, name: e.target.value })} />
          <div className="flex gap-3">
            <div className="w-1/3"><Input type="number" label="Age" value={patient.age} onChange={e => setPatient({ ...patient, age: parseInt(e.target.value) })} /></div>
            <div className="flex-1"><label className="text-xs font-medium text-slate-400 mb-1.5 block">Sex</label><PillToggle options={["Female", "Male", "Other"]} value={patient.sex} onChange={v => setPatient({ ...patient, sex: v })} /></div>
          </div>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Clinical Notes</label>
        <textarea className="w-full h-28 resize-none rounded-xl p-3 notepad focus:outline-none focus:ring-2 focus:ring-[#0891B2] border border-white/10 text-sm" placeholder="Enter preliminary clinical observations..." value={patient.notes} onChange={e => setPatient({ ...patient, notes: e.target.value })} />
        <p className="text-[10px] text-slate-500 mt-1 flex items-center justify-end font-mono"><Save className="w-3 h-3 mr-1" />Auto-saved</p>
      </div>
    </motion.div>
  );

  // ── Step 2: Tumour ──────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
      <h2 className="text-xl font-bold text-white">Tumour & Staging</h2>
      <div>
        <label className="text-xs font-medium text-slate-400 mb-2 block">Clinical Stage</label>
        <div className="flex justify-between items-end gap-2 p-4 rounded-2xl bg-slate-900 border border-slate-800">
          {["I", "II", "III", "IV"].map((s, i) => (
            <div key={s} onClick={() => setTumour({ ...tumour, stage: s })} className={cn("flex flex-col items-center cursor-pointer transition-all", tumour.stage === s ? "opacity-100 scale-105" : "opacity-40 hover:opacity-70")}>
              <svg width="44" height="44" viewBox="0 0 100 100" className="mb-2">
                <circle cx="50" cy="50" r={20 + (i * 10)} fill={tumour.stage === s ? "#0891B2" : "#334155"} className="transition-all duration-300" />
                {i > 1 && <circle cx={70 + (i * 5)} cy={30 - (i * 2)} r={5 + i} fill={tumour.stage === s ? "#e11d48" : "#334155"} />}
              </svg>
              <span className={cn("font-bold text-xs", tumour.stage === s ? "text-[#0891B2]" : "text-slate-500")}>Stage {s}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 space-y-5">
        <div>
          <label className="flex justify-between text-xs font-medium text-slate-300 mb-4">Tumour Size <span className="text-[#0891B2] font-mono bg-[#0891B2]/10 px-2 py-0.5 rounded">{tumour.size.toFixed(1)} cm</span></label>
          <Slider value={[tumour.size]} min={0.1} max={10} step={0.1} onValueChange={v => setTumour({ ...tumour, size: v[0] })} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-300 mb-2 block">Histological Grade</label>
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(g => (
              <button key={g} type="button" onClick={() => setTumour({ ...tumour, grade: g })}
                className={cn("flex justify-between items-center px-3 py-2.5 rounded-xl border transition-all text-left text-sm",
                  tumour.grade === g ? "border-amber-500 bg-amber-500/10 text-white" : "border-slate-800 bg-slate-900 text-slate-400"
                )}>
                <span className="font-bold">Grade {g}</span>
                <span className="text-xs opacity-70">{g === 1 ? 'Well differentiated' : g === 2 ? 'Moderately differentiated' : 'Poorly differentiated'}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between bg-slate-900 rounded-xl border border-slate-800 p-3">
          <label className="text-xs font-medium text-slate-300">Lymph Node Involvement</label>
          <div className="flex items-center gap-3">
            <span className={tumour.nodes ? "text-slate-500 text-xs" : "text-white text-xs font-medium"}>Neg</span>
            <Switch checked={tumour.nodes} onCheckedChange={c => setTumour({ ...tumour, nodes: c })} />
            <span className={tumour.nodes ? "text-rose-500 text-xs font-medium" : "text-slate-500 text-xs"}>Pos</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // ── Step 3: Biomarkers ──────────────────────────────────────────────────────
  const renderStep3 = () => {
    const ki67Color = biomarkers.ki67 < 14 ? "text-emerald-400" : biomarkers.ki67 < 20 ? "text-amber-400" : "text-rose-500";
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
        <h2 className="text-xl font-bold text-white">Biomarker Control Panel</h2>
        {/* Receptor Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <h3 className="text-[#0891B2] font-semibold text-xs uppercase tracking-wider flex items-center gap-2"><FlaskConical className="w-3.5 h-3.5" />Receptor Status</h3>
          {[["ER Status", "er"], ["PR Status", "pr"], ["HER2 Status", "her2"]].map(([label, key]) => (
            <div key={key} className="space-y-1.5">
              <span className="text-slate-300 text-xs font-medium">{label}</span>
              <PillToggle options={["Positive", "Negative", "Unknown"]} value={(biomarkers as any)[key]} onChange={v => setBiomarkers({ ...biomarkers, [key]: v })} />
            </div>
          ))}
        </div>
        {/* Mutations */}
        <div className={cn("bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 relative overflow-hidden", (biomarkers.brca1 === "Positive" || biomarkers.brca2 === "Positive") && "border-amber-500/30")}>
          {(biomarkers.brca1 === "Positive" || biomarkers.brca2 === "Positive") && (
            <div className="flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/20 -mx-4 -mt-4 px-4 py-2 mb-2 text-amber-500 text-xs font-bold"><ShieldAlert className="w-3.5 h-3.5" />BRCA+ — PARP inhibitor eligible</div>
          )}
          <h3 className="text-rose-500 font-semibold text-xs uppercase tracking-wider">Mutations</h3>
          {[["BRCA1", "brca1"], ["BRCA2", "brca2"]].map(([label, key]) => (
            <div key={key} className="space-y-1.5">
              <span className="text-slate-300 text-xs font-medium">{label}</span>
              <PillToggle options={["Positive", "Negative", "Unknown"]} value={(biomarkers as any)[key]} onChange={v => setBiomarkers({ ...biomarkers, [key]: v })} />
            </div>
          ))}
        </div>
        {/* Proliferation */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-5">
          <h3 className="text-amber-500 font-semibold text-xs uppercase tracking-wider">Proliferation & Genomic Assays</h3>
          <div>
            <div className="flex justify-between items-end mb-3">
              <div><span className="text-slate-300 text-xs block mb-1">Ki-67 Index</span><div className="flex items-center gap-2"><Switch checked={biomarkers.ki67Known} onCheckedChange={c => setBiomarkers({ ...biomarkers, ki67Known: c })} /><span className="text-[10px] text-slate-500">Value Known</span></div></div>
              <div className="text-right"><span className={`font-mono font-bold text-lg ${!biomarkers.ki67Known ? 'text-slate-600' : ki67Color}`}>{biomarkers.ki67Known ? `${biomarkers.ki67}%` : '--'}</span></div>
            </div>
            <Slider disabled={!biomarkers.ki67Known} value={[biomarkers.ki67]} max={100} step={1} onValueChange={v => setBiomarkers({ ...biomarkers, ki67: v[0] })} />
          </div>
          <div>
            <div className="flex justify-between items-end mb-3">
              <span className="text-slate-300 text-xs">Oncotype DX</span>
              <span className="font-mono font-bold text-lg text-purple-400">{biomarkers.oncotype}</span>
            </div>
            <Slider value={[biomarkers.oncotype]} max={100} step={1} onValueChange={v => setBiomarkers({ ...biomarkers, oncotype: v[0] })} />
          </div>
        </div>
      </motion.div>
    );
  };

  // ── Step 4: Health ──────────────────────────────────────────────────────────
  const renderStep4 = () => {
    const lvefRotation = (health.lvef / 100) * 180;
    const isContraindicated = health.lvef < 50;
    const toggleComorbidity = (c: string) => {
      if (health.comorbidities.includes(c)) setHealth({ ...health, comorbidities: health.comorbidities.filter(x => x !== c) });
      else setHealth({ ...health, comorbidities: [...health.comorbidities, c] });
    };
    const addMed = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && health.mInput) { e.preventDefault(); setHealth({ ...health, medications: [...health.medications, health.mInput], mInput: "" }); }
    };
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
        <h2 className="text-xl font-bold text-white">Systemic Health Profile</h2>
        {/* LVEF Gauge */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
          <h3 className="text-slate-300 font-semibold mb-4 text-sm self-start">LVEF (Ejection Fraction)</h3>
          <div className="relative w-40 h-20 overflow-hidden flex justify-center mt-2 mb-6">
            <svg viewBox="0 0 200 100" className="w-full h-full">
              <defs>
                <linearGradient id="lvefGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e11d48" /><stop offset="45%" stopColor="#d97706" /><stop offset="55%" stopColor="#059669" /><stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
              <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="url(#lvefGrad)" strokeWidth="20" strokeLinecap="round" />
              <motion.g animate={{ rotate: lvefRotation }} style={{ transformOrigin: "100px 100px" }}>
                <path d="M 95 100 L 100 20 L 105 100 Z" fill="#fff" /><circle cx="100" cy="100" r="8" fill="#fff" />
              </motion.g>
            </svg>
            <div className="absolute bottom-0 text-2xl font-bold font-mono text-white bg-slate-900 border border-slate-800 rounded-lg px-3 py-0.5 translate-y-2">{health.lvef}%</div>
          </div>
          <div className="w-full mb-4"><Slider max={100} min={10} step={1} value={[health.lvef]} onValueChange={v => setHealth({ ...health, lvef: v[0] })} /></div>
          {isContraindicated && (
            <div className="w-full bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 text-center text-xs text-rose-500 flex items-center justify-center gap-2 mb-3">
              <ShieldAlert className="w-3.5 h-3.5" />Anthracycline contraindicated.
            </div>
          )}
          <div className="w-full">
            <label className="text-xs font-medium text-slate-300 block mb-2">ECOG Performance Status</label>
            <div className="flex p-0.5 bg-slate-900 border border-slate-800 rounded-xl">
              {["0", "1", "2", "3", "4"].map(v => (
                <button key={v} type="button" onClick={() => setHealth({ ...health, ecog: parseInt(v) })} className={cn("flex-1 py-1.5 rounded-lg text-xs font-medium transition-all", health.ecog === parseInt(v) ? "bg-slate-700 text-white" : "text-slate-500")}>{v}</button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">{health.ecog === 0 ? "Fully active" : health.ecog === 1 ? "Restricted physically" : health.ecog === 2 ? "Ambulatory, capable of selfcare" : health.ecog === 3 ? "Limited selfcare" : "Completely disabled"}</p>
          </div>
        </div>
        {/* Comorbidities */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-slate-300 font-semibold mb-3 text-sm">Comorbidities</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {[{ id: "Cardiac", icon: HeartPulse, color: "text-rose-500" }, { id: "Diabetes", icon: Droplets, color: "text-sky-400" }, { id: "Hypertension", icon: ActivitySquare, color: "text-amber-500" }, { id: "Osteoporosis", icon: Bone, color: "text-slate-300" }].map(c => {
              const active = health.comorbidities.includes(c.id);
              const Icon = c.icon;
              return (
                <div key={c.id} onClick={() => toggleComorbidity(c.id)} className={cn("p-3 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition-all", active ? "bg-slate-800 border-[#0891B2]" : "bg-slate-900/50 border-slate-800")}>
                  <Icon className={cn("w-5 h-5", active ? c.color : "text-slate-600")} />
                  <span className={cn("text-xs font-medium", active ? "text-white" : "text-slate-500")}>{c.id}</span>
                </div>
              );
            })}
          </div>
        </div>
        {/* Medications */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-slate-300 font-semibold mb-3 text-sm">Current Medications</h3>
          <div className="tag-container mb-2 min-h-[28px]">
            {health.medications.map(m => (<span key={m} className="tag-item text-xs">{m} <button onClick={() => setHealth({ ...health, medications: health.medications.filter(x => x !== m) })} className="ml-1 opacity-60">×</button></span>))}
            {health.medications.length === 0 && <span className="text-xs text-slate-500 my-auto ml-2">No medications logged...</span>}
          </div>
          <Input placeholder="Type medication and press Enter..." value={health.mInput} onChange={e => setHealth({ ...health, mInput: e.target.value })} onKeyDown={addMed} className="bg-black/50 border-slate-800 text-sm" />
        </div>
      </motion.div>
    );
  };

  // ── Step 5: Review ──────────────────────────────────────────────────────────
  const renderStep5 = () => {
    if (isSubmitting) return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
        <div className="relative w-24 h-24 flex items-center justify-center hexagon bg-[#0891B2]/10 border-2 border-[#0891B2]">
          <Activity className="w-10 h-10 text-[#0891B2] status-ongoing" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Generating Treatment Protocol</h3>
          <p className="text-xs text-slate-500">Powered by clinical AI + Ollama LLM</p>
          <div className="h-8 flex items-center justify-center bg-slate-900 rounded-full px-6 border border-slate-800">
            <AnimatePresence mode="wait">
              <motion.span key={loadingStage} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-[#0891B2] text-xs font-mono">
                {["Classifying molecular subtype...", "Running guideline evaluation engine...", "Checking algorithmic contraindications...", "Generating AI clinical recommendations..."][loadingStage]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
    if (error) return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center"><ShieldAlert className="w-7 h-7 text-rose-500" /></div>
        <div><h3 className="text-lg font-bold text-white mb-1">Analysis Failed</h3><p className="text-slate-400 text-sm max-w-sm">{error}</p></div>
        <Button variant="teal" onClick={() => setError(null)}>Try Again</Button>
      </div>
    );
    const compFields = [
      { id: "er", name: "ER Status", complete: biomarkers.er !== "Unknown", step: 3 },
      { id: "pr", name: "PR Status", complete: biomarkers.pr !== "Unknown", step: 3 },
      { id: "her2", name: "HER2 Status", complete: biomarkers.her2 !== "Unknown", step: 3 },
      { id: "ki67", name: "Ki-67", complete: biomarkers.ki67Known, step: 3, warnText: "Ki-67 missing — conservative classification used." },
      { id: "size", name: "Tumour Size", complete: tumour.size > 0, step: 2 },
      { id: "stage", name: "Stage", complete: !!tumour.stage, step: 2 },
      { id: "nodes", name: "Lymph Nodes", complete: true, step: 2 },
      { id: "ecog", name: "ECOG Score", complete: true, step: 4 },
    ];
    const completedCount = compFields.filter(f => f.complete).length;
    const compPct = Math.round((completedCount / compFields.length) * 100);
    const isComplete = compPct === 100;
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
        <h2 className="text-xl font-bold text-white">Final Clinical Review</h2>
        <div className={cn("p-4 rounded-2xl border transition-all", isComplete ? "bg-emerald-950/20 border-emerald-500/30" : "bg-slate-900 border-slate-800")}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-white text-sm">📋 Data Completeness</h3>
            <span className={cn("text-xl font-mono font-bold", isComplete ? "text-emerald-400" : "text-white")}>{compPct}%</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {compFields.map(f => (
              <div key={f.id} onClick={() => !f.complete && setStep(f.step)} className={cn("flex items-center gap-1.5 p-2 rounded-lg text-xs transition-colors", f.complete ? "text-slate-300" : "text-amber-500 bg-amber-500/10 cursor-pointer border border-amber-500/30")}>
                {f.complete ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse shrink-0" />}
                <span>{f.name}{!f.complete && " (MISSING)"}</span>
              </div>
            ))}
          </div>
          {compFields.filter(f => !f.complete).map(f => (
            <div key={f.id} className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2">
              <TriangleAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300">{f.warnText || `${f.name} is not provided — results may be less precise.`}</p>
            </div>
          ))}
        </div>
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Patient</p>
            <p className="text-white font-semibold text-sm">{patient.name || "—"}</p>
            <p className="text-xs text-slate-400">{patient.age}y • {patient.sex}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Tumour</p>
            <p className="text-white font-semibold text-sm">Stage {tumour.stage} • G{tumour.grade}</p>
            <p className="text-xs text-slate-400">{tumour.size}cm • Nodes: {tumour.nodes ? "+" : "−"}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Receptors</p>
            <p className="text-xs text-slate-300">ER: {biomarkers.er} • PR: {biomarkers.pr}</p>
            <p className="text-xs text-slate-300">HER2: {biomarkers.her2}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Health</p>
            <p className="text-xs text-slate-300">LVEF: {health.lvef}% • ECOG: {health.ecog}</p>
            <p className="text-xs text-slate-300">{health.comorbidities.join(", ") || "No comorbidities"}</p>
          </div>
        </div>
        <Button onClick={handleSubmit} variant="teal" className="w-full h-12 text-sm font-bold shadow-[0_0_20px_rgba(8,145,178,0.3)]">
          Run AI Analysis →
        </Button>
      </motion.div>
    );
  };

  const steps = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  return (
    <div className="min-h-full pb-28">
      {/* Step Progress Bar */}
      <div className="sticky top-0 z-10 bg-[#0D1220]/95 backdrop-blur border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Consultation</h2>
          <span className="text-xs text-slate-500">{step + 1} / {STEPS.length}</span>
        </div>
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col gap-1">
              <div className={cn("h-1 rounded-full transition-all", i <= step ? "bg-[#0891B2]" : "bg-slate-800")} />
              <span className={cn("text-[9px] text-center truncate", i === step ? "text-[#0891B2] font-medium" : "text-slate-600")}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {steps[step]()}
        </AnimatePresence>

        {/* Navigation */}
        {!isSubmitting && (
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <Button variant="outline" onClick={handlePrev} className="flex-1 border-slate-700 bg-slate-900 text-slate-300 h-11 text-sm">← Back</Button>
            )}
            {step < 5 && (
              <Button variant="teal" onClick={handleNext} className="flex-1 h-11 text-sm">
                {step === 0 ? "Skip & Enter Manually" : "Continue →"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
