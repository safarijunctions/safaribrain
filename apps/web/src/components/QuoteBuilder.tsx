import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { TourTemplateDetail } from "../types";

interface CostLineForm {
  label: string;
  category: "PARK_FEE" | "ACCOMMODATION" | "TRANSPORT" | "ACTIVITY" | "OTHER";
  quantity: number;
  unitCost: number;
  currency: string;
  internal: boolean;
}

export function QuoteBuilder({
  requestId,
  partySize,
  template,
  onCreated,
}: {
  requestId: string;
  partySize: number;
  template: TourTemplateDetail;
  onCreated: () => void;
}) {
  const [currency, setCurrency] = useState("USD");
  const [residency, setResidency] = useState("NON_RESIDENT");
  const [markupPercent, setMarkupPercent] = useState(20);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(18);
  const [commissionPercent, setCommissionPercent] = useState(10);
  const [costLines, setCostLines] = useState<CostLineForm[]>([
    { label: "4x4 vehicle + driver-guide", category: "TRANSPORT", quantity: template.durationDays, unitCost: 250, currency: "USD", internal: false },
    { label: "Lodge accommodation (net rate)", category: "ACCOMMODATION", quantity: Math.max(template.durationDays - 1, 1), unitCost: 300, currency: "USD", internal: true },
  ]);

  const create = useMutation({
    mutationFn: () =>
      api.post("/quotes", {
        requestId,
        tourTemplateId: template.id,
        currency,
        residency,
        extraCostLines: costLines,
        markupPercent,
        discountAmount,
        taxPercent,
        commissionPercent,
      }),
    onSuccess: onCreated,
  });

  function updateLine(idx: number, patch: Partial<CostLineForm>) {
    setCostLines((lines) => lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  return (
    <div className="border border-stone-200 rounded-lg p-4 bg-stone-50 space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-1">{template.title}</h3>
        <ol className="text-xs text-stone-500 list-decimal list-inside">
          {template.versions[0]?.days.map((d) => (
            <li key={d.id}>
              Day {d.dayNumber}: {d.title} {d.place ? `— ${d.place.name}` : ""} (park fees applied automatically)
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block font-medium mb-1">Currency</label>
          <input className="w-full border border-stone-300 rounded px-2 py-1" value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </div>
        <div>
          <label className="block font-medium mb-1">Residency</label>
          <select className="w-full border border-stone-300 rounded px-2 py-1" value={residency} onChange={(e) => setResidency(e.target.value)}>
            <option value="NON_RESIDENT">Non-resident</option>
            <option value="RESIDENT">Resident</option>
            <option value="EAST_AFRICAN">East African</option>
          </select>
        </div>
        <div>
          <label className="block font-medium mb-1">Markup %</label>
          <input type="number" className="w-full border border-stone-300 rounded px-2 py-1" value={markupPercent} onChange={(e) => setMarkupPercent(Number(e.target.value))} />
        </div>
        <div>
          <label className="block font-medium mb-1">Tax %</label>
          <input type="number" className="w-full border border-stone-300 rounded px-2 py-1" value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))} />
        </div>
        <div>
          <label className="block font-medium mb-1">Discount ({currency})</label>
          <input type="number" className="w-full border border-stone-300 rounded px-2 py-1" value={discountAmount} onChange={(e) => setDiscountAmount(Number(e.target.value))} />
        </div>
        <div>
          <label className="block font-medium mb-1">Commission %</label>
          <input type="number" className="w-full border border-stone-300 rounded px-2 py-1" value={commissionPercent} onChange={(e) => setCommissionPercent(Number(e.target.value))} />
        </div>
        <div>
          <label className="block font-medium mb-1">Party size</label>
          <input disabled className="w-full border border-stone-200 bg-stone-100 rounded px-2 py-1" value={partySize} />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium mb-2">Supplier cost lines (park fees are added automatically from the itinerary)</p>
        <div className="space-y-2">
          {costLines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
              <input
                className="col-span-4 border border-stone-300 rounded px-2 py-1"
                value={line.label}
                onChange={(e) => updateLine(idx, { label: e.target.value })}
              />
              <select
                className="col-span-2 border border-stone-300 rounded px-2 py-1"
                value={line.category}
                onChange={(e) => updateLine(idx, { category: e.target.value as CostLineForm["category"] })}
              >
                {["ACCOMMODATION", "TRANSPORT", "ACTIVITY", "OTHER"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="col-span-2 border border-stone-300 rounded px-2 py-1"
                value={line.quantity}
                onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
                placeholder="Qty"
              />
              <input
                type="number"
                className="col-span-2 border border-stone-300 rounded px-2 py-1"
                value={line.unitCost}
                onChange={(e) => updateLine(idx, { unitCost: Number(e.target.value) })}
                placeholder="Unit cost"
              />
              <label className="col-span-1 flex items-center gap-1" title="Internal cost — never shown to the client">
                <input type="checkbox" checked={line.internal} onChange={(e) => updateLine(idx, { internal: e.target.checked })} />
                internal
              </label>
              <button
                className="col-span-1 text-red-500 hover:underline"
                onClick={() => setCostLines((lines) => lines.filter((_, i) => i !== idx))}
              >
                remove
              </button>
            </div>
          ))}
        </div>
        <button
          className="mt-2 text-xs text-savanna-700 hover:underline"
          onClick={() =>
            setCostLines((lines) => [...lines, { label: "", category: "OTHER", quantity: 1, unitCost: 0, currency, internal: false }])
          }
        >
          + Add cost line
        </button>
      </div>

      {create.isError && <p className="text-xs text-red-600">{(create.error as Error).message}</p>}

      <button
        onClick={() => create.mutate()}
        disabled={create.isPending}
        className="bg-savanna-600 hover:bg-savanna-700 text-white text-sm font-medium rounded px-4 py-2 disabled:opacity-50"
      >
        {create.isPending ? "Pricing…" : "Create quote draft"}
      </button>
    </div>
  );
}
