"use client";

import { useRouter } from "next/navigation";
import { CalendarPlus, PackagePlus, Wrench, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const actions: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: string;
}[] = [
  {
    title: "Register Asset",
    description: "Add a new asset to the organization directory.",
    href: "/assets",
    icon: PackagePlus,
    accent: "from-teal-500/15 to-emerald-500/5 text-teal-600 dark:text-teal-300",
  },
  {
    title: "Book Resource",
    description: "Reserve a shared room, vehicle, or equipment.",
    href: "/bookings",
    icon: CalendarPlus,
    accent: "from-sky-500/15 to-cyan-500/5 text-sky-600 dark:text-sky-300",
  },
  {
    title: "Raise Maintenance Request",
    description: "Report an issue with an organizational asset.",
    href: "/maintenance",
    icon: Wrench,
    accent: "from-amber-500/15 to-orange-500/5 text-amber-600 dark:text-amber-300",
  },
];

export default function QuickActions() {
  const router = useRouter();

  return (
    <section className="mb-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
            Shortcuts
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
            Quick Actions
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.href}
              type="button"
              className="workspace-card group rounded-2xl p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-teal-500/20 hover:shadow-xl"
              onClick={() => router.push(action.href)}
            >
              <div
                className={cn(
                  "mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br",
                  action.accent
                )}
              >
                <Icon className="size-5" />
              </div>
              <strong className="mb-2 block text-base font-semibold text-slate-900 transition group-hover:text-teal-700 dark:text-white dark:group-hover:text-teal-300">
                {action.title}
              </strong>
              <span className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                {action.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
