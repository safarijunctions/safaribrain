import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { PriceBreakdownDto, ItineraryDay } from "../types";
import { AcaciaSilhouette } from "../components/AcaciaSilhouette";

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

  if (isLoading || !data)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sunset-50 to-acacia-50">
        <p className="text-sm text-stone-500">Loading your proposal…</p>
      </div>
    );

  const { breakdown } = data;

  return (
    <div className="min-h-screen relative overflow-hidden py-10 px-4 bg-gradient-to-b from-sunset-50 via-clay-50 to-acacia-50">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[36rem] rounded-full bg-sunset-300/30 blur-3xl" aria-hidden />
      <AcaciaSilhouette className="hidden md:block absolute bottom-8 right-8 h-20 w-20 text-acacia-800/10 lg:h-28 lg:w-28" />

      <div className="relative max-w-2xl mx-auto bg-white rounded-2xl shadow-xl shadow-clay-900/10 border border-white overflow-hidden">
        <div className="bg-gradient-to-br from-clay-700 via-clay-700 to-acacia-800 text-white px-7 py-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-sunset-200">Safari Junction's Adventures</p>
            <h1 className="font-display text-2xl font-semibold mt-1">Your safari proposal</h1>
            <p className="text-sm text-white/80 mt-1">Prepared for {data.contactName}</p>
          </div>
          <a
            href={`/api/proposals/${token}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-xs font-medium bg-white/15 hover:bg-white/25 rounded-lg px-3 py-1.5 whitespace-nowrap transition"
          >
            Download PDF
          </a>
        </div>

        <div className="p-7 space-y-7">
          {data.itinerary && (
            <section>
              <h2 className="font-display text-lg font-semibold text-clay-800 mb-3">Itinerary</h2>
              <ol className="space-y-3 text-sm">
                {data.itinerary.days.map((d) => (
                  <li key={d.id} className="border-l-2 border-sunset-400 pl-3.5">
                    <p className="font-medium text-stone-800">
                      Day {d.dayNumber}: {d.title}
                    </p>
                    {d.place && <p className="text-acacia-700 text-xs font-medium">{d.place.name}</p>}
                    <p className="text-stone-400 text-xs">Meals: {d.mealsIncluded.join(", ") || "—"}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section>
            <h2 className="font-display text-lg font-semibold text-clay-800 mb-3">Price</h2>
            <table className="w-full text-sm">
              <tbody>
                {breakdown.costLines.map((l, i) => (
                  <tr key={i} className="border-t border-stone-100">
                    <td className="py-1.5">{l.label}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {l.currency} {(l.quantity * l.unitCost).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {breakdown.discountAmount > 0 && (
                  <tr className="border-t border-stone-100 text-acacia-700">
                    <td className="py-1.5">Discount</td>
                    <td className="py-1.5 text-right tabular-nums">-{breakdown.currency} {breakdown.discountAmount.toLocaleString()}</td>
                  </tr>
                )}
                {breakdown.taxAmount > 0 && (
                  <tr className="border-t border-stone-100">
                    <td className="py-1.5">Tax ({breakdown.taxPercent}%)</td>
                    <td className="py-1.5 text-right tabular-nums">{breakdown.currency} {breakdown.taxAmount.toLocaleString()}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-clay-200">
                  <td className="py-2.5 font-display font-semibold text-base text-clay-800">Total</td>
                  <td className="py-2.5 text-right font-display font-semibold text-base text-clay-800 tabular-nums">
                    {breakdown.currency} {breakdown.totalClientPrice.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            {breakdown.feeSourcesAsOf.length > 0 && (
              <p className="text-xs text-stone-400 mt-3">
                Park fees shown as of{" "}
                {breakdown.feeSourcesAsOf.map((f) => new Date(f.asOfDate).toLocaleDateString()).join(", ")} — official published rates,
                subject to change by the relevant park authority before booking is confirmed.
              </p>
            )}
            {data.isFrozen && (
              <p className="text-xs text-acacia-700 mt-2 font-medium flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-acacia-600" />
                This price is confirmed and locked in for your booking — it will not change.
              </p>
            )}
          </section>

          {data.itinerary?.termsMarkdown && (
            <section className="text-xs text-stone-500 border-t border-stone-100 pt-5">
              <h3 className="font-medium text-stone-700 mb-1.5">Terms</h3>
              <p>{data.itinerary.termsMarkdown}</p>
            </section>
          )}

          {data.status === "SENT" && !actionDone && (
            <section className="border-t border-stone-200 pt-6 space-y-3">
              <button
                onClick={() => accept.mutate()}
                disabled={accept.isPending}
                className="w-full bg-gradient-to-r from-acacia-600 to-acacia-700 hover:from-acacia-700 hover:to-acacia-800 text-white font-medium rounded-xl py-3.5 shadow-sm shadow-acacia-900/20 transition disabled:opacity-50"
              >
                {accept.isPending ? "Confirming…" : "Accept this proposal"}
              </button>
              <div className="flex gap-2">
                <input
                  placeholder="Tell us what you'd like changed…"
                  className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay-400 focus:border-transparent"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <button
                  onClick={() => requestChanges.mutate()}
                  disabled={requestChanges.isPending}
                  className="text-sm font-medium border border-stone-300 rounded-lg px-4 py-2 hover:bg-stone-50 transition"
                >
                  Request changes
                </button>
              </div>
            </section>
          )}

          {(data.status === "ACCEPTED" || actionDone === "accepted") && (
            <p className="text-center text-acacia-700 font-medium">🎉 Accepted — your safari expert will be in touch to confirm next steps.</p>
          )}
          {(data.status === "CHANGES_REQUESTED" || actionDone === "changes-requested") && (
            <p className="text-center text-sunset-700 font-medium">Thanks — we've flagged your changes to your safari expert.</p>
          )}
        </div>
      </div>
    </div>
  );
}
