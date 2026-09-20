import { SEAT_STATUS_LABEL, SeatStatus } from "./Seat";

const SWATCH_CLASSES: Record<SeatStatus, string> = {
  available: "bg-seat-available rounded-sm",
  booked: "bg-seat-booked rounded-sm",
  selected: "bg-seat-selected rounded-sm",
  driver: "bg-seat-driver rounded-full",
  held: "bg-seat-held rounded-sm",
};

// Matches the reference's right-hand key order: Available, Booked,
// Selected, Driver (Not Bookable). "Held" isn't in the reference (a
// 2-state static mockup has no notion of another guest's in-progress
// hold) but is a real, necessary status here, so it's appended last.
const ORDER: SeatStatus[] = [
  "available",
  "booked",
  "selected",
  "driver",
  "held",
];

export function SeatLegend() {
  return (
    <div className="flex flex-row sm:flex-col flex-wrap justify-center sm:justify-start gap-x-5 gap-y-2.5 sm:gap-y-4 text-xs text-earth-700">
      {ORDER.map((status) => (
        <span key={status} className="flex items-center gap-2">
          <span className={`h-3.5 w-3.5 shrink-0 ${SWATCH_CLASSES[status]}`} />
          <span className="font-medium">
            {SEAT_STATUS_LABEL[status]}
            {status === "driver" ? " (Not Bookable)" : ""}
          </span>
        </span>
      ))}
    </div>
  );
}
