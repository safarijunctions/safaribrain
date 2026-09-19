import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { TradeDeparture, TradeBooking, SeatMapSeat } from "../types";

// The Trade marketplace (§6): another organization's own inventory,
// browsed and booked wholesale on behalf of an end client. Authenticated
// (not the public marketplace's no-login pattern) — a trade partner is a
// known, verified business, not an anonymous traveler.
export function TradePage() {
  const [tab, setTab] = useState<"browse" | "bookings">("browse");
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <h1 className="font-display text-2xl font-semibold text-forest-800 mb-1">Trade Marketplace</h1>
      <p className="text-sm text-stone-500 mb-6">
        Browse other verified operators' and guides' departures at their net (wholesale) rate, and book seats on behalf of your own
        clients.
      </p>
      <div className="flex gap-1 mb-6 border-b border-stone-200">
        {(["browse", "bookings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t ? "border-forest-600 text-forest-700" : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {t === "browse" ? "Browse departures" : "My trade bookings"}
          </button>
        ))}
      </div>
      {tab === "browse" ? <BrowseTradeDepartures /> : <MyTradeBookings />}
    </div>
  );
}

function BrowseTradeDepartures() {
  const { data, isLoading } = useQuery({ queryKey: ["trade-departures"], queryFn: () => api.get<TradeDeparture[]>("/trade/departures") });
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-stone-500">Loading…</p>;
  if (data?.length === 0) return <p className="text-sm text-stone-400">No trade-visible departures right now — check back later, or ask an operator to opt a departure into the trade channel.</p>;

  return (
    <div className="space-y-3">
      {data?.map((d) => {
        const booked = d.seats?.filter((s) => s.status === "BOOKED").length ?? 0;
        const available = d.totalSeats - booked;
        return (
          <div key={d.id} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm shadow-forest-900/5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-medium text-sm">{d.tourTemplate.title}</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {d.tourTemplate.organization.name} ({d.tourTemplate.organization.country}) · {new Date(d.departureDate).toLocaleDateString()} ·{" "}
                  {d.tourTemplate.durationDays} days
                </p>
              </div>
              <div className="text-right text-xs shrink-0">
                <p className="text-stone-400 line-through">
                  {d.currency} {Number(d.pricePerSeat).toLocaleString()} retail
                </p>
                <p className="font-semibold text-moss-700">
                  {d.currency} {Number(d.netPricePerSeat).toLocaleString()} net
                </p>
                <p className="text-stone-500">{available} of {d.totalSeats} seats free</p>
              </div>
            </div>
            <button onClick={() => setOpenId(openId === d.id ? null : d.id)} className="mt-2 text-xs text-forest-700 hover:underline">
              {openId === d.id ? "Hide seats" : "Book seats"}
            </button>
            {openId === d.id && <TradeSeatBooking departureId={d.id} currency={d.currency} netPricePerSeat={Number(d.netPricePerSeat)} />}
          </div>
        );
      })}
    </div>
  );
}

