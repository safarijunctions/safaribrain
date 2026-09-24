import { useState } from "react";
import { OverviewPanel } from "../components/OverviewPanel";
import { IntegrationsPanel } from "../components/IntegrationsPanel";
import { UsersPanel } from "../components/UsersPanel";
import { AuditLogPanel } from "../components/AuditLogPanel";
import { ContentPanel } from "../components/ContentPanel";
import { ListingsPanel } from "../components/ListingsPanel";
import { AiDraftPanel } from "../components/AiDraftPanel";
import { ReviewsPanel } from "../components/ReviewsPanel";
import { FleetPanel } from "../components/FleetPanel";

const TABS = [
  "overview",
  "content",
  "listings",
  "reviews",
  "fleet",
  "ai",
  "integrations",
  "users",
  "audit",
] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  content: "Content",
  listings: "Marketplace",
  reviews: "Reviews",
  fleet: "Fleet",
  ai: "AI Drafts",
  integrations: "Integrations",
  users: "Team",
  audit: "Audit Log",
};

export function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <h1 className="font-display text-2xl font-semibold text-forest-800 mb-1">
        Admin Portal
      </h1>
      <p className="text-sm text-earth-500 mb-6">
        Provider credentials, team access, and a full activity trail —
        everything you need to help a user when something goes wrong.
      </p>

      <div className="flex flex-wrap gap-x-1 gap-y-1.5 mb-6 border-b border-sand-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${
              tab === t
                ? "border-forest-600 text-forest-700"
                : "border-transparent text-earth-500 hover:text-earth-700"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewPanel />}
      {tab === "content" && <ContentPanel />}
      {tab === "listings" && <ListingsPanel />}
      {tab === "reviews" && <ReviewsPanel />}
      {tab === "fleet" && <FleetPanel />}
      {tab === "ai" && <AiDraftPanel />}
      {tab === "integrations" && <IntegrationsPanel />}
      {tab === "users" && <UsersPanel />}
      {tab === "audit" && <AuditLogPanel />}
    </div>
  );
}
