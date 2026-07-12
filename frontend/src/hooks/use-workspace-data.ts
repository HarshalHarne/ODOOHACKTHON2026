"use client";

import { useCallback, useEffect, useState } from "react";

import { 
  getWorkspaceData,
  fetchDepartments,
  fetchCategories,
  fetchEmployees
} from "@/lib/workspace/storage";
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
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const localData = getWorkspaceData();
    try {
      const [departments, categories, employees] = await Promise.all([
        fetchDepartments(),
        fetchCategories(),
        fetchEmployees(),
      ]);

      setData({
        ...localData,
        departments,
        categories,
        employees,
      });
    } catch (err) {
      console.error("Failed to fetch workspace data:", err);
      // Fallback to local data only
      setData(localData);
    } finally {
      setIsLoading(false);
    }
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
