import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Quote } from "../types";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-stone-100 text-stone-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  SENT: "bg-purple-100 text-purple-800",
  ACCEPTED: "bg-green-100 text-green-800",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-800",
  EXPIRED: "bg-stone-200 text-stone-600",
  DECLINED: "bg-red-100 text-red-700",
};

export function QuoteCard({ quote, onChanged }: { quote: Quote; onChanged: () => void }) {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
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
    <div className="border border-stone-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[quote.status]}`}>{quote.status}</span>
        <p className="text-lg font-semibold">
          {quote.currency} {Number(latest.totalPrice).toLocaleString()}
        </p>
      </div>

      <div className="text-xs text-stone-500 mb-3">
        Version {latest.versionNo} · created {new Date(latest.createdAt).toLocaleString()}
        {quote.priceSnapshot && (
          <span className="ml-2 text-green-700 font-medium">Frozen at acceptance {new Date(quote.priceSnapshot.frozenAt).toLocaleString()}</span>
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
              <td className="py-1">Commission (paid out of margin)</td>
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
            className="text-xs font-medium bg-savanna-600 hover:bg-savanna-700 text-white rounded px-3 py-1.5"
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
                <button onClick={() => decide.mutate("APPROVED")} className="text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1.5">
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
          <button onClick={() => send.mutate()} className="text-xs font-medium bg-savanna-600 hover:bg-savanna-700 text-white rounded px-3 py-1.5">
            Send proposal to client
          </button>
        )}

        {proposalUrl && (
          <a href={proposalUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline break-all">
            {proposalUrl}
          </a>
        )}
      </div>
    </div>
  );
}
