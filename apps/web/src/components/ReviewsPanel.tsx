import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { ModerationReview } from "../types";

const TABS = ["PENDING", "PUBLISHED", "REJECTED"] as const;

// §7 Phase 3 gate: "post-trip review invite and moderation" — every
// review starts PENDING (BookingsService.markCompleted unlocks
// submission, ReviewsService.submitByToken writes it) and only appears
// on the public marketplace once published here.
export function ReviewsPanel() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("PENDING");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["review-queue", tab],
    queryFn: () => api.get<ModerationReview[]>(`/admin/reviews?status=${tab}`),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["review-queue"] });
  }

  const moderate = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "PUBLISH" | "REJECT" }) => api.post(`/admin/reviews/${id}/moderate`, { decision }),
    onSuccess: invalidate,
  });

  const reply = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => api.post(`/admin/reviews/${id}/reply`, { text }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-stone-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px ${tab === t ? "border-forest-600 text-forest-700" : "border-transparent text-stone-500 hover:text-stone-700"}`}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-stone-500">Loading…</p>}
      {(moderate.isError || reply.isError) && (
        <p className="text-sm text-red-600">{((moderate.error ?? reply.error) as Error).message}</p>
      )}

      <div className="space-y-3">
        {data?.map((r) => (
          <div key={r.id} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm shadow-forest-900/5 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-medium text-stone-800">
                  {r.reviewerName} · {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                </p>
                <p className="text-xs text-stone-400">{r.tourTemplate?.title ?? "—"} · {new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
              {tab === "PENDING" && (
                <div className="flex gap-2 text-xs">
                  <button onClick={() => moderate.mutate({ id: r.id, decision: "PUBLISH" })} className="bg-moss-600 hover:bg-moss-700 text-white rounded px-3 py-1.5 font-medium">
                    Publish
                  </button>
                  <button onClick={() => moderate.mutate({ id: r.id, decision: "REJECT" })} className="border border-stone-300 rounded px-3 py-1.5">
                    Reject
                  </button>
                </div>
              )}
            </div>
            {r.title && <p className="text-sm font-medium text-stone-700">{r.title}</p>}
            {r.body && <p className="text-sm text-stone-600">{r.body}</p>}

            {tab === "PUBLISHED" && (
              <div className="flex gap-2 pt-1">
                <input
                  className="flex-1 border border-stone-300 rounded px-2 py-1.5 text-xs"
                  placeholder="Reply as the operator (shown publicly)…"
                  value={replyDrafts[r.id] ?? ""}
                  onChange={(e) => setReplyDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                />
                <button
                  onClick={() => reply.mutate({ id: r.id, text: replyDrafts[r.id] ?? "" })}
                  disabled={!replyDrafts[r.id] || reply.isPending}
                  className="text-xs font-medium bg-forest-600 hover:bg-forest-700 text-white rounded px-3 py-1.5 disabled:opacity-50"
                >
                  Reply
                </button>
              </div>
            )}
          </div>
        ))}
        {data?.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No {tab.toLowerCase()} reviews.</p>}
      </div>
    </div>
  );
}