function TradeSeatBooking({ departureId, currency, netPricePerSeat }: { departureId: string; currency: string; netPricePerSeat: number }) {
  const qc = useQueryClient();
  const [holderToken] = useState(() => crypto.randomUUID());
  const [selected, setSelected] = useState<string[]>([]);
  const [held, setHeld] = useState(false);
  const [endClientFullName, setEndClientFullName] = useState("");
  const [endClientEmail, setEndClientEmail] = useState("");
  const [endClientCountry, setEndClientCountry] = useState("");
  const [result, setResult] = useState<TradeBooking | null>(null);

  const { data: seats } = useQuery({
    queryKey: ["trade-seats", departureId],
    queryFn: () => api.get<SeatMapSeat[]>(`/trade/departures/${departureId}/seats?holderToken=${holderToken}`),
    refetchInterval: held ? false : 8000,
  });

  const hold = useMutation({
    mutationFn: () => api.post(`/trade/departures/${departureId}/hold`, { seatIds: selected, holderToken }),
    onSuccess: () => {
      setHeld(true);
      qc.invalidateQueries({ queryKey: ["trade-seats", departureId] });
    },
  });

  const book = useMutation({
    mutationFn: () =>
      api.post<TradeBooking>(`/trade/departures/${departureId}/book`, {
        holderToken,
        endClientFullName,
        endClientEmail,
        endClientCountry: endClientCountry || undefined,
      }),
    onSuccess: (booking) => {
      setResult(booking);
      qc.invalidateQueries({ queryKey: ["trade-departures"] });
    },
  });

  if (result) {
    return (
      <div className="mt-3 border-t border-stone-100 pt-3 text-sm">
        <p className="text-moss-700 font-medium">Booked — {selected.length} seat(s) at {currency} {netPricePerSeat.toLocaleString()} net each.</p>
        <p className="text-stone-500 text-xs mt-1">
          Total: {result.currency} {Number(result.totalPrice).toLocaleString()} (retail equivalent {result.currency}{" "}
          {Number(result.retailTotalPrice ?? 0).toLocaleString()}) — your margin if resold at retail:{" "}
          {result.currency} {(Number(result.retailTotalPrice ?? 0) - Number(result.totalPrice)).toLocaleString()}.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-stone-100 pt-3 space-y-3">
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
        {seats?.map((s) => {
          const disabled = s.status === "BOOKED" || (s.status === "HELD" && !s.isMine);
          const isSelected = selected.includes(s.id);
          return (
            <button
              key={s.id}
              disabled={disabled || held}
              onClick={() => setSelected((prev) => (isSelected ? prev.filter((id) => id !== s.id) : [...prev, s.id]))}
              className={`text-xs rounded px-2 py-1.5 border ${
                s.status === "BOOKED"
                  ? "bg-stone-200 text-stone-400 border-stone-200"
                  : s.status === "HELD" && !s.isMine
                    ? "bg-amber-100 text-amber-500 border-amber-200"
                    : isSelected
                      ? "bg-forest-600 text-white border-forest-600"
                      : "bg-white border-stone-300 hover:border-forest-400"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {!held ? (
        <button
          disabled={selected.length === 0 || hold.isPending}
          onClick={() => hold.mutate()}
          className="text-xs font-medium bg-forest-600 hover:bg-forest-700 text-white rounded px-3 py-1.5 disabled:opacity-50"
        >
          Hold {selected.length || ""} seat(s) for 5 minutes
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50 rounded-lg p-3">
          <p className="col-span-2 text-stone-600">Who is this booking for? (your end client)</p>
          <input className="border border-stone-300 rounded px-2 py-1.5" placeholder="Full name" value={endClientFullName} onChange={(e) => setEndClientFullName(e.target.value)} />
          <input className="border border-stone-300 rounded px-2 py-1.5" placeholder="Email" value={endClientEmail} onChange={(e) => setEndClientEmail(e.target.value)} />
          <input className="border border-stone-300 rounded px-2 py-1.5 col-span-2" placeholder="Country (optional)" value={endClientCountry} onChange={(e) => setEndClientCountry(e.target.value)} />
          <button
            disabled={!endClientFullName || !endClientEmail || book.isPending}
            onClick={() => book.mutate()}
            className="col-span-2 font-medium bg-moss-700 hover:bg-moss-800 text-white rounded px-3 py-1.5 disabled:opacity-50"
          >
            Confirm booking at {currency} {(netPricePerSeat * selected.length).toLocaleString()}
          </button>
          {book.isError && <p className="col-span-2 text-red-600">{(book.error as Error).message}</p>}
        </div>
      )}
      {hold.isError && <p className="text-xs text-red-600">{(hold.error as Error).message}</p>}
    </div>
  );
}

function MyTradeBookings() {
  const { data, isLoading } = useQuery({ queryKey: ["trade-bookings"], queryFn: () => api.get<TradeBooking[]>("/trade/bookings") });
  if (isLoading) return <p className="text-sm text-stone-500">Loading…</p>;
  if (data?.length === 0) return <p className="text-sm text-stone-400">No trade bookings yet.</p>;
  return (
    <div className="bg-white border border-stone-200 rounded-xl divide-y shadow-sm shadow-forest-900/5 overflow-hidden">
      {data?.map((b) => (
        <div key={b.id} className="px-5 py-3 text-sm flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-medium">{b.departure?.tourTemplate.title ?? "—"}</p>
            <p className="text-xs text-stone-500">
              {b.organization.name} · {b.departure ? new Date(b.departure.departureDate).toLocaleDateString() : ""}
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold">{b.currency} {Number(b.totalPrice).toLocaleString()} paid</p>
            <p className="text-stone-500">margin {b.currency} {(Number(b.retailTotalPrice ?? 0) - Number(b.totalPrice)).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
