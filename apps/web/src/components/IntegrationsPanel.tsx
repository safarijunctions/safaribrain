import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Integration } from "../types";

// Mirrors IntegrationProvider in packages/shared/src/enums.ts — kept as a
// plain string list rather than a runtime import from @safaribrain/shared,
// same as LeadSourceChannel/RequestStage elsewhere in this app: the shared
// package builds to CommonJS, which Vite's dev server can't reliably
// interop as a live-reloading ESM import.
const PROVIDERS = [
  "STRIPE",
  "MPESA",
  "TIGO_PESA",
  "AIRTEL_MONEY",
  "MTN_MOMO",
  "BANK_TRANSFER",
  "WHATSAPP_BUSINESS",
  "SMS",
  "EMAIL_SMTP",
  "LLM_PROVIDER",
] as const;

const PROVIDER_LABELS: Record<string, string> = {
  STRIPE: "Stripe (international cards)",
  MPESA: "M-Pesa",
  TIGO_PESA: "Tigo Pesa",
  AIRTEL_MONEY: "Airtel Money",
  MTN_MOMO: "MTN Mobile Money",
  BANK_TRANSFER: "Manual bank transfer",
  WHATSAPP_BUSINESS: "WhatsApp Business API",
  SMS: "SMS gateway",
  EMAIL_SMTP: "Email (SMTP)",
  LLM_PROVIDER: "AI / LLM provider",
};

type KV = { key: string; value: string };

export function IntegrationsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["integrations"], queryFn: () => api.get<Integration[]>("/admin/integrations") });
  const [showForm, setShowForm] = useState(false);

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => api.patch(`/admin/integrations/${id}/enabled`, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/integrations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const configured = new Set(data?.map((i) => i.provider));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-stone-500">
          {data?.length ?? 0} provider{data?.length === 1 ? "" : "s"} configured. Secret keys are never shown again once saved.
        </p>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-gradient-to-r from-clay-600 to-clay-700 hover:from-clay-700 hover:to-clay-800 text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm shadow-clay-900/10 transition"
        >
          {showForm ? "Close" : "+ Add provider"}
        </button>
      </div>

      {showForm && (
        <IntegrationForm
          existingProviders={configured}
          onSaved={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ["integrations"] });
          }}
        />
      )}

      {isLoading && <p className="text-sm text-stone-500">Loading…</p>}

      <div className="bg-white border border-stone-200 rounded-xl divide-y shadow-sm shadow-clay-900/5 overflow-hidden">
        {data?.map((i) => (
          <div key={i.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-medium text-sm">
                {i.displayName} <span className="text-xs text-stone-400">({PROVIDER_LABELS[i.provider] ?? i.provider})</span>
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                {i.category} · {i.secretsConfigured ? `${i.secretKeys.length} secret(s) set` : "no secrets set yet"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={i.enabled} onChange={(e) => toggle.mutate({ id: i.id, enabled: e.target.checked })} />
                Enabled
              </label>
              <button onClick={() => remove.mutate(i.id)} className="text-xs text-red-500 hover:underline">
                Remove
              </button>
            </div>
          </div>
        ))}
        {data?.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-stone-400">
            No providers configured yet — the app works fully without them; add one whenever you're ready to go live with real payments,
            WhatsApp, or AI features.
          </p>
        )}
      </div>
    </div>
  );
}

function IntegrationForm({ onSaved, existingProviders }: { onSaved: () => void; existingProviders: Set<string> }) {
  const providers = PROVIDERS;
  const [provider, setProvider] = useState<string>(providers[0]);
  const [displayName, setDisplayName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [configFields, setConfigFields] = useState<KV[]>([{ key: "", value: "" }]);
  const [secretFields, setSecretFields] = useState<KV[]>([{ key: "", value: "" }]);

  const save = useMutation({
    mutationFn: () =>
      api.post("/admin/integrations", {
        provider,
        displayName: displayName || (PROVIDER_LABELS[provider] ?? provider),
        enabled,
        config: Object.fromEntries(configFields.filter((f) => f.key).map((f) => [f.key, f.value])),
        secrets: Object.fromEntries(secretFields.filter((f) => f.key).map((f) => [f.key, f.value])),
      }),
    onSuccess: onSaved,
  });

  function kvRows(fields: KV[], setFields: (f: KV[]) => void, valueType: "text" | "password") {
    return (
      <div className="space-y-2">
        {fields.map((f, i) => (
          <div key={i} className="flex gap-2">
            <input
              placeholder="key, e.g. secretKey"
              className="flex-1 border border-stone-300 rounded px-2 py-1.5 text-xs"
              value={f.key}
              onChange={(e) => setFields(fields.map((x, idx) => (idx === i ? { ...x, key: e.target.value } : x)))}
            />
            <input
              placeholder="value"
              type={valueType}
              className="flex-1 border border-stone-300 rounded px-2 py-1.5 text-xs"
              value={f.value}
              onChange={(e) => setFields(fields.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))}
            />
            <button className="text-xs text-red-500" onClick={() => setFields(fields.filter((_, idx) => idx !== i))}>
              ✕
            </button>
          </div>
        ))}
        <button className="text-xs text-clay-700 hover:underline" onClick={() => setFields([...fields, { key: "", value: "" }])}>
          + Add field
        </button>
      </div>
    );
  }

  return (
    <div className="border border-stone-200 rounded-xl p-4 bg-clay-50/40 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Provider</label>
          <select className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm" value={provider} onChange={(e) => setProvider(e.target.value)}>
            {providers.map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p] ?? p} {existingProviders.has(p) ? "(already added — will update)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Display name</label>
          <input
            className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm"
            placeholder={PROVIDER_LABELS[provider] ?? provider}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium mb-2">Non-secret config (account IDs, phone numbers, from-address…)</p>
        {kvRows(configFields, setConfigFields, "text")}
      </div>

      <div>
        <p className="text-xs font-medium mb-2">Secrets (API keys, tokens — never shown again after saving)</p>
        {kvRows(secretFields, setSecretFields, "password")}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Enabled
      </label>

      {save.isError && <p className="text-xs text-red-600">{(save.error as Error).message}</p>}

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="bg-gradient-to-r from-clay-600 to-clay-700 hover:from-clay-700 hover:to-clay-800 text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm shadow-clay-900/10 transition disabled:opacity-50"
      >
        {save.isPending ? "Saving…" : "Save provider"}
      </button>
    </div>
  );
}
