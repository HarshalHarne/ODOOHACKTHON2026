"use client";

import { useCallback, useEffect, useState } from "react";

import { getWorkspaceData } from "@/lib/workspace/storage";
import type { WorkspaceData } from "@/lib/workspace/types";

export function useWorkspaceData() {
  const [data, setData] = useState<WorkspaceData>({
    departments: [],
    categories: [],
    employees: [],
    assets: [],
    allocations: [],
    allocationHistory: [],
    resources: [],
    bookings: [],
    maintenanceRequests: [],
    auditCycles: [],
    auditChecklist: [],
    discrepancyReports: [],
  });

  const refresh = useCallback(() => {
    setData(getWorkspaceData());
  }, []);

  useEffect(() => {
    refresh();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "assetflow-workspace") {
        refresh();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("assetflow-workspace-updated", refresh);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("assetflow-workspace-updated", refresh);
    };
  }, [refresh]);

  return { data, refresh };
}

export function notifyWorkspaceUpdated() {
  window.dispatchEvent(new Event("assetflow-workspace-updated"));
}
