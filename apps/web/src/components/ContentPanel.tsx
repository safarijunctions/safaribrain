import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Place } from "../types";

const KINDS = ["NATIONAL_PARK", "CONSERVATION_AREA", "TOWN", "BEACH", "LAKE", "MOUNTAIN", "CULTURAL_SITE", "OTHER"] as const;
const RESIDENCY = ["NON_RESIDENT", "RESIDENT", "EAST_AFRICAN"] as const;
const AGE_BANDS = ["ADULT", "CHILD", "INFANT"] as const;
const UNITS = ["PER_PERSON_PER_DAY", "PER_PERSON_PER_ENTRY", "PER_VEHICLE_PER_ENTRY"] as const;

// The pan-African content scope raised mid-build (§1.7: "every national
// park, attraction, and destination across Africa, not just well-known
// ones") is a content-ops effort, not a schema change — Place.country is
// already free text. This panel is the piece that was actually missing:
// somewhere an admin can add a park in Kenya, Uganda, Rwanda, or anywhere
// else without an engineer running a seed script.
export function ContentPanel() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("MANAGE_CONTENT");
  const canPublishFee = hasPermission("PUBLISH_FEE");
  const [countryFilter, setCountryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: countries } = useQuery({ queryKey: ["content-countries"], queryFn: () => api.get<string[]>("/content/places/countries") });
  const { data: places, isLoading } = useQuery({
    queryKey: ["places", countryFilter],
    queryFn: () => api.get<Place[]>(`/content/places${countryFilter ? `?country=${encodeURIComponent(countryFilter)}` : ""}`),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/content/places/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["places"] }),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["places"] });
    qc.invalidateQueries({ queryKey: ["content-countries"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-stone-500">Country</label>
          <select className="border border-stone-300 rounded px-2 py-1.5 text-sm" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
            <option value="">All ({places?.length ?? 0})</option>
            {countries?.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="bg-gradient-to-r from-clay-600 to-clay-700 hover:from-clay-700 hover:to-clay-800 text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm shadow-clay-900/10 transition"
          >
            {showForm ? "Close" : "+ Add place"}
          </button>
        )}
      </div>

      {showForm && canManage && <PlaceForm onSaved={() => { setShowForm(false); invalidate(); }} />}

      {isLoading && <p className="text-sm text-stone-500">Loading…</p>}

      <div className="bg-white border border-stone-200 rounded-xl divide-y shadow-sm shadow-clay-900/5 overflow-hidden">
        {places?.map((p) => (
          <div key={p.id} className="px-5 py-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="font-medium text-sm">
                  {p.name} <span className="text-xs text-stone-400">({p.country} · {p.kind.replace(/_/g, " ")})</span>
                </p>
                <p className="text-xs text-stone-500 mt-0.5">{p.feeRules.length} fee rule{p.feeRules.length === 1 ? "" : "s"}</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="text-clay-700 hover:underline">
                  {expandedId === p.id ? "Hide fee rules" : "Fee rules"}
                </button>
                {canManage && (
                  <button onClick={() => remove.mutate(p.id)} className="text-red-500 hover:underline">
                    Remove
                  </button>
                )}
              </div>
            </div>
            {expandedId === p.id && <FeeRulesEditor place={p} canEdit={canPublishFee} onChanged={invalidate} />}
          </div>
        ))}
        {places?.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-stone-400">
            No places in the catalog yet{countryFilter ? ` for ${countryFilter}` : ""}. {canManage && "Add the first one above."}
          </p>
        )}
      </div>
    </div>
  );
}

function PlaceForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [kind, setKind] = useState<string>(KINDS[0]);
  const [description, setDescription] = useState("");

  const save = useMutation({
    mutationFn: () => api.post("/content/places", { name, country: country.toUpperCase(), kind, description: description || undefined }),
    onSuccess: onSaved,
  });

  return (
    <div className="border border-stone-200 rounded-xl p-4 bg-clay-50/40 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Name</label>
          <input className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maasai Mara National Reserve" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Country (ISO code)</label>
          <input className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="KE" maxLength={2} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Kind</label>
          <select className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Description (optional)</label>
        <textarea className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {save.isError && <p className="text-xs text-red-600">{(save.error as Error).message}</p>}
      <button
        onClick={() => save.mutate()}
        disabled={!name || country.length !== 2 || save.isPending}
        className="bg-gradient-to-r from-clay-600 to-clay-700 hover:from-clay-700 hover:to-clay-800 text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm shadow-clay-900/10 transition disabled:opacity-50"
      >
        {save.isPending ? "Saving…" : "Save place"}
      </button>
    </div>
  );
}

function FeeRulesEditor({ place, canEdit, onChanged }: { place: Place; canEdit: boolean; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [residency, setResidency] = useState<string>(RESIDENCY[0]);
  const [ageBand, setAgeBand] = useState<string>(AGE_BANDS[0]);
  const [unit, setUnit] = useState<string>(UNITS[0]);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceAsOf, setSourceAsOf] = useState(new Date().toISOString().slice(0, 10));

  const add = useMutation({
    mutationFn: () =>
      api.post(`/content/places/${place.id}/fee-rules`, {
        label,
        residency,
        ageBand,
        unit,
        amount: Number(amount),
        currency,
        sourceUrl: sourceUrl || undefined,
        sourceAsOf,
      }),
    onSuccess: () => {
      setLabel("");
      setAmount("");
      setShowForm(false);
      onChanged();
    },
  });

  const remove = useMutation({
    mutationFn: (ruleId: string) => api.delete(`/content/places/${place.id}/fee-rules/${ruleId}`),
    onSuccess: onChanged,
  });

  return (
    <div className="mt-3 border-t border-stone-100 pt-3 space-y-2">
      {place.feeRules.length === 0 && <p className="text-xs text-stone-400">No fee rules yet.</p>}
      <ul className="text-xs space-y-1">
        {place.feeRules.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2">
            <span>
              {r.label} · {r.residency} {r.ageBand && `/ ${r.ageBand}`} · as of {new Date(r.sourceAsOf).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="tabular-nums">
                {r.currency} {Number(r.amount).toLocaleString()}
              </span>
              {canEdit && (
                <button onClick={() => remove.mutate(r.id)} className="text-red-500 hover:underline">
                  ✕
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      {canEdit &&
        (!showForm ? (
          <button onClick={() => setShowForm(true)} className="text-xs text-clay-700 hover:underline">
            + Add fee rule
          </button>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-stone-50 rounded-lg p-3">
            <input className="sm:col-span-2 border border-stone-300 rounded px-2 py-1.5" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
            <select className="border border-stone-300 rounded px-2 py-1.5" value={residency} onChange={(e) => setResidency(e.target.value)}>
              {RESIDENCY.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <select className="border border-stone-300 rounded px-2 py-1.5" value={ageBand} onChange={(e) => setAgeBand(e.target.value)}>
              {AGE_BANDS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select className="sm:col-span-2 border border-stone-300 rounded px-2 py-1.5" value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <input type="number" className="border border-stone-300 rounded px-2 py-1.5" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input className="border border-stone-300 rounded px-2 py-1.5" placeholder="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            <input className="sm:col-span-2 border border-stone-300 rounded px-2 py-1.5" placeholder="Source URL (optional)" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
            <input type="date" className="border border-stone-300 rounded px-2 py-1.5" value={sourceAsOf} onChange={(e) => setSourceAsOf(e.target.value)} />
            <div className="sm:col-span-4 flex gap-1.5">
              <button
                onClick={() => add.mutate()}
                disabled={!label || !amount || add.isPending}
                className="font-medium bg-clay-600 hover:bg-clay-700 text-white rounded px-3 py-1.5 disabled:opacity-50"
              >
                Save
              </button>
              <button onClick={() => setShowForm(false)} className="border border-stone-300 rounded px-3 py-1.5">
                Cancel
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
