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

const STORAGE_KEY = "assetflow-workspace-v2";

const emptyWorkspace: WorkspaceData = {
  departments: [
    { id: "dept-1", name: "Engineering", head: "Sarah Chen", parentDept: "", status: "active" },
    { id: "dept-2", name: "Design", head: "Marcus Rivera", parentDept: "", status: "active" },
    { id: "dept-3", name: "Operations", head: "David Kim", parentDept: "", status: "active" },
    { id: "dept-4", name: "Frontend", head: "Alex Wong", parentDept: "dept-1", status: "active" },
  ],
  categories: [
    { id: "cat-1", name: "Laptops", description: "Standard issue computers", status: "active" },
    { id: "cat-2", name: "Monitors", description: "External displays", status: "active" },
    { id: "cat-3", name: "Mobile Devices", description: "Phones and tablets", status: "active" },
    { id: "cat-4", name: "Office Furniture", description: "Chairs, desks, etc.", status: "active" },
  ],
  employees: [
    { id: "emp-1", name: "Alice Johnson", departmentId: "dept-4", role: "Senior Frontend Engineer", status: "active" },
    { id: "emp-2", name: "Bob Smith", departmentId: "dept-1", role: "Backend Engineer", status: "active" },
    { id: "emp-3", name: "Charlie Davis", departmentId: "dept-2", role: "Product Designer", status: "active" },
    { id: "emp-4", name: "Diana Prince", departmentId: "dept-3", role: "Operations Manager", status: "active" },
    { id: "emp-5", name: "Evan Wright", departmentId: "dept-1", role: "Engineering Manager", status: "active" },
  ],
  assets: [
    { id: "ast-1", tag: "AST-001", name: "MacBook Pro 16\" M3 Max", categoryId: "cat-1", status: "allocated", location: "New York Office", departmentId: "dept-4", serial: "C02F234XQ6L", qrCode: "QR-AST-001" },
    { id: "ast-2", tag: "AST-002", name: "Dell UltraSharp 32\" 4K", categoryId: "cat-2", status: "allocated", location: "New York Office", departmentId: "dept-4", serial: "CN-0J1XY9-74261", qrCode: "QR-AST-002" },
    { id: "ast-3", tag: "AST-003", name: "iPhone 15 Pro", categoryId: "cat-3", status: "maintenance", location: "IT Storage", departmentId: "dept-1", serial: "F4G3H2J1K0", qrCode: "QR-AST-003" },
    { id: "ast-4", tag: "AST-004", name: "Herman Miller Aeron", categoryId: "cat-4", status: "available", location: "Storage Room A", departmentId: "dept-3", serial: "HM-99821", qrCode: "QR-AST-004" },
    { id: "ast-5", tag: "AST-005", name: "ThinkPad X1 Carbon Gen 11", categoryId: "cat-1", status: "available", location: "London Office", departmentId: "dept-1", serial: "PF-234ABC", qrCode: "QR-AST-005" },
    { id: "ast-6", tag: "AST-006", name: "MacBook Air M2", categoryId: "cat-1", status: "allocated", location: "Remote", departmentId: "dept-2", serial: "C02G345YR7M", qrCode: "QR-AST-006" },
  ],
  allocations: [
    { id: "alloc-1", assetId: "ast-1", employeeId: "emp-1", active: true, startedAt: "2023-10-15T09:00:00Z" },
    { id: "alloc-2", assetId: "ast-2", employeeId: "emp-1", active: true, startedAt: "2023-10-15T09:05:00Z" },
    { id: "alloc-3", assetId: "ast-6", employeeId: "emp-3", active: true, startedAt: "2023-11-01T10:30:00Z" },
  ],
  allocationHistory: [
    { id: "hist-1", assetId: "ast-1", occurredAt: "2023-10-15T09:00:00Z", label: "Allocated to Alice Johnson - Frontend" },
    { id: "hist-2", assetId: "ast-2", occurredAt: "2023-10-15T09:05:00Z", label: "Allocated to Alice Johnson - Frontend" },
    { id: "hist-3", assetId: "ast-6", occurredAt: "2023-11-01T10:30:00Z", label: "Allocated to Charlie Davis - Design" },
    { id: "hist-4", assetId: "ast-3", occurredAt: "2024-01-10T14:00:00Z", label: "Returned by Bob Smith - condition: screen cracked" },
  ],
  resources: [
    { id: "res-1", name: "Conference Room A (Boardroom)", type: "room", capacity: 12, location: "Floor 4, West Wing", status: "active" },
    { id: "res-2", name: "Huddle Room 1", type: "room", capacity: 4, location: "Floor 3, East Wing", status: "active" },
    { id: "res-3", name: "4K Laser Projector", type: "equipment", capacity: 1, location: "IT Cabinet 2", status: "active" },
    { id: "res-4", name: "Company Vehicle - Toyota Prius", type: "vehicle", capacity: 5, location: "Basement Parking B2", status: "maintenance" },
  ],
  bookings: [
    { id: "book-1", resourceId: "res-1", employeeId: "emp-5", date: new Date().toISOString().split('T')[0], startHour: 10, startMinute: 0, endHour: 11, endMinute: 30, purpose: "Weekly Engineering Sync", status: "confirmed" },
    { id: "book-2", resourceId: "res-3", employeeId: "emp-3", date: new Date().toISOString().split('T')[0], startHour: 14, startMinute: 0, endHour: 15, endMinute: 0, purpose: "Design Review Presentation", status: "confirmed" },
  ],
  maintenanceRequests: [
    { id: "maint-1", assetId: "ast-3", description: "Screen cracked and battery draining fast", status: "approved", technicianName: "Mike Fixit", createdAt: "2024-01-11T09:30:00Z" },
    { id: "maint-2", assetId: "ast-4", description: "Armrest is loose", status: "pending", technicianName: "", createdAt: new Date().toISOString() },
  ],
  auditCycles: [
    { id: "audit-1", name: "Q1 2024 Inventory Check", status: "open", createdAt: "2024-03-01T08:00:00Z" },
    { id: "audit-2", name: "2023 EOY Audit", status: "closed", createdAt: "2023-12-01T08:00:00Z", closedAt: "2023-12-15T17:00:00Z" },
  ],
  auditChecklist: [
    { id: "chk-1", auditCycleId: "audit-1", assetId: "ast-1", expectedLocation: "New York Office", verification: "verified" },
    { id: "chk-2", auditCycleId: "audit-1", assetId: "ast-2", expectedLocation: "New York Office", verification: "pending" },
    { id: "chk-3", auditCycleId: "audit-1", assetId: "ast-5", expectedLocation: "London Office", verification: "missing" },
  ],
  discrepancyReports: [
    { id: "disc-1", auditCycleId: "audit-1", generatedAt: new Date().toISOString(), flaggedCount: 1, summary: "1 assets flagged - discrepancy report generated automatically" },
  ],
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
