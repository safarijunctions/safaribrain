import { useState, FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api } from "../lib/api";
import { EnquiryRequestSummary } from "../types";

const STAGE_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  QUOTED: "bg-sunset-100 text-sunset-700",
  NEGOTIATING: "bg-purple-100 text-purple-800",
  BOOKED: "bg-acacia-100 text-acacia-800",
  COMPLETED: "bg-stone-200 text-stone-700",
  LOST: "bg-red-100 text-red-800",
};

export function CrmInboxPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["requests"],
    queryFn: () => api.get<EnquiryRequestSummary[]>("/crm/requests"),
  });
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-clay-800">Enquiry inbox</h1>
          <p className="text-sm text-stone-500">One deduplicated contact and request per enquiry, from any channel.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="self-start sm:self-auto bg-gradient-to-r from-clay-600 to-clay-700 hover:from-clay-700 hover:to-clay-800 text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm shadow-clay-900/10 transition"
        >
          {showForm ? "Close" : "+ New enquiry"}
        </button>
      </div>

      {showForm && <NewEnquiryForm onCreated={() => setShowForm(false)} />}

      {isLoading && <p className="text-sm text-stone-500">Loading…</p>}

      <div className="bg-white border border-stone-200 rounded-xl divide-y shadow-sm shadow-clay-900/5 overflow-hidden">
        {data?.map((r) => (
          <Link
            key={r.id}
            to="/crm/$requestId"
            params={{ requestId: r.id }}
            className="flex items-center justify-between px-5 py-4 hover:bg-clay-50/50 transition"
          >
            <div>
              <p className="font-medium">{r.contact.fullName}</p>
              <p className="text-xs text-stone-500">
                {r.source} · {r.partySize} pax · {new Date(r.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${STAGE_COLORS[r.stage] ?? "bg-stone-100"}`}>
              {r.stage}
            </span>
          </Link>
        ))}
        {data?.length === 0 && <p className="px-5 py-8 text-center text-sm text-stone-400">No enquiries yet.</p>}
      </div>
    </div>
  );
}

function NewEnquiryForm({ onCreated }: { onCreated: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    contactFullName: "",
    contactEmail: "",
    contactWhatsapp: "",
    partySize: 2,
    source: "WHATSAPP",
    notes: "",
  });

  const create = useMutation({
    mutationFn: () => api.post("/crm/requests", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requests"] });
      onCreated();
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  return (
    <form onSubmit={submit} className="bg-white border border-stone-200 rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-sm shadow-clay-900/5">
      <div>
        <label className="block text-xs font-medium mb-1">Full name</label>
        <input
          required
          className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
          value={form.contactFullName}
          onChange={(e) => setForm({ ...form, contactFullName: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Email</label>
        <input
          required
          type="email"
          className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
          value={form.contactEmail}
          onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">WhatsApp</label>
        <input
          className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
          value={form.contactWhatsapp}
          onChange={(e) => setForm({ ...form, contactWhatsapp: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Party size</label>
        <input
          type="number"
          min={1}
          className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
          value={form.partySize}
          onChange={(e) => setForm({ ...form, partySize: Number(e.target.value) })}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Source</label>
        <select
          className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
        >
          {["WEB", "WHATSAPP", "EMAIL", "PHONE", "REFERRAL", "WALK_IN"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium mb-1">Notes</label>
        <textarea
          className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={create.isPending}
          className="bg-gradient-to-r from-clay-600 to-clay-700 hover:from-clay-700 hover:to-clay-800 text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm shadow-clay-900/10 transition disabled:opacity-50"
        >
          {create.isPending ? "Creating…" : "Create enquiry"}
        </button>
      </div>
    </form>
  );
}
