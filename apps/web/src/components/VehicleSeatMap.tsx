import { SeatMapSeat } from "../types";

// A top-down safari-vehicle seat picker — driver up front (a fixed,
// non-bookable icon, not a real Seat row), the front passenger seat beside
// them, then bench rows of two behind. Chunking real seats into this shape
// (1, then pairs, with a trailing single row if the count is odd) means it
// renders correctly for any totalSeats a departure/vehicle actually has,
// not just the two reference layouts (6 guests+driver / 8 guests+driver) —
// those two just happen to be what this produces for 6 or 8 real seats.
function chunkIntoRows(seats: SeatMapSeat[]): SeatMapSeat[][] {
  if (seats.length === 0) return [];
  const rows: SeatMapSeat[][] = [[seats[0]]];
  let i = 1;
  while (i < seats.length) {
    const remaining = seats.length - i;
    const rowSize = remaining === 1 ? 1 : 2;
    rows.push(seats.slice(i, i + rowSize));
    i += rowSize;
  }
  return rows;
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
      className={`h-12 w-12 rounded-md border flex flex-col items-center justify-center gap-0.5 transition ${STATUS_STYLES[kind]}`}
    >
      <SeatIcon />
      <span className="text-[10px] font-medium leading-none">{seat.label}</span>
    </button>
  );
}

function DriverIcon() {
  return (
    <div
      title="Driver — not bookable"
      className="h-12 w-12 rounded-full bg-seat-driver border border-seat-driver/70 flex items-center justify-center"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <path
          d="M12 4v4M12 16v4M4 12h4M16 12h4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

// The design brief's van-shaped, clickable seat picker — a top-down safari
// vehicle silhouette (mirrors, tapered nose, rear) with the driver's seat
// fixed and marked non-bookable, exactly as specified: "Driver seat NOT
// selectable." Reused wherever a traveler or trade partner picks seats.
export function VehicleSeatMap({
  seats,
  selected,
  onToggle,
}: {
  seats: SeatMapSeat[];
  selected: string[];
  onToggle: (seat: SeatMapSeat) => void;
}) {
  const rows = chunkIntoRows(seats);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative bg-earth-700/60 border border-white/10 rounded-[2.5rem] rounded-t-[3.5rem] px-6 pt-10 pb-8">
        {/* Side mirrors */}
        <span className="absolute top-14 -left-2 h-6 w-3 bg-earth-600 rounded-sm" />
        <span className="absolute top-14 -right-2 h-6 w-3 bg-earth-600 rounded-sm" />

        {/* Front row: driver + front passenger */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <DriverIcon />
          {rows[0]?.map((seat) => (
            <Seat
              key={seat.id}
              seat={seat}
              selected={selected.includes(seat.id)}
              onClick={() => onToggle(seat)}
            />
          ))}
        </div>

        {/* Remaining bench rows */}
        <div className="flex flex-col items-center gap-3">
          {rows.slice(1).map((row, i) => (
            <div key={i} className="flex items-center justify-center gap-4">
              {row.map((seat) => (
                <Seat
                  key={seat.id}
                  seat={seat}
                  selected={selected.includes(seat.id)}
                  onClick={() => onToggle(seat)}
                />
              ))}
            </div>
          ))}
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
