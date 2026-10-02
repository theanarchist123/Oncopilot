"use client";

import React from "react";
import { BottomTabBar } from "@/components/mobile/BottomTabBar";
import { Activity, Bell } from "lucide-react";
import { useNotificationsStore } from "@/store";

export default function MobileDashboardLayout({ children }: { children: React.ReactNode }) {
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  return (
    <div className="flex flex-col h-[100dvh] mobile-atmosphere text-white overflow-hidden">
      {/* Mobile Top Bar */}
      <header className="h-[4.25rem] shrink-0 flex items-center justify-between px-5 bg-[#0b1220]/90 backdrop-blur-xl border-b border-white/8 z-40">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#67C9E8]" />
          <span className="font-bold text-lg tracking-tight text-white">On<span className="text-[#67C9E8]">Copilot</span></span>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="relative text-slate-400 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full text-[8px] font-bold flex items-center justify-center text-white ring-2 ring-[#0D1220]">
                {unreadCount}
              </span>
            )}
          </button>
          <div className="w-8 h-8 rounded-full bg-[#163b4c] border border-[#67C9E8]/30 flex items-center justify-center text-xs font-bold shadow-sm">
            PS
          </div>
        </div>
      </header>

      {/* Main Content Area (scrollable) */}
      <main className="flex-1 overflow-y-auto pb-24 scroll-smooth">
        {children}
      </main>

      {/* Bottom Tab Navigation */}
      <BottomTabBar />
    </div>
  );
}
