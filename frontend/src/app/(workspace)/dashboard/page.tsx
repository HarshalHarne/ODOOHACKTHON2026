import EmptyPanel from "@/components/dashboard/EmptyPanel";
import PageHeader from "@/components/dashboard/PageHeader";
import KPICard from "@/components/dashboard/KPICard";
import QuickActions from "@/components/dashboard/QuickActions";

const kpiTitles = [
  "Assets Available",
  "Assets Allocated",
  "Maintenance Today",
  "Active Bookings",
  "Pending Transfers",
  "Upcoming Returns",
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Monitor assets, resources, maintenance, and operational activity across your organization."
      />

      <section className="mb-8 grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1">
        {kpiTitles.map((title) => (
          <KPICard key={title} title={title} />
        ))}
      </section>

      <QuickActions />

      <section className="mb-8 grid grid-cols-2 gap-5 max-lg:grid-cols-1">
        <EmptyPanel
          title="Overdue Returns"
          emptyTitle="No overdue return data"
          description="Overdue asset allocations will appear here when available."
        />

        <EmptyPanel
          title="Upcoming Returns"
          emptyTitle="No upcoming return data"
          description="Scheduled asset returns will appear here when available."
        />
      </section>

      <EmptyPanel
        title="Recent Activity"
        emptyTitle="No recent activity"
        description="Asset allocations, bookings, maintenance updates, and transfers will appear here."
      />
    </>
  );
}
