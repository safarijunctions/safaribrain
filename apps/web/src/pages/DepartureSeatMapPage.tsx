import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { PublicDeparture, SeatMapSeat, DepartureGroup } from "../types";
import { PublicHeader } from "../components/PublicHeader";
import {
  VehicleSeatMap,
  SeatSelectionSummary,
} from "../components/VehicleSeatMap";

const HOLDER_TOKEN_KEY = "safaribrain.holderToken";

function getHolderToken(): string {
  let token = sessionStorage.getItem(HOLDER_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(HOLDER_TOKEN_KEY, token);
  }
  return token;
}

// §1.2's second buying mode, live: pick specific seats on a fixed
// departure, hold them (atomically — DeparturesService.holdSeats handles
// the concurrency), then confirm into a real booking. No login, no quote,
// no operator involved until after the seats are already reserved.
export function DepartureSeatMapPage() {
  const { departureId } = useParams({ strict: false }) as {
    departureId: string;
  };
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
    queryFn: () =>
      api.get<PublicDeparture>(`/marketplace/departures/${departureId}`),
  });

  const { data: seats, refetch } = useQuery({
    queryKey: ["departure-seats", departureId],
    queryFn: () =>
      api.get<SeatMapSeat[]>(
        `/marketplace/departures/${departureId}/seats?holderToken=${holderToken}`,
      ),
    refetchInterval: 10_000,
  });

  // Design brief's "showing the real group, with privacy controls" — who's
  // actually joining, first name + last initial only, never full contact
  // details. Refetches alongside the seat map so a new booking shows up.
  const { data: group } = useQuery({
    queryKey: ["departure-group", departureId],
    queryFn: () =>
      api.get<DepartureGroup>(`/marketplace/departures/${departureId}/group`),
    refetchInterval: 10_000,
  });

  const hold = useMutation({
    mutationFn: () =>
      api.post<{ heldUntil: string; seats: { id: string }[] }>(
        `/marketplace/departures/${departureId}/hold`,
        { seatIds: selected, holderToken },
      ),
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
      api.post<{ ticketToken: string }>(
        `/marketplace/departures/${departureId}/book`,
        {
          holderToken,
          contactFullName: fullName,
          contactEmail: email,
          contactWhatsapp: whatsapp || undefined,
          contactCountry: country || undefined,
        },
      ),
    onSuccess: (booking) => {
      sessionStorage.removeItem(HOLDER_TOKEN_KEY);
      navigate({
        to: "/booking/$token",
        params: { token: booking.ticketToken },
      });
    },
  });

  // Client-side countdown display only — the server is the source of truth
  // for whether a hold is still valid (lazy expiry, see DeparturesService).
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secondsLeft = holdExpiresAt
    ? Math.max(0, Math.round((holdExpiresAt.getTime() - now) / 1000))
    : null;

  function toggleSeat(seat: SeatMapSeat) {
    if (seat.status === "BOOKED") return;
    if (seat.status === "HELD" && !seat.isMine) return;
    setSelected((sel) =>
      sel.includes(seat.id)
        ? sel.filter((id) => id !== seat.id)
        : [...sel, seat.id],
    );
  }

  if (!departure || !seats)
    return (
      <div className="min-h-screen bg-ivory">
        <PublicHeader />
        <p className="text-sm text-savannah-600 text-center py-20">Loading…</p>
      </div>
    );

  const total = selected.length * Number(departure.pricePerSeat);

  return (
    <div className="min-h-screen bg-ivory">
      <PublicHeader />

      <div className="bg-earth-800 text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
          <p className="text-xs tracking-widest2 uppercase text-brass-300 font-medium">
            {departure.tourTemplate.organization.name}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl mt-1">
            {departure.tourTemplate.title}
          </h1>
          <p className="text-sm text-white/70 mt-2">
            {new Date(departure.departureDate).toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            · {departure.currency}{" "}
            {Number(departure.pricePerSeat).toLocaleString()}/seat
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* The seat diagram — a vehicle-shaped, clickable seat picker */}
        <section className="bg-white border border-sand-200 rounded-sm p-6 sm:p-8 space-y-6">
          <p className="text-xs tracking-widest2 uppercase text-savannah-600 font-medium">
            Choose your seats
          </p>
          <VehicleSeatMap
            seats={seats}
            selected={selected}
            onToggle={toggleSeat}
          />
          <SeatSelectionSummary
            selectedLabels={seats
              .filter((s) => selected.includes(s.id))
              .map((s) => s.label)}
          />
        </section>

        {group && group.count > 0 && (
          <section className="bg-white border border-sand-200 p-5">
            <p className="text-xs tracking-widest2 uppercase text-savannah-600 font-medium mb-2">
              Who's joining
            </p>
            <p className="text-sm text-earth-700">
              {group.count} traveler{group.count === 1 ? "" : "s"} already
              booked on this departure
              {group.names.length > 0 ? <>: {group.names.join(", ")}</> : "."}
            </p>
          </section>
        )}

        {holdError && <p className="text-xs text-status-full">{holdError}</p>}

        {!showBookingForm ? (
          <button
            onClick={() => hold.mutate()}
            disabled={selected.length === 0 || hold.isPending}
            className="w-full bg-forest-700 hover:bg-forest-800 text-white font-medium tracking-wide uppercase text-sm rounded-sm py-4 transition disabled:opacity-50"
          >
            {hold.isPending
              ? "Holding…"
              : selected.length === 0
                ? "Select seats to continue"
                : `Hold ${selected.length} seat${selected.length > 1 ? "s" : ""} — ${departure.currency} ${total.toLocaleString()}`}
          </button>
        ) : (
          <section className="border-t border-sand-200 pt-6 space-y-3">
            {secondsLeft !== null && (
              <p className="text-xs text-savannah-700 font-medium">
                {secondsLeft > 0
                  ? `Held for ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")} — complete your booking before it expires.`
                  : "Your hold has expired — please select seats again."}
              </p>
            )}
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
            </div>
            {confirm.isError && (
              <p className="text-xs text-status-full">
                {(confirm.error as Error).message}
              </p>
            )}
            <button
              onClick={() => confirm.mutate()}
              disabled={
                !fullName ||
                !email ||
                confirm.isPending ||
                (secondsLeft ?? 1) <= 0
              }
              className="w-full bg-forest-700 hover:bg-forest-800 text-white font-medium tracking-wide uppercase text-sm rounded-sm py-3.5 transition disabled:opacity-50"
            >
              {confirm.isPending ? "Booking…" : "Confirm booking"}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
