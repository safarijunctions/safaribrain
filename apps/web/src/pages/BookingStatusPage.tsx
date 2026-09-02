import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { PublicBooking } from "../types";
import { AcaciaSilhouette } from "../components/AcaciaSilhouette";

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

  const { data, isLoading } = useQuery({
    queryKey: ["booking-public", token],
    queryFn: () => api.get<PublicBooking>(`/bookings/public/${token}`),
  });

  if (isLoading || !data)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sunset-50 to-acacia-50">
        <p className="text-sm text-stone-500">Loading your booking…</p>
      </div>
    );

  const ticketReady = ["PAID", "ACTIVE", "COMPLETED"].includes(data.status);

  return (
    <div className="min-h-screen relative overflow-hidden py-10 px-4 bg-gradient-to-b from-sunset-50 via-clay-50 to-acacia-50">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[36rem] rounded-full bg-sunset-300/30 blur-3xl" aria-hidden />
      <AcaciaSilhouette className="hidden md:block absolute bottom-8 right-8 h-20 w-20 text-acacia-800/10 lg:h-28 lg:w-28" />

      <div className="relative max-w-2xl mx-auto bg-white rounded-2xl shadow-xl shadow-clay-900/10 border border-white overflow-hidden">
        <div className="bg-gradient-to-br from-clay-700 via-clay-700 to-acacia-800 text-white px-7 py-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-sunset-200">Safari Junction's Adventures</p>
            <h1 className="font-display text-2xl font-semibold mt-1">Your booking</h1>
            <p className="text-sm text-white/80 mt-1">Prepared for {data.contactName}</p>
          </div>
          <span className="shrink-0 text-xs font-medium bg-white/15 rounded-lg px-3 py-1.5 whitespace-nowrap">
            {STATUS_LABELS[data.status] ?? data.status}
          </span>
        </div>

        <div className="p-7 space-y-7">
          {data.itinerary && (
            <section>
              <h2 className="font-display text-lg font-semibold text-clay-800 mb-3">Itinerary</h2>
              <ol className="space-y-3 text-sm">
                {data.itinerary.days.map((d) => (
                  <li key={d.dayNumber} className="border-l-2 border-sunset-400 pl-3.5">
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

          {data.travelers.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold text-clay-800 mb-3">Travelers</h2>
              <ul className="text-sm space-y-1">
                {data.travelers.map((t, i) => (
                  <li key={i}>{t.fullName}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="font-display text-lg font-semibold text-clay-800 mb-3">Payment</h2>
            <table className="w-full text-sm">
              <tbody>
                {data.payments.map((p, i) => (
                  <tr key={i} className="border-t border-stone-100">
                    <td className="py-1.5">
                      {p.method.replace(/_/g, " ")} · {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {data.currency} {Number(p.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-clay-200">
                  <td className="py-2.5 font-display font-semibold text-base text-clay-800">Total</td>
                  <td className="py-2.5 text-right font-display font-semibold text-base text-clay-800 tabular-nums">
                    {data.currency} {Number(data.totalPrice).toLocaleString()}
                  </td>
                </tr>
                {data.balanceDue > 0 && (
                  <tr>
                    <td className="py-1 text-sunset-700">Balance due</td>
                    <td className="py-1 text-right tabular-nums text-sunset-700">
                      {data.currency} {data.balanceDue.toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {data.termsMarkdown && (
            <section className="text-xs text-stone-500 border-t border-stone-100 pt-5">
              <h3 className="font-medium text-stone-700 mb-1.5">Terms</h3>
              <p>{data.termsMarkdown}</p>
            </section>
          )}

          <section className="flex flex-wrap gap-3 text-sm border-t border-stone-200 pt-6">
            <a
              href={`/api/bookings/public/${token}/receipt.pdf`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center bg-gradient-to-r from-clay-600 to-clay-700 hover:from-clay-700 hover:to-clay-800 text-white font-medium rounded-xl py-3 shadow-sm shadow-clay-900/20 transition"
            >
              Download receipt
            </a>
            {ticketReady && (
              <a
                href={`/api/bookings/public/${token}/eticket.pdf`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center bg-gradient-to-r from-acacia-600 to-acacia-700 hover:from-acacia-700 hover:to-acacia-800 text-white font-medium rounded-xl py-3 shadow-sm shadow-acacia-900/20 transition"
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
