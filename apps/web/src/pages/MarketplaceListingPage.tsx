import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { MarketplaceListingDetail } from "../types";
import { AcaciaSilhouette } from "../components/AcaciaSilhouette";

export function MarketplaceListingPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const [showForm, setShowForm] = useState(false);
  const [sent, setSent] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace-listing", id],
    queryFn: () => api.get<MarketplaceListingDetail>(`/marketplace/templates/${id}`),
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [country, setCountry] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [preferredStart, setPreferredStart] = useState("");
  const [notes, setNotes] = useState("");

  const enquire = useMutation({
    mutationFn: () =>
      api.post(`/marketplace/templates/${id}/enquire`, {
        contactFullName: fullName,
        contactEmail: email,
        contactWhatsapp: whatsapp || undefined,
        contactCountry: country || undefined,
        partySize,
        preferredStart: preferredStart || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => setSent(true),
  });

  if (isLoading || !data)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sunset-50 to-acacia-50">
        <p className="text-sm text-stone-500">Loading…</p>
      </div>
    );

  const latest = data.versions[0];

  return (
    <div className="min-h-screen relative overflow-hidden py-10 px-4 bg-gradient-to-b from-sunset-50 via-clay-50 to-acacia-50">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[36rem] rounded-full bg-sunset-300/30 blur-3xl" aria-hidden />
      <AcaciaSilhouette className="hidden md:block absolute bottom-8 right-8 h-20 w-20 text-acacia-800/10 lg:h-28 lg:w-28" />

      <div className="relative max-w-2xl mx-auto bg-white rounded-2xl shadow-xl shadow-clay-900/10 border border-white overflow-hidden">
        <div className="bg-gradient-to-br from-clay-700 via-clay-700 to-acacia-800 text-white px-7 py-6">
          <p className="text-xs uppercase tracking-[0.15em] text-sunset-200">{data.organization.name} · {data.organization.country}</p>
          <h1 className="font-display text-2xl font-semibold mt-1">{data.title}</h1>
          <p className="text-sm text-white/80 mt-1">{data.summary}</p>
        </div>

        <div className="p-7 space-y-7">
          {latest?.days && latest.days.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold text-clay-800 mb-3">Itinerary</h2>
              <ol className="space-y-3 text-sm">
                {latest.days.map((d) => (
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

          {latest?.termsMarkdown && (
            <section className="text-xs text-stone-500 border-t border-stone-100 pt-5">
              <h3 className="font-medium text-stone-700 mb-1.5">Terms</h3>
              <p>{latest.termsMarkdown}</p>
            </section>
          )}

          {sent ? (
            <p className="text-center text-acacia-700 font-medium">
              🎉 Sent — {data.organization.name} will follow up with pricing and next steps.
            </p>
          ) : (
            <section className="border-t border-stone-200 pt-6">
              {!showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full bg-gradient-to-r from-acacia-600 to-acacia-700 hover:from-acacia-700 hover:to-acacia-800 text-white font-medium rounded-xl py-3.5 shadow-sm shadow-acacia-900/20 transition"
                >
                  Enquire about this trip
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input className="border border-stone-300 rounded-lg px-3 py-2 text-sm" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    <input className="border border-stone-300 rounded-lg px-3 py-2 text-sm" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <input className="border border-stone-300 rounded-lg px-3 py-2 text-sm" placeholder="WhatsApp (optional)" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                    <input className="border border-stone-300 rounded-lg px-3 py-2 text-sm" placeholder="Your country (optional)" value={country} onChange={(e) => setCountry(e.target.value)} />
                    <input
                      className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
                      type="number"
                      min={1}
                      placeholder="Party size"
                      value={partySize}
                      onChange={(e) => setPartySize(Number(e.target.value))}
                    />
                    <input
                      className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
                      type="date"
                      value={preferredStart}
                      onChange={(e) => setPreferredStart(e.target.value)}
                    />
                  </div>
                  <textarea
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Anything else you'd like us to know?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  {enquire.isError && <p className="text-xs text-red-600">{(enquire.error as Error).message}</p>}
                  <button
                    onClick={() => enquire.mutate()}
                    disabled={!fullName || !email || enquire.isPending}
                    className="w-full bg-gradient-to-r from-acacia-600 to-acacia-700 hover:from-acacia-700 hover:to-acacia-800 text-white font-medium rounded-xl py-3 shadow-sm shadow-acacia-900/20 transition disabled:opacity-50"
                  >
                    {enquire.isPending ? "Sending…" : "Send enquiry"}
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
