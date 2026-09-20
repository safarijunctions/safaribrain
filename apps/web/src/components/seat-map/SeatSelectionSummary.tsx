import { ReactNode } from "react";

// The textual readout below the seat map — "Selected seats: N" / "Seat
// numbers: a, b" — plus a slot for whatever action button the page
// actually needs next (Hold, Confirm, etc.), so the summary and the call
// to action always sit together.
export function SeatSelectionSummary({
  selectedLabels,
  children,
}: {
  selectedLabels: string[];
  children?: ReactNode;
}) {
  return (
    <div className="w-full max-w-md mx-auto text-center space-y-1">
      <p className="text-sm text-earth-700">
        Selected seats:{" "}
        <span className="font-semibold text-forest-800">
          {selectedLabels.length}
        </span>
      </p>
      <p className="text-xs text-earth-500">
        {selectedLabels.length > 0
          ? `Seat numbers: ${selectedLabels.join(", ")}`
          : "No seats selected yet"}
      </p>
      {children && <div className="pt-2">{children}</div>}
    </div>
  );
}
