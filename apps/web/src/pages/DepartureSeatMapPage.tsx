import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { PublicDeparture, SeatMapSeat } from "../types";
import { AcaciaSilhouette } from "../components/AcaciaSilhouette";

const HOLDER_TOKEN_KEY = "safaribrain.holderToken";

function getHolderToken(): string {
  let token = sessionStorage.getItem(HOLDER_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(HOLDER_TOKEN_KEY, token);
  }
  return token;
}

const SEAT_COLORS: Record<string, string> = {
  AVAILABLE: "bg-white border-stone-300 hover:border-acacia-500 text-stone-700",
  HELD: "bg-sunset-100 border-sunset-400 text-sunset-800",
  BOOKED: "bg-stone-200 border-stone-300 text-stone-400 cursor-not-allowed",
};

// §1.2's second buying mode, live: pick specific seats on a fixed
// departure, hold them (atomically — DeparturesService.holdSeats handles
// the concurrency), then confirm into a real booking. No login, no quote,
// no operator involved until after the seats are already reserved.
export function DepartureSeatMapPage() {
  const { departureId } = useParams({ strict: false }) as { departureId: string };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const holderToken = useMemo(getHolderToken, []);

  const [selected, setSelected] = useState<string[]>([]);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [country, setCountry] = useState("");

  const { data: departure } = useQuery({
    queryKey: ["departure", departureId],
    queryFn: () => api.get<PublicDeparture>(`/marketplace/departures/${departureId}`),
  });

  const { data: seats, refetch } = useQuery({
    queryKey: ["departure-seats", departureId],
    queryFn: () => api.get<SeatMapSeat[]>(`/marketplace/departures/${departureId}/seats?holderToken=${holderToken}`),
    refetchInterval: 10_000,
  });

  const rows = useMemo(() => {
    const byRow = new Map<string, SeatMapSeat[]>();
    for (const s of seats ?? []) {
      const row = s.label.replace(/[A-Z]+$/, "");
      if (!byRow.has(row)) byRow.set(row, []);
      byRow.get(row)!.push(s);
    }
    return Array.from(byRow.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [seats]);

  const hold = useMutation({
    mutationFn: () => api.post<{ heldUntil: string; seats: { id: string }[] }>(`/marketplace/departures/${departureId}/hold`, { seatIds: selected, holderToken }),
    onSuccess: (res) => {
      setHoldError(null);
      setHoldExpiresAt(new Date(res.heldUntil));
      setShowBookingForm(true);
      refetch();
    },
    onError: (err) => {
      setHoldError((err as Error).message);
      refetch();
    },
  });

  const confirm = useMutation({
    mutationFn: () =>
      api.post<{ ticketToken: string }>(`/marketplace/departures/${departureId}/book`, {
        holderToken,
        contactFullName: fullName,
        contactEmail: email,
        contactWhatsapp: whatsapp || undefined,
        contactCountry: country || undefined,
      }),
    onSuccess: (booking) => {
      sessionStorage.removeItem(HOLDER_TOKEN_KEY);
      navigate({ to: "/booking/$token", params: { token: booking.ticketToken } });
    },
  });

  // Client-side countdown display only — the server is the source of truth
  // for whether a hold is still valid (lazy expiry, see DeparturesService).
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secondsLeft = holdExpiresAt ? Math.max(0, Math.round((holdExpiresAt.getTime() - now) / 1000)) : null;

  function toggleSeat(seat: SeatMapSeat) {
    if (seat.status === "BOOKED") return;
    if (seat.status === "HELD" && !seat.isMine) return;
    setSelected((sel) => (sel.includes(seat.id) ? sel.filter((id) => id !== seat.id) : [...sel, seat.id]));
  }

  if (!departure || !seats)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sunset-50 to-acacia-50">
        <p className="text-sm text-stone-500">Loading…</p>
      </div>
    );

  const total = selected.length * Number(departure.pricePerSeat);

  return (
    <div className="min-h-screen relative overflow-hidden py-10 px-4 bg-gradient-to-b from-sunset-50 via-clay-50 to-acacia-50">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[36rem] rounded-full bg-sunset-300/30 blur-3xl" aria-hidden />
      <AcaciaSilhouette className="hidden md:block absolute bottom-8 right-8 h-20 w-20 text-acacia-800/10 lg:h-28 lg:w-28" />

      <div className="relative max-w-lg mx-auto bg-white rounded-2xl shadow-xl shadow-clay-900/10 border border-white overflow-hidden">
        <div className="bg-gradient-to-br from-clay-700 via-clay-700 to-acacia-800 text-white px-7 py-6">
          <p className="text-xs uppercase tracking-[0.15em] text-sunset-200">{departure.tourTemplate.organization.name}</p>
          <h1 className="font-display text-2xl font-semibold mt-1">{departure.tourTemplate.title}</h1>
          <p className="text-sm text-white/80 mt-1">
            {new Date(departure.departureDate).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })} ·{" "}
            {departure.currency} {Number(departure.pricePerSeat).toLocaleString()}/seat
          </p>
        </div>

        <div className="p-7 space-y-6">
          <section>
            <h2 className="font-display text-lg font-semibold text-clay-800 mb-3">Choose your seats</h2>
            <div className="flex gap-4 text-xs text-stone-500 mb-4">
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded border border-stone-300 bg-white" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded border border-sunset-400 bg-sunset-100" /> Held</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded border border-stone-300 bg-stone-200" /> Booked</span>
            </div>
            <div className="space-y-2">
              {rows.map(([row, rowSeats]) => (
                <div key={row} className="flex items-center gap-2">
                  <span className="text-xs text-stone-400 w-4">{row}</span>
                  <div className="flex gap-2">
                    {rowSeats.map((seat) => (
                      <button
                        key={seat.id}
                        onClick={() => toggleSeat(seat)}
                        disabled={seat.status === "BOOKED" || (seat.status === "HELD" && !seat.isMine)}
                        title={seat.type}
                        className={`h-10 w-10 rounded-lg border text-xs font-medium transition ${
                          selected.includes(seat.id) ? "bg-acacia-600 border-acacia-600 text-white" : SEAT_COLORS[seat.status]
                        }`}
                      >
                        {seat.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {holdError && <p className="text-xs text-red-600">{holdError}</p>}

          {!showBookingForm ? (
            <button
              onClick={() => hold.mutate()}
              disabled={selected.length === 0 || hold.isPending}
              className="w-full bg-gradient-to-r from-acacia-600 to-acacia-700 hover:from-acacia-700 hover:to-acacia-800 text-white font-medium rounded-xl py-3.5 shadow-sm shadow-acacia-900/20 transition disabled:opacity-50"
            >
              {hold.isPending
                ? "Holding…"
                : selected.length === 0
                  ? "Select seats to continue"
                  : `Hold ${selected.length} seat${selected.length > 1 ? "s" : ""} — ${departure.currency} ${total.toLocaleString()}`}
            </button>
          ) : (
            <section className="border-t border-stone-200 pt-6 space-y-3">
              {secondsLeft !== null && (
                <p className="text-xs text-sunset-700 font-medium">
                  {secondsLeft > 0 ? `Held for ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")} — complete your booking before it expires.` : "Your hold has expired — please select seats again."}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input className="border border-stone-300 rounded-lg px-3 py-2 text-sm" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                <input className="border border-stone-300 rounded-lg px-3 py-2 text-sm" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="border border-stone-300 rounded-lg px-3 py-2 text-sm" placeholder="WhatsApp (optional)" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                <input className="border border-stone-300 rounded-lg px-3 py-2 text-sm" placeholder="Your country (optional)" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              {confirm.isError && <p className="text-xs text-red-600">{(confirm.error as Error).message}</p>}
              <button
                onClick={() => confirm.mutate()}
                disabled={!fullName || !email || confirm.isPending || (secondsLeft ?? 1) <= 0}
                className="w-full bg-gradient-to-r from-acacia-600 to-acacia-700 hover:from-acacia-700 hover:to-acacia-800 text-white font-medium rounded-xl py-3 shadow-sm shadow-acacia-900/20 transition disabled:opacity-50"
              >
                {confirm.isPending ? "Booking…" : "Confirm booking"}
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
