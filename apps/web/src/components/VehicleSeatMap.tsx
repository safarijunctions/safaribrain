import { SeatMapSeat } from "../types";

// A top-down safari-vehicle seat picker, matching the reference layout
// exactly: a horizontal van body, a driver's cockpit fixed at the front
// (right) end with a non-bookable steering-wheel icon, and the passenger
// cabin behind it as a two-row bench grid (near row / far row) — 3 columns
// for a 7-seater (6 guest seats + driver), 4 columns for a 9-seater (8
// guest seats + driver). Columns = ceil(seatCount / 2), so it also
// degrades gracefully for any other real seat count.
function splitIntoBenchGrid(seats: SeatMapSeat[]): (SeatMapSeat | null)[][] {
  const columns = Math.max(1, Math.ceil(seats.length / 2));
  const rowA: (SeatMapSeat | null)[] = [];
  const rowB: (SeatMapSeat | null)[] = [];
  for (let col = 0; col < columns; col++) {
    rowA.push(seats[col * 2] ?? null);
    rowB.push(seats[col * 2 + 1] ?? null);
  }
  return [rowA, rowB];
}

const STATUS_STYLES: Record<string, string> = {
  available:
    "bg-seat-available border-seat-available/70 text-white hover:brightness-110",
  selected: "bg-seat-selected border-seat-selected/70 text-white",
  held: "bg-seat-held border-seat-held/70 text-white cursor-not-allowed",
  booked:
    "bg-seat-booked border-seat-booked/70 text-white/90 cursor-not-allowed",
};

function SeatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path
        d="M6 10V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="5"
        y="10"
        width="14"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M5 17v2M19 17v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Seat({
  seat,
  selected,
  onClick,
}: {
  seat: SeatMapSeat;
  selected: boolean;
  onClick: () => void;
}) {
  const disabled =
    seat.status === "BOOKED" || (seat.status === "HELD" && !seat.isMine);
  const kind = disabled
    ? seat.status === "BOOKED"
      ? "booked"
      : "held"
    : selected
      ? "selected"
      : "available";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={seat.label}
      className={`h-11 w-11 sm:h-12 sm:w-12 rounded-md border flex flex-col items-center justify-center gap-0.5 transition shrink-0 ${STATUS_STYLES[kind]}`}
    >
      <SeatIcon />
      <span className="text-[10px] font-medium leading-none">{seat.label}</span>
    </button>
  );
}

// The design brief's van-shaped, clickable seat picker. Driver's seat is a
// fixed, non-bookable icon (never a real Seat row) — "Driver seat NOT
// selectable" — positioned in its own cockpit at the vehicle's front,
// separate from the passenger bench grid.
export function VehicleSeatMap({
  seats,
  selected,
  onToggle,
}: {
  seats: SeatMapSeat[];
  selected: string[];
  onToggle: (seat: SeatMapSeat) => void;
}) {
  const [rowA, rowB] = splitIntoBenchGrid(seats);

  return (
    <div className="flex flex-col items-center gap-6 w-full overflow-x-auto">
      <div className="relative w-fit mx-auto">
        {/* Wheels */}
        <div className="absolute bottom-0 left-8 right-8 translate-y-1/2 flex justify-between px-1">
          {Array.from({ length: Math.max(2, rowA.length) }).map((_, i) => (
            <span key={i} className="h-2.5 w-5 rounded-sm bg-earth-900" />
          ))}
        </div>

        {/* Van body */}
        <div className="relative flex items-stretch gap-3 sm:gap-4 bg-gradient-to-b from-earth-500 to-earth-600 border-2 border-earth-800 rounded-l-2xl rounded-r-[2.5rem] px-4 sm:px-6 py-5 sm:py-6 shadow-lg">
          {/* Rear cap */}
          <span className="absolute -left-2 top-1/2 -translate-y-1/2 h-16 w-2.5 rounded-l-full bg-earth-800" />

          {/* Passenger bench grid: near row (top) / far row (bottom) */}
          <div className="flex flex-col justify-center gap-2.5">
            <div className="flex items-center justify-center gap-2.5">
              {rowA.map((seat, i) =>
                seat ? (
                  <Seat
                    key={seat.id}
                    seat={seat}
                    selected={selected.includes(seat.id)}
                    onClick={() => onToggle(seat)}
                  />
                ) : (
                  <span
                    key={i}
                    className="h-11 w-11 sm:h-12 sm:w-12 shrink-0"
                  />
                ),
              )}
            </div>
            <div className="flex items-center justify-center gap-2.5">
              {rowB.map((seat, i) =>
                seat ? (
                  <Seat
                    key={seat.id}
                    seat={seat}
                    selected={selected.includes(seat.id)}
                    onClick={() => onToggle(seat)}
                  />
                ) : (
                  <span
                    key={i}
                    className="h-11 w-11 sm:h-12 sm:w-12 shrink-0"
                  />
                ),
              )}
            </div>
          </div>

          {/* Driver cockpit — front of the vehicle, fixed, not bookable */}
          <div className="relative flex flex-col items-center gap-2 pl-3 sm:pl-4 border-l border-earth-400/50 shrink-0">
            {/* Side mirrors */}
            <span className="absolute -top-3 -right-1.5 h-2.5 w-4 rounded-sm bg-earth-800" />
            <span className="absolute -bottom-3 -right-1.5 h-2.5 w-4 rounded-sm bg-earth-800" />
            <div
              title="Driver — not bookable"
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-seat-driver border border-seat-driver/70 flex items-center justify-center"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 text-white"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
                <path
                  d="M12 4v4M12 16v4M4 12h4M16 12h4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="text-[9px] tracking-widest2 uppercase text-white/60">
              Driver
            </span>
          </div>

          {/* Front cap */}
          <span className="absolute -right-2 top-1/2 -translate-y-1/2 h-20 w-3 rounded-r-full bg-earth-800" />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs text-white/60">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-seat-available" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-seat-selected" /> Selected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-seat-held" /> Held
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-seat-booked" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-seat-driver" /> Driver (not
          bookable)
        </span>
      </div>
    </div>
  );
}
