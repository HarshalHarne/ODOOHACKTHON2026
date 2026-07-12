import type {
  AllocationHistoryEntry,
  AllocationRecord,
  Asset,
  AuditChecklistItem,
  AuditCycle,
  AuditVerificationStatus,
  BookableResource,
  Category,
  Department,
  DiscrepancyReport,
  Employee,
  MaintenanceRequest,
  MaintenanceStatus,
  ResourceBooking,
  WorkspaceData,
} from "@/lib/workspace/types";
import { apiClient } from "@/lib/api-client";

const STORAGE_KEY = "assetflow-workspace";

const emptyWorkspace: WorkspaceData = {
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
};

function normalizeWorkspace(parsed: Partial<WorkspaceData>): WorkspaceData {
  return {
    departments: parsed.departments ?? [],
    categories: parsed.categories ?? [],
    employees: parsed.employees ?? [],
    assets: parsed.assets ?? [],
    allocations: parsed.allocations ?? [],
    allocationHistory: parsed.allocationHistory ?? [],
    resources: parsed.resources ?? [],
    bookings: parsed.bookings ?? [],
    maintenanceRequests: parsed.maintenanceRequests ?? [],
    auditCycles: parsed.auditCycles ?? [],
    auditChecklist: parsed.auditChecklist ?? [],
    discrepancyReports: parsed.discrepancyReports ?? [],
  };
}

function readWorkspace(): WorkspaceData {
  if (typeof window === "undefined") {
    return emptyWorkspace;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return emptyWorkspace;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceData>;
    return normalizeWorkspace(parsed);
  } catch {
    return emptyWorkspace;
  }
}

function writeWorkspace(data: WorkspaceData) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function createId() {
  return crypto.randomUUID();
}

export function getWorkspaceData(): WorkspaceData {
  return readWorkspace();
}

export async function fetchDepartments(): Promise<Department[]> {
  try {
    return await apiClient<Department[]>("/api/v1/departments") || [];
  } catch (error) {
    console.error("Failed to fetch departments", error);
    return [];
  }
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    return await apiClient<Category[]>("/api/v1/categories") || [];
  } catch (error) {
    console.error("Failed to fetch categories", error);
    return [];
  }
}

export async function fetchEmployees(): Promise<Employee[]> {
  try {
    return await apiClient<Employee[]>("/api/v1/employees") || [];
  } catch (error) {
    console.error("Failed to fetch employees", error);
    return [];
  }
}

export function saveAssets(assets: Asset[]) {
  const data = readWorkspace();
  writeWorkspace({ ...data, assets });
}

export async function upsertDepartment(
  department: Omit<Department, "id"> & { id?: string }
) {
  if (department.id) {
    return await apiClient<Department>(`/api/v1/departments/${department.id}`, {
      method: "PUT",
      data: department,
    });
  } else {
    // Parent department logic might need adjustment if parentDept is a name in frontend but ID in backend,
    // but we send it as is. The backend handles parentId / parentDept.
    return await apiClient<Department>("/api/v1/departments", {
      method: "POST",
      data: {
        name: department.name,
        code: department.name.substring(0, 3).toUpperCase(),
        status: department.status,
      },
    });
  }
}

export async function upsertCategory(
  category: Omit<Category, "id"> & { id?: string }
) {
  if (category.id) {
    return await apiClient<Category>(`/api/v1/categories/${category.id}`, {
      method: "PUT",
      data: category,
    });
  } else {
    return await apiClient<Category>("/api/v1/categories", {
      method: "POST",
      data: {
        name: category.name,
        description: category.description,
        status: category.status,
      },
    });
  }
}

export async function upsertEmployee(
  employee: any // Omit<Employee, "id"> & { id?: string } + email, password
) {
  if (employee.id) {
    return await apiClient<Employee>(`/api/v1/employees/${employee.id}`, {
      method: "PUT",
      data: employee,
    });
  } else {
    return await apiClient<Employee>("/api/v1/employees", {
      method: "POST",
      data: employee,
    });
  }
}

