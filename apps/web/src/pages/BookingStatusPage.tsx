import { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { PublicBooking } from "../types";
import { AcaciaSilhouette } from "../components/AcaciaSilhouette";

const STARS = [1, 2, 3, 4, 5];

// §8: "essential itinerary/contacts/vouchers/tickets/maps cached for
// offline use... never imply a payment or seat is confirmed while
// offline." The service worker (public/sw.js) makes a previously-opened
// booking page load transparently from cache with no network — this hook
// is what tells the UI it's happening, so it can label the state rather
// than silently show possibly-stale data as if it were live.
function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
  return online;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Awaiting confirmation",
  CONFIRMED: "Confirmed — balance due",
  PAID: "Fully paid",
  ACTIVE: "Trip in progress",
  COMPLETED: "Trip completed",
  CANCELLED: "Cancelled",
};

export function BookingStatusPage() {
  const { token } = useParams({ strict: false }) as { token: string };
  const qc = useQueryClient();
  const online = useOnlineStatus();

  const { data, isLoading } = useQuery({
    queryKey: ["booking-public", token],
    queryFn: () => api.get<PublicBooking>(`/bookings/public/${token}`),
  });

  if (isLoading || !data)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brass-50 to-moss-50">
        <p className="text-sm text-earth-500">
          {online
            ? "Loading your booking…"
            : "You're offline, and this page hasn't been saved for offline use yet."}
        </p>
      </div>
    );

  const ticketReady = ["PAID", "ACTIVE", "COMPLETED"].includes(data.status);

  return (
    <div className="min-h-screen relative overflow-hidden py-10 px-4 bg-gradient-to-b from-brass-50 via-forest-50 to-moss-50">
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[36rem] rounded-full bg-brass-300/30 blur-3xl"
        aria-hidden
      />
      <AcaciaSilhouette className="hidden md:block absolute bottom-8 right-8 h-20 w-20 text-moss-800/10 lg:h-28 lg:w-28" />

      <div className="relative max-w-2xl mx-auto bg-white rounded-2xl shadow-xl shadow-forest-900/10 border border-white overflow-hidden">
        {!online && (
          <div className="bg-brass-100 text-brass-800 text-xs font-medium text-center py-2 px-4">
            You're offline — showing the last saved copy of this page. Payments
            and reviews need a connection to go through.
          </div>
        )}
        <div className="bg-gradient-to-br from-forest-700 via-forest-700 to-moss-800 text-white px-7 py-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-brass-200">
              Safari Junction's Adventures
            </p>
            <h1 className="font-display text-2xl font-semibold mt-1">
              Your booking
            </h1>
            <p className="text-sm text-white/80 mt-1">
              Prepared for {data.contactName}
            </p>
          </div>
          <span className="shrink-0 text-xs font-medium bg-white/15 rounded-lg px-3 py-1.5 whitespace-nowrap">
            {STATUS_LABELS[data.status] ?? data.status}
          </span>
        </div>

        <div className="p-7 space-y-7">
          {data.itinerary && (
            <section>
              <h2 className="font-display text-lg font-semibold text-forest-800 mb-3">
                Itinerary
              </h2>
              <ol className="space-y-3 text-sm">
                {data.itinerary.days.map((d) => (
                  <li
                    key={d.dayNumber}
                    className="border-l-2 border-brass-400 pl-3.5"
                  >
                    <p className="font-medium text-earth-800">
                      Day {d.dayNumber}: {d.title}
                    </p>
                    {d.place && (
                      <p className="text-moss-700 text-xs font-medium">
                        {d.place.name}
                      </p>
                    )}
                    <p className="text-earth-400 text-xs">
                      Meals: {d.mealsIncluded.join(", ") || "—"}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {data.travelers.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold text-forest-800 mb-3">
                Travelers
              </h2>
              <ul className="text-sm space-y-1">
                {data.travelers.map((t, i) => (
                  <li key={i}>{t.fullName}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="font-display text-lg font-semibold text-forest-800 mb-3">
              Payment
            </h2>
            <table className="w-full text-sm">
              <tbody>
                {data.payments.map((p, i) => (
                  <tr key={i} className="border-t border-sand-100">
                    <td className="py-1.5">
                      {p.method.replace(/_/g, " ")} ·{" "}
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {data.currency} {Number(p.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-forest-200">
                  <td className="py-2.5 font-display font-semibold text-base text-forest-800">
                    Total
                  </td>
                  <td className="py-2.5 text-right font-display font-semibold text-base text-forest-800 tabular-nums">
                    {data.currency} {Number(data.totalPrice).toLocaleString()}
                  </td>
                </tr>
                {data.balanceDue > 0 && (
                  <tr>
                    <td className="py-1 text-brass-700">Balance due</td>
                    <td className="py-1 text-right tabular-nums text-brass-700">
                      {data.currency} {data.balanceDue.toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {data.termsMarkdown && (
            <section className="text-xs text-earth-500 border-t border-sand-100 pt-5">
              <h3 className="font-medium text-earth-700 mb-1.5">Terms</h3>
              <p>{data.termsMarkdown}</p>
            </section>
          )}

          {data.status === "COMPLETED" && (
            <section className="border-t border-sand-200 pt-6">
              <h2 className="font-display text-lg font-semibold text-forest-800 mb-3">
                How was your trip?
              </h2>
              {data.review ? (
                <div className="space-y-2">
                  <p className="text-sm text-brass-600">
                    {"★".repeat(data.review.rating)}
                    {"☆".repeat(5 - data.review.rating)}
                  </p>
                  {data.review.title && (
                    <p className="text-sm font-medium text-earth-800">
                      {data.review.title}
                    </p>
                  )}
                  {data.review.body && (
                    <p className="text-sm text-earth-600">{data.review.body}</p>
                  )}
                  {data.review.status === "PENDING" && (
                    <p className="text-xs text-earth-400">
                      Thanks — your review is awaiting a quick check before it
                      goes live.
                    </p>
                  )}
                  {data.review.operatorReply && (
                    <div className="bg-forest-50 rounded-lg p-3 text-xs text-earth-600">
                      <p className="font-medium text-forest-700 mb-1">
                        Reply from Safari Junction's Adventures
                      </p>
                      {data.review.operatorReply}
                    </div>
                  )}
                </div>
              ) : online ? (
                <ReviewForm
                  token={token}
                  onSubmitted={() =>
                    qc.invalidateQueries({
                      queryKey: ["booking-public", token],
                    })
                  }
                />
              ) : (
                <p className="text-xs text-earth-400">
                  You'll be able to leave a review once you're back online.
                </p>
              )}
            </section>
          )}

          <section className="flex flex-wrap gap-3 text-sm border-t border-sand-200 pt-6">
            <a
              href={
                online ? `/api/bookings/public/${token}/receipt.pdf` : undefined
              }
              target="_blank"
              rel="noreferrer"
              aria-disabled={!online}
              title={online ? undefined : "Downloads need a connection"}
              className={`flex-1 text-center font-medium rounded-xl py-3 shadow-sm transition ${
                online
                  ? "bg-gradient-to-r from-forest-600 to-forest-700 hover:from-forest-700 hover:to-forest-800 text-white shadow-forest-900/20"
                  : "bg-sand-200 text-earth-400 cursor-not-allowed pointer-events-none"
              }`}
            >
              Download receipt
            </a>
            {ticketReady && (
              <a
                href={
                  online
                    ? `/api/bookings/public/${token}/eticket.pdf`
                    : undefined
                }
                target="_blank"
                rel="noreferrer"
                aria-disabled={!online}
                title={online ? undefined : "Downloads need a connection"}
                className={`flex-1 text-center font-medium rounded-xl py-3 shadow-sm transition ${
                  online
                    ? "bg-gradient-to-r from-moss-600 to-moss-700 hover:from-moss-700 hover:to-moss-800 text-white shadow-moss-900/20"
                    : "bg-sand-200 text-earth-400 cursor-not-allowed pointer-events-none"
                }`}
              >
                Download e-ticket
              </a>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ReviewForm({
  token,
  onSubmitted,
}: {
  token: string;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      api.post(`/bookings/public/${token}/review`, {
        rating,
        title: title || undefined,
        body: body || undefined,
      }),
    onSuccess: onSubmitted,
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-1 text-2xl">
        {STARS.map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            className={n <= rating ? "text-brass-500" : "text-sand-300"}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
      </div>
      <input
        className="w-full border border-sand-300 rounded-lg px-3 py-2 text-sm"
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="w-full border border-sand-300 rounded-lg px-3 py-2 text-sm"
        rows={3}
        placeholder="Tell other travelers about your trip…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {submit.isError && (
        <p className="text-xs text-status-full">
          {(submit.error as Error).message}
        </p>
      )}
      <button
        onClick={() => submit.mutate()}
        disabled={rating === 0 || submit.isPending}
        className="w-full bg-gradient-to-r from-brass-500 to-brass-600 hover:from-brass-600 hover:to-brass-700 text-white font-medium rounded-xl py-3 shadow-sm shadow-brass-900/20 transition disabled:opacity-50"
      >
        {submit.isPending ? "Sending…" : "Submit review"}
      </button>
    </div>
  );
}
