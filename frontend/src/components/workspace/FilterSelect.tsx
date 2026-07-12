import { cn } from "@/lib/utils";

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  className?: string;
}

export default function FilterSelect({
  label,
  value,
  onChange,
  options,
  className,
}: FilterSelectProps) {
  return (
    <label className={cn("inline-flex min-w-[9rem] flex-col gap-2", className)}>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="screen-filter h-11 rounded-full border-2 border-white/20 bg-transparent px-4 text-sm text-slate-100 outline-none transition focus:border-emerald-400/70"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-slate-900">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
