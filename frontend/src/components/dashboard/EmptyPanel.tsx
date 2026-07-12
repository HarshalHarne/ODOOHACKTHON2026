import { Inbox } from "lucide-react";

interface EmptyPanelProps {
  title: string;
  emptyTitle: string;
  description: string;
}

export default function EmptyPanel({
  title,
  emptyTitle,
  description,
}: EmptyPanelProps) {
  return (
    <article className="workspace-card rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {title}
        </h2>
        <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-700 dark:text-teal-300">
          Live soon
        </span>
      </div>

      <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/70 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-300">
          <Inbox className="size-5" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {emptyTitle}
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </article>
  );
}
