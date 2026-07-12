import { Sparkles } from "lucide-react";

import PageHeader from "@/components/dashboard/PageHeader";

interface WorkspaceSectionPageProps {
  title: string;
  description: string;
}

export default function WorkspaceSectionPage({
  title,
  description,
}: WorkspaceSectionPageProps) {
  return (
    <section>
      <PageHeader title={title} description={description} />

      <article className="workspace-card rounded-2xl p-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/15 to-sky-500/10 text-teal-600 dark:text-teal-300">
          <Sparkles className="size-6" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Module in preparation
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
          This workspace section is wired into navigation and ready for feature
          implementation.
        </p>
      </article>
    </section>
  );
}
