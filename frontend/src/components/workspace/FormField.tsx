import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export default function FormField({
  label,
  children,
  className,
}: FormFieldProps) {
  return (
    <label className={cn("flex flex-col gap-2", className)}>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

export const formControlClass =
  "h-11 w-full rounded-xl border-2 border-white/15 bg-white/5 px-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/70";
