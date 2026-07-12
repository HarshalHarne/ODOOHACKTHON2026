import {
  ArrowLeftRight,
  CalendarCheck,
  Package,
  PackageCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value?: number;
}

const kpiStyles: Record<
  string,
  { icon: LucideIcon; accent: string; glow: string }
> = {
  "Assets Available": {
    icon: Package,
    accent: "from-teal-500 to-emerald-500",
    glow: "bg-teal-500/10 text-teal-600 dark:text-teal-300",
  },
  "Assets Allocated": {
    icon: PackageCheck,
    accent: "from-sky-500 to-cyan-500",
    glow: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  },
  "Maintenance Today": {
    icon: Wrench,
    accent: "from-amber-500 to-orange-500",
    glow: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
  "Active Bookings": {
    icon: CalendarCheck,
    accent: "from-violet-500 to-purple-500",
    glow: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  },
  "Pending Transfers": {
    icon: ArrowLeftRight,
    accent: "from-rose-500 to-pink-500",
    glow: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  },
  "Upcoming Returns": {
    icon: PackageCheck,
    accent: "from-indigo-500 to-blue-500",
    glow: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  },
};

const defaultStyle = {
  icon: Package,
  accent: "from-teal-500 to-sky-500",
  glow: "bg-teal-500/10 text-teal-600 dark:text-teal-300",
};

export default function KPICard({ title, value }: KPICardProps) {
  const style = kpiStyles[title] ?? defaultStyle;
  const Icon = style.icon;

  return (
    <article className="workspace-card group relative overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80",
          style.accent
        )}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </span>
          <strong className="mt-4 block text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value === undefined ? "—" : value}
          </strong>
        </div>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl",
            style.glow
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-5 text-xs text-slate-400 dark:text-slate-500">
        Updated from live workspace activity
      </p>
    </article>
  );
}
