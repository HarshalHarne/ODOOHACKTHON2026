"use client";

import PageHeader from "@/components/dashboard/PageHeader";
import KPICard from "@/components/dashboard/KPICard";
import QuickActions from "@/components/dashboard/QuickActions";
import { useWorkspaceData } from "@/hooks/use-workspace-data";
import StatusBadge from "@/components/workspace/StatusBadge";
import DataTable from "@/components/workspace/DataTable";

export default function DashboardPage() {
  const { data } = useWorkspaceData();

  const availableAssets = data.assets.filter((a) => a.status === "available").length;
  const allocatedAssets = data.assets.filter((a) => a.status === "allocated").length;
  const maintenanceToday = data.maintenanceRequests.filter((m) => m.status === "pending").length;
  const activeBookings = data.bookings.filter((b) => b.status === "confirmed").length;
  const pendingTransfers = 0; // Derived metric if needed
  const upcomingReturns = 0; // Derived metric if needed

  const recentActivity = data.allocationHistory.slice(0, 5);
  const maintenanceList = data.maintenanceRequests.slice(0, 5);

  const kpis = [
    { title: "Assets Available", value: availableAssets },
    { title: "Assets Allocated", value: allocatedAssets },
    { title: "Maintenance Today", value: maintenanceToday },
    { title: "Active Bookings", value: activeBookings },
    { title: "Pending Transfers", value: pendingTransfers },
    { title: "Upcoming Returns", value: upcomingReturns },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Monitor assets, resources, maintenance, and operational activity across your organization."
      />

      <section className="mb-8 grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1">
        {kpis.map((kpi) => (
          <KPICard key={kpi.title} title={kpi.title} value={kpi.value} />
        ))}
      </section>

      <QuickActions />

      <section className="mb-8 grid grid-cols-2 gap-5 max-lg:grid-cols-1">
        <div className="rounded-2xl border border-white/10 bg-[#0b1018]/50 p-6 shadow-xl backdrop-blur-xl">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
            Maintenance Requests
          </h2>
          <DataTable
            columns={["Asset", "Description", "Status"]}
            isEmpty={maintenanceList.length === 0}
            emptyMessage="No pending maintenance requests."
          >
            {maintenanceList.map((req) => {
              const asset = data.assets.find((a) => a.id === req.assetId);
              return (
                <tr key={req.id} className="border-b border-white/10">
                  <td className="px-4 py-3 text-sm font-medium text-white">{asset?.tag || req.assetId}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{req.description}</td>
                  <td className="px-4 py-3 text-sm">
                    <StatusBadge label={req.status} tone={req.status === "approved" ? "success" : "neutral"} />
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0b1018]/50 p-6 shadow-xl backdrop-blur-xl">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
            Recent Activity
          </h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-slate-400">No recent activity found.</p>
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((activity) => (
                <li key={activity.id} className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/5 p-3 text-sm">
                  <span className="font-medium text-emerald-400">
                    {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(activity.occurredAt))}
                  </span>
                  <span className="text-slate-200">{activity.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
