import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { DashboardApi } from "../api/resources";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/Badge";
import { formatCurrency, formatDateTime } from "../utils/format";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-summary"], queryFn: () => DashboardApi.summary().then((r) => r.data) });

  if (isLoading || !data) {
    return <div className="text-slate-400">Loading dashboard…</div>;
  }

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of jobs, revenue, and operations" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jobs today" value={data.jobsToday} sub={`${data.jobsThisWeek} scheduled this week`} />
        <StatCard label="Active clients" value={data.activeClients} />
        <StatCard label="Revenue this month" value={formatCurrency(data.revenueThisMonth)} sub={`${formatCurrency(data.collectedThisMonth)} collected`} />
        <StatCard label="Overdue invoices" value={data.overdueInvoices.length} sub={data.lowStockItems.length ? `${data.lowStockItems.length} items low on stock` : "Inventory healthy"} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Upcoming jobs (next 7 days)</h2>
          {data.upcomingJobs.length === 0 && <p className="text-sm text-slate-400">Nothing scheduled.</p>}
          <ul className="divide-y divide-slate-100">
            {data.upcomingJobs.map((job) => (
              <li key={job.id} className="py-2">
                <Link to={`/jobs/${job.id}`} className="flex items-center justify-between hover:text-brand-700">
                  <div>
                    <div className="text-sm font-medium">{job.title}</div>
                    <div className="text-xs text-slate-500">
                      {job.client.name} · {job.property.name} · {formatDateTime(job.scheduledStart)}
                    </div>
                  </div>
                  <Badge value={job.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Overdue invoices</h2>
          {data.overdueInvoices.length === 0 && <p className="text-sm text-slate-400">No overdue invoices. 🎉</p>}
          <ul className="divide-y divide-slate-100">
            {data.overdueInvoices.map((inv) => (
              <li key={inv.id} className="py-2">
                <Link to={`/invoices/${inv.id}`} className="flex items-center justify-between hover:text-brand-700">
                  <div>
                    <div className="text-sm font-medium">{inv.invoiceNumber}</div>
                    <div className="text-xs text-slate-500">
                      {(inv as any).client?.name} · due {formatDateTime(inv.dueDate)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-red-600">{formatCurrency(inv.total - inv.amountPaid)}</div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Low stock inventory</h2>
          {data.lowStockItems.length === 0 && <p className="text-sm text-slate-400">All inventory above reorder levels.</p>}
          <ul className="divide-y divide-slate-100">
            {data.lowStockItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                <span>{item.name}</span>
                <span className="text-red-600">
                  {item.quantityOnHand} {item.unit} left (reorder at {item.reorderLevel})
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Jobs by status</h2>
          <ul className="space-y-2">
            {data.jobStatusCounts.map((s) => (
              <li key={s.status} className="flex items-center justify-between text-sm">
                <Badge value={s.status} />
                <span className="font-semibold">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
