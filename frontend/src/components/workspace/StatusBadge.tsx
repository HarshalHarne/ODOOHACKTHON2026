import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  label: string;
  tone?: "success" | "neutral" | "warning" | "info";
};

const toneClasses = {
  success:
    "border-emerald-400/70 bg-emerald-500/10 text-emerald-300",
  neutral:
    "border-white/25 bg-white/5 text-slate-200",
  warning:
    "border-amber-400/70 bg-amber-500/10 text-amber-200",
  info: "border-sky-400/70 bg-sky-500/10 text-sky-200",
};

export default function StatusBadge({
  label,
  tone = "neutral",
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[5.5rem] items-center justify-center rounded-full border px-3 py-1 text-xs font-medium capitalize",
        toneClasses[tone]
      )}
    >
      {label}
    </span>
  );
}
