import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { AiItineraryDraft, AiDraftDay } from "../types";

const STATUS_COLORS: Record<string, string> = {
  DRAFTED: "bg-sunset-100 text-sunset-700",
  APPROVED: "bg-acacia-100 text-acacia-800",
  REJECTED: "bg-red-100 text-red-700",
};

const MEALS = ["BREAKFAST", "LUNCH", "DINNER"];

// §1.3 / §9's non-negotiable, made visible in the UI: nothing an AI drafts
// here becomes a real tour template until a human reviews it on this page
// and explicitly approves — the draft is editable right up to that point,
// never just an "accept AI's word for it" button.
export function AiDraftPanel() {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [durationDays, setDurationDays] = useState(4);

  const { data: drafts, isLoading } = useQuery({ queryKey: ["ai-itinerary-drafts"], queryFn: () => api.get<AiItineraryDraft[]>("/ai/itinerary-drafts") });

  const generate = useMutation({
    mutationFn: () => api.post<AiItineraryDraft>("/ai/itinerary-drafts", { prompt, durationDays }),
    onSuccess: () => {
      setPrompt("");
      qc.invalidateQueries({ queryKey: ["ai-itinerary-drafts"] });
    },
  });

  const pending = drafts?.filter((d) => d.status === "DRAFTED") ?? [];
  const decided = drafts?.filter((d) => d.status !== "DRAFTED") ?? [];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm shadow-clay-900/5 space-y-3">
        <p className="text-sm text-stone-500">
          Describe a trip and an AI will draft a day-by-day outline. Nothing is created until you review and approve it below — the AI
          never publishes anything on its own.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <textarea
            className="sm:col-span-3 border border-stone-300 rounded-lg px-3 py-2 text-sm"
            rows={2}
            placeholder="e.g. 5-day family trip covering Serengeti and Ngorongoro, relaxed pace, one lodge night at the crater rim"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div>
            <label className="block text-xs font-medium mb-1">Duration (days)</label>
            <input type="number" min={1} max={30} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))} />
          </div>
        </div>
        {generate.isError && <p className="text-xs text-red-600">{(generate.error as Error).message}</p>}
        <button
          onClick={() => generate.mutate()}
          disabled={!prompt || generate.isPending}
          className="bg-gradient-to-r from-clay-600 to-clay-700 hover:from-clay-700 hover:to-clay-800 text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm shadow-clay-900/10 transition disabled:opacity-50"
        >
          {generate.isPending ? "Drafting…" : "Generate draft"}
        </button>
      </div>

      {isLoading && <p className="text-sm text-stone-500">Loading…</p>}

      {pending.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Awaiting review</p>
          {pending.map((d) => (
            <DraftReviewCard key={d.id} draft={d} onDone={() => qc.invalidateQueries({ queryKey: ["ai-itinerary-drafts"] })} />
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <div>
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">History</p>
          <div className="bg-white border border-stone-200 rounded-xl divide-y shadow-sm shadow-clay-900/5 overflow-hidden">
            {decided.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{d.output.title}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[d.status]}`}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DraftReviewCard({ draft, onDone }: { draft: AiItineraryDraft; onDone: () => void }) {
  const [title, setTitle] = useState(draft.output.title);
  const [summary, setSummary] = useState(draft.output.summary);
  const [days, setDays] = useState<AiDraftDay[]>(draft.output.days);

  const approve = useMutation({
    mutationFn: () => api.post(`/ai/itinerary-drafts/${draft.id}/approve`, { title, summary, days }),
    onSuccess: onDone,
  });

  const reject = useMutation({
    mutationFn: () => api.post(`/ai/itinerary-drafts/${draft.id}/reject`),
    onSuccess: onDone,
  });

  function updateDay(idx: number, patch: Partial<AiDraftDay>) {
    setDays((ds) => ds.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }

  function toggleMeal(idx: number, meal: string) {
    setDays((ds) =>
      ds.map((d, i) => {
        if (i !== idx) return d;
        const has = d.mealsIncluded.includes(meal);
        return { ...d, mealsIncluded: has ? d.mealsIncluded.filter((m) => m !== meal) : [...d.mealsIncluded, meal] };
      }),
    );
  }

  return (
    <div className="border border-sunset-200 rounded-xl p-4 bg-sunset-50/40 space-y-3">
      <p className="text-xs text-stone-500">
        Model: {draft.model} · Brief: "{draft.prompt}"
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input className="border border-stone-300 rounded-lg px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <input className="border border-stone-300 rounded-lg px-3 py-2 text-sm" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summary" />
      </div>

      <div className="space-y-2">
        {days.map((d, i) => (
          <div key={i} className="border border-stone-200 bg-white rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-clay-700">Day {d.dayNumber}</div>
            <input className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm" value={d.title} onChange={(e) => updateDay(i, { title: e.target.value })} />
            <textarea className="w-full border border-stone-300 rounded px-2 py-1.5 text-xs" rows={2} value={d.description ?? ""} onChange={(e) => updateDay(i, { description: e.target.value })} />
            <div className="flex gap-3 text-xs">
              {MEALS.map((m) => (
                <label key={m} className="flex items-center gap-1">
                  <input type="checkbox" checked={d.mealsIncluded.includes(m)} onChange={() => toggleMeal(i, m)} />
                  {m}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {approve.isError && <p className="text-xs text-red-600">{(approve.error as Error).message}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => approve.mutate()}
          disabled={approve.isPending}
          className="text-sm font-medium bg-acacia-600 hover:bg-acacia-700 text-white rounded-lg px-4 py-2 disabled:opacity-50"
        >
          {approve.isPending ? "Creating…" : "Approve & create template"}
        </button>
        <button onClick={() => reject.mutate()} disabled={reject.isPending} className="text-sm font-medium border border-stone-300 rounded-lg px-4 py-2 hover:bg-stone-50">
          Reject
        </button>
      </div>
    </div>
  );
}
