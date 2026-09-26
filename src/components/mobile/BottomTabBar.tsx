"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Folders, Plus, PieChart, Settings } from "lucide-react";
import { motion } from "framer-motion";

export function BottomTabBar() {
  const pathname = usePathname();

  const tabs = [
    { name: "Home", href: "/m", icon: Home },
    { name: "Cases", href: "/m/cases", icon: Folders },
    { name: "New", href: "/m/new", icon: Plus, isFab: true },
    { name: "Stats", href: "/m/analytics", icon: PieChart },
    { name: "More", href: "/m/more", icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-[#0D1220] border-t border-white/5 z-50 px-6 pb-safe">
      <div className="flex items-center justify-between h-full max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (pathname.startsWith(tab.href + "/") && tab.href !== "/m");

          if (tab.isFab) {
            return (
              <Link href={tab.href} key={tab.name} className="relative -top-5">
                <motion.div 
                  whileTap={{ scale: 0.9 }}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-[#67C9E8] to-[#0F3460] flex items-center justify-center shadow-[0_0_20px_rgba(8,145,178,0.4)]"
                >
                  <tab.icon className="w-7 h-7 text-white" />
                </motion.div>
              </Link>
            );
          }

          return (
            <Link href={tab.href} key={tab.name} className="flex flex-col items-center justify-center w-12 gap-1 group relative h-full">
              <tab.icon className={`w-5 h-5 transition-colors ${isActive ? "text-[#0891B2]" : "text-slate-500 group-hover:text-slate-400"}`} />
              <span className={`text-[10px] transition-colors ${isActive ? "text-[#0891B2] font-medium" : "text-slate-500 group-hover:text-slate-400"}`}>
                {tab.name}
              </span>
              {isActive && (
                <motion.div layoutId="bottomTabIndicator" className="w-1 h-1 rounded-full bg-[#0891B2] absolute bottom-2" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
