import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Quote } from "../types";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-stone-100 text-stone-700",
  PENDING_APPROVAL: "bg-sunset-100 text-sunset-700",
  APPROVED: "bg-blue-100 text-blue-800",
  SENT: "bg-purple-100 text-purple-800",
  ACCEPTED: "bg-acacia-100 text-acacia-800",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-800",
  EXPIRED: "bg-stone-200 text-stone-600",
  DECLINED: "bg-red-100 text-red-700",
};

export function QuoteCard({ quote, onChanged }: { quote: Quote; onChanged: () => void }) {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [showRevise, setShowRevise] = useState(false);
  const latest = quote.versions[quote.versions.length - 1];

  function invalidateAndNotify() {
    qc.invalidateQueries();
    onChanged();
  }

  const submitForApproval = useMutation({
    mutationFn: () => api.post(`/quotes/${quote.id}/submit-for-approval`),
    onSuccess: invalidateAndNotify,
  });

  const decide = useMutation({
    mutationFn: (decision: "APPROVED" | "REJECTED") => api.post(`/quotes/${quote.id}/decide`, { decision, reason }),
    onSuccess: invalidateAndNotify,
  });

  const send = useMutation({
    mutationFn: () => api.post(`/quotes/${quote.id}/send`),
    onSuccess: invalidateAndNotify,
  });

  const proposalUrl = quote.proposalLink ? `${window.location.origin}/proposal/${quote.proposalLink.token}` : null;

  return (
    <div className="border border-stone-200 rounded-xl p-4 shadow-sm shadow-clay-900/5">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[quote.status]}`}>{quote.status}</span>
        <p className="font-display text-lg font-semibold text-clay-800">
          {quote.currency} {Number(latest.totalPrice).toLocaleString()}
        </p>
      </div>

      <div className="text-xs text-stone-500 mb-3">
        Version {latest.versionNo} · created {new Date(latest.createdAt).toLocaleString()}
        {quote.proposalLink?.openedAt && (
          <span className="ml-2 text-sunset-700">Client opened it {new Date(quote.proposalLink.openedAt).toLocaleString()}</span>
        )}
        {quote.priceSnapshot && (
          <span className="ml-2 text-acacia-700 font-medium">Frozen at acceptance {new Date(quote.priceSnapshot.frozenAt).toLocaleString()}</span>
        )}
      </div>

      <details className="text-xs text-stone-600 mb-3">
        <summary className="cursor-pointer font-medium">Full internal breakdown ({latest.breakdown.costLines.length} lines)</summary>
        <table className="w-full mt-2 text-xs">
          <tbody>
            {latest.breakdown.costLines.map((l, i) => (
              <tr key={i} className="border-t border-stone-100">
                <td className="py-1">
                  {l.label} {l.internal && <span className="text-red-500">(internal)</span>}
                </td>
                <td className="py-1 text-right">
                  {l.quantity} × {l.unitCost} {l.currency}
                </td>
              </tr>
            ))}
            <tr className="border-t border-stone-200 font-medium">
              <td className="py-1">Markup ({latest.breakdown.markupPercent}%)</td>
              <td className="py-1 text-right">{latest.breakdown.markupAmount}</td>
            </tr>
            <tr>
              <td className="py-1">Tax ({latest.breakdown.taxPercent}%)</td>
              <td className="py-1 text-right">{latest.breakdown.taxAmount}</td>
            </tr>
            <tr>
              <td className="py-1">Commission ({latest.breakdown.commissionPercent}%, paid out of margin)</td>
              <td className="py-1 text-right">{latest.breakdown.commissionAmount}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-stone-400">
          Park fees as of: {latest.breakdown.feeSourcesAsOf.map((f) => `${f.label} (${new Date(f.asOfDate).toLocaleDateString()})`).join("; ")}
        </p>
      </details>

      {quote.approvals.length > 0 && (
        <div className="text-xs text-stone-500 mb-3">
          {quote.approvals.map((a) => (
            <p key={a.id}>
              {a.decision} — {new Date(a.createdAt).toLocaleString()} {a.reason && `("${a.reason}")`}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {quote.status === "DRAFT" && (
          <button
            onClick={() => submitForApproval.mutate()}
            className="text-xs font-medium bg-clay-600 hover:bg-clay-700 text-white rounded px-3 py-1.5"
          >
            Submit for approval
          </button>
        )}

        {quote.status === "PENDING_APPROVAL" && (
          <div className="flex items-center gap-2">
            <input
              placeholder="Reason (optional)"
              className="border border-stone-300 rounded px-2 py-1 text-xs"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {hasPermission("APPROVE_QUOTE") ? (
              <>
                <button onClick={() => decide.mutate("APPROVED")} className="text-xs font-medium bg-acacia-600 hover:bg-acacia-700 text-white rounded px-3 py-1.5">
                  Approve
                </button>
                <button onClick={() => decide.mutate("REJECTED")} className="text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded px-3 py-1.5">
                  Send back
                </button>
              </>
            ) : (
              <span className="text-xs text-stone-400">Waiting on a manager with approval rights (§3 dual control)</span>
            )}
          </div>
        )}

        {quote.status === "APPROVED" && (
          <button onClick={() => send.mutate()} className="text-xs font-medium bg-clay-600 hover:bg-clay-700 text-white rounded px-3 py-1.5">
            Send proposal to client
          </button>
        )}

        {quote.status === "CHANGES_REQUESTED" && !showRevise && (
          <button
            onClick={() => setShowRevise(true)}
            className="text-xs font-medium bg-orange-600 hover:bg-orange-700 text-white rounded px-3 py-1.5"
          >
            Revise & resubmit
          </button>
        )}

        {proposalUrl && (
          <>
            <a href={proposalUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline break-all">
              {proposalUrl}
            </a>
            <a
              href={`/api/proposals/${quote.proposalLink!.token}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-stone-500 underline"
            >
              PDF
            </a>
          </>
        )}
      </div>

      {showRevise && (
        <ReviseForm
          quoteId={quote.id}
          currency={quote.currency}
          breakdown={latest.breakdown}
          onDone={() => {
            setShowRevise(false);
            invalidateAndNotify();
          }}
          onCancel={() => setShowRevise(false)}
        />
      )}
    </div>
  );
}

