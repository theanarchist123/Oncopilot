"use client"

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, ArrowRight, Fingerprint, LockKeyhole } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { mockUser } from "@/lib/mock-data";
import { api } from "@/lib/api";

export default function MobileLoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
        const res = await api.login({ email, password });
        if (res.success && res.data?.access_token) {
            const token = res.data.access_token;
            login({ ...mockUser, token } as any);
            router.push("/m");
        }
    } catch (err: any) {
        console.error("Login failed:", err);
        setError(err.message || "Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] mobile-atmosphere overflow-hidden relative">
      <div className="absolute inset-0 mobile-grid pointer-events-none" />

      {/* Top Image Section (40%) */}
      <div className="relative h-[40dvh] w-full shrink-0">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=800&auto=format&fit=crop')` }}
        />
        <div className="absolute inset-0 mobile-image-wash" />
        
        {/* Floating Hexagons */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           {[...Array(3)].map((_, i) => (
             <motion.div
               key={i}
               className="absolute w-20 h-20 border border-[#67C9E8]/20 hexagon flex items-center justify-center opacity-30"
               animate={{
                 y: [Math.random() * 50, Math.random() * -50, Math.random() * 50],
                 rotate: [0, 180, 360],
               }}
               transition={{
                 duration: 15 + Math.random() * 10,
                 repeat: Infinity,
                 ease: "linear",
               }}
               style={{
                 left: `${Math.random() * 80}%`,
                 top: `${Math.random() * 80}%`,
               }}
             />
           ))}
        </div>

        <div className="absolute top-10 left-6 z-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#0891B2] flex items-center justify-center shadow-[0_0_28px_rgba(8,145,178,0.35)]">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-white">On<span className="text-[#0891B2]">Copilot</span></span>
          </div>
          <div className="mt-4 flex items-center gap-4">
             <div className="h-px bg-[#0891B2] w-8" />
             <p className="text-[#67C9E8] font-semibold tracking-[0.22em] uppercase text-[9px]">Precision Oncology</p>
          </div>
        </div>
      </div>

      {/* Bottom Form Section (60%) */}
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", bounce: 0, duration: 0.6 }}
        className="relative z-20 flex-1 mobile-surface rounded-t-[2rem] border-t border-white/10 px-6 pt-8 pb-12 flex flex-col"
      >
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 text-[#67C9E8] text-[10px] font-semibold uppercase tracking-[0.2em]"><Fingerprint className="w-3.5 h-3.5" /> Secure workspace</div>
          <h1 className="text-[1.75rem] font-bold tracking-[-0.03em] mb-2 text-white">Welcome back</h1>
          <p className="text-slate-400 text-sm">Continue where your clinical thinking left off.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 flex-1">
          <Input 
            type="email" 
            label="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="seed.doctor@oncopilot.dev"
            className="bg-black/20 border-white/10 h-12 rounded-xl"
            icon={<Activity className="w-4 h-4" />}
          />
          
          <Input 
            type="password" 
            label="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="bg-black/20 border-white/10 h-12 rounded-xl"
            icon={<LockKeyhole className="w-4 h-4" />}
          />

          {error && (
              <div className="text-rose-500 text-sm font-semibold">{error}</div>
          )}

          <div className="flex items-center justify-between text-sm py-2">
            <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                <input type="checkbox" className="rounded border-border text-[#0891B2] focus:ring-[#0891B2] accent-[#0891B2]" />
                Remember me
            </label>
            <Link href="#" className="text-[#0891B2] font-medium hover:underline">Forgot?</Link>
          </div>

          <Button type="submit" className="w-full group h-12 text-base rounded-xl mt-4" variant="shimmer">
            Sign in <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </form>

        <div className="text-center mt-6 text-sm pb-6">
          <span className="text-slate-400">Don't have an account? </span>
          <Link href="/mobile/signup" className="text-[#0891B2] font-semibold hover:underline">Request access</Link>
        </div>
      </motion.div>
    </div>
  );
}
