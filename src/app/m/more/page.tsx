"use client";

import React from "react";
import { User, Bell, Shield, Moon, LogOut, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const SettingRow = ({ icon: Icon, title, value, danger = false }: any) => (
  <div className="flex items-center justify-between p-4 bg-[#0D1220] border-b border-white/5 active:bg-slate-900/50 transition-colors">
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${danger ? 'bg-rose-500/10' : 'bg-slate-800'}`}>
        <Icon className={`w-4 h-4 ${danger ? 'text-rose-500' : 'text-slate-300'}`} />
      </div>
      <span className={`text-sm font-medium ${danger ? 'text-rose-500' : 'text-white'}`}>{title}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-xs text-slate-500">{value}</span>}
      <ChevronRight className="w-4 h-4 text-slate-600" />
    </div>
  </div>
);

export default function MobileMorePage() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("cancer-copilot-auth");
    router.push("/mobile/login");
  };

  return (
    <div className="flex flex-col min-h-full px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Settings</h1>
      </div>

      <div className="bg-[#0D1220] border border-white/10 rounded-2xl p-4 mb-6 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-[#0F3460] flex items-center justify-center text-white font-bold text-lg border border-[#0891B2]/30">
          PS
        </div>
        <div>
          <h3 className="font-bold text-white">Dr. Priya Sharma</h3>
          <p className="text-xs text-slate-400">Oncologist • Tata Memorial</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 overflow-hidden mb-6 shadow-sm">
        <SettingRow icon={User} title="Account Details" />
        <SettingRow icon={Bell} title="Notifications" value="Enabled" />
        <SettingRow icon={Shield} title="Security & Privacy" />
        <SettingRow icon={Moon} title="Appearance" value="Dark Theme" />
      </div>

      <div className="rounded-2xl border border-white/10 overflow-hidden shadow-sm" onClick={handleLogout}>
        <SettingRow icon={LogOut} title="Log Out" danger />
      </div>

      <div className="text-center mt-12 text-[10px] text-slate-600 font-medium">
        OnCopilot Mobile Version 1.0.0
      </div>
    </div>
  );
}
