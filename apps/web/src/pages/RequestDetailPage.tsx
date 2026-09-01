import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { EnquiryRequestDetail, TourTemplateSummary, TourTemplateDetail, Quote } from "../types";
import { QuoteBuilder } from "../components/QuoteBuilder";
import { QuoteCard } from "../components/QuoteCard";

export function RequestDetailPage() {
  const { requestId } = useParams({ strict: false }) as { requestId: string };
  const qc = useQueryClient();

  const { data: request, isLoading } = useQuery({
    queryKey: ["request", requestId],
    queryFn: () => api.get<EnquiryRequestDetail>(`/crm/requests/${requestId}`),
  });

  const { data: templates } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.get<TourTemplateSummary[]>("/products/tour-templates"),
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { data: templateDetail } = useQuery({
    queryKey: ["template", selectedTemplateId],
    queryFn: () => api.get<TourTemplateDetail>(`/products/tour-templates/${selectedTemplateId}`),
    enabled: Boolean(selectedTemplateId),
  });

  const [showBuilder, setShowBuilder] = useState(false);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["request", requestId] });
  }

  if (isLoading || !request) return <p className="p-8 text-sm text-stone-500">Loading…</p>;

  const latestQuote: Quote | undefined = request.quotes[request.quotes.length - 1];
  const canDraftNewQuote = !latestQuote || ["ACCEPTED", "DECLINED", "EXPIRED"].includes(latestQuote.status);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <section className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm shadow-clay-900/5">
          <h1 className="font-display text-lg font-semibold text-clay-800">{request.contact.fullName}</h1>
          <p className="text-sm text-stone-500">
            {request.contact.email} {request.contact.whatsapp && `· WhatsApp ${request.contact.whatsapp}`}
          </p>
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <div>
              <p className="text-stone-400 text-xs">Party size</p>
              <p>{request.partySize}</p>
            </div>
            <div>
              <p className="text-stone-400 text-xs">Stage</p>
              <p>{request.stage}</p>
            </div>
            <div>
              <p className="text-stone-400 text-xs">Source</p>
              <p>{request.source}</p>
            </div>
          </div>
          {request.notes && <p className="text-sm mt-4 text-stone-700 italic">"{request.notes}"</p>}
        </section>

        <section className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm shadow-clay-900/5">
          <h2 className="font-display font-semibold text-clay-800 mb-3">Quotes</h2>
          {request.quotes.length === 0 && <p className="text-sm text-stone-400">No quote drafted yet.</p>}
          <div className="space-y-4">
            {request.quotes.map((q) => (
              <QuoteCard key={q.id} quote={q} onChanged={invalidate} />
            ))}
          </div>

          {canDraftNewQuote && (
            <div className="mt-5 border-t border-stone-100 pt-4">
              {!showBuilder ? (
                <button
                  onClick={() => setShowBuilder(true)}
                  className="text-sm font-medium text-clay-700 hover:underline"
                >
                  + Build a new quote
                </button>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-medium">Tour template</label>
                  <select
                    className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
                    value={selectedTemplateId ?? ""}
                    onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                  >
                    <option value="">Select a template…</option>
                    {templates?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.durationDays}d)
                      </option>
                    ))}
                  </select>

                  {templateDetail && (
                    <QuoteBuilder
                      requestId={request.id}
                      partySize={request.partySize}
                      template={templateDetail}
                      onCreated={() => {
                        setShowBuilder(false);
                        setSelectedTemplateId(null);
                        invalidate();
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <section className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm shadow-clay-900/5">
          <h2 className="font-display font-semibold text-clay-800 mb-3">Tasks</h2>
          <ul className="space-y-2 text-sm">
            {request.tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between">
                <span className={t.completedAt ? "line-through text-stone-400" : ""}>{t.title}</span>
                {t.dueAt && <span className="text-xs text-stone-400">{new Date(t.dueAt).toLocaleDateString()}</span>}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm shadow-clay-900/5">
          <h2 className="font-display font-semibold text-clay-800 mb-3">Activity</h2>
          <ul className="space-y-3 text-sm">
            {request.pipelineLog.map((p) => (
              <li key={p.id}>
                <p className="font-medium text-xs uppercase tracking-wide text-clay-700">{p.stage}</p>
                <p className="text-stone-600">{p.note}</p>
                <p className="text-xs text-stone-400">{new Date(p.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
