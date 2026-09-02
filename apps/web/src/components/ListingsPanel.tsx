import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { TourTemplateSummary, Departure } from "../types";

// Phase 3 (§7) marketplace: which tour templates a prospective traveler can
// browse without an account, plus — §1.2's second buying mode — the fixed
// departures with seat-map checkout an operator can open for instant
// booking. Off by default per-template — see MarketplaceController for the
// public-facing side.
export function ListingsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["templates"], queryFn: () => api.get<TourTemplateSummary[]>("/products/tour-templates") });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = useMutation({
    mutationFn: ({ id, publiclyListed }: { id: string; publiclyListed: boolean }) => api.patch(`/products/tour-templates/${id}/listing`, { publiclyListed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">
        Templates listed here appear on the public marketplace (no login required) for anyone browsing safaris across Africa. Open a
        departure on a template to sell it as an instant, seat-map booking alongside the usual custom-quote flow.
      </p>
      {isLoading && <p className="text-sm text-stone-500">Loading…</p>}
      <div className="bg-white border border-stone-200 rounded-xl divide-y shadow-sm shadow-clay-900/5 overflow-hidden">
        {data?.map((t) => (
          <div key={t.id} className="px-5 py-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="font-medium text-sm">{t.title}</p>
                <p className="text-xs text-stone-500 mt-0.5">{t.durationDays} days · {t.summary}</p>
              </div>
              <div className="flex items-center gap-3 text-xs shrink-0">
                <button onClick={() => setExpandedId(expandedId === t.id ? null : t.id)} className="text-clay-700 hover:underline">
                  {expandedId === t.id ? "Hide departures" : "Departures"}
                </button>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={!!t.publiclyListed}
                    onChange={(e) => toggle.mutate({ id: t.id, publiclyListed: e.target.checked })}
                  />
                  Publicly listed
                </label>
              </div>
            </div>
            {expandedId === t.id && <DeparturesEditor templateId={t.id} />}
          </div>
        ))}
        {data?.length === 0 && <p className="px-5 py-8 text-center text-sm text-stone-400">No tour templates yet.</p>}
      </div>
    </div>
  );
}

function DeparturesEditor({ templateId }: { templateId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [departureDate, setDepartureDate] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [pricePerSeat, setPricePerSeat] = useState("");
  const [totalSeats, setTotalSeats] = useState(6);

  const { data: departures } = useQuery({
    queryKey: ["departures", templateId],
    queryFn: () => api.get<Departure[]>(`/products/tour-templates/${templateId}/departures`),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post(`/products/tour-templates/${templateId}/departures`, { departureDate, currency, pricePerSeat: Number(pricePerSeat), totalSeats }),
    onSuccess: () => {
      setPricePerSeat("");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["departures", templateId] });
    },
  });

  return (
    <div className="mt-3 border-t border-stone-100 pt-3 space-y-2">
      {departures?.length === 0 && <p className="text-xs text-stone-400">No departures opened yet.</p>}
      <ul className="text-xs space-y-1">
        {departures?.map((d) => {
          const booked = d.seats.filter((s) => s.status === "BOOKED").length;
          const held = d.seats.filter((s) => s.status === "HELD").length;
          return (
            <li key={d.id} className="flex items-center justify-between">
              <span>
                {new Date(d.departureDate).toLocaleDateString()} · {d.status}
              </span>
              <span className="tabular-nums text-stone-500">
                {booked} booked{held > 0 ? `, ${held} held` : ""} / {d.totalSeats} seats · {d.currency} {Number(d.pricePerSeat).toLocaleString()}/seat
              </span>
            </li>
          );
        })}
      </ul>

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="text-xs text-clay-700 hover:underline">
          + Open a departure
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-stone-50 rounded-lg p-3">
          <input type="date" className="border border-stone-300 rounded px-2 py-1.5" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
          <input className="border border-stone-300 rounded px-2 py-1.5" placeholder="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          <input type="number" className="border border-stone-300 rounded px-2 py-1.5" placeholder="Price/seat" value={pricePerSeat} onChange={(e) => setPricePerSeat(e.target.value)} />
          <input type="number" min={1} max={60} className="border border-stone-300 rounded px-2 py-1.5" placeholder="Total seats" value={totalSeats} onChange={(e) => setTotalSeats(Number(e.target.value))} />
          <div className="col-span-2 sm:col-span-4 flex gap-1.5">
            <button
              onClick={() => create.mutate()}
              disabled={!departureDate || !pricePerSeat || create.isPending}
              className="font-medium bg-clay-600 hover:bg-clay-700 text-white rounded px-3 py-1.5 disabled:opacity-50"
            >
              Save
            </button>
            <button onClick={() => setShowForm(false)} className="border border-stone-300 rounded px-3 py-1.5">
              Cancel
            </button>
          </div>
          {create.isError && <p className="col-span-2 sm:col-span-4 text-red-600">{(create.error as Error).message}</p>}
        </div>
      )}
    </div>
  );
}
