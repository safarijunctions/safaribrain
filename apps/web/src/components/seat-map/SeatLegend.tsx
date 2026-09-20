import { SEAT_STATUS_LABEL, SeatStatus } from "./Seat";

// The same 4 color/label pairs used everywhere a seat can appear, plus
// "held" (another guest's in-progress hold) since that's a real, distinct
// state the picker must show — kept visually secondary so the 4 primary
// states stay the focus.
const SWATCH_CLASSES: Record<SeatStatus, string> = {
  available: "bg-seat-available rounded-sm",
  selected: "bg-seat-selected rounded-sm",
  booked: "bg-seat-booked rounded-sm",
  driver: "bg-seat-driver rounded-full",
  held: "bg-seat-held rounded-sm",
};

const ORDER: SeatStatus[] = [
  "available",
  "selected",
  "booked",
  "driver",
  "held",
];

export function SeatLegend() {
  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs text-earth-600">
      {ORDER.map((status) => (
        <span key={status} className="flex items-center gap-1.5">
          <span className={`h-3 w-3 ${SWATCH_CLASSES[status]}`} />
          {SEAT_STATUS_LABEL[status]}
        </span>
      ))}
    </div>
  );
}