// Pre-filled from the version the client pushed back on — park fee lines are
// left out since ParkFeeRule-derived lines are recomputed automatically from
// the quote's pinned template version; only the operator-entered supplier
// lines and pricing knobs need editing here (§4.7 negotiation loop:
// new -> quoted -> negotiating -> booked).
function ReviseForm({
  quoteId,
  currency,
  breakdown,
  onDone,
  onCancel,
}: {
  quoteId: string;
  currency: string;
  breakdown: Quote["versions"][number]["breakdown"];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [extraCostLines, setExtraCostLines] = useState(
    breakdown.costLines
      .filter((l) => l.category !== "PARK_FEE")
      .map((l) => ({ label: l.label, category: l.category, quantity: l.quantity, unitCost: l.unitCost, currency: l.currency, internal: l.internal })),
  );
  const [markupPercent, setMarkupPercent] = useState(breakdown.markupPercent);
  const [discountAmount, setDiscountAmount] = useState(breakdown.discountAmount);
  const [taxPercent, setTaxPercent] = useState(breakdown.taxPercent);
  const [commissionPercent, setCommissionPercent] = useState(breakdown.commissionPercent);

  const revise = useMutation({
    mutationFn: () =>
      api.post(`/quotes/${quoteId}/revise`, { extraCostLines, markupPercent, discountAmount, taxPercent, commissionPercent }),
    onSuccess: onDone,
  });

  function updateLine(idx: number, patch: Partial<(typeof extraCostLines)[number]>) {
    setExtraCostLines((lines) => lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  return (
    <div className="mt-4 border-t border-orange-200 pt-4 space-y-3 bg-orange-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl">
      <p className="text-xs font-medium text-orange-800">Revise this quote — park fees stay auto-calculated, edit the rest:</p>

      <div className="space-y-2">
        {extraCostLines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center text-xs border border-orange-100 sm:border-0 rounded-lg sm:rounded-none p-2 sm:p-0 bg-white sm:bg-transparent">
            <input
              className="col-span-2 sm:col-span-5 border border-stone-300 rounded px-2 py-1"
              value={line.label}
              onChange={(e) => updateLine(idx, { label: e.target.value })}
            />
            <input
              type="number"
              className="col-span-1 sm:col-span-2 border border-stone-300 rounded px-2 py-1"
              value={line.quantity}
              onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
              placeholder="Qty"
            />
            <input
              type="number"
              className="col-span-1 sm:col-span-2 border border-stone-300 rounded px-2 py-1"
              value={line.unitCost}
              onChange={(e) => updateLine(idx, { unitCost: Number(e.target.value) })}
              placeholder="Unit cost"
            />
            <label className="col-span-1 sm:col-span-2 flex items-center gap-1" title="Internal cost — never shown to the client">
              <input type="checkbox" checked={line.internal} onChange={(e) => updateLine(idx, { internal: e.target.checked })} />
              internal
            </label>
            <button className="col-span-1 text-red-500 text-left sm:text-center" onClick={() => setExtraCostLines((lines) => lines.filter((_, i) => i !== idx))}>
              ✕ remove
            </button>
          </div>
        ))}
        <button
          className="text-xs text-clay-700 hover:underline"
          onClick={() => setExtraCostLines((lines) => [...lines, { label: "", category: "OTHER", quantity: 1, unitCost: 0, currency, internal: false }])}
        >
          + Add cost line
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
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
      </div>

      {revise.isError && <p className="text-xs text-red-600">{(revise.error as Error).message}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => revise.mutate()}
          disabled={revise.isPending}
          className="text-xs font-medium bg-clay-600 hover:bg-clay-700 text-white rounded px-3 py-1.5 disabled:opacity-50"
        >
          {revise.isPending ? "Saving…" : "Save revision (back to draft)"}
        </button>
        <button onClick={onCancel} className="text-xs font-medium border border-stone-300 rounded px-3 py-1.5 hover:bg-stone-50">
          Cancel
        </button>
      </div>
    </div>
  );
}
