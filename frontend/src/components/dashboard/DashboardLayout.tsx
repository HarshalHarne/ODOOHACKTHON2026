"use client";

import { ReactNode } from "react";

import AppSidebar from "@/components/dashboard/AppSidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "17.5rem",
        } as React.CSSProperties
      }
    >
      <TooltipProvider>
        <AppSidebar />
        <SidebarInset className="workspace-shell min-h-svh text-slate-900 dark:text-slate-100">
          <header className="workspace-topbar flex h-16 items-center gap-3 px-4 md:px-6">
            <SidebarTrigger className="rounded-xl border border-transparent text-slate-600 transition hover:border-teal-500/20 hover:bg-white/70 hover:text-teal-700 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-teal-300" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
                AssetFlow
              </p>
              <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                Operational workspace
              </p>
            </div>
          </header>

          <div className="relative px-5 py-8 md:px-8 lg:px-10 lg:py-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-teal-500/5 to-transparent dark:from-teal-400/8" />
            <div className="relative">{children}</div>
          </div>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
