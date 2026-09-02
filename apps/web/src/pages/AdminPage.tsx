import { useState } from "react";
import { OverviewPanel } from "../components/OverviewPanel";
import { IntegrationsPanel } from "../components/IntegrationsPanel";
import { UsersPanel } from "../components/UsersPanel";
import { AuditLogPanel } from "../components/AuditLogPanel";

const TABS = ["overview", "integrations", "users", "audit"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  integrations: "Integrations",
  users: "Team",
  audit: "Audit Log",
};

export function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className={`mx-auto px-4 sm:px-6 py-8 ${tab === "audit" ? "max-w-6xl" : "max-w-4xl"}`}>
      <h1 className="font-display text-2xl font-semibold text-clay-800 mb-1">Admin Portal</h1>
      <p className="text-sm text-stone-500 mb-6">
        Provider credentials, team access, and a full activity trail — everything you need to help a user when something goes wrong.
      </p>

      <div className="flex gap-1 mb-6 border-b border-stone-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
              tab === t ? "border-clay-600 text-clay-700" : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewPanel />}
      {tab === "integrations" && <IntegrationsPanel />}
      {tab === "users" && <UsersPanel />}
      {tab === "audit" && <AuditLogPanel />}
    </div>
  );
}
