"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import FormField, { formControlClass } from "@/components/workspace/FormField";
import ScreenPanel from "@/components/workspace/ScreenPanel";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  notifyWorkspaceUpdated,
  useWorkspaceData,
} from "@/hooks/use-workspace-data";
import {
  createMaintenanceRequest,
  updateMaintenanceStatus,
} from "@/lib/workspace/storage";
import {
  MAINTENANCE_COLUMNS,
  type MaintenanceStatus,
} from "@/lib/workspace/types";
import { cn } from "@/lib/utils";

const nextStatusMap: Partial<
  Record<MaintenanceStatus, { status: MaintenanceStatus; label: string }>
> = {
  pending: { status: "approved", label: "Approve" },
  approved: { status: "technician_assigned", label: "Assign technician" },
  technician_assigned: { status: "in_progress", label: "Start work" },
  in_progress: { status: "resolved", label: "Resolve" },
};

export default function MaintenanceBoard() {
  const { data, refresh } = useWorkspaceData();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [assetId, setAssetId] = useState("");
  const [description, setDescription] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const assetTagById = new Map(data.assets.map((asset) => [asset.id, asset.tag]));

  const handleCreateRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!assetId || !description.trim()) {
      return;
    }

    createMaintenanceRequest(assetId, description.trim());
    notifyWorkspaceUpdated();
    refresh();
    setAssetId("");
    setDescription("");
    setSheetOpen(false);
  };

  const handleAdvance = (requestId: string, currentStatus: MaintenanceStatus) => {
    const next = nextStatusMap[currentStatus];

    if (!next) {
      return;
    }

    if (next.status === "technician_assigned") {
      setActiveRequestId(requestId);
      return;
    }

    updateMaintenanceStatus(requestId, next.status);
    notifyWorkspaceUpdated();
    refresh();
  };

  const handleAssignTechnician = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeRequestId || !technicianName.trim()) {
      return;
    }

    updateMaintenanceStatus(
      activeRequestId,
      "technician_assigned",
      technicianName.trim()
    );
    notifyWorkspaceUpdated();
    refresh();
    setActiveRequestId(null);
    setTechnicianName("");
  };

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Maintenance workflow
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
            Maintenance Management
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="screen-action inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition hover:bg-emerald-500/10"
        >
          <Plus className="size-4" />
          Raise request
        </button>
      </div>

      <ScreenPanel>
        <div className="overflow-x-auto">
          <div className="grid min-w-[1100px] grid-cols-5 gap-4">
            {MAINTENANCE_COLUMNS.map((column) => {
              const cards = data.maintenanceRequests.filter(
                (request) => request.status === column.id
              );

              return (
                <div
                  key={column.id}
                  className="rounded-[1.25rem] border border-white/15 bg-white/5 p-3"
                >
                  <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
                    {column.label}
                  </h2>
                  <div className="space-y-3">
                    {cards.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-500">
                        No cards
                      </p>
                    ) : (
                      cards.map((request) => {
                        const next = nextStatusMap[request.status];

                        return (
                          <article
                            key={request.id}
                            className={cn(
                              "rounded-2xl border px-4 py-4 text-sm leading-6",
                              request.status === "resolved"
                                ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-50"
                                : "border-white/15 bg-[#101722] text-slate-100"
                            )}
                          >
                            <p className="font-semibold">
                              {assetTagById.get(request.assetId) ?? "Asset"}
                            </p>
                            <p className="mt-2 text-slate-300">
                              {request.description}
                            </p>
                            {request.technicianName ? (
                              <p className="mt-2 text-xs text-slate-400">
                                Tech: {request.technicianName}
                              </p>
                            ) : null}
                            {next ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleAdvance(request.id, request.status)
                                }
                                className="mt-4 rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-emerald-400/50 hover:text-emerald-200"
                              >
                                {next.label}
                              </button>
                            ) : null}
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-5 text-sm text-slate-400">
          Approving a card moves the asset to under maintenance, resolving
          returns it to available.
        </p>
      </ScreenPanel>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full border-white/10 bg-[#0b1018] text-slate-100 sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-white">Raise maintenance request</SheetTitle>
            <SheetDescription className="text-slate-400">
              Create a pending maintenance card for an asset.
            </SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-col gap-4 px-4"
            onSubmit={handleCreateRequest}
          >
            <FormField label="Asset">
              <select
                className={formControlClass}
                value={assetId}
                onChange={(event) => setAssetId(event.target.value)}
                required
              >
                <option value="">Select asset</option>
                {data.assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.tag} - {asset.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Issue description">
              <textarea
                className={`${formControlClass} min-h-28 resize-y py-3`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </FormField>
            <SheetFooter className="px-0">
              <Button type="submit">Create request</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet
        open={activeRequestId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveRequestId(null);
            setTechnicianName("");
          }
        }}
      >
        <SheetContent className="w-full border-white/10 bg-[#0b1018] text-slate-100 sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-white">Assign technician</SheetTitle>
            <SheetDescription className="text-slate-400">
              Enter the technician responsible for this maintenance card.
            </SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-col gap-4 px-4"
            onSubmit={handleAssignTechnician}
          >
            <FormField label="Technician name">
              <input
                className={formControlClass}
                value={technicianName}
                onChange={(event) => setTechnicianName(event.target.value)}
                required
              />
            </FormField>
            <SheetFooter className="px-0">
              <Button type="submit">Assign technician</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </section>
  );
}