export function upsertAsset(asset: Omit<Asset, "id"> & { id?: string }) {
  const data = readWorkspace();
  const id = asset.id ?? createId();
  const nextAsset: Asset = { ...asset, id };
  const index = data.assets.findIndex((item) => item.id === id);

  const assets =
    index === -1
      ? [...data.assets, nextAsset]
      : data.assets.map((item) => (item.id === id ? nextAsset : item));

  writeWorkspace({ ...data, assets });
  return nextAsset;
}

export async function deleteDepartment(id: string) {
  await apiClient(`/api/v1/departments/${id}`, { method: "DELETE" });
}

export async function deleteCategory(id: string) {
  await apiClient(`/api/v1/categories/${id}`, { method: "DELETE" });
}

export async function deleteEmployee(id: string) {
  await apiClient(`/api/v1/employees/${id}`, { method: "DELETE" });
}

export function deleteAsset(id: string) {
  const data = readWorkspace();
  writeWorkspace({
    ...data,
    assets: data.assets.filter((item) => item.id !== id),
  });
}

function updateAssetStatus(assetId: string, status: Asset["status"]) {
  const data = readWorkspace();
  writeWorkspace({
    ...data,
    assets: data.assets.map((asset) =>
      asset.id === assetId ? { ...asset, status } : asset
    ),
  });
}

function appendHistory(assetId: string, label: string) {
  const data = readWorkspace();
  const entry: AllocationHistoryEntry = {
    id: createId(),
    assetId,
    occurredAt: new Date().toISOString(),
    label,
  };

  writeWorkspace({
    ...data,
    allocationHistory: [entry, ...data.allocationHistory],
  });
}

export function getActiveAllocation(assetId: string) {
  const data = readWorkspace();
  return data.allocations.find(
    (allocation) => allocation.assetId === assetId && allocation.active
  );
}

export function allocateAsset(assetId: string, employeeId: string) {
  const data = readWorkspace();
  const existing = getActiveAllocation(assetId);

  if (existing) {
    return { success: false as const, reason: "already_allocated" as const };
  }

  const employee = data.employees.find((item) => item.id === employeeId);
  const department = data.departments.find(
    (item) => item.id === employee?.departmentId
  );

  const allocation: AllocationRecord = {
    id: createId(),
    assetId,
    employeeId,
    active: true,
    startedAt: new Date().toISOString(),
  };

  writeWorkspace({
    ...data,
    allocations: [...data.allocations, allocation],
  });

  updateAssetStatus(assetId, "allocated");
  appendHistory(
    assetId,
    `Allocated to ${employee?.name ?? "employee"}${department ? ` - ${department.name}` : ""}`
  );

  return { success: true as const };
}

export function submitTransferRequest(
  assetId: string,
  toEmployeeId: string,
  reason: string
) {
  const data = readWorkspace();
  const activeAllocation = data.allocations.find(
    (allocation) => allocation.assetId === assetId && allocation.active
  );

  if (!activeAllocation) {
    return { success: false as const, reason: "not_allocated" as const };
  }

  const fromEmployee = data.employees.find(
    (item) => item.id === activeAllocation.employeeId
  );
  const toEmployee = data.employees.find((item) => item.id === toEmployeeId);
  const department = data.departments.find(
    (item) => item.id === toEmployee?.departmentId
  );

  if (!toEmployee || toEmployeeId === activeAllocation.employeeId) {
    return { success: false as const, reason: "invalid_target" as const };
  }

  const endedAt = new Date().toISOString();
  const updatedAllocations = data.allocations.map((allocation) =>
    allocation.id === activeAllocation.id
      ? { ...allocation, active: false, endedAt }
      : allocation
  );

  const nextAllocation: AllocationRecord = {
    id: createId(),
    assetId,
    employeeId: toEmployeeId,
    active: true,
    startedAt: endedAt,
  };

  writeWorkspace({
    ...data,
    allocations: [...updatedAllocations, nextAllocation],
  });

  appendHistory(
    assetId,
    `Transfer request from ${fromEmployee?.name ?? "employee"} to ${toEmployee.name}${reason ? ` - ${reason}` : ""}`
  );
  appendHistory(
    assetId,
    `Allocated to ${toEmployee.name}${department ? ` - ${department.name}` : ""}`
  );

  return { success: true as const };
}

