import { SeatMapSeat } from "../types";
import { Seat, DriverSeat, SeatStatus } from "./seat-map/Seat";
import { VehicleShell } from "./seat-map/VehicleShell";
import { SeatLegend } from "./seat-map/SeatLegend";
export { SeatSelectionSummary } from "./seat-map/SeatSelectionSummary";

// A top-down safari-vehicle seat picker, matching the reference layout: a
// rounded vehicle body, a driver's cockpit fixed at the front (right) end
// with a non-bookable steering-wheel icon, and the passenger cabin behind
// it as a two-row bench grid (near row / far row) — 3 columns for a
// 7-seater (6 guest seats + driver), 4 columns for a 9-seater (8 guest
// seats + driver). Columns = ceil(seatCount / 2), so it degrades
// gracefully for any other real seat count.
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

function statusOf(seat: SeatMapSeat, isSelected: boolean): SeatStatus {
  if (seat.status === "BOOKED") return "booked";
  if (seat.status === "HELD" && !seat.isMine) return "held";
  return isSelected ? "selected" : "available";
}

// The design brief's van-shaped, clickable seat picker. Driver's seat is a
// fixed, non-bookable icon (never a real Seat row) — positioned in its own
// cockpit at the vehicle's front, separate from the passenger bench grid
// and excluded from the passenger seat count.
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
    <div className="flex flex-col items-center gap-6 w-full overflow-x-auto">
      <VehicleShell
        passengerRows={[
          rowA.map((seat, i) => renderSlot(seat, i)),
          rowB.map((seat, i) => renderSlot(seat, i)),
        ]}
        driver={<DriverSeat />}
        wheelCount={rowA.length}
      />
      <SeatLegend />
    </div>
  );
}
