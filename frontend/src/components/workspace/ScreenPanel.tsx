import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ScreenPanelProps {
  children: ReactNode;
  className?: string;
}

export default function ScreenPanel({ children, className }: ScreenPanelProps) {
  return (
    <section
      className={cn(
        "screen-panel rounded-[1.75rem] border-2 border-white/20 bg-[#0b1018] p-5 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-6",
        className
      )}
    >
      {children}
    </section>
  );
}