export function returnAsset(assetId: string, condition: string) {
  const data = readWorkspace();
  const activeAllocation = data.allocations.find(
    (allocation) => allocation.assetId === assetId && allocation.active
  );

  if (!activeAllocation) {
    return { success: false as const };
  }

  const employee = data.employees.find(
    (item) => item.id === activeAllocation.employeeId
  );
  const endedAt = new Date().toISOString();

  writeWorkspace({
    ...data,
    allocations: data.allocations.map((allocation) =>
      allocation.id === activeAllocation.id
        ? { ...allocation, active: false, endedAt }
        : allocation
    ),
  });

  updateAssetStatus(assetId, "available");
  appendHistory(
    assetId,
    `Returned by ${employee?.name ?? "employee"}${condition ? ` - condition: ${condition}` : ""}`
  );

  return { success: true as const };
}

export function upsertResource(
  resource: Omit<BookableResource, "id"> & { id?: string }
) {
  const data = readWorkspace();
  const id = resource.id ?? createId();
  const nextResource: BookableResource = { ...resource, id };
  const index = data.resources.findIndex((item) => item.id === id);

  const resources =
    index === -1
      ? [...data.resources, nextResource]
      : data.resources.map((item) => (item.id === id ? nextResource : item));

  writeWorkspace({ ...data, resources });
  return nextResource;
}

export function deleteResource(id: string) {
  const data = readWorkspace();
  writeWorkspace({
    ...data,
    resources: data.resources.filter((item) => item.id !== id),
    bookings: data.bookings.filter((booking) => booking.resourceId !== id),
  });
}

function bookingMinutes(hour: number, minute: number) {
  return hour * 60 + minute;
}

function bookingsOverlap(
  a: Pick<
    ResourceBooking,
    "startHour" | "startMinute" | "endHour" | "endMinute"
  >,
  b: Pick<
    ResourceBooking,
    "startHour" | "startMinute" | "endHour" | "endMinute"
  >
) {
  const aStart = bookingMinutes(a.startHour, a.startMinute);
  const aEnd = bookingMinutes(a.endHour, a.endMinute);
  const bStart = bookingMinutes(b.startHour, b.startMinute);
  const bEnd = bookingMinutes(b.endHour, b.endMinute);

  return aStart < bEnd && bStart < aEnd;
}

export function createBooking(
  booking: Omit<ResourceBooking, "id" | "status">
) {
  const data = readWorkspace();
  const confirmedBookings = data.bookings.filter(
    (item) =>
      item.resourceId === booking.resourceId &&
      item.date === booking.date &&
      item.status === "confirmed"
  );

  const hasConflict = confirmedBookings.some((item) =>
    bookingsOverlap(item, booking)
  );

  const nextBooking: ResourceBooking = {
    ...booking,
    id: createId(),
    status: hasConflict ? "requested" : "confirmed",
  };

  writeWorkspace({
    ...data,
    bookings: [...data.bookings, nextBooking],
  });

  return { booking: nextBooking, hasConflict };
}

export function deleteBooking(id: string) {
  const data = readWorkspace();
  writeWorkspace({
    ...data,
    bookings: data.bookings.filter((booking) => booking.id !== id),
  });
}

export function createMaintenanceRequest(assetId: string, description: string) {
  const data = readWorkspace();
  const request: MaintenanceRequest = {
    id: createId(),
    assetId,
    description: description.trim(),
    status: "pending",
    technicianName: "",
    createdAt: new Date().toISOString(),
  };

  writeWorkspace({
    ...data,
    maintenanceRequests: [...data.maintenanceRequests, request],
  });

  return request;
}

export function updateMaintenanceStatus(
  id: string,
  status: MaintenanceStatus,
  technicianName = ""
) {
  const data = readWorkspace();
  const request = data.maintenanceRequests.find((item) => item.id === id);

  if (!request) {
    return { success: false as const };
  }

  const nextRequest: MaintenanceRequest = {
    ...request,
    status,
    technicianName: technicianName || request.technicianName,
  };

  writeWorkspace({
    ...data,
    maintenanceRequests: data.maintenanceRequests.map((item) =>
      item.id === id ? nextRequest : item
    ),
  });

  if (status === "approved") {
    updateAssetStatus(request.assetId, "maintenance");
  }

  if (status === "resolved") {
    updateAssetStatus(request.assetId, "available");
  }

  return { success: true as const };
}

