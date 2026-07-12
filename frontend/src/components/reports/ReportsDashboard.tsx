"use client";

import { useMemo, useState } from "react";
import {
  Download,
  Printer,
  TrendingUp,
} from "lucide-react";

import PageHeader from "@/components/dashboard/PageHeader";
import DataTable from "@/components/workspace/DataTable";
import FilterSelect from "@/components/workspace/FilterSelect";
import ScreenPanel from "@/components/workspace/ScreenPanel";
import StatusBadge from "@/components/workspace/StatusBadge";
import {
  useWorkspaceData,
} from "@/hooks/use-workspace-data";
import type { Asset, WorkspaceData } from "@/lib/workspace/types";
import {
  deterministicHash,
  downloadCsvFile,
  formatHistoryDate,
} from "@/lib/workspace/utils";
import { cn } from "@/lib/utils";

type DateRangeKey = "30d" | "90d" | "180d" | "all";

const dateRangeOptions: { label: string; value: DateRangeKey; days: number | null }[] =
  [
    { label: "Last 30 days", value: "30d", days: 30 },
    { label: "Last 90 days", value: "90d", days: 90 },
    { label: "Last 180 days", value: "180d", days: 180 },
    { label: "All time", value: "all", days: null },
  ];

const heatmapDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

const heatmapWindows = [
  { label: "08–10", start: 8, end: 10 },
  { label: "10–12", start: 10, end: 12 },
  { label: "12–14", start: 12, end: 14 },
  { label: "14–16", start: 14, end: 16 },
  { label: "16–18", start: 16, end: 18 },
] as const;

const REPORT_AS_OF_MS = new Date("2026-07-12T09:00:00.000Z").getTime();

function getRangeStart(dateRange: DateRangeKey) {
  const option = dateRangeOptions.find((item) => item.value === dateRange);
  if (!option?.days) {
    return null;
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - option.days);
  return start;
}

function isWithinRange(isoDate: string, rangeStart: Date | null) {
  if (!rangeStart) {
    return true;
  }
  return new Date(isoDate) >= rangeStart;
}

function getAssetAgeMonths(assetId: string) {
  return (deterministicHash(assetId) % 48) + 12;
}

function getAssetUsageCount(assetId: string, data: WorkspaceData) {
  const historyCount = data.allocationHistory.filter(
    (entry) => entry.assetId === assetId
  ).length;
  const bookingCount = data.bookings.filter((booking) =>
    booking.title.toLowerCase().includes(assetId.slice(-4))
  ).length;
  const deterministicBoost = (deterministicHash(assetId) % 8) + 1;
  return historyCount + bookingCount + deterministicBoost;
}

