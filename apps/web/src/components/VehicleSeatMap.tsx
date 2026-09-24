import { SeatMapSeat } from "../types";
import { Seat, DriverSeat, SeatStatus } from "./seat-map/Seat";
import { VehicleShell } from "./seat-map/VehicleShell";
import { SeatLegend } from "./seat-map/SeatLegend";
export { SeatSelectionSummary } from "./seat-map/SeatSelectionSummary";

// A top-down safari-vehicle seat picker matching the reference layout:
// vertical vehicle body, the driver sharing the front row with the first
// passenger seat (fixed, non-bookable, excluded from the passenger seat
// count), and the rest of the cabin below as rows of 2 — degrades
// gracefully for any real seat count, not just the reference's 6.
function buildLayout(seats: SeatMapSeat[]) {
  const [frontSeat = null, ...rest] = seats;
  const rows: (SeatMapSeat | null)[][] = [];
  for (let i = 0; i < rest.length; i += 2) {
    rows.push([rest[i] ?? null, rest[i + 1] ?? null]);
  }
  return { frontSeat, rows };
}

function statusOf(seat: SeatMapSeat, isSelected: boolean): SeatStatus {
  if (seat.status === "BOOKED") return "booked";
  if (seat.status === "HELD" && !seat.isMine) return "held";
  return isSelected ? "selected" : "available";
}

// The design brief's vehicle-shaped, clickable seat picker. Driver's seat
// is a fixed, non-bookable icon (never a real Seat row) in its own cockpit
// slot, separate from the passenger grid and excluded from the passenger
// seat count.
export function VehicleSeatMap({
  seats,
  selected,
  onToggle,
}: {
  seats: SeatMapSeat[];
  selected: string[];
  onToggle: (seat: SeatMapSeat) => void;
}) {
  const { frontSeat, rows } = buildLayout(seats);
  const guestCount = seats.length;

  const renderSlot = (seat: SeatMapSeat | null, key: number) => {
    if (!seat) {
      return <span key={key} className="h-11 w-10 sm:h-12 sm:w-11 shrink-0" />;
    }
    const isSelected = selected.includes(seat.id);
    const status = statusOf(seat, isSelected);
    const clickable = status === "available" || status === "selected";
    return (
      <Seat
        key={seat.id}
        number={seat.label}
        status={status}
        onClick={clickable ? () => onToggle(seat) : undefined}
      />
    );
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full overflow-x-auto">
      <p className="text-xs tracking-widest2 uppercase text-savannah-600 font-medium">
        {guestCount + 1} Seater ({guestCount} Guests + Driver)
      </p>
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center gap-6 sm:gap-10 w-full">
        <VehicleShell
          frontRow={[renderSlot(frontSeat, -1), <DriverSeat key="driver" />]}
          passengerRows={rows.map((row, i) =>
            row.map((seat, j) => renderSlot(seat, i * 2 + j)),
          )}
        />
        <SeatLegend />
      </div>
    </div>
  );
}
