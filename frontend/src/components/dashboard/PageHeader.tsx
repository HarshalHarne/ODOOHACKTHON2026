"use client";

import { ReactNode, useEffect, useState } from "react";
import { Bell, Moon, Sun } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export default function PageHeader({
  title,
  description,
  actions,
}: PageHeaderProps) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("assetflow-theme");
    const isDark = savedTheme === "dark";

    setTimeout(() => {
      setDarkMode(isDark);
    }, 0);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const nextTheme = !darkMode;

    setDarkMode(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme);
    localStorage.setItem("assetflow-theme", nextTheme ? "dark" : "light");
  };

  return (
    <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-teal-600 dark:text-teal-400">
          AssetFlow Workspace
        </p>
        <h1 className="workspace-section-title text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {actions}
        <button
          type="button"
          onClick={toggleTheme}
          className="workspace-card inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-teal-500/30 hover:text-teal-700 dark:text-slate-200 dark:hover:text-teal-300"
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {darkMode ? "Light mode" : "Dark mode"}
        </button>

        <button
          type="button"
          className="workspace-card inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-teal-500/30 hover:text-teal-700 dark:text-slate-200 dark:hover:text-teal-300"
          aria-label="Open notifications"
        >
          <Bell className="size-4" />
          Alerts
        </button>

        <div className="workspace-card flex items-center gap-3 rounded-xl px-3 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-sky-500 text-sm font-bold text-white">
            U
          </div>
          <div className="hidden sm:block">
            <strong className="block text-sm text-slate-900 dark:text-white">
              User
            </strong>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              Workspace Account
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
