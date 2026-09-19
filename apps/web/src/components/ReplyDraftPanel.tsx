import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { ReplyDraftJob } from "../types";

// §1.3 / §9's non-negotiable, same as AiDraftPanel: nothing an AI drafts
// here reaches the client until a human reviews and edits it —"Approve &
// copy" records exactly the text in this box, never the AI's raw output,
// and there's no automatic send since no messaging integration is live yet.
export function ReplyDraftPanel({ requestId }: { requestId: string }) {
  const qc = useQueryClient();
  const [editText, setEditText] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: drafts, isLoading } = useQuery({
    queryKey: ["reply-drafts", requestId],
    queryFn: () =>
      api.get<ReplyDraftJob[]>(`/ai/reply-drafts?requestId=${requestId}`),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["reply-drafts", requestId] });
  }

  const generate = useMutation({
    mutationFn: () =>
      api.post<ReplyDraftJob>("/ai/reply-drafts", { requestId }),
    onSuccess: invalidate,
  });

  const approve = useMutation({
    mutationFn: ({ id, replyText }: { id: string; replyText: string }) =>
      api.post(`/ai/reply-drafts/${id}/approve`, { replyText }),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: (id: string) => api.post(`/ai/reply-drafts/${id}/reject`),
    onSuccess: invalidate,
  });

  async function copyAndApprove(job: ReplyDraftJob) {
    const text = editText[job.id] ?? job.output.replyText;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(job.id);
      setTimeout(() => setCopiedId((c) => (c === job.id ? null : c)), 2000);
    } catch {
      // clipboard access can fail (permissions, non-secure context) — approval still proceeds
    }
    approve.mutate({ id: job.id, replyText: text });
  }

  const pending = drafts?.filter((d) => d.status === "DRAFTED") ?? [];
  const decided = drafts?.filter((d) => d.status !== "DRAFTED") ?? [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-earth-500">
        Draft a first-reply message with AI, edit it, then approve to copy it
        and log it on this enquiry's activity trail.
      </p>
      <button
        onClick={() => generate.mutate()}
        disabled={generate.isPending}
        className="text-xs font-medium border border-forest-300 text-forest-700 hover:bg-forest-50 rounded px-3 py-1.5 disabled:opacity-50"
      >
        {generate.isPending ? "Drafting…" : "Draft AI reply"}
      </button>
      {generate.isError && (
        <p className="text-xs text-status-full">
          {(generate.error as Error).message}
        </p>
      )}

      {isLoading && <p className="text-xs text-earth-400">Loading…</p>}

      {pending.map((job) => (
        <div
          key={job.id}
          className="border border-brass-200 bg-brass-50/50 p-3 space-y-2"
        >
          <textarea
            className="w-full border border-sand-300 rounded px-2 py-1.5 text-xs"
            rows={6}
            value={editText[job.id] ?? job.output.replyText}
            onChange={(e) =>
              setEditText((d) => ({ ...d, [job.id]: e.target.value }))
            }
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => copyAndApprove(job)}
              disabled={approve.isPending}
              className="text-xs font-medium bg-forest-600 hover:bg-forest-700 text-white rounded px-3 py-1.5 disabled:opacity-50"
            >
              {copiedId === job.id ? "Copied!" : "Approve & copy"}
            </button>
            <button
              onClick={() => reject.mutate(job.id)}
              disabled={reject.isPending}
              className="text-xs border border-sand-300 rounded px-3 py-1.5"
            >
              Discard
            </button>
          </div>
        </div>
      ))}

      {decided.length > 0 && (
        <details className="text-xs text-earth-500">
          <summary className="cursor-pointer">
            {decided.length} past draft{decided.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-2 space-y-2">
            {decided.map((job) => (
              <li
                key={job.id}
                className={
                  job.status === "REJECTED" ? "line-through text-earth-400" : ""
                }
              >
                {job.output.replyText.slice(0, 120)}
                {job.output.replyText.length > 120 ? "…" : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
