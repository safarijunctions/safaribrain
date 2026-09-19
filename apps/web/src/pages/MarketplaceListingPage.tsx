import { useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { MarketplaceListingDetail, Departure, ReviewSummary } from "../types";
import { PublicHeader } from "../components/PublicHeader";
import { seatAvailability } from "../lib/seatStatus";

export function MarketplaceListingPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const [showForm, setShowForm] = useState(false);
  const [sent, setSent] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace-listing", id],
    queryFn: () =>
      api.get<MarketplaceListingDetail>(`/marketplace/templates/${id}`),
  });

  const { data: departures } = useQuery({
    queryKey: ["marketplace-departures", id],
    queryFn: () =>
      api.get<Departure[]>(`/marketplace/templates/${id}/departures`),
  });

  const { data: reviewSummary } = useQuery({
    queryKey: ["marketplace-reviews", id],
    queryFn: () =>
      api.get<ReviewSummary>(`/marketplace/templates/${id}/reviews`),
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
      <div className="min-h-screen bg-ivory">
        <PublicHeader />
        <p className="text-sm text-savannah-600 text-center py-20">Loading…</p>
      </div>
    );

  const latest = data.versions[0];

  return (
    <div className="min-h-screen bg-ivory">
      <PublicHeader />

      {/* Header band */}
      <div className="bg-earth-800 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <p className="text-xs tracking-widest2 uppercase text-brass-300 font-medium">
            {data.organization.name} · {data.organization.country}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl mt-2">
            {data.title}
          </h1>
          {data.summary && (
            <p className="text-white/70 mt-3 max-w-xl">{data.summary}</p>
          )}
          {reviewSummary && reviewSummary.count > 0 && (
            <p className="text-sm text-brass-200 mt-4">
              {"★".repeat(Math.round(reviewSummary.average ?? 0))}
              {"☆".repeat(5 - Math.round(reviewSummary.average ?? 0))}{" "}
              {reviewSummary.average?.toFixed(1)} ({reviewSummary.count} review
              {reviewSummary.count === 1 ? "" : "s"})
            </p>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {latest?.days && latest.days.length > 0 && (
          <section>
            <p className="text-xs tracking-widest2 uppercase text-savannah-600 font-medium mb-3">
              Day by day
            </p>
            <h2 className="font-display text-2xl text-forest-800 mb-5">
              Itinerary
            </h2>
            <ol className="space-y-4">
              {latest.days.map((d) => (
                <li key={d.id} className="border-l-2 border-brass-400 pl-4">
                  <p className="font-medium text-earth-800">
                    Day {d.dayNumber} — {d.title}
                  </p>
                  {d.place && (
                    <p className="text-savannah-600 text-xs font-medium mt-0.5">
                      {d.place.name}
                    </p>
                  )}
                  <p className="text-earth-400 text-xs mt-0.5">
                    Meals: {d.mealsIncluded.join(", ") || "—"}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {latest?.termsMarkdown && (
          <section className="text-sm text-earth-500 border-t border-sand-200 pt-8">
            <h3 className="font-medium text-earth-700 mb-2 text-xs tracking-widest2 uppercase">
              Terms
            </h3>
            <p>{latest.termsMarkdown}</p>
          </section>
        )}

        {reviewSummary && reviewSummary.reviews.length > 0 && (
          <section className="border-t border-sand-200 pt-8">
            <p className="text-xs tracking-widest2 uppercase text-savannah-600 font-medium mb-3">
              In their words
            </p>
            <h2 className="font-display text-2xl text-forest-800 mb-5">
              Traveler reviews
            </h2>
            <div className="space-y-5">
              {reviewSummary.reviews.map((r) => (
                <div
                  key={r.id}
                  className="border-b border-sand-100 pb-4 last:border-0"
                >
                  <p className="text-sm text-brass-500">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </p>
                  {r.title && (
                    <p className="text-sm font-medium text-earth-800 mt-1">
                      {r.title}
                    </p>
                  )}
                  {r.body && (
                    <p className="text-sm text-earth-500 mt-1">{r.body}</p>
                  )}
                  {r.operatorReply && (
                    <div className="bg-forest-50 p-3 text-xs text-earth-600 mt-2">
                      <p className="font-medium text-forest-700 mb-1">
                        Reply from {data.organization.name}
                      </p>
                      {r.operatorReply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {departures && departures.length > 0 && (
          <section className="border-t border-sand-200 pt-8">
            <p className="text-xs tracking-widest2 uppercase text-savannah-600 font-medium mb-3">
              Live · Instant booking
            </p>
            <h2 className="font-display text-2xl text-forest-800 mb-1">
              Choose your departure
            </h2>
            <p className="text-xs text-earth-400 mb-4">
              Fixed date, fixed price, instant seat reservation — no quote
              needed.
            </p>
            <div className="space-y-2">
              {departures.map((d) => {
                const available = d.seats.filter(
                  (s) => s.status === "AVAILABLE",
                ).length;
                const availability = seatAvailability(available, d.totalSeats);
                return (
                  <Link
                    key={d.id}
                    to="/marketplace/departures/$departureId"
                    params={{ departureId: d.id }}
                    className="flex items-center justify-between border border-sand-200 hover:border-forest-400 transition px-4 py-3.5"
                  >
                    <span className="font-medium text-earth-800 text-sm">
                      {new Date(d.departureDate).toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${availability.dot}`}
                        />
                        <span className={availability.text}>
                          {available} of {d.totalSeats} seats
                        </span>
                      </span>
                      <span className="text-earth-500">
                        {d.currency} {Number(d.pricePerSeat).toLocaleString()}
                        /seat
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {sent ? (
          <p className="text-center text-forest-700 font-medium border-t border-sand-200 pt-8">
            Sent — {data.organization.name} will follow up with pricing and next
            steps.
          </p>
        ) : (
          <section className="border-t border-sand-200 pt-8">
            {departures && departures.length > 0 && (
              <p className="text-xs text-earth-400 mb-3">
                Prefer a custom date, group size, or a tweaked itinerary? Send
                an enquiry instead:
              </p>
            )}
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full bg-forest-700 hover:bg-forest-800 text-white font-medium tracking-wide uppercase text-sm rounded-sm py-3.5 transition"
              >
                Enquire about this trip
              </button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    className="border border-sand-300 px-3 py-2 text-sm"
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <input
                    className="border border-sand-300 px-3 py-2 text-sm"
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input
                    className="border border-sand-300 px-3 py-2 text-sm"
                    placeholder="WhatsApp (optional)"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
                  <input
                    className="border border-sand-300 px-3 py-2 text-sm"
                    placeholder="Your country (optional)"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                  <input
                    className="border border-sand-300 px-3 py-2 text-sm"
                    type="number"
                    min={1}
                    placeholder="Party size"
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                  />
                  <input
                    className="border border-sand-300 px-3 py-2 text-sm"
                    type="date"
                    value={preferredStart}
                    onChange={(e) => setPreferredStart(e.target.value)}
                  />
                </div>
                <textarea
                  className="w-full border border-sand-300 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Anything else you'd like us to know?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                {enquire.isError && (
                  <p className="text-xs text-status-full">
                    {(enquire.error as Error).message}
                  </p>
                )}
                <button
                  onClick={() => enquire.mutate()}
                  disabled={!fullName || !email || enquire.isPending}
                  className="w-full bg-forest-700 hover:bg-forest-800 text-white font-medium tracking-wide uppercase text-sm rounded-sm py-3 transition disabled:opacity-50"
                >
                  {enquire.isPending ? "Sending…" : "Send enquiry"}
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
