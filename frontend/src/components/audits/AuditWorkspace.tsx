"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  FileWarning,
  Plus,
  Search,
  ShieldAlert,
} from "lucide-react";

import PageHeader from "@/components/dashboard/PageHeader";
import DataTable from "@/components/workspace/DataTable";
import FilterSelect from "@/components/workspace/FilterSelect";
import FormField, { formControlClass } from "@/components/workspace/FormField";
import ScreenPanel from "@/components/workspace/ScreenPanel";
import StatusBadge from "@/components/workspace/StatusBadge";
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
  addAuditChecklistItem,
  closeAuditCycle,
  createAuditCycle,
  updateAuditVerification,
} from "@/lib/workspace/storage";
import type {
  AuditChecklistItem,
  AuditCycle,
  AuditCycleStatus,
  AuditScopeType,
  AuditVerificationStatus,
} from "@/lib/workspace/types";
import { AUDIT_VERIFICATION_OPTIONS } from "@/lib/workspace/types";
import { downloadCsvFile } from "@/lib/workspace/utils";
import { cn } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────────────────

function auditStatusTone(status: AuditCycleStatus) {
  if (status === "open") return "info" as const;
  if (status === "in_progress") return "warning" as const;
  return "success" as const;
}

function verificationTone(v: AuditVerificationStatus) {
  if (v === "verified") return "success" as const;
  if (v === "missing" || v === "damaged") return "warning" as const;
  return "neutral" as const;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Types ──────────────────────────────────────────────────────────────

type CycleFormState = {
  title: string;
  scopeType: AuditScopeType;
  scopeValue: string;
  startDate: string;
  endDate: string;
  auditors: string;
};

const emptyCycleForm: CycleFormState = {
  title: "",
  scopeType: "department",
  scopeValue: "",
  startDate: "",
  endDate: "",
  auditors: "",
};

// ── Component ──────────────────────────────────────────────────────────

export default function AuditWorkspace() {
  const { data, refresh } = useWorkspaceData();
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [detailCycleId, setDetailCycleId] = useState<string | null>(null);
  const [cycleForm, setCycleForm] = useState<CycleFormState>(emptyCycleForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [confirmClose, setConfirmClose] = useState(false);
  const [formError, setFormError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  // Lookup maps
  const departmentNameById = useMemo(
    () => new Map(data.departments.map((d) => [d.id, d.name])),
    [data.departments]
  );
  const categoryNameById = useMemo(
    () => new Map(data.categories.map((c) => [c.id, c.name])),
    [data.categories]
  );
  const assetById = useMemo(
    () => new Map(data.assets.map((a) => [a.id, a])),
    [data.assets]
  );

  // Overview stats
  const activeCycles = data.auditCycles.filter(
    (c) => c.status === "open" || c.status === "in_progress"
  ).length;
  const completedCycles = data.auditCycles.filter(
    (c) => c.status === "closed"
  ).length;
  const pendingVerifications = data.auditChecklist.filter(
    (item) => {
      const cycle = data.auditCycles.find((c) => c.id === item.auditCycleId);
      return cycle && cycle.status !== "closed" && item.verification === "pending";
    }
  ).length;
  const openDiscrepancies = data.auditChecklist.filter(
    (item) => {
      const cycle = data.auditCycles.find((c) => c.id === item.auditCycleId);
      return (
        cycle &&
        cycle.status !== "closed" &&
        (item.verification === "missing" || item.verification === "damaged")
      );
    }
  ).length;

  // Filtered cycles
  const filteredCycles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return data.auditCycles.filter((cycle) => {
      const matchesSearch =
        query.length === 0 ||
        cycle.title.toLowerCase().includes(query) ||
        cycle.auditors.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" || cycle.status === statusFilter;
      const matchesScope =
        scopeFilter === "all" || cycle.scopeType === scopeFilter;
      return matchesSearch && matchesStatus && matchesScope;
    });
  }, [data.auditCycles, searchQuery, statusFilter, scopeFilter]);

  // Detail cycle
  const detailCycle = data.auditCycles.find((c) => c.id === detailCycleId);
  const detailFindings = useMemo(
    () =>
      detailCycleId
        ? data.auditChecklist.filter((item) => item.auditCycleId === detailCycleId)
        : [],
    [data.auditChecklist, detailCycleId]
  );
  const detailProgress = useMemo(() => {
    const total = detailFindings.length;
    const checked = detailFindings.filter((f) => f.verification !== "pending").length;
    const verified = detailFindings.filter((f) => f.verification === "verified").length;
    const missing = detailFindings.filter((f) => f.verification === "missing").length;
    const damaged = detailFindings.filter((f) => f.verification === "damaged").length;
    const unchecked = total - checked;
    return { total, checked, verified, missing, damaged, unchecked };
  }, [detailFindings]);

  const isClosed = detailCycle?.status === "closed";

  // Cycle progress helper
  function getCycleProgress(cycleId: string) {
    const items = data.auditChecklist.filter((i) => i.auditCycleId === cycleId);
    const total = items.length;
    const checked = items.filter((i) => i.verification !== "pending").length;
    return { checked, total };
  }

  function getCycleDiscrepancies(cycleId: string) {
    return data.auditChecklist.filter(
      (i) =>
        i.auditCycleId === cycleId &&
        (i.verification === "missing" || i.verification === "damaged")
    ).length;
  }

  // Create cycle handler
  const handleCreateCycle = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (
      !cycleForm.title.trim() ||
      !cycleForm.scopeValue.trim() ||
      !cycleForm.startDate ||
      !cycleForm.endDate ||
      !cycleForm.auditors.trim()
    ) {
      setFormError("All fields are required.");
      return;
    }

    if (cycleForm.endDate < cycleForm.startDate) {
      setFormError("End date cannot precede start date.");
      return;
    }

    const scopeAssets = data.assets.filter((asset) => {
      if (cycleForm.scopeType === "department") {
        return asset.departmentId === cycleForm.scopeValue;
      }
      return asset.location
        .toLowerCase()
        .includes(cycleForm.scopeValue.trim().toLowerCase());
    });

    if (scopeAssets.length === 0) {
      setFormError(
        "No assets match the selected scope. Choose a different department or location."
      );
      return;
    }

    const result = createAuditCycle({
      title: cycleForm.title.trim(),
      departmentId: cycleForm.scopeType === "department" ? cycleForm.scopeValue : "",
      scopeType: cycleForm.scopeType,
      scopeValue: cycleForm.scopeValue.trim(),
      startDate: cycleForm.startDate,
      endDate: cycleForm.endDate,
      auditors: cycleForm.auditors.trim(),
    });

    if (!result.success) {
      setFormError("An open audit cycle already exists. Close it before creating another.");
      return;
    }

    const cycleId = result.cycle.id;

    for (const asset of scopeAssets) {
      addAuditChecklistItem(cycleId, asset.id, asset.location);
    }

    notifyWorkspaceUpdated();
    refresh();
    setCreateSheetOpen(false);
    setCycleForm(emptyCycleForm);
    setCreateSuccess(
      `Audit cycle created with ${scopeAssets.length} asset${scopeAssets.length === 1 ? "" : "s"}.`
    );
    setDetailCycleId(cycleId);
  };

  // Verification update
  const handleVerificationChange = (
    item: AuditChecklistItem,
    verification: AuditVerificationStatus,
    note?: string
  ) => {
    updateAuditVerification(item.id, verification, note);
    notifyWorkspaceUpdated();
    refresh();
  };

  // Close cycle
  const handleCloseCycle = () => {
    if (!detailCycleId) return;
    const result = closeAuditCycle(detailCycleId);
    if (!result.success) {
      return;
    }
    notifyWorkspaceUpdated();
    refresh();
    setConfirmClose(false);
  };

  // Discrepancy CSV export
  const handleExportDiscrepancies = () => {
    if (!detailCycle) return;
    const flagged = detailFindings.filter(
      (f) => f.verification === "missing" || f.verification === "damaged"
    );
    const headers = ["Tag", "Asset", "Result", "Note", "Location", "Recommended Action"];
    const rows = flagged.map((f) => {
      const asset = assetById.get(f.assetId);
      return [
        asset?.tag ?? "—",
        asset?.name ?? "—",
        f.verification,
        f.note,
        f.expectedLocation,
        f.verification === "missing"
          ? "Investigate location and holder history"
          : "Raise maintenance request",
      ];
    });
    downloadCsvFile(
      `discrepancy-report-${detailCycle.title.replace(/\s+/g, "-").toLowerCase()}.csv`,
      headers,
      rows
    );
  };

  // KPI Cards
  const kpis = [
    { label: "Active Cycles", value: activeCycles, icon: Clock, color: "text-sky-300 bg-sky-500/10" },
    { label: "Completed Cycles", value: completedCycles, icon: CheckCircle2, color: "text-emerald-300 bg-emerald-500/10" },
    { label: "Assets Pending", value: pendingVerifications, icon: ClipboardCheck, color: "text-amber-300 bg-amber-500/10" },
    { label: "Open Discrepancies", value: openDiscrepancies, icon: ShieldAlert, color: "text-rose-300 bg-rose-500/10" },
  ];

  // Scope display helper
  function getScopeLabel(cycle: AuditCycle) {
    if (cycle.scopeType === "department") {
      return departmentNameById.get(cycle.scopeValue) ?? cycle.scopeValue;
    }
    return cycle.scopeValue;
  }

  const hasFilters = searchQuery !== "" || statusFilter !== "all" || scopeFilter !== "all";

  return (
    <section>
      <PageHeader
        title="Asset Audits"
        description="Plan structured verification cycles, reconcile asset records, and generate discrepancy reports across the organization."
        actions={
          <button
            type="button"
            onClick={() => {
              setCycleForm(emptyCycleForm);
              setFormError("");
              setCreateSheetOpen(true);
            }}
            className="screen-action inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition hover:bg-emerald-500/10"
          >
            <Plus className="size-4" />
            Create Audit Cycle
          </button>
        }
      />

      {/* KPI overview */}
      <section className="mb-8 grid grid-cols-4 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <article
              key={kpi.label}
              className="workspace-card group relative overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {kpi.label}
                  </span>
                  <strong className="mt-4 block text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {kpi.value}
                  </strong>
                </div>
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl",
                    kpi.color
                  )}
                >
                  <Icon className="size-5" />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Cycle list */}
      <ScreenPanel>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by cycle name or auditor…"
              className="screen-search h-12 w-full rounded-full border-2 border-white/20 bg-transparent pr-4 pl-11 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/70"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: "All statuses", value: "all" },
                { label: "Open", value: "open" },
                { label: "In progress", value: "in_progress" },
                { label: "Closed", value: "closed" },
              ]}
            />
            <FilterSelect
              label="Scope"
              value={scopeFilter}
              onChange={setScopeFilter}
              options={[
                { label: "All scopes", value: "all" },
                { label: "Department", value: "department" },
                { label: "Location", value: "location" },
              ]}
            />
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setScopeFilter("all");
                }}
                className="mt-auto h-11 rounded-full border-2 border-white/20 px-4 text-sm text-slate-300 transition hover:border-white/40 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <DataTable
          columns={[
            "Cycle",
            "Scope",
            "Date Range",
            "Auditors",
            "Progress",
            "Completion",
            "Status",
            "Discrepancies",
            "",
          ]}
          isEmpty={filteredCycles.length === 0}
          emptyMessage={
            data.auditCycles.length === 0
              ? "No audit cycles yet. Create your first audit cycle."
              : "No audit cycles match the current filters."
          }
        >
          {filteredCycles.map((cycle) => {
            const progress = getCycleProgress(cycle.id);
            const discrepancies = getCycleDiscrepancies(cycle.id);
            return (
              <tr
                key={cycle.id}
                className="cursor-pointer border-b border-white/10 transition hover:bg-white/5"
                onClick={() => {
                  setDetailCycleId(cycle.id);
                  setConfirmClose(false);
                }}
              >
                <td className="px-4 py-4 font-medium text-white">
                  {cycle.title}
                </td>
                <td className="px-4 py-4 text-slate-300 capitalize">
                  {cycle.scopeType}: {getScopeLabel(cycle)}
                </td>
                <td className="px-4 py-4 text-slate-300">
                  {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}
                </td>
                <td className="px-4 py-4 text-slate-300">
                  {cycle.auditors}
                </td>
                <td className="px-4 py-4 text-slate-300">
                  {progress.checked}/{progress.total}
                </td>
                <td className="px-4 py-4 text-slate-300">
                  {progress.total === 0
                    ? "0%"
                    : `${Math.round((progress.checked / progress.total) * 100)}%`}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge
                    label={cycle.status.replace("_", " ")}
                    tone={auditStatusTone(cycle.status)}
                  />
                </td>
                <td className="px-4 py-4 text-slate-300">
                  {discrepancies > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-300">
                      <AlertTriangle className="size-3.5" />
                      {discrepancies}
                    </span>
                  ) : (
                    "0"
                  )}
                </td>
                <td className="px-4 py-4">
                  <ChevronRight className="size-4 text-slate-500" />
                </td>
              </tr>
            );
          })}
        </DataTable>
      </ScreenPanel>

      {/* Create Cycle Sheet */}
      <Sheet open={createSheetOpen} onOpenChange={setCreateSheetOpen}>
        <SheetContent className="w-full border-white/10 bg-[#0b1018] text-slate-100 sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-white">Create Audit Cycle</SheetTitle>
            <SheetDescription className="text-slate-400">
              Define audit scope, timeline, and assigned auditors.
            </SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-col gap-4 px-4"
            onSubmit={handleCreateCycle}
          >
            <FormField label="Cycle Name">
              <input
                className={formControlClass}
                value={cycleForm.title}
                onChange={(e) =>
                  setCycleForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g. Q3 Engineering Audit"
                required
              />
            </FormField>
            <FormField label="Scope Type">
              <select
                className={formControlClass}
                value={cycleForm.scopeType}
                onChange={(e) =>
                  setCycleForm((prev) => ({
                    ...prev,
                    scopeType: e.target.value as AuditScopeType,
                    scopeValue: "",
                  }))
                }
              >
                <option value="department">Department</option>
                <option value="location">Location</option>
              </select>
            </FormField>
            <FormField label="Scope Value">
              {cycleForm.scopeType === "department" ? (
                <select
                  className={formControlClass}
                  value={cycleForm.scopeValue}
                  onChange={(e) =>
                    setCycleForm((prev) => ({
                      ...prev,
                      scopeValue: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select department</option>
                  {data.departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={formControlClass}
                  value={cycleForm.scopeValue}
                  onChange={(e) =>
                    setCycleForm((prev) => ({
                      ...prev,
                      scopeValue: e.target.value,
                    }))
                  }
                  placeholder="e.g. Building A, Floor 2"
                  required
                />
              )}
            </FormField>
            <FormField label="Start Date">
              <input
                type="date"
                className={formControlClass}
                value={cycleForm.startDate}
                onChange={(e) =>
                  setCycleForm((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                required
              />
            </FormField>
            <FormField label="End Date">
              <input
                type="date"
                className={formControlClass}
                value={cycleForm.endDate}
                onChange={(e) =>
                  setCycleForm((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
                required
              />
            </FormField>
            <FormField label="Auditors">
              <input
                className={formControlClass}
                value={cycleForm.auditors}
                onChange={(e) =>
                  setCycleForm((prev) => ({
                    ...prev,
                    auditors: e.target.value,
                  }))
                }
                placeholder="e.g. Alice Chen, Bob Martinez"
                required
              />
            </FormField>

            {formError && (
              <p className="text-sm text-rose-400">{formError}</p>
            )}

            <SheetFooter className="px-0">
              <Button type="submit">Create Cycle</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Detail Sheet */}
      <Sheet
        open={detailCycleId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailCycleId(null);
            setConfirmClose(false);
            setCreateSuccess("");
          }
        }}
      >
        <SheetContent className="w-full border-white/10 bg-[#0b1018] text-slate-100 sm:max-w-2xl overflow-y-auto">
          {detailCycle && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">
                  {detailCycle.title}
                </SheetTitle>
                <SheetDescription className="text-slate-400">
                  {detailCycle.scopeType === "department" ? "Department" : "Location"}:{" "}
                  {getScopeLabel(detailCycle)} • {formatDate(detailCycle.startDate)} –{" "}
                  {formatDate(detailCycle.endDate)}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 px-4">
                {createSuccess && detailCycleId === detailCycle.id && (
                  <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    {createSuccess}
                  </p>
                )}

                {/* Cycle info */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                    <p className="text-xs text-slate-400">Status</p>
                    <p className="mt-1 text-sm font-semibold capitalize text-white">
                      {detailCycle.status.replace("_", " ")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                    <p className="text-xs text-slate-400">Progress</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {detailProgress.checked}/{detailProgress.total}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                    <p className="text-xs text-slate-400">Auditors</p>
                    <p className="mt-1 truncate text-sm font-semibold text-white">
                      {detailCycle.auditors}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                    <p className="text-xs text-slate-400">Discrepancies</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {detailProgress.missing + detailProgress.damaged}
                    </p>
                  </div>
                </div>

                {/* Progress breakdown */}
                <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block size-2 rounded-full bg-emerald-400" />
                    Verified: {detailProgress.verified}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block size-2 rounded-full bg-amber-400" />
                    Missing: {detailProgress.missing}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block size-2 rounded-full bg-rose-400" />
                    Damaged: {detailProgress.damaged}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block size-2 rounded-full bg-slate-500" />
                    Unchecked: {detailProgress.unchecked}
                  </span>
                </div>

                {detailCycle.closedAt && (
                  <p className="text-xs text-slate-500">
                    Closed: {formatDate(detailCycle.closedAt)}
                  </p>
                )}

                {/* Findings table */}
                <div className="overflow-hidden rounded-[1.25rem] border border-white/15">
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/15 bg-white/5">
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                            Tag
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                            Name
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                            Category
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                            Location
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                            Department
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                            Result
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                            Note
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailFindings.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-4 py-10 text-center text-sm text-slate-400"
                            >
                              No assets in this audit checklist.
                            </td>
                          </tr>
                        ) : (
                          detailFindings.map((finding) => {
                            const asset = assetById.get(finding.assetId);
                            return (
                              <tr
                                key={finding.id}
                                className="border-b border-white/10 transition hover:bg-white/5"
                              >
                                <td className="px-4 py-4 font-medium text-white">
                                  {asset?.tag ?? "—"}
                                </td>
                                <td className="px-4 py-4 text-slate-300">
                                  {asset?.name ?? "—"}
                                </td>
                                <td className="px-4 py-4 text-slate-300">
                                  {asset
                                    ? (categoryNameById.get(asset.categoryId) ?? "—")
                                    : "—"}
                                </td>
                                <td className="px-4 py-4 text-slate-300">
                                  {finding.expectedLocation}
                                </td>
                                <td className="px-4 py-4 text-slate-300">
                                  {asset
                                    ? (departmentNameById.get(asset.departmentId) ?? "—")
                                    : "—"}
                                </td>
                                <td className="px-4 py-4">
                                  {isClosed ? (
                                    <StatusBadge
                                      label={finding.verification}
                                      tone={verificationTone(finding.verification)}
                                    />
                                  ) : (
                                    <select
                                      className="h-9 rounded-lg border border-white/15 bg-transparent px-2 text-xs text-slate-100 outline-none transition focus:border-emerald-400/70"
                                      value={finding.verification}
                                      onChange={(e) =>
                                        handleVerificationChange(
                                          finding,
                                          e.target.value as AuditVerificationStatus
                                        )
                                      }
                                      aria-label={`Verification status for ${asset?.tag ?? "asset"}`}
                                    >
                                      <option value="pending">Unverified</option>
                                      {AUDIT_VERIFICATION_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </td>
                                <td className="px-4 py-4">
                                  {isClosed ? (
                                    <span className="text-slate-400">
                                      {finding.note || "—"}
                                    </span>
                                  ) : (
                                    <input
                                      type="text"
                                      className="h-9 w-full min-w-[8rem] rounded-lg border border-white/15 bg-transparent px-2 text-xs text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/70"
                                      value={finding.note}
                                      onChange={(e) =>
                                        handleVerificationChange(
                                          finding,
                                          finding.verification,
                                          e.target.value
                                        )
                                      }
                                      placeholder="Add note…"
                                      aria-label={`Note for ${asset?.tag ?? "asset"}`}
                                    />
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Discrepancy report */}
                {(detailProgress.missing > 0 || detailProgress.damaged > 0) && (
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-300">
                        <FileWarning className="size-4" />
                        <h3 className="text-sm font-semibold">
                          Discrepancy Report
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportDiscrepancies}
                        className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 px-3 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-500/10"
                        aria-label="Export discrepancy report as CSV"
                      >
                        <Download className="size-3" />
                        Export CSV
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="text-left text-amber-300/70">
                            <th className="px-3 py-2 font-semibold">Tag</th>
                            <th className="px-3 py-2 font-semibold">Asset</th>
                            <th className="px-3 py-2 font-semibold">Result</th>
                            <th className="px-3 py-2 font-semibold">Note</th>
                            <th className="px-3 py-2 font-semibold">Location</th>
                            <th className="px-3 py-2 font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailFindings
                            .filter(
                              (f) =>
                                f.verification === "missing" ||
                                f.verification === "damaged"
                            )
                            .map((f) => {
                              const asset = assetById.get(f.assetId);
                              return (
                                <tr
                                  key={f.id}
                                  className="border-t border-amber-400/15"
                                >
                                  <td className="px-3 py-2 font-medium text-white">
                                    {asset?.tag ?? "—"}
                                  </td>
                                  <td className="px-3 py-2 text-slate-300">
                                    {asset?.name ?? "—"}
                                  </td>
                                  <td className="px-3 py-2">
                                    <StatusBadge
                                      label={f.verification}
                                      tone="warning"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-slate-300">
                                    {f.note || "—"}
                                  </td>
                                  <td className="px-3 py-2 text-slate-300">
                                    {f.expectedLocation}
                                  </td>
                                  <td className="px-3 py-2 text-slate-400">
                                    {f.verification === "missing"
                                      ? "Investigate location and holder history"
                                      : "Raise maintenance request"}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Close cycle actions */}
                {!isClosed && (
                  <div className="pt-2">
                    {detailProgress.unchecked > 0 ? (
                      <p className="text-sm text-slate-400">
                        <AlertTriangle className="mr-1.5 inline size-3.5 text-amber-400" />
                        {detailProgress.unchecked} asset{detailProgress.unchecked > 1 ? "s" : ""}{" "}
                        remain unchecked. Complete all verifications before closing.
                      </p>
                    ) : confirmClose ? (
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-slate-300">
                          Close this cycle? All findings will be locked.
                        </p>
                        <Button type="button" onClick={handleCloseCycle}>
                          Confirm close
                        </Button>
                        <button
                          type="button"
                          onClick={() => setConfirmClose(false)}
                          className="text-sm text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => setConfirmClose(true)}
                      >
                        Close Audit Cycle
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
