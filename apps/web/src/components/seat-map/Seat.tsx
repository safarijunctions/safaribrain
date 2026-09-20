export type SeatStatus =
  | "available"
  | "selected"
  | "booked"
  | "held"
  | "driver";

export const SEAT_STATUS_LABEL: Record<SeatStatus, string> = {
  available: "Available",
  selected: "Selected",
  booked: "Booked",
  held: "Held",
  driver: "Driver",
};

const STATUS_CLASSES: Record<SeatStatus, string> = {
  available:
    "bg-seat-available border-seat-available/70 text-white hover:brightness-110 cursor-pointer",
  selected:
    "bg-seat-selected border-seat-selected/70 text-white cursor-pointer",
  booked:
    "bg-seat-booked border-seat-booked/70 text-white/90 cursor-not-allowed",
  held: "bg-seat-held border-seat-held/70 text-white cursor-not-allowed",
  driver: "bg-seat-driver border-seat-driver/70 text-white cursor-not-allowed",
};

// A single vehicle seat: rounded backrest lip + cushion body (not a plain
// square/circle), always showing its number, with a "Seat N — Status"
// tooltip. Click only ever does anything for an available/selected seat —
// booked, held (by someone else) and driver are visually disabled.
export function Seat({
  number,
  status,
  onClick,
}: {
  number: string;
  status: SeatStatus;
  onClick?: () => void;
}) {
  const disabled = status !== "available" && status !== "selected";
  const tooltip = `Seat ${number} — ${SEAT_STATUS_LABEL[status]}`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      aria-label={tooltip}
      className={`relative h-11 w-10 sm:h-12 sm:w-11 rounded-t-2xl rounded-b-md border-2 flex flex-col items-center justify-end pb-1.5 transition-all shrink-0 enabled:hover:-translate-y-0.5 enabled:hover:scale-105 enabled:active:scale-95 ${status === "selected" ? "shadow-[0_0_0_3px_rgba(59,130,246,0.3)]" : ""} ${STATUS_CLASSES[status]}`}
    >
      <span className="absolute top-1 h-2.5 w-6 sm:w-7 rounded-full bg-black/15" />
      <span className="text-[11px] font-semibold leading-none">{number}</span>
    </button>
  );
}

// The driver's position: same seat silhouette, a steering-wheel icon in
// place of a number, never clickable, never counted as a passenger seat.
export function DriverSeat() {
  const tooltip = "Driver — not selectable";
  return (
    <div
      title={tooltip}
      aria-label={tooltip}
      className="relative h-11 w-10 sm:h-12 sm:w-11 rounded-t-2xl rounded-b-md border-2 bg-seat-driver border-seat-driver/70 flex flex-col items-center justify-center gap-1 shrink-0"
    >
      <span className="absolute top-1 h-2.5 w-6 sm:w-7 rounded-full bg-black/15" />
      <svg
        viewBox="0 0 24 24"
        className="h-4.5 w-4.5 text-white mt-1"
        fill="none"
      >
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