export function deleteMaintenanceRequest(id: string) {
  const data = readWorkspace();
  writeWorkspace({
    ...data,
    maintenanceRequests: data.maintenanceRequests.filter(
      (item) => item.id !== id
    ),
  });
}

export function getOpenAuditCycle() {
  const data = readWorkspace();
  return data.auditCycles.find((cycle) => cycle.status === "open");
}

export function createAuditCycle(
  cycle: Omit<AuditCycle, "id" | "status" | "createdAt" | "closedAt">
) {
  const data = readWorkspace();
  const existingOpen = data.auditCycles.find((item) => item.status === "open");

  if (existingOpen) {
    return { success: false as const, reason: "open_cycle_exists" as const };
  }

  const nextCycle: AuditCycle = {
    ...cycle,
    id: createId(),
    status: "open",
    createdAt: new Date().toISOString(),
  };

  writeWorkspace({
    ...data,
    auditCycles: [...data.auditCycles, nextCycle],
  });

  return { success: true as const, cycle: nextCycle };
}

export function closeAuditCycle(auditCycleId: string) {
  const data = readWorkspace();
  const cycle = data.auditCycles.find((item) => item.id === auditCycleId);

  if (!cycle || cycle.status === "closed") {
    return { success: false as const };
  }

  writeWorkspace({
    ...data,
    auditCycles: data.auditCycles.map((item) =>
      item.id === auditCycleId
        ? {
            ...item,
            status: "closed",
            closedAt: new Date().toISOString(),
          }
        : item
    ),
  });

  return { success: true as const };
}

export function addAuditChecklistItem(
  auditCycleId: string,
  assetId: string,
  expectedLocation: string
) {
  const data = readWorkspace();
  const cycle = data.auditCycles.find((item) => item.id === auditCycleId);

  if (!cycle || cycle.status !== "open") {
    return { success: false as const };
  }

  const alreadyListed = data.auditChecklist.some(
    (item) => item.auditCycleId === auditCycleId && item.assetId === assetId
  );

  if (alreadyListed) {
    return { success: false as const, reason: "already_listed" as const };
  }

  const item: AuditChecklistItem = {
    id: createId(),
    auditCycleId,
    assetId,
    expectedLocation: expectedLocation.trim(),
    verification: "pending",
  };

  writeWorkspace({
    ...data,
    auditChecklist: [...data.auditChecklist, item],
  });

  return { success: true as const, item };
}

export function updateAuditVerification(
  checklistItemId: string,
  verification: AuditVerificationStatus
) {
  const data = readWorkspace();
  const checklistItem = data.auditChecklist.find(
    (item) => item.id === checklistItemId
  );

  if (!checklistItem) {
    return { success: false as const };
  }

  const cycle = data.auditCycles.find(
    (item) => item.id === checklistItem.auditCycleId
  );

  if (!cycle || cycle.status !== "open") {
    return { success: false as const };
  }

  writeWorkspace({
    ...data,
    auditChecklist: data.auditChecklist.map((item) =>
      item.id === checklistItemId ? { ...item, verification } : item
    ),
  });

  syncDiscrepancyReport(checklistItem.auditCycleId);
  return { success: true as const };
}

function syncDiscrepancyReport(auditCycleId: string) {
  const data = readWorkspace();
  const flaggedItems = data.auditChecklist.filter(
    (item) =>
      item.auditCycleId === auditCycleId &&
      (item.verification === "missing" || item.verification === "damaged")
  );

  const remainingReports = data.discrepancyReports.filter(
    (report) => report.auditCycleId !== auditCycleId
  );

  if (flaggedItems.length === 0) {
    writeWorkspace({
      ...data,
      discrepancyReports: remainingReports,
    });
    return;
  }

  const report: DiscrepancyReport = {
    id: createId(),
    auditCycleId,
    generatedAt: new Date().toISOString(),
    flaggedCount: flaggedItems.length,
    summary: `${flaggedItems.length} assets flagged - discrepancy report generated automatically`,
  };

  writeWorkspace({
    ...data,
    discrepancyReports: [...remainingReports, report],
  });
}

export function getDiscrepancyReport(auditCycleId: string) {
  const data = readWorkspace();
  return data.discrepancyReports.find(
    (report) => report.auditCycleId === auditCycleId
  );
}
