import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { DashboardOverview } from "../types";

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm shadow-clay-900/5">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="font-display text-2xl font-semibold text-clay-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  );
}

function BreakdownTile({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = Object.entries(counts);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm shadow-clay-900/5">
      <p className="text-xs text-stone-500 mb-2">{title}</p>
      {entries.length === 0 && <p className="text-sm text-stone-400">None yet</p>}
      <div className="space-y-1.5">
        {entries.map(([key, count]) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-stone-700">{key}</span>
            <span className="text-stone-500 tabular-nums">
              {count} <span className="text-stone-300">·</span> {total > 0 ? Math.round((count / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OverviewPanel() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardOverview>("/admin/dashboard") });

  if (isLoading || !data) return <p className="text-sm text-stone-500">Loading…</p>;

  const revenueLabel =
    data.acceptedRevenue.length === 0
      ? "0"
      : data.acceptedRevenue.map((r) => `${r.currency} ${Number(r.total).toLocaleString()}`).join(" · ");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatTile label="Accepted revenue" value={revenueLabel} sub="sum of frozen price snapshots" />
        <StatTile label="Open tasks" value={data.openTasksCount} />
        <StatTile label="Team members" value={data.teamMembersCount} />
        <StatTile label="Integrations enabled" value={data.integrationsEnabledCount} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <BreakdownTile title="Requests by stage" counts={data.requestsByStage} />
        <BreakdownTile title="Quotes by status" counts={data.quotesByStatus} />
      </div>
    </div>
  );
}
