import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface DataTableProps {
  columns: string[];
  children: ReactNode;
  emptyMessage: string;
  isEmpty: boolean;
  className?: string;
}

export default function DataTable({
  columns,
  children,
  emptyMessage,
  isEmpty,
  className,
}: DataTableProps) {
  return (
    <div className={cn("overflow-hidden rounded-[1.25rem] border border-white/15", className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/15 bg-white/5">
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
