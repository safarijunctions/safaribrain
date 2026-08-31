import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { PriceBreakdownDto, ItineraryDay } from "../types";

interface ProposalResponse {
  status: string;
  contactName: string;
  itinerary?: { termsMarkdown?: string; days: ItineraryDay[] };
  breakdown: PriceBreakdownDto;
  isFrozen: boolean;
}

export function ProposalPage() {
  const { token } = useParams({ strict: false }) as { token: string };
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [actionDone, setActionDone] = useState<"accepted" | "changes-requested" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["proposal", token],
    queryFn: () => api.get<ProposalResponse>(`/proposals/${token}`),
  });

  const accept = useMutation({
    mutationFn: () => api.post(`/proposals/${token}/accept`),
    onSuccess: () => {
      setActionDone("accepted");
      qc.invalidateQueries({ queryKey: ["proposal", token] });
    },
  });

  const requestChanges = useMutation({
    mutationFn: () => api.post(`/proposals/${token}/request-changes`, { note }),
    onSuccess: () => {
      setActionDone("changes-requested");
      qc.invalidateQueries({ queryKey: ["proposal", token] });
    },
  });

  if (isLoading || !data) return <p className="p-8 text-center text-sm text-stone-500">Loading your proposal…</p>;

  const { breakdown } = data;

  return (
    <div className="min-h-screen bg-savanna-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-savanna-700 text-white px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide opacity-80">Safari Junction's Adventures</p>
            <h1 className="text-xl font-semibold">Your safari proposal</h1>
            <p className="text-sm opacity-90 mt-1">Prepared for {data.contactName}</p>
          </div>
          <a
            href={`/api/proposals/${token}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-xs font-medium bg-white/10 hover:bg-white/20 rounded px-3 py-1.5 whitespace-nowrap"
          >
            Download PDF
          </a>
        </div>

        <div className="p-6 space-y-6">
          {data.itinerary && (
            <section>
              <h2 className="font-medium mb-2">Itinerary</h2>
              <ol className="space-y-2 text-sm">
                {data.itinerary.days.map((d) => (
                  <li key={d.id} className="border-l-2 border-savanna-200 pl-3">
                    <p className="font-medium">
                      Day {d.dayNumber}: {d.title}
                    </p>
                    {d.place && <p className="text-stone-500 text-xs">{d.place.name}</p>}
                    <p className="text-stone-400 text-xs">Meals: {d.mealsIncluded.join(", ") || "—"}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section>
            <h2 className="font-medium mb-2">Price</h2>
            <table className="w-full text-sm">
              <tbody>
                {breakdown.costLines.map((l, i) => (
                  <tr key={i} className="border-t border-stone-100">
                    <td className="py-1.5">{l.label}</td>
                    <td className="py-1.5 text-right">
                      {l.currency} {(l.quantity * l.unitCost).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {breakdown.discountAmount > 0 && (
                  <tr className="border-t border-stone-100 text-green-700">
                    <td className="py-1.5">Discount</td>
                    <td className="py-1.5 text-right">-{breakdown.currency} {breakdown.discountAmount.toLocaleString()}</td>
                  </tr>
                )}
                {breakdown.taxAmount > 0 && (
                  <tr className="border-t border-stone-100">
                    <td className="py-1.5">Tax ({breakdown.taxPercent}%)</td>
                    <td className="py-1.5 text-right">{breakdown.currency} {breakdown.taxAmount.toLocaleString()}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-stone-300 font-semibold text-base">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right">
                    {breakdown.currency} {breakdown.totalClientPrice.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            {breakdown.feeSourcesAsOf.length > 0 && (
              <p className="text-xs text-stone-400 mt-2">
                Park fees shown as of{" "}
                {breakdown.feeSourcesAsOf.map((f) => new Date(f.asOfDate).toLocaleDateString()).join(", ")} — official published rates,
                subject to change by the relevant park authority before booking is confirmed.
              </p>
            )}
            {data.isFrozen && (
              <p className="text-xs text-green-700 mt-2 font-medium">
                This price is confirmed and locked in for your booking — it will not change.
              </p>
            )}
          </section>

          {data.itinerary?.termsMarkdown && (
            <section className="text-xs text-stone-500 border-t border-stone-100 pt-4">
              <h3 className="font-medium text-stone-700 mb-1">Terms</h3>
              <p>{data.itinerary.termsMarkdown}</p>
            </section>
          )}

          {data.status === "SENT" && !actionDone && (
            <section className="border-t border-stone-200 pt-5 space-y-3">
              <button
                onClick={() => accept.mutate()}
                disabled={accept.isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium rounded py-3 disabled:opacity-50"
              >
                {accept.isPending ? "Confirming…" : "Accept this proposal"}
              </button>
              <div className="flex gap-2">
                <input
                  placeholder="Tell us what you'd like changed…"
                  className="flex-1 border border-stone-300 rounded px-3 py-2 text-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <button
                  onClick={() => requestChanges.mutate()}
                  disabled={requestChanges.isPending}
                  className="text-sm font-medium border border-stone-300 rounded px-4 py-2 hover:bg-stone-50"
                >
                  Request changes
                </button>
              </div>
            </section>
          )}

          {(data.status === "ACCEPTED" || actionDone === "accepted") && (
            <p className="text-center text-green-700 font-medium">🎉 Accepted — your safari expert will be in touch to confirm next steps.</p>
          )}
          {(data.status === "CHANGES_REQUESTED" || actionDone === "changes-requested") && (
            <p className="text-center text-orange-700 font-medium">Thanks — we've flagged your changes to your safari expert.</p>
          )}
        </div>
      </div>
    </div>
  );
}
