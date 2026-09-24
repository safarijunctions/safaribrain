import { useState, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ConversationSummary, Message, TradeOrganization } from "../types";

// Org-to-org messaging (§6 Trade) — deliberately B2B only, not
// traveler-facing (travelers have no platform account anywhere in this
// system). An operator, guide, agent, or vehicle owner messaging another
// organization they trade with.
export function MessagesPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [startingWith, setStartingWith] = useState<string | null>(null);
  const { data: conversations, refetch } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get<ConversationSummary[]>("/messaging/conversations"),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <p className="text-[11px] tracking-widest2 uppercase text-savannah-600 font-medium mb-2">
        Trade network
      </p>
      <h1 className="font-display text-3xl text-forest-800 mb-1">Messages</h1>
      <p className="text-sm text-earth-500 mb-8">
        Talk directly with the operators, guides, agents, and vehicle owners you
        trade with.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-sand-200">
        <div className="sm:col-span-1 bg-white border-b sm:border-b-0 sm:border-r border-sand-200">
          <div className="px-4 py-3 border-b border-sand-100 flex items-center justify-between">
            <p className="text-xs tracking-widest2 uppercase text-savannah-600 font-medium">
              Conversations
            </p>
            <button
              onClick={() => setStartingWith("new")}
              className="text-xs tracking-wide uppercase font-medium text-forest-700 hover:text-forest-800"
            >
              + New
            </button>
          </div>
          {startingWith === "new" && (
            <NewConversation
              onStarted={(id) => {
                setActiveId(id);
                setStartingWith(null);
                refetch();
              }}
              onCancel={() => setStartingWith(null)}
            />
          )}
          <ul className="divide-y divide-sand-100 max-h-[28rem] overflow-y-auto">
            {conversations?.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-sand-50 transition ${activeId === c.id ? "bg-sand-100" : ""}`}
                >
                  <p className="font-medium text-forest-800">
                    {c.counterpart.name}
                  </p>
                  <p className="text-xs text-earth-500 truncate">
                    {c.lastMessage?.body ?? "No messages yet"}
                  </p>
                </button>
              </li>
            ))}
            {conversations?.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-savannah-500">
                No conversations yet.
              </li>
            )}
          </ul>
        </div>

        <div className="sm:col-span-2 bg-ivory flex flex-col h-[32rem]">
          {activeId ? (
            <ConversationThread conversationId={activeId} />
          ) : (
            <p className="m-auto text-sm text-savannah-500">
              Select a conversation.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function NewConversation({
  onStarted,
  onCancel,
}: {
  onStarted: (id: string) => void;
  onCancel: () => void;
}) {
  const { data: directory } = useQuery({
    queryKey: ["trade-directory"],
    queryFn: () => api.get<TradeOrganization[]>("/trade/organizations"),
  });
  const [counterpartOrganizationId, setCounterpartOrganizationId] =
    useState("");
  const [body, setBody] = useState("");

  const start = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>("/messaging/conversations", {
        counterpartOrganizationId,
        body,
      }),
    onSuccess: (conv) => onStarted(conv.id),
  });

  return (
    <div className="px-4 py-3 border-b border-sand-100 space-y-2 text-xs bg-sand-50">
      <select
        className="w-full border border-sand-300 px-2 py-1.5"
        value={counterpartOrganizationId}
        onChange={(e) => setCounterpartOrganizationId(e.target.value)}
      >
        <option value="">Select an organization…</option>
        {directory?.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} ({o.kind}, {o.country})
          </option>
        ))}
      </select>
      <textarea
        className="w-full border border-sand-300 px-2 py-1.5"
        placeholder="Say hello…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex gap-1.5">
        <button
          disabled={!counterpartOrganizationId || !body || start.isPending}
          onClick={() => start.mutate()}
          className="text-xs tracking-wide uppercase font-medium bg-forest-700 hover:bg-forest-800 text-white px-3 py-1.5 disabled:opacity-50"
        >
          Send
        </button>
        <button
          onClick={onCancel}
          className="text-xs tracking-wide uppercase font-medium border border-sand-300 px-3 py-1.5"
        >
          Cancel
        </button>
      </div>
      {start.isError && (
        <p className="text-status-full">{(start.error as Error).message}</p>
      )}
    </div>
  );
}

function ConversationThread({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const { data: messages } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () =>
      api.get<Message[]>(`/messaging/conversations/${conversationId}/messages`),
    refetchInterval: 5000,
  });

  const send = useMutation({
    mutationFn: () =>
      api.post(`/messaging/conversations/${conversationId}/messages`, { body }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (body.trim()) send.mutate();
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages?.map((m) => {
          const mine = m.senderOrganizationId === user?.organizationId;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-3 py-2 text-sm ${mine ? "bg-forest-700 text-white" : "bg-white border border-sand-200 text-earth-800"}`}
              >
                {m.body}
                <div
                  className={`text-[10px] mt-0.5 ${mine ? "text-white/60" : "text-earth-400"}`}
                >
                  {new Date(m.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={onSubmit}
        className="border-t border-sand-200 p-2.5 flex gap-2"
      >
        <input
          className="flex-1 border border-sand-300 px-3 py-2 text-sm"
          placeholder="Type a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button
          type="submit"
          disabled={!body.trim() || send.isPending}
          className="text-xs tracking-wide uppercase font-medium bg-forest-700 hover:bg-forest-800 text-white px-4 py-2 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </>
  );
}
