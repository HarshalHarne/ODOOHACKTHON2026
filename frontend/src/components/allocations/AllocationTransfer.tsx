"use client";

import { useMemo, useState } from "react";

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
  allocateAsset,
  returnAsset,
  submitTransferRequest,
} from "@/lib/workspace/storage";

function formatHistoryDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function AllocationTransfer() {
  const { data, refresh } = useWorkspaceData();
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [allocateEmployeeId, setAllocateEmployeeId] = useState("");
  const [transferEmployeeId, setTransferEmployeeId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [returnCondition, setReturnCondition] = useState("");
  const [returnSheetOpen, setReturnSheetOpen] = useState(false);
  const [message, setMessage] = useState("");

  const selectedAsset = data.assets.find((asset) => asset.id === selectedAssetId);
  const activeAllocation = selectedAssetId
    ? data.allocations.find(
        (allocation) =>
          allocation.assetId === selectedAssetId && allocation.active
      )
    : undefined;

  const currentEmployee = activeAllocation
    ? data.employees.find(
        (employee) => employee.id === activeAllocation.employeeId
      )
    : undefined;

  const currentDepartment = currentEmployee
    ? data.departments.find(
        (department) => department.id === currentEmployee.departmentId
      )
    : undefined;

  const assetHistory = useMemo(() => {
    return data.allocationHistory
      .filter((entry) => entry.assetId === selectedAssetId)
      .sort(
        (left, right) =>
          new Date(right.occurredAt).getTime() -
          new Date(left.occurredAt).getTime()
      );
  }, [data.allocationHistory, selectedAssetId]);

  const handleAllocate = () => {
    if (!selectedAssetId || !allocateEmployeeId) {
      return;
    }

    const result = allocateAsset(selectedAssetId, allocateEmployeeId);

    if (!result.success) {
      setMessage("This asset is already allocated. Submit a transfer request.");
      return;
    }

    notifyWorkspaceUpdated();
    refresh();
    setAllocateEmployeeId("");
    setMessage("Asset allocated successfully.");
  };

  const handleTransfer = () => {
    if (!selectedAssetId || !transferEmployeeId || !transferReason.trim()) {
      return;
    }

    const result = submitTransferRequest(
      selectedAssetId,
      transferEmployeeId,
      transferReason.trim()
    );

    if (!result.success) {
      setMessage("Unable to submit transfer request.");
      return;
    }

    notifyWorkspaceUpdated();
    refresh();
    setTransferEmployeeId("");
    setTransferReason("");
    setMessage("Transfer request submitted.");
  };

  const handleReturn = () => {
    if (!selectedAssetId) {
      return;
    }

    returnAsset(selectedAssetId, returnCondition.trim());
    notifyWorkspaceUpdated();
    refresh();
    setReturnCondition("");
    setReturnSheetOpen(false);
    setMessage("Asset returned and marked available.");
  };

  return (
    <section>
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
          Allocation workflow
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          Asset Allocation &amp; Transfer
        </h1>
      </div>

      <ScreenPanel>
        <FormField label="Select asset">
          <select
            className={formControlClass}
            value={selectedAssetId}
            onChange={(event) => {
              setSelectedAssetId(event.target.value);
              setMessage("");
              setAllocateEmployeeId("");
              setTransferEmployeeId("");
              setTransferReason("");
            }}
          >
            <option value="">Choose an asset</option>
            {data.assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.tag} - {asset.name}
              </option>
            ))}
          </select>
        </FormField>

        {!selectedAssetId && (
          <p className="mt-5 text-sm text-slate-400">
            Select an asset to allocate, transfer, or review allocation
            history.
          </p>
        )}

        {selectedAsset && activeAllocation && currentEmployee && (
          <div className="mt-5 rounded-2xl border-2 border-red-400/70 bg-red-500/10 px-4 py-4 text-sm leading-6 text-red-100">
            Already allocated to {currentEmployee.name}
            {currentDepartment ? ` (${currentDepartment.name})` : ""}. Direct
            re-allocation is blocked - submit a transfer request below.
          </div>
        )}

        {selectedAsset && !activeAllocation && selectedAsset.status !== "maintenance" && (
          <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
              Allocate asset
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <FormField label="Allocate to">
                <select
                  className={formControlClass}
                  value={allocateEmployeeId}
                  onChange={(event) =>
                    setAllocateEmployeeId(event.target.value)
                  }
                >
                  <option value="">Select employee</option>
                  {data.employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <Button type="button" onClick={handleAllocate}>
                Allocate
              </Button>
            </div>
          </div>
        )}

        {selectedAsset && activeAllocation && currentEmployee && (
          <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
              Transfer request
            </h2>
            <div className="mt-4 grid gap-4">
              <FormField label="From">
                <input
                  className={formControlClass}
                  value={currentEmployee.name}
                  readOnly
                />
              </FormField>
              <FormField label="To">
                <select
                  className={formControlClass}
                  value={transferEmployeeId}
                  onChange={(event) =>
                    setTransferEmployeeId(event.target.value)
                  }
                >
                  <option value="">Select employee...</option>
                  {data.employees
                    .filter((employee) => employee.id !== currentEmployee.id)
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                </select>
              </FormField>
              <FormField label="Reason">
                <textarea
                  className={`${formControlClass} min-h-28 resize-y py-3`}
                  value={transferReason}
                  onChange={(event) => setTransferReason(event.target.value)}
                />
              </FormField>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleTransfer}
                  className="screen-action rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition hover:bg-emerald-500/10"
                >
                  Submit Request
                </button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReturnSheetOpen(true)}
                >
                  Return asset
                </Button>
              </div>
            </div>
          </div>
        )}

        {message ? (
          <p className="mt-4 text-sm text-emerald-300">{message}</p>
        ) : null}

        {selectedAssetId ? (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
              Allocation history
            </h2>
            {assetHistory.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">
                No allocation history for this asset yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {assetHistory.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                  >
                    {formatHistoryDate(entry.occurredAt)} - {entry.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </ScreenPanel>

      <Sheet open={returnSheetOpen} onOpenChange={setReturnSheetOpen}>
        <SheetContent className="w-full border-white/10 bg-[#0b1018] text-slate-100 sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-white">Return asset</SheetTitle>
            <SheetDescription className="text-slate-400">
              End the active allocation and mark the asset as available.
            </SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-col gap-4 px-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleReturn();
            }}
          >
            <FormField label="Condition">
              <input
                className={formControlClass}
                value={returnCondition}
                onChange={(event) => setReturnCondition(event.target.value)}
                placeholder="good"
              />
            </FormField>
            <SheetFooter className="px-0">
              <Button type="submit">Confirm return</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </section>
  );
}
