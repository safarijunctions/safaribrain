import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";

interface JarvisTurn {
  role: "user" | "assistant";
  content: string;
}

// Floating read-only assistant, available from anywhere inside the
// authenticated app shell. It can only look things up (CRM/bookings/
// dashboard, via the API's tool-use loop) — it has no write path, so
// there's nothing here that needs approval or confirmation before it runs.
export function JarvisWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<JarvisTurn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (messages: JarvisTurn[]) => api.post<{ reply: string; model: string }>("/ai/jarvis/message", { messages }),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, ask.isPending]);

  function send() {
    const text = input.trim();
    if (!text || ask.isPending) return;
    const next = [...turns, { role: "user" as const, content: text }];
    setTurns(next);
    setInput("");
    ask.mutate(next, {
      onSuccess: (res) => setTurns((t) => [...t, { role: "assistant", content: res.reply }]),
      onError: (err) =>
        setTurns((t) => [
          ...t,
          {
            role: "assistant",
            content: err instanceof ApiError ? err.message : "Something went wrong reaching Jarvis.",
          },
        ]),
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-gradient-to-r from-clay-600 to-clay-700 hover:from-clay-700 hover:to-clay-800 text-white text-sm font-medium rounded-full pl-3 pr-4 py-2.5 shadow-lg shadow-clay-900/20 transition"
      >
        <span aria-hidden className="text-base">✦</span>
        Jarvis
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 w-[22rem] max-w-[calc(100vw-2.5rem)] h-[28rem] max-h-[calc(100vh-4rem)] bg-white border border-stone-200 rounded-xl shadow-2xl shadow-clay-900/20 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between bg-gradient-to-r from-clay-800 via-clay-700 to-acacia-800 text-white px-4 py-3 shrink-0">
        <div>
          <p className="font-display font-semibold text-sm leading-tight">Jarvis</p>
          <p className="text-[11px] text-white/70 leading-tight">Read-only — asks, never acts</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-lg leading-none" aria-label="Close">
          ×
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-stone-50">
        {turns.length === 0 && (
          <p className="text-xs text-stone-500 px-1">
            Ask about enquiries, quotes, or bookings — e.g. "what's the status of Laura Bennett's enquiry" or "how many
            quotes are pending approval". Jarvis can only look things up, not change anything.
          </p>
        )}
        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                t.role === "user" ? "bg-clay-700 text-white" : "bg-white border border-stone-200 text-stone-800"
              }`}
            >
              {t.content}
            </div>
          </div>
        ))}
        {ask.isPending && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-400">Thinking…</div>
          </div>
        )}
      </div>

      <div className="border-t border-stone-200 p-2 flex gap-2 shrink-0">
        <input
          className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Ask Jarvis…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || ask.isPending}
          className="bg-clay-700 hover:bg-clay-800 text-white text-sm font-medium rounded-lg px-3 py-2 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
