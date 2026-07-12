import type {
  AllocationHistoryEntry,
  AllocationRecord,
  Asset,
  AuditChecklistItem,
  AuditCycle,
  AuditCycleStatus,
  AuditScopeType,
  AuditVerificationStatus,
  BookableResource,
  Category,
  Department,
  DiscrepancyReport,
  Employee,
  MaintenanceRequest,
  MaintenanceStatus,
  NotificationType,
  ResourceBooking,
  WorkspaceData,
  WorkspaceNotification,
} from "@/lib/workspace/types";

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
  notifications: [],
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
    auditCycles: (parsed.auditCycles ?? []).map((c) => ({
      ...c,
      scopeType: (c as AuditCycle).scopeType ?? "department" as AuditScopeType,
      scopeValue: (c as AuditCycle).scopeValue ?? (c as AuditCycle).departmentId ?? "",
    })),
    auditChecklist: (parsed.auditChecklist ?? []).map((item) => ({
      ...item,
      note: (item as AuditChecklistItem).note ?? "",
    })),
    discrepancyReports: parsed.discrepancyReports ?? [],
    notifications: (parsed.notifications ?? []).map((n) => ({
      ...n,
      suggestedAction: n.suggestedAction ?? "",
    })),
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

export function saveDepartments(departments: Department[]) {
  const data = readWorkspace();
  writeWorkspace({ ...data, departments });
}

export function saveCategories(categories: Category[]) {
  const data = readWorkspace();
  writeWorkspace({ ...data, categories });
}

export function saveEmployees(employees: Employee[]) {
  const data = readWorkspace();
  writeWorkspace({ ...data, employees });
}

export function saveAssets(assets: Asset[]) {
  const data = readWorkspace();
  writeWorkspace({ ...data, assets });
}

export function upsertDepartment(
  department: Omit<Department, "id"> & { id?: string }
) {
  const data = readWorkspace();
  const id = department.id ?? createId();
  const nextDepartment: Department = { ...department, id };
  const index = data.departments.findIndex((item) => item.id === id);

  const departments =
    index === -1
      ? [...data.departments, nextDepartment]
      : data.departments.map((item) =>
          item.id === id ? nextDepartment : item
        );

  writeWorkspace({ ...data, departments });
  return nextDepartment;
}

export function upsertCategory(
  category: Omit<Category, "id"> & { id?: string }
) {
  const data = readWorkspace();
  const id = category.id ?? createId();
  const nextCategory: Category = { ...category, id };
  const index = data.categories.findIndex((item) => item.id === id);

  const categories =
    index === -1
      ? [...data.categories, nextCategory]
      : data.categories.map((item) => (item.id === id ? nextCategory : item));

  writeWorkspace({ ...data, categories });
  return nextCategory;
}

