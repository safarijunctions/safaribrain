import { useState } from "react";
import { OverviewPanel } from "../components/OverviewPanel";
import { IntegrationsPanel } from "../components/IntegrationsPanel";
import { UsersPanel } from "../components/UsersPanel";

const TABS = ["overview", "integrations", "users"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  integrations: "Integrations",
  users: "Team",
};

export function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="font-display text-2xl font-semibold text-clay-800 mb-1">Admin Portal</h1>
      <p className="text-sm text-stone-500 mb-6">
        Provider credentials and team access — add real payment, messaging, and AI keys here once you're ready to go live.
      </p>

      <div className="flex gap-1 mb-6 border-b border-stone-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
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
    </div>
  );
}
