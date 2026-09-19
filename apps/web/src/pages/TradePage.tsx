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
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <p className="text-[11px] tracking-widest2 uppercase text-savannah-600 font-medium mb-2">
        Verified trade partners only
      </p>
      <h1 className="font-display text-3xl text-forest-800 mb-1">
        Trade Marketplace
      </h1>
      <p className="text-sm text-earth-500 mb-8 max-w-xl">
        Browse other verified operators' and guides' departures at their net
        (wholesale) rate, and book seats on behalf of your own clients.
      </p>
      <div className="flex gap-1 mb-8 border-b border-sand-200">
        {(["browse", "bookings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs tracking-wide uppercase font-medium border-b-2 -mb-px transition ${
              tab === t
                ? "border-forest-700 text-forest-800"
                : "border-transparent text-savannah-500 hover:text-savannah-700"
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
  const { data, isLoading } = useQuery({
    queryKey: ["trade-departures"],
    queryFn: () => api.get<TradeDeparture[]>("/trade/departures"),
  });
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-savannah-600">Loading…</p>;
  if (data?.length === 0)
    return (
      <p className="text-sm text-savannah-500">
        No trade-visible departures right now — check back later, or ask an
        operator to opt a departure into the trade channel.
      </p>
    );

  return (
    <div className="space-y-3">
      {data?.map((d) => {
        const booked =
          d.seats?.filter((s) => s.status === "BOOKED").length ?? 0;
        const available = d.totalSeats - booked;
        return (
          <div key={d.id} className="bg-white border border-sand-200 p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[11px] tracking-widest2 uppercase text-savannah-600 font-medium">
                  {d.tourTemplate.organization.name} ·{" "}
                  {d.tourTemplate.organization.country}
                </p>
                <p className="font-display text-lg text-forest-800 mt-1">
                  {d.tourTemplate.title}
                </p>
                <p className="text-xs text-earth-500 mt-1">
                  {new Date(d.departureDate).toLocaleDateString()} ·{" "}
                  {d.tourTemplate.durationDays} days
                </p>
              </div>
              <div className="text-right text-xs shrink-0">
                <p className="text-earth-400 line-through">
                  {d.currency} {Number(d.pricePerSeat).toLocaleString()} retail
                </p>
                <p className="font-display text-lg text-status-available">
                  {d.currency} {Number(d.netPricePerSeat).toLocaleString()} net
                </p>
                <p className="text-savannah-600 mt-0.5">
                  {available} of {d.totalSeats} seats free
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpenId(openId === d.id ? null : d.id)}
              className="mt-3 text-xs tracking-wide uppercase font-medium text-forest-700 hover:text-forest-800 underline decoration-forest-300"
            >
              {openId === d.id ? "Hide seats" : "Book seats"}
            </button>
            {openId === d.id && (
              <TradeSeatBooking
                departureId={d.id}
                currency={d.currency}
                netPricePerSeat={Number(d.netPricePerSeat)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TradeSeatBooking({
  departureId,
  currency,
  netPricePerSeat,
}: {
  departureId: string;
  currency: string;
  netPricePerSeat: number;
}) {
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
    queryFn: () =>
      api.get<SeatMapSeat[]>(
        `/trade/departures/${departureId}/seats?holderToken=${holderToken}`,
      ),
    refetchInterval: held ? false : 8000,
  });

  const hold = useMutation({
    mutationFn: () =>
      api.post(`/trade/departures/${departureId}/hold`, {
        seatIds: selected,
        holderToken,
      }),
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
      <div className="mt-3 border-t border-sand-100 pt-3 text-sm">
        <p className="text-status-available font-medium">
          Booked — {selected.length} seat(s) at {currency}{" "}
          {netPricePerSeat.toLocaleString()} net each.
        </p>
        <p className="text-earth-500 text-xs mt-1">
          Total: {result.currency} {Number(result.totalPrice).toLocaleString()}{" "}
          (retail equivalent {result.currency}{" "}
          {Number(result.retailTotalPrice ?? 0).toLocaleString()}) — your margin
          if resold at retail: {result.currency}{" "}
          {(
            Number(result.retailTotalPrice ?? 0) - Number(result.totalPrice)
          ).toLocaleString()}
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-sand-100 pt-3 space-y-3">
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
        {seats?.map((s) => {
          const disabled =
            s.status === "BOOKED" || (s.status === "HELD" && !s.isMine);
          const isSelected = selected.includes(s.id);
          return (
            <button
              key={s.id}
              disabled={disabled || held}
              onClick={() =>
                setSelected((prev) =>
                  isSelected
                    ? prev.filter((id) => id !== s.id)
                    : [...prev, s.id],
                )
              }
              className={`text-xs px-2 py-1.5 border transition ${
                s.status === "BOOKED"
                  ? "bg-sand-100 text-earth-400 border-sand-200"
                  : s.status === "HELD" && !s.isMine
                    ? "bg-status-almost-full/10 text-status-almost-full border-status-almost-full/40"
                    : isSelected
                      ? "bg-forest-700 text-white border-forest-700"
                      : "bg-white border-sand-300 hover:border-forest-400"
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
          className="text-xs tracking-wide uppercase font-medium bg-forest-700 hover:bg-forest-800 text-white px-3 py-2 disabled:opacity-50"
        >
          Hold {selected.length || ""} seat(s) for 5 minutes
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-xs bg-sand-50 p-3">
          <p className="col-span-2 text-earth-600">
            Who is this booking for? (your end client)
          </p>
          <input
            className="border border-sand-300 px-2 py-1.5"
            placeholder="Full name"
            value={endClientFullName}
            onChange={(e) => setEndClientFullName(e.target.value)}
          />
          <input
            className="border border-sand-300 px-2 py-1.5"
            placeholder="Email"
            value={endClientEmail}
            onChange={(e) => setEndClientEmail(e.target.value)}
          />
          <input
            className="border border-sand-300 px-2 py-1.5 col-span-2"
            placeholder="Country (optional)"
            value={endClientCountry}
            onChange={(e) => setEndClientCountry(e.target.value)}
          />
          <button
            disabled={!endClientFullName || !endClientEmail || book.isPending}
            onClick={() => book.mutate()}
            className="col-span-2 text-xs tracking-wide uppercase font-medium bg-brass-500 hover:bg-brass-600 text-earth-900 px-3 py-2 disabled:opacity-50"
          >
            Confirm booking at {currency}{" "}
            {(netPricePerSeat * selected.length).toLocaleString()}
          </button>
          {book.isError && (
            <p className="col-span-2 text-status-full">
              {(book.error as Error).message}
            </p>
          )}
        </div>
      )}
      {hold.isError && (
        <p className="text-xs text-status-full">
          {(hold.error as Error).message}
        </p>
      )}
    </div>
  );
}

function MyTradeBookings() {
  const { data, isLoading } = useQuery({
    queryKey: ["trade-bookings"],
    queryFn: () => api.get<TradeBooking[]>("/trade/bookings"),
  });
  if (isLoading) return <p className="text-sm text-savannah-600">Loading…</p>;
  if (data?.length === 0)
    return <p className="text-sm text-savannah-500">No trade bookings yet.</p>;
  return (
    <div className="bg-white border border-sand-200 divide-y divide-sand-100">
      {data?.map((b) => (
        <div
          key={b.id}
          className="px-5 py-4 text-sm flex items-center justify-between gap-3 flex-wrap"
        >
          <div>
            <p className="font-medium text-forest-800">
              {b.departure?.tourTemplate.title ?? "—"}
            </p>
            <p className="text-xs text-earth-500 mt-0.5">
              {b.organization.name} ·{" "}
              {b.departure
                ? new Date(b.departure.departureDate).toLocaleDateString()
                : ""}
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-display text-base text-forest-800">
              {b.currency} {Number(b.totalPrice).toLocaleString()} paid
            </p>
            <p className="text-savannah-600">
              margin {b.currency}{" "}
              {(
                Number(b.retailTotalPrice ?? 0) - Number(b.totalPrice)
              ).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