export function upsertEmployee(
  employee: Omit<Employee, "id"> & { id?: string }
) {
  const data = readWorkspace();
  const id = employee.id ?? createId();
  const nextEmployee: Employee = { ...employee, id };
  const index = data.employees.findIndex((item) => item.id === id);

  const employees =
    index === -1
      ? [...data.employees, nextEmployee]
      : data.employees.map((item) => (item.id === id ? nextEmployee : item));

  writeWorkspace({ ...data, employees });
  return nextEmployee;
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

export function deleteDepartment(id: string) {
  const data = readWorkspace();
  writeWorkspace({
    ...data,
    departments: data.departments.filter((item) => item.id !== id),
  });
}

export function deleteCategory(id: string) {
  const data = readWorkspace();
  writeWorkspace({
    ...data,
    categories: data.categories.filter((item) => item.id !== id),
  });
}

export function deleteEmployee(id: string) {
  const data = readWorkspace();
  writeWorkspace({
    ...data,
    employees: data.employees.filter((item) => item.id !== id),
  });
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
  return data.auditCycles.find(
    (cycle) => cycle.status === "open" || cycle.status === "in_progress"
  );
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
    return { success: false as const, reason: "invalid_cycle" as const };
  }

  const pendingCount = data.auditChecklist.filter(
    (item) =>
      item.auditCycleId === auditCycleId && item.verification === "pending"
  ).length;

  if (pendingCount > 0) {
    return {
      success: false as const,
      reason: "pending_verifications" as const,
      pendingCount,
    };
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

  if (!cycle || cycle.status === "closed") {
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
    note: "",
  };

  writeWorkspace({
    ...data,
    auditChecklist: [...data.auditChecklist, item],
  });

  return { success: true as const, item };
}

export function updateAuditVerification(
  checklistItemId: string,
  verification: AuditVerificationStatus,
  note?: string
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

  if (!cycle || cycle.status === "closed") {
    return { success: false as const };
  }

  const updatedChecklist = data.auditChecklist.map((item) =>
    item.id === checklistItemId
      ? { ...item, verification, note: note !== undefined ? note : item.note }
      : item
  );

  // Auto-transition from open to in_progress on first verification
  let updatedCycles = data.auditCycles;
  if (cycle.status === "open" && verification !== "pending") {
    updatedCycles = data.auditCycles.map((item) =>
      item.id === cycle.id
        ? { ...item, status: "in_progress" as AuditCycleStatus }
        : item
    );
  }

  writeWorkspace({
    ...data,
    auditChecklist: updatedChecklist,
    auditCycles: updatedCycles,
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

// ── Notification functions ─────────────────────────────────────────────

export function addNotification(
  notification: Omit<WorkspaceNotification, "id">
) {
  const data = readWorkspace();
  const next: WorkspaceNotification = {
    ...notification,
    id: createId(),
  };

  writeWorkspace({
    ...data,
    notifications: [next, ...data.notifications],
  });

  return next;
}

export function markNotificationRead(id: string) {
  const data = readWorkspace();
  writeWorkspace({
    ...data,
    notifications: data.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    ),
  });
}

export function markNotificationUnread(id: string) {
  const data = readWorkspace();
  writeWorkspace({
    ...data,
    notifications: data.notifications.map((n) =>
      n.id === id ? { ...n, read: false } : n
    ),
  });
}

export function markAllNotificationsRead() {
  const data = readWorkspace();
  writeWorkspace({
    ...data,
    notifications: data.notifications.map((n) => ({ ...n, read: true })),
  });
}

export function removeNotification(id: string) {
  const data = readWorkspace();
  writeWorkspace({
    ...data,
    notifications: data.notifications.filter((n) => n.id !== id),
  });
}

// ── Seed data ──────────────────────────────────────────────────────────

const SEED_KEY = "assetflow-seeded-v2";

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

function dateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}

export function ensureSeedData() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(SEED_KEY)) return;

  const data = readWorkspace();

  // Only seed if workspace has no audit data and no notifications
  if (data.auditCycles.length > 0 && data.notifications.length > 0) {
    window.localStorage.setItem(SEED_KEY, "1");
    return;
  }

  // Seed departments if empty
  const deptEngId = "seed-dept-eng";
  const deptOpsId = "seed-dept-ops";
  const deptHrId = "seed-dept-hr";

  const seedDepartments: Department[] = data.departments.length > 0 ? data.departments : [
    { id: deptEngId, name: "Engineering", head: "Alice Chen", parentDept: "", status: "active" },
    { id: deptOpsId, name: "Operations", head: "Bob Martinez", parentDept: "", status: "active" },
    { id: deptHrId, name: "Human Resources", head: "Carol Park", parentDept: "", status: "active" },
  ];

  const seedCategories: Category[] = data.categories.length > 0 ? data.categories : [
    { id: "seed-cat-laptop", name: "Laptops", description: "Portable computing devices", status: "active" },
    { id: "seed-cat-monitor", name: "Monitors", description: "Display screens", status: "active" },
    { id: "seed-cat-desk", name: "Desks", description: "Office furniture", status: "active" },
    { id: "seed-cat-phone", name: "Phones", description: "Communication devices", status: "active" },
  ];

  const seedEmployees: Employee[] = data.employees.length > 0 ? data.employees : [
    { id: "seed-emp-1", name: "Alice Chen", departmentId: deptEngId, role: "Director", status: "active" },
    { id: "seed-emp-2", name: "David Kim", departmentId: deptEngId, role: "Senior Engineer", status: "active" },
    { id: "seed-emp-3", name: "Eve Johnson", departmentId: deptOpsId, role: "Operations Lead", status: "active" },
    { id: "seed-emp-4", name: "Frank Brown", departmentId: deptHrId, role: "HR Manager", status: "active" },
  ];

  // Seed assets
  const seedAssets: Asset[] = data.assets.length > 0 ? data.assets : [
    { id: "seed-asset-1", tag: "LPT-001", name: "MacBook Pro 16\"", categoryId: "seed-cat-laptop", status: "allocated", location: "Building A, Floor 2", departmentId: deptEngId, serial: "SN-MBP-001", qrCode: "QR-LPT-001" },
    { id: "seed-asset-2", tag: "LPT-002", name: "ThinkPad X1 Carbon", categoryId: "seed-cat-laptop", status: "available", location: "Building A, Floor 2", departmentId: deptEngId, serial: "SN-TPX-002", qrCode: "QR-LPT-002" },
    { id: "seed-asset-3", tag: "MON-001", name: "Dell UltraSharp 27\"", categoryId: "seed-cat-monitor", status: "allocated", location: "Building A, Floor 2", departmentId: deptEngId, serial: "SN-DUS-001", qrCode: "QR-MON-001" },
    { id: "seed-asset-4", tag: "MON-002", name: "LG 4K Monitor", categoryId: "seed-cat-monitor", status: "available", location: "Building B, Floor 1", departmentId: deptOpsId, serial: "SN-LG4-002", qrCode: "QR-MON-002" },
    { id: "seed-asset-5", tag: "DSK-001", name: "Standing Desk Pro", categoryId: "seed-cat-desk", status: "allocated", location: "Building A, Floor 3", departmentId: deptHrId, serial: "SN-SDP-001", qrCode: "QR-DSK-001" },
    { id: "seed-asset-6", tag: "DSK-002", name: "Executive Desk", categoryId: "seed-cat-desk", status: "available", location: "Building B, Floor 1", departmentId: deptOpsId, serial: "SN-EXD-002", qrCode: "QR-DSK-002" },
    { id: "seed-asset-7", tag: "PHN-001", name: "Cisco IP Phone", categoryId: "seed-cat-phone", status: "maintenance", location: "Building A, Floor 1", departmentId: deptEngId, serial: "SN-CIP-001", qrCode: "QR-PHN-001" },
    { id: "seed-asset-8", tag: "LPT-003", name: "Dell XPS 15", categoryId: "seed-cat-laptop", status: "allocated", location: "Building B, Floor 2", departmentId: deptOpsId, serial: "SN-DXP-003", qrCode: "QR-LPT-003" },
    { id: "seed-asset-9", tag: "MON-003", name: "Samsung Curved 32\"", categoryId: "seed-cat-monitor", status: "available", location: "Building A, Floor 1", departmentId: deptEngId, serial: "SN-SC3-003", qrCode: "QR-MON-003" },
    { id: "seed-asset-10", tag: "PHN-002", name: "Polycom Conference", categoryId: "seed-cat-phone", status: "available", location: "Building A, Floor 2", departmentId: deptEngId, serial: "SN-PCF-002", qrCode: "QR-PHN-002" },
    { id: "seed-asset-11", tag: "LPT-004", name: "HP EliteBook", categoryId: "seed-cat-laptop", status: "available", location: "Building B, Floor 1", departmentId: deptOpsId, serial: "SN-HEB-004", qrCode: "QR-LPT-004" },
    { id: "seed-asset-12", tag: "DSK-003", name: "Adjustable Desk", categoryId: "seed-cat-desk", status: "allocated", location: "Building A, Floor 3", departmentId: deptHrId, serial: "SN-ADJ-003", qrCode: "QR-DSK-003" },
  ];

  // Seed audit cycles
  const auditCycles: AuditCycle[] = data.auditCycles.length > 0 ? data.auditCycles : [
    {
      id: "seed-audit-1",
      title: "Q2 Engineering Equipment Audit",
      departmentId: deptEngId,
      scopeType: "department",
      scopeValue: deptEngId,
      startDate: dateStr(-60),
      endDate: dateStr(-30),
      auditors: "Alice Chen, David Kim",
      status: "closed",
      createdAt: daysAgo(65),
      closedAt: daysAgo(28),
    },
    {
      id: "seed-audit-2",
      title: "Building A Location Audit",
      departmentId: "",
      scopeType: "location",
      scopeValue: "Building A",
      startDate: dateStr(-45),
      endDate: dateStr(-15),
      auditors: "Eve Johnson",
      status: "closed",
      createdAt: daysAgo(48),
      closedAt: daysAgo(14),
    },
    {
      id: "seed-audit-3",
      title: "Q3 Operations Review",
      departmentId: deptOpsId,
      scopeType: "department",
      scopeValue: deptOpsId,
      startDate: dateStr(-10),
      endDate: dateStr(20),
      auditors: "Bob Martinez, Eve Johnson",
      status: "in_progress",
      createdAt: daysAgo(12),
    },
    {
      id: "seed-audit-4",
      title: "HR Assets Verification",
      departmentId: deptHrId,
      scopeType: "department",
      scopeValue: deptHrId,
      startDate: dateStr(5),
      endDate: dateStr(35),
      auditors: "Carol Park, Frank Brown",
      status: "open",
      createdAt: daysAgo(2),
    },
  ];

  // Seed audit checklist items
  const auditChecklist: AuditChecklistItem[] = data.auditChecklist.length > 0 ? data.auditChecklist : [
    // Closed cycle 1 - Engineering
    { id: "seed-chk-1", auditCycleId: "seed-audit-1", assetId: "seed-asset-1", expectedLocation: "Building A, Floor 2", verification: "verified", note: "Asset in good condition" },
    { id: "seed-chk-2", auditCycleId: "seed-audit-1", assetId: "seed-asset-2", expectedLocation: "Building A, Floor 2", verification: "verified", note: "" },
    { id: "seed-chk-3", auditCycleId: "seed-audit-1", assetId: "seed-asset-3", expectedLocation: "Building A, Floor 2", verification: "damaged", note: "Screen has dead pixels" },
    // Closed cycle 2 - Building A
    { id: "seed-chk-4", auditCycleId: "seed-audit-2", assetId: "seed-asset-1", expectedLocation: "Building A, Floor 2", verification: "verified", note: "" },
    { id: "seed-chk-5", auditCycleId: "seed-audit-2", assetId: "seed-asset-7", expectedLocation: "Building A, Floor 1", verification: "missing", note: "Not found at expected location" },
    { id: "seed-chk-6", auditCycleId: "seed-audit-2", assetId: "seed-asset-9", expectedLocation: "Building A, Floor 1", verification: "verified", note: "" },
    // In-progress cycle 3 - Operations
    { id: "seed-chk-7", auditCycleId: "seed-audit-3", assetId: "seed-asset-4", expectedLocation: "Building B, Floor 1", verification: "verified", note: "" },
    { id: "seed-chk-8", auditCycleId: "seed-audit-3", assetId: "seed-asset-6", expectedLocation: "Building B, Floor 1", verification: "damaged", note: "Desk surface scratched" },
    { id: "seed-chk-9", auditCycleId: "seed-audit-3", assetId: "seed-asset-8", expectedLocation: "Building B, Floor 2", verification: "pending", note: "" },
    // Open cycle 4 - HR
    { id: "seed-chk-10", auditCycleId: "seed-audit-4", assetId: "seed-asset-5", expectedLocation: "Building A, Floor 3", verification: "pending", note: "" },
    { id: "seed-chk-11", auditCycleId: "seed-audit-4", assetId: "seed-asset-12", expectedLocation: "Building A, Floor 3", verification: "pending", note: "" },
    { id: "seed-chk-12", auditCycleId: "seed-audit-4", assetId: "seed-asset-11", expectedLocation: "Building B, Floor 1", verification: "pending", note: "" },
  ];

  // Seed notifications
  const notifications: WorkspaceNotification[] = data.notifications.length > 0 ? data.notifications : [
    { id: "seed-notif-1", type: "asset" as NotificationType, title: "Asset Assigned", message: "MacBook Pro 16\" (LPT-001) has been assigned to David Kim in Engineering.", timestamp: daysAgo(0), read: false, relatedEntityId: "seed-asset-1", relatedEntityLabel: "LPT-001", suggestedAction: "Review the allocation in the Assets directory." },
    { id: "seed-notif-2", type: "maintenance" as NotificationType, title: "Maintenance Approved", message: "Maintenance request for Cisco IP Phone (PHN-001) has been approved. Awaiting technician assignment.", timestamp: daysAgo(0), read: false, relatedEntityId: "seed-asset-7", relatedEntityLabel: "PHN-001", suggestedAction: "Assign a technician in Maintenance." },
    { id: "seed-notif-3", type: "booking" as NotificationType, title: "Booking Confirmed", message: "Conference Room A booking confirmed for tomorrow 10:00 AM - 11:30 AM.", timestamp: daysAgo(0), read: false, suggestedAction: "View booking details in Resource Booking." },
    { id: "seed-notif-4", type: "transfer" as NotificationType, title: "Transfer Approved", message: "Transfer of Dell XPS 15 (LPT-003) from Engineering to Operations has been approved.", timestamp: daysAgo(0), read: false, relatedEntityId: "seed-asset-8", relatedEntityLabel: "LPT-003", suggestedAction: "Confirm handover with both departments." },
    { id: "seed-notif-5", type: "audit" as NotificationType, title: "Audit Discrepancy Found", message: "Building A Location Audit found 1 missing asset. Review the discrepancy report.", timestamp: daysAgo(1), read: false, relatedEntityId: "seed-audit-2", relatedEntityLabel: "Building A Location Audit", suggestedAction: "Open the audit cycle and export the discrepancy report." },
    { id: "seed-notif-6", type: "return" as NotificationType, title: "Overdue Return", message: "ThinkPad X1 Carbon (LPT-002) return is overdue by 3 days. Please follow up with the assigned employee.", timestamp: daysAgo(1), read: false, relatedEntityId: "seed-asset-2", relatedEntityLabel: "LPT-002", suggestedAction: "Contact the assignee and initiate a return." },
    { id: "seed-notif-7", type: "maintenance" as NotificationType, title: "Maintenance Completed", message: "Dell UltraSharp 27\" (MON-001) maintenance has been resolved. Asset is now available.", timestamp: daysAgo(1), read: true, relatedEntityId: "seed-asset-3", relatedEntityLabel: "MON-001", suggestedAction: "Mark the asset available for reallocation." },
    { id: "seed-notif-8", type: "booking" as NotificationType, title: "Booking Cancelled", message: "Your booking for Meeting Room B on Friday has been cancelled due to a scheduling conflict.", timestamp: daysAgo(1), read: true, suggestedAction: "Book an alternative time slot." },
    { id: "seed-notif-9", type: "asset" as NotificationType, title: "New Asset Registered", message: "HP EliteBook (LPT-004) has been registered in the Operations department.", timestamp: daysAgo(2), read: true, relatedEntityId: "seed-asset-11", relatedEntityLabel: "LPT-004", suggestedAction: "Review the asset record in the directory." },
    { id: "seed-notif-10", type: "booking" as NotificationType, title: "Booking Reminder", message: "Reminder: You have a conference room booking tomorrow at 2:00 PM.", timestamp: daysAgo(2), read: true, suggestedAction: "Confirm attendance or reschedule if needed." },
    { id: "seed-notif-11", type: "transfer" as NotificationType, title: "Transfer Requested", message: "Transfer request submitted for Samsung Curved 32\" (MON-003) from Engineering to HR.", timestamp: daysAgo(3), read: true, relatedEntityId: "seed-asset-9", relatedEntityLabel: "MON-003", suggestedAction: "Approve or reject the transfer request." },
    { id: "seed-notif-12", type: "audit" as NotificationType, title: "Audit Cycle Started", message: "Q3 Operations Review audit cycle has been started by Bob Martinez.", timestamp: daysAgo(5), read: true, relatedEntityId: "seed-audit-3", relatedEntityLabel: "Q3 Operations Review", suggestedAction: "Begin asset verification in the Audit workspace." },
    { id: "seed-notif-13", type: "maintenance" as NotificationType, title: "Maintenance Rejected", message: "Maintenance request for Standing Desk Pro (DSK-001) was rejected. Reason: insufficient detail.", timestamp: daysAgo(6), read: true, relatedEntityId: "seed-asset-5", relatedEntityLabel: "DSK-001", suggestedAction: "Submit a revised maintenance request with more detail." },
    { id: "seed-notif-14", type: "return" as NotificationType, title: "Asset Returned", message: "Executive Desk (DSK-002) has been returned by Eve Johnson in good condition.", timestamp: daysAgo(8), read: true, relatedEntityId: "seed-asset-6", relatedEntityLabel: "DSK-002", suggestedAction: "Inspect the asset and update its availability." },
    { id: "seed-notif-15", type: "audit" as NotificationType, title: "Audit Cycle Completed", message: "Q2 Engineering Equipment Audit has been closed. 1 discrepancy found.", timestamp: daysAgo(10), read: true, relatedEntityId: "seed-audit-1", relatedEntityLabel: "Q2 Engineering Equipment Audit", suggestedAction: "Review the closed audit summary and discrepancy report." },
  ];

  // Seed discrepancy reports for cycles with flagged items
  const discrepancyReports: DiscrepancyReport[] = data.discrepancyReports.length > 0 ? data.discrepancyReports : [
    { id: "seed-disc-1", auditCycleId: "seed-audit-1", generatedAt: daysAgo(30), flaggedCount: 1, summary: "1 asset flagged - discrepancy report generated automatically" },
    { id: "seed-disc-2", auditCycleId: "seed-audit-2", generatedAt: daysAgo(16), flaggedCount: 1, summary: "1 asset flagged - discrepancy report generated automatically" },
    { id: "seed-disc-3", auditCycleId: "seed-audit-3", generatedAt: daysAgo(5), flaggedCount: 1, summary: "1 asset flagged - discrepancy report generated automatically" },
  ];

  writeWorkspace({
    ...data,
    departments: seedDepartments,
    categories: seedCategories,
    employees: seedEmployees,
    assets: seedAssets,
    auditCycles,
    auditChecklist,
    discrepancyReports,
    notifications,
  });

  window.localStorage.setItem(SEED_KEY, "1");
}