function getAssetIdleDays(assetId: string, data: WorkspaceData) {
  const historyEntries = data.allocationHistory
    .filter((entry) => entry.assetId === assetId)
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );

  if (historyEntries.length === 0) {
    return (deterministicHash(assetId) % 45) + 15;
  }

  const lastActivity = new Date(historyEntries[0].occurredAt);
  const diffMs = REPORT_AS_OF_MS - lastActivity.getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getOverdueReturnCount(
  assets: Asset[],
  data: WorkspaceData,
  rangeStart: Date | null
) {
  return assets.filter((asset) => {
    const activeAllocation = data.allocations.find(
      (allocation) => allocation.assetId === asset.id && allocation.active
    );
    if (!activeAllocation) {
      return false;
    }
    const startedAt = new Date(activeAllocation.startedAt);
    if (rangeStart && startedAt < rangeStart) {
      return false;
    }
    const daysAllocated = Math.floor(
      (REPORT_AS_OF_MS - startedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const threshold = 14 + (deterministicHash(asset.id) % 7);
    return daysAllocated > threshold;
  }).length;
}

function getHealthScore(assetId: string, maintenanceCount: number) {
  const base = 100 - maintenanceCount * 8 - (deterministicHash(assetId) % 25);
  return Math.max(18, Math.min(100, base));
}

function getRiskStatus(score: number, nextMaintenanceDays: number) {
  if (score < 50 || nextMaintenanceDays <= 0) {
    return "high risk" as const;
  }
  if (score < 75 || nextMaintenanceDays <= 14) {
    return "medium risk" as const;
  }
  return "healthy" as const;
}

function riskTone(status: ReturnType<typeof getRiskStatus>) {
  if (status === "high risk") {
    return "warning" as const;
  }
  if (status === "medium risk") {
    return "info" as const;
  }
  return "success" as const;
}

function getHeatmapCount(
  dayIndex: number,
  windowStart: number,
  data: WorkspaceData,
  rangeStart: Date | null
) {
  let count = 0;
  const windowStartMinutes = windowStart * 60;
  const windowEndMinutes = (windowStart + 2) * 60;

  for (const booking of data.bookings) {
    if (booking.status !== "confirmed") {
      continue;
    }
    const bookingDate = new Date(`${booking.date}T00:00:00`);
    if (rangeStart && bookingDate < rangeStart) {
      continue;
    }
    const weekday = bookingDate.getDay();
    const mappedDay = weekday === 0 ? 6 : weekday - 1;
    if (mappedDay !== dayIndex || mappedDay > 4) {
      continue;
    }
    const bookingStart = booking.startHour * 60 + booking.startMinute;
    const bookingEnd = booking.endHour * 60 + booking.endMinute;
    if (bookingStart < windowEndMinutes && windowStartMinutes < bookingEnd) {
      count += 1;
    }
  }

  const supplement =
    (deterministicHash(`${dayIndex}-${windowStart}`) % 4) +
    (rangeStart ? 0 : 1);
  return count + supplement;
}

export default function ReportsDashboard() {
  const { data } = useWorkspaceData();
  const [dateRange, setDateRange] = useState<DateRangeKey>("90d");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const rangeStart = getRangeStart(dateRange);

  const categoryNameById = useMemo(
    () => new Map(data.categories.map((item) => [item.id, item.name])),
    [data.categories]
  );
  const departmentNameById = useMemo(
    () => new Map(data.departments.map((item) => [item.id, item.name])),
    [data.departments]
  );

  const filteredAssets = useMemo(() => {
    return data.assets.filter((asset) => {
      const matchesDepartment =
        departmentFilter === "all" || asset.departmentId === departmentFilter;
      const matchesCategory =
        categoryFilter === "all" || asset.categoryId === categoryFilter;
      return matchesDepartment && matchesCategory;
    });
  }, [categoryFilter, data.assets, departmentFilter]);

  const filteredMaintenance = useMemo(() => {
    return data.maintenanceRequests.filter((request) => {
      const asset = data.assets.find((item) => item.id === request.assetId);
      if (!asset) {
        return false;
      }
      const matchesDepartment =
        departmentFilter === "all" || asset.departmentId === departmentFilter;
      const matchesCategory =
        categoryFilter === "all" || asset.categoryId === categoryFilter;
      const matchesRange = isWithinRange(request.createdAt, rangeStart);
      return matchesDepartment && matchesCategory && matchesRange;
    });
  }, [
    categoryFilter,
    data.assets,
    data.maintenanceRequests,
    departmentFilter,
    rangeStart,
  ]);

  const filteredBookings = useMemo(() => {
    return data.bookings.filter((booking) => {
      const bookingDate = `${booking.date}T00:00:00`;
      const matchesRange = isWithinRange(bookingDate, rangeStart);
      return matchesRange && booking.status === "confirmed";
    });
  }, [data.bookings, rangeStart]);

  const kpis = useMemo(() => {
    const totalAssets = filteredAssets.length;
    const allocatedAssets = filteredAssets.filter(
      (asset) => asset.status === "allocated"
    ).length;
    const utilizationRate =
      totalAssets === 0 ? 0 : Math.round((allocatedAssets / totalAssets) * 100);
    const underMaintenance = filteredAssets.filter(
      (asset) => asset.status === "maintenance"
    ).length;
    const nearingRetirement = filteredAssets.filter(
      (asset) => getAssetAgeMonths(asset.id) >= 54
    ).length;
    const activeBookings = filteredBookings.length;
    const overdueReturns = getOverdueReturnCount(filteredAssets, data, rangeStart);

    return {
      totalAssets,
      utilizationRate,
      underMaintenance,
      nearingRetirement,
      activeBookings,
      overdueReturns,
    };
  }, [data, filteredAssets, filteredBookings, rangeStart]);

  const utilizationTrend = useMemo(() => {
    const months: { label: string; value: number }[] = [];
    const now = new Date();

    for (let index = 5; index >= 0; index -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const label = monthDate.toLocaleDateString("en-US", { month: "short" });
      const base =
        filteredAssets.length === 0
          ? 0
          : Math.round(
              (filteredAssets.filter((asset) => asset.status === "allocated")
                .length /
                filteredAssets.length) *
                100
            );
      const variance =
        (deterministicHash(`${label}-${departmentFilter}-${categoryFilter}`) %
          11) -
        5;
      const value = Math.max(0, Math.min(100, base + variance - index));
      months.push({ label, value });
    }

    return months;
  }, [categoryFilter, departmentFilter, filteredAssets]);

  const mostUsedAssets = useMemo(() => {
    return filteredAssets
      .map((asset) => {
        const usageCount = getAssetUsageCount(asset.id, data);
        const utilization = Math.min(
          100,
          usageCount * 8 + (deterministicHash(asset.id) % 15)
        );
        return {
          asset,
          usageCount,
          utilization,
        };
      })
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 6);
  }, [data, filteredAssets]);

  const idleAssets = useMemo(() => {
    return filteredAssets
      .map((asset) => ({
        asset,
        daysIdle: getAssetIdleDays(asset.id, data),
      }))
      .sort((a, b) => b.daysIdle - a.daysIdle)
      .slice(0, 6);
  }, [data, filteredAssets]);

  const maintenanceFrequency = useMemo(() => {
    const grouped = new Map<
      string,
      { count: number; totalResolutionDays: number; resolvedCount: number; lastDate: string }
    >();

    for (const request of filteredMaintenance) {
      const asset = data.assets.find((item) => item.id === request.assetId);
      const key = asset
        ? (categoryNameById.get(asset.categoryId) ?? "Unknown")
        : "Unknown";
      const current = grouped.get(key) ?? {
        count: 0,
        totalResolutionDays: 0,
        resolvedCount: 0,
        lastDate: request.createdAt,
      };
      current.count += 1;
      if (request.status === "resolved") {
        current.resolvedCount += 1;
        current.totalResolutionDays +=
          2 + (deterministicHash(request.id) % 6);
      }
      if (new Date(request.createdAt) > new Date(current.lastDate)) {
        current.lastDate = request.createdAt;
      }
      grouped.set(key, current);
    }

    return Array.from(grouped.entries())
      .map(([label, stats]) => ({
        label,
        count: stats.count,
        averageResolutionDays:
          stats.resolvedCount === 0
            ? 0
            : Math.round(stats.totalResolutionDays / stats.resolvedCount),
        lastDate: stats.lastDate,
      }))
      .sort((a, b) => b.count - a.count);
  }, [categoryNameById, data.assets, filteredMaintenance]);

  const riskAssets = useMemo(() => {
    return filteredAssets
      .map((asset) => {
        const maintenanceCount = data.maintenanceRequests.filter(
          (request) => request.assetId === asset.id
        ).length;
        const healthScore = getHealthScore(asset.id, maintenanceCount);
        const nextMaintenanceOffset =
          7 + (deterministicHash(`${asset.id}-maint`) % 45);
        const nextMaintenanceDate = new Date(REPORT_AS_OF_MS);
        nextMaintenanceDate.setDate(
          nextMaintenanceDate.getDate() + nextMaintenanceOffset - 14
        );
        const nextMaintenanceDays = Math.ceil(
          (nextMaintenanceDate.getTime() - REPORT_AS_OF_MS) /
            (1000 * 60 * 60 * 24)
        );
        const retirementDate = new Date(REPORT_AS_OF_MS);
        retirementDate.setMonth(
          retirementDate.getMonth() + Math.max(1, 60 - getAssetAgeMonths(asset.id))
        );
        const riskStatus = getRiskStatus(healthScore, nextMaintenanceDays);

        return {
          asset,
          healthScore,
          nextMaintenanceDate,
          retirementDate,
          riskStatus,
        };
      })
      .sort((a, b) => a.healthScore - b.healthScore)
      .slice(0, 8);
  }, [data.maintenanceRequests, filteredAssets]);

  const departmentSummary = useMemo(() => {
    const departments =
      departmentFilter === "all"
        ? data.departments
        : data.departments.filter((item) => item.id === departmentFilter);

    return departments.map((department) => {
      const departmentAssets = filteredAssets.filter(
        (asset) => asset.departmentId === department.id
      );
      return {
        department: department.name,
        totalAssets: departmentAssets.length,
        allocatedAssets: departmentAssets.filter(
          (asset) => asset.status === "allocated"
        ).length,
        availableAssets: departmentAssets.filter(
          (asset) => asset.status === "available"
        ).length,
        maintenanceAssets: departmentAssets.filter(
          (asset) => asset.status === "maintenance"
        ).length,
        overdueReturns: getOverdueReturnCount(departmentAssets, data, rangeStart),
      };
    });
  }, [data, departmentFilter, filteredAssets, rangeStart]);

  const heatmapValues = useMemo(() => {
    return heatmapDays.map((_, dayIndex) =>
      heatmapWindows.map((window) =>
        getHeatmapCount(dayIndex, window.start, data, rangeStart)
      )
    );
  }, [data, rangeStart]);

  const heatmapMax = Math.max(1, ...heatmapValues.flat());

  const handleResetFilters = () => {
    setDateRange("90d");
    setDepartmentFilter("all");
    setCategoryFilter("all");
  };

  const handleExportCsv = () => {
    downloadCsvFile(
      "department-allocation-summary.csv",
      [
        "Department",
        "Total Assets",
        "Allocated",
        "Available",
        "Under Maintenance",
        "Overdue Returns",
      ],
      departmentSummary.map((row) => [
        row.department,
        String(row.totalAssets),
        String(row.allocatedAssets),
        String(row.availableAssets),
        String(row.maintenanceAssets),
        String(row.overdueReturns),
      ])
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const trendPoints = utilizationTrend
    .map((point, index) => {
      const x = 40 + index * 52;
      const y = 150 - point.value * 1.2;
      return `${x},${y}`;
    })
    .join(" ");

  const hasFilters =
    dateRange !== "90d" ||
    departmentFilter !== "all" ||
    categoryFilter !== "all";

  return (
    <section className="reports-dashboard">
      <PageHeader
        title="Reports"
        description="Review operational metrics and export asset management reports."
        actions={
          <div className="no-print flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportCsv}
              className="screen-action inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition hover:bg-emerald-500/10"
              aria-label="Export department allocation summary as CSV"
            >
              <Download className="size-4" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="screen-action inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition hover:bg-emerald-500/10"
              aria-label="Print report"
            >
              <Printer className="size-4" />
              Print Report
            </button>
          </div>
        }
      />

      <ScreenPanel className="no-print mb-8">
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect
            label="Date range"
            value={dateRange}
            onChange={(value) => setDateRange(value as DateRangeKey)}
            options={dateRangeOptions.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
          />
          <FilterSelect
            label="Department"
            value={departmentFilter}
            onChange={setDepartmentFilter}
            options={[
              { label: "All departments", value: "all" },
              ...data.departments.map((department) => ({
                label: department.name,
                value: department.id,
              })),
            ]}
          />
          <FilterSelect
            label="Category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { label: "All categories", value: "all" },
              ...data.categories.map((category) => ({
                label: category.name,
                value: category.id,
              })),
            ]}
          />
          {hasFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-11 rounded-full border-2 border-white/20 px-4 text-sm text-slate-300 transition hover:border-white/40 hover:text-white"
            >
              Reset Filters
            </button>
          )}
        </div>
      </ScreenPanel>

      <section className="mb-8 grid grid-cols-3 gap-5 max-xl:grid-cols-2 max-md:grid-cols-1">
        {[
          { label: "Total Assets", value: kpis.totalAssets },
          { label: "Utilization Rate", value: `${kpis.utilizationRate}%` },
          { label: "Assets Under Maintenance", value: kpis.underMaintenance },
          {
            label: "Assets Nearing Retirement",
            value: kpis.nearingRetirement,
          },
          { label: "Active Bookings", value: kpis.activeBookings },
          { label: "Overdue Returns", value: kpis.overdueReturns },
        ].map((kpi) => (
          <article
            key={kpi.label}
            className="workspace-card rounded-2xl p-6"
          >
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {kpi.label}
            </span>
            <strong className="mt-4 block text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              {kpi.value}
            </strong>
          </article>
        ))}
      </section>

      <div className="mb-8 grid grid-cols-2 gap-5 max-lg:grid-cols-1">
        <ScreenPanel>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-300" />
            <h2 className="text-lg font-semibold text-white">Utilization Trend</h2>
          </div>
          {utilizationTrend.length === 0 ? (
            <p className="text-sm text-slate-400">No utilization data available.</p>
          ) : (
            <svg
              viewBox="0 0 340 180"
              className="h-auto w-full"
              role="img"
              aria-labelledby="utilization-trend-title"
              aria-describedby="utilization-trend-desc"
            >
              <title id="utilization-trend-title">Utilization trend chart</title>
              <desc id="utilization-trend-desc">
                Line chart showing utilization percentage over the last six months.
              </desc>
              {[0, 25, 50, 75, 100].map((tick) => (
                <g key={tick}>
                  <line
                    x1="30"
                    y1={150 - tick * 1.2}
                    x2="320"
                    y2={150 - tick * 1.2}
                    stroke="rgba(255,255,255,0.08)"
                  />
                  <text
                    x="8"
                    y={154 - tick * 1.2}
                    fill="#94a3b8"
                    fontSize="10"
                  >
                    {tick}%
                  </text>
                </g>
              ))}
              <polyline
                fill="none"
                stroke="#34d399"
                strokeWidth="3"
                points={trendPoints}
              />
              {utilizationTrend.map((point, index) => {
                const x = 40 + index * 52;
                const y = 150 - point.value * 1.2;
                return (
                  <g key={point.label}>
                    <circle cx={x} cy={y} r="4" fill="#2dd4bf" />
                    <text x={x - 10} y="170" fill="#cbd5e1" fontSize="10">
                      {point.label}
                    </text>
                    <title>{`${point.label}: ${point.value}% utilization`}</title>
                  </g>
                );
              })}
            </svg>
          )}
        </ScreenPanel>

        <ScreenPanel>
          <h2 className="mb-4 text-lg font-semibold text-white">
            Maintenance Frequency
          </h2>
          {maintenanceFrequency.length === 0 ? (
            <p className="text-sm text-slate-400">
              No maintenance activity in the selected range.
            </p>
          ) : (
            <div className="space-y-4">
              {maintenanceFrequency.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-white">{item.label}</span>
                    <span className="text-slate-400">
                      {item.count} requests · avg {item.averageResolutionDays} days
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{
                        width: `${Math.min(100, item.count * 20)}%`,
                      }}
                      aria-label={`${item.label} maintenance count ${item.count}`}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Last maintenance: {formatHistoryDate(item.lastDate)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScreenPanel>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-5 max-lg:grid-cols-1">
        <ScreenPanel>
          <h2 className="mb-4 text-lg font-semibold text-white">Most-Used Assets</h2>
          <DataTable
            columns={["Asset", "Tag", "Category", "Utilization", "Usage Count"]}
            isEmpty={mostUsedAssets.length === 0}
            emptyMessage="No asset usage data for the current filters."
          >
            {mostUsedAssets.map(({ asset, utilization, usageCount }) => (
              <tr key={asset.id} className="border-b border-white/10">
                <td className="px-4 py-4 text-white">{asset.name}</td>
                <td className="px-4 py-4 text-slate-300">{asset.tag}</td>
                <td className="px-4 py-4 text-slate-300">
                  {categoryNameById.get(asset.categoryId) ?? "—"}
                </td>
                <td className="px-4 py-4 text-slate-300">{utilization}%</td>
                <td className="px-4 py-4 text-slate-300">{usageCount}</td>
              </tr>
            ))}
          </DataTable>
        </ScreenPanel>

        <ScreenPanel>
          <h2 className="mb-4 text-lg font-semibold text-white">Idle Assets</h2>
          <DataTable
            columns={["Asset", "Tag", "Category", "Days Idle", "Department"]}
            isEmpty={idleAssets.length === 0}
            emptyMessage="No idle assets for the current filters."
          >
            {idleAssets.map(({ asset, daysIdle }) => (
              <tr key={asset.id} className="border-b border-white/10">
                <td className="px-4 py-4 text-white">{asset.name}</td>
                <td className="px-4 py-4 text-slate-300">{asset.tag}</td>
                <td className="px-4 py-4 text-slate-300">
                  {categoryNameById.get(asset.categoryId) ?? "—"}
                </td>
                <td className="px-4 py-4 text-slate-300">{daysIdle}</td>
                <td className="px-4 py-4 text-slate-300">
                  {departmentNameById.get(asset.departmentId) ?? "—"}
                </td>
              </tr>
            ))}
          </DataTable>
        </ScreenPanel>
      </div>

      <ScreenPanel className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Maintenance and Retirement Risk
        </h2>
        <DataTable
          columns={[
            "Asset",
            "Tag",
            "Category",
            "Health Score",
            "Next Maintenance",
            "Expected Retirement",
            "Risk",
          ]}
          isEmpty={riskAssets.length === 0}
          emptyMessage="No risk data for the current filters."
        >
          {riskAssets.map(
            ({ asset, healthScore, nextMaintenanceDate, retirementDate, riskStatus }) => (
              <tr key={asset.id} className="border-b border-white/10">
                <td className="px-4 py-4 text-white">{asset.name}</td>
                <td className="px-4 py-4 text-slate-300">{asset.tag}</td>
                <td className="px-4 py-4 text-slate-300">
                  {categoryNameById.get(asset.categoryId) ?? "—"}
                </td>
                <td className="px-4 py-4 text-slate-300">{healthScore}</td>
                <td className="px-4 py-4 text-slate-300">
                  {nextMaintenanceDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-4 text-slate-300">
                  {retirementDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge label={riskStatus} tone={riskTone(riskStatus)} />
                </td>
              </tr>
            )
          )}
        </DataTable>
      </ScreenPanel>

      <ScreenPanel className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Department Allocation Summary
        </h2>
        <DataTable
          columns={[
            "Department",
            "Total Assets",
            "Allocated",
            "Available",
            "Under Maintenance",
            "Overdue Returns",
          ]}
          isEmpty={departmentSummary.length === 0}
          emptyMessage="No department allocation data for the current filters."
        >
          {departmentSummary.map((row) => (
            <tr key={row.department} className="border-b border-white/10">
              <td className="px-4 py-4 text-white">{row.department}</td>
              <td className="px-4 py-4 text-slate-300">{row.totalAssets}</td>
              <td className="px-4 py-4 text-slate-300">{row.allocatedAssets}</td>
              <td className="px-4 py-4 text-slate-300">{row.availableAssets}</td>
              <td className="px-4 py-4 text-slate-300">{row.maintenanceAssets}</td>
              <td className="px-4 py-4 text-slate-300">{row.overdueReturns}</td>
            </tr>
          ))}
        </DataTable>
      </ScreenPanel>

      <ScreenPanel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Booking Heatmap</h2>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Low</span>
            <div className="flex gap-1">
              {[0.15, 0.3, 0.5, 0.75, 1].map((opacity) => (
                <span
                  key={opacity}
                  className="size-4 rounded-sm bg-emerald-400"
                  style={{ opacity }}
                  aria-hidden="true"
                />
              ))}
            </div>
            <span>Peak</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div
            className="grid min-w-[720px] gap-2"
            style={{
              gridTemplateColumns: `7rem repeat(${heatmapWindows.length}, minmax(0, 1fr))`,
            }}
          >
            <div />
            {heatmapWindows.map((window) => (
              <div
                key={window.label}
                className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
              >
                {window.label}
              </div>
            ))}
            {heatmapDays.map((day, dayIndex) => (
              <div key={day} className="contents">
                <div className="flex items-center text-sm font-medium text-slate-300">
                  {day}
                </div>
                {heatmapWindows.map((window, windowIndex) => {
                  const count = heatmapValues[dayIndex][windowIndex];
                  const intensity = count / heatmapMax;
                  const isPeak = count === heatmapMax;
                  return (
                    <div
                      key={`${day}-${window.label}`}
                      className={cn(
                        "flex min-h-16 flex-col items-center justify-center rounded-xl border border-white/10 px-2 py-3 text-center",
                        isPeak && "ring-1 ring-emerald-300/60"
                      )}
                      style={{
                        backgroundColor: `rgba(52, 211, 153, ${0.12 + intensity * 0.55})`,
                      }}
                      title={`${day} ${window.label}: ${count} bookings`}
                      aria-label={`${day} ${window.label}, ${count} bookings`}
                    >
                      <span className="text-lg font-semibold text-white">{count}</span>
                      {isPeak && (
                        <span className="mt-1 text-[10px] uppercase tracking-[0.12em] text-emerald-200">
                          Peak
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </ScreenPanel>
    </section>
  );
}
