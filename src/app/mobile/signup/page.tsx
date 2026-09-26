"use client"

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ArrowRight, ArrowLeft, Stethoscope, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export default function MobileSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"doctor" | "patient" | null>(null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [hospital, setHospital] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (role) setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setError("");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        name: `${firstName} ${lastName}`.trim(),
        email,
        password,
        role: role || "doctor",
        hospital: role === "doctor" ? hospital : undefined,
      };
      const res = await api.register(payload);
      if (res.success) {
        router.push("/mobile/login?registered=true");
      }
    } catch (err: any) {
      console.error("Signup failed:", err);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background overflow-hidden relative">
      {/* Background Mesh */}
      <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none" />

      {/* Top Image Section (40%) */}
      <div className="relative h-[35dvh] w-full shrink-0">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1581093588401-fbb62a02f120?q=80&w=800&auto=format&fit=crop')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1220] via-transparent to-background/50" />

        <div className="absolute top-12 left-6 z-10">
          <Link href="/mobile" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#0F3460] flex items-center justify-center shadow-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-white">On<span className="text-[#0891B2]">Copilot</span></span>
          </Link>
          <div className="mt-4 flex items-center gap-4">
             <div className="h-px bg-[#0891B2] w-8" />
             <p className="text-[#0891B2] font-semibold tracking-wider uppercase text-[10px]">Empowering Clinicians</p>
          </div>
        </div>
      </div>

      {/* Bottom Form Section (65% to overlay image slightly) */}
      <div className="relative z-20 flex-1 bg-[#0D1220] rounded-t-3xl border-t border-white/10 px-6 pt-6 pb-12 flex flex-col -mt-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
              className="w-full flex-1 flex flex-col"
            >
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight mb-2 text-white">Create an account</h1>
                <p className="text-slate-400 text-sm">Select your profile type</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {/* Doctor Card */}
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setRole("doctor")}
                  className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-colors ${role === "doctor" ? "border-[#0891B2] bg-[#0891B2]/10" : "border-white/10 bg-slate-900/50"}`}
                >
                  {role === "doctor" && <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[#0891B2]" />}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${role === "doctor" ? "bg-[#0891B2]" : "bg-slate-800"}`}>
                    <Stethoscope className={`w-5 h-5 ${role === "doctor" ? "text-white" : "text-slate-400"}`} />
                  </div>
                  <h3 className="text-base font-bold mb-1 text-white">Doctor</h3>
                  <p className="text-[10px] text-slate-400 leading-snug">Manage cases, get AI insights</p>
                </motion.div>

                {/* Patient Card */}
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setRole("patient")}
                  className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-colors ${role === "patient" ? "border-[#0891B2] bg-[#0891B2]/10" : "border-white/10 bg-slate-900/50"}`}
                >
                  {role === "patient" && <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[#0891B2]" />}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${role === "patient" ? "bg-[#0891B2]" : "bg-slate-800"}`}>
                    <UserRound className={`w-5 h-5 ${role === "patient" ? "text-white" : "text-slate-400"}`} />
                  </div>
                  <h3 className="text-base font-bold mb-1 text-white">Patient</h3>
                  <p className="text-[10px] text-slate-400 leading-snug">View reports & plans</p>
                </motion.div>
              </div>

              <div className="mt-auto">
                <Button 
                  onClick={handleNext} 
                  disabled={!role} 
                  className="w-full group h-12 text-base rounded-xl" 
                  variant="shimmer"
                >
                  Continue Setup <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>

                <div className="text-center mt-6 text-sm">
                  <span className="text-slate-400">Already have an account? </span>
                  <Link href="/mobile/login" className="text-[#0891B2] font-semibold hover:underline">Sign in</Link>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="w-full flex-1 flex flex-col"
            >
              <button onClick={handleBack} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-4 transition-colors">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>

              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight mb-1 text-white">Complete Profile</h1>
                <p className="text-slate-400 text-xs">Set up your {role} credentials.</p>
              </div>

              <form className="space-y-4 flex-1 flex flex-col" onSubmit={handleSignup}>
                <div className="grid grid-cols-2 gap-3">
                  <Input type="text" label="First Name" required value={firstName} onChange={e => setFirstName(e.target.value)} className="bg-slate-900 border-white/10 rounded-xl" />
                  <Input type="text" label="Last Name" required value={lastName} onChange={e => setLastName(e.target.value)} className="bg-slate-900 border-white/10 rounded-xl" />
                </div>
                
                <Input type="email" label="Email Address" required value={email} onChange={e => setEmail(e.target.value)} className="bg-slate-900 border-white/10 rounded-xl" />
                
                {role === "doctor" && (
                   <Input type="text" label="Hospital / Affiliation" required value={hospital} onChange={e => setHospital(e.target.value)} className="bg-slate-900 border-white/10 rounded-xl" />
                )}

                <Input type="password" label="Create Password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} className="bg-slate-900 border-white/10 rounded-xl" />

                {error && <div className="text-rose-500 font-semibold text-xs">{error}</div>}

                <div className="flex items-center text-xs mt-2 mb-4">
                  <label className="flex items-start gap-2 cursor-pointer text-slate-400 leading-snug">
                    <input type="checkbox" required className="mt-0.5 rounded border-border text-[#0891B2] focus:ring-[#0891B2] accent-[#0891B2]" />
                    <span>I agree to the <Link href="#" className="text-[#0891B2] hover:underline">Terms</Link> and <Link href="#" className="text-[#0891B2] hover:underline">Privacy</Link></span>
                  </label>
                </div>

                <div className="mt-auto">
                  <Button type="submit" disabled={loading} className="w-full h-12 text-base rounded-xl" variant="teal">
                    {loading ? "Creating..." : "Create Account"}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
