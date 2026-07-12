export type EntityStatus = "active" | "inactive";

export type AssetStatus = "available" | "allocated" | "maintenance";

export interface Department {
  id: string;
  name: string;
  head: string;
  parentDept: string;
  status: EntityStatus;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  status: EntityStatus;
}

export interface Employee {
  id: string;
  name: string;
  departmentId: string;
  role: string;
  status: EntityStatus;
}

export interface Asset {
  id: string;
  tag: string;
  name: string;
  categoryId: string;
  status: AssetStatus;
  location: string;
  departmentId: string;
  serial: string;
  qrCode: string;
}

export interface AllocationRecord {
  id: string;
  assetId: string;
  employeeId: string;
  active: boolean;
  startedAt: string;
  endedAt?: string;
}

export interface AllocationHistoryEntry {
  id: string;
  assetId: string;
  occurredAt: string;
  label: string;
}

export interface BookableResource {
  id: string;
  name: string;
}

export type MaintenanceStatus =
  | "pending"
  | "approved"
  | "technician_assigned"
  | "in_progress"
  | "resolved";

export interface MaintenanceRequest {
  id: string;
  assetId: string;
  description: string;
  status: MaintenanceStatus;
  technicianName: string;
  createdAt: string;
}

export type BookingStatus = "confirmed" | "requested";

export interface ResourceBooking {
  id: string;
  resourceId: string;
  title: string;
  date: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  status: BookingStatus;
}

export type AuditVerificationStatus =
  | "pending"
  | "verified"
  | "missing"
  | "damaged";

export type AuditCycleStatus = "open" | "in_progress" | "closed";

export type AuditScopeType = "department" | "location";

export interface AuditCycle {
  id: string;
  title: string;
  departmentId: string;
  scopeType: AuditScopeType;
  scopeValue: string;
  startDate: string;
  endDate: string;
  auditors: string;
  status: AuditCycleStatus;
  createdAt: string;
  closedAt?: string;
}

export interface AuditChecklistItem {
  id: string;
  auditCycleId: string;
  assetId: string;
  expectedLocation: string;
  verification: AuditVerificationStatus;
  note: string;
}

export interface DiscrepancyReport {
  id: string;
  auditCycleId: string;
  generatedAt: string;
  flaggedCount: number;
  summary: string;
}

export type NotificationType =
  | "asset"
  | "maintenance"
  | "booking"
  | "transfer"
  | "return"
  | "audit";

export interface WorkspaceNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  relatedEntityId?: string;
  relatedEntityLabel?: string;
  suggestedAction?: string;
}

export interface WorkspaceData {
  departments: Department[];
  categories: Category[];
  employees: Employee[];
  assets: Asset[];
  allocations: AllocationRecord[];
  allocationHistory: AllocationHistoryEntry[];
  resources: BookableResource[];
  bookings: ResourceBooking[];
  maintenanceRequests: MaintenanceRequest[];
  auditCycles: AuditCycle[];
  auditChecklist: AuditChecklistItem[];
  discrepancyReports: DiscrepancyReport[];
  notifications: WorkspaceNotification[];
}

export type OrganizationTab = "departments" | "categories" | "employee";

export const ASSET_STATUSES: AssetStatus[] = [
  "available",
  "allocated",
  "maintenance",
];

export const ENTITY_STATUSES: EntityStatus[] = ["active", "inactive"];

export const MAINTENANCE_STATUSES: MaintenanceStatus[] = [
  "pending",
  "approved",
  "technician_assigned",
  "in_progress",
  "resolved",
];

export const MAINTENANCE_COLUMNS: {
  id: MaintenanceStatus;
  label: string;
}[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "technician_assigned", label: "Technician assigned" },
  { id: "in_progress", label: "In progress" },
  { id: "resolved", label: "Resolved" },
];

export const BOOKING_HOURS = Array.from({ length: 10 }, (_, index) => index + 9);

export const AUDIT_VERIFICATION_OPTIONS: AuditVerificationStatus[] = [
  "verified",
  "missing",
  "damaged",
];

export const AUDIT_CYCLE_STATUSES: AuditCycleStatus[] = [
  "open",
  "in_progress",
  "closed",
];

export const NOTIFICATION_TYPES: NotificationType[] = [
  "asset",
  "maintenance",
  "booking",
  "transfer",
  "return",
  "audit",
];
