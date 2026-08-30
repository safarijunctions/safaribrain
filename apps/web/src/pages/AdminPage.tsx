import { useState } from "react";
import { IntegrationsPanel } from "../components/IntegrationsPanel";
import { UsersPanel } from "../components/UsersPanel";

export function AdminPage() {
  const [tab, setTab] = useState<"integrations" | "users">("integrations");

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold mb-1">Admin Portal</h1>
      <p className="text-sm text-stone-500 mb-6">
        Provider credentials and team access — add real payment, messaging, and AI keys here once you're ready to go live.
      </p>

      <div className="flex gap-1 mb-6 border-b border-stone-200">
        {(["integrations", "users"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t ? "border-savanna-600 text-savanna-700" : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {t === "integrations" ? "Integrations" : "Team"}
          </button>
        ))}
      </div>

      {tab === "integrations" ? <IntegrationsPanel /> : <UsersPanel />}
    </div>
  );
}
