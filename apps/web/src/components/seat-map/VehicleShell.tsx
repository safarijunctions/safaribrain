import { ReactNode } from "react";

// The top-down vehicle body, vertical orientation matching the reference:
// gold corner caps and mirrors up top, the driver sharing the front row
// with the first passenger seat, the rest of the passenger cabin below as
// rows of 2, and three wheels along the bottom edge.
export function VehicleShell({
  frontRow,
  passengerRows,
  wheelCount = 3,
}: {
  frontRow: ReactNode[];
  passengerRows: ReactNode[][];
  wheelCount?: number;
}) {
  return (
    <div className="relative w-fit mx-auto">
      {/* Top corner caps */}
      <span className="absolute -top-1.5 left-4 h-3 w-7 rounded-full bg-brass-400 z-10" />
      <span className="absolute -top-1.5 right-4 h-3 w-7 rounded-full bg-brass-400 z-10" />

      {/* Side mirrors */}
      <span className="absolute top-9 -left-2.5 h-4 w-3 rounded-sm bg-earth-700" />
      <span className="absolute top-9 -right-2.5 h-4 w-3 rounded-sm bg-earth-700" />

      {/* Vehicle body */}
      <div className="relative flex flex-col items-center gap-4 bg-gradient-to-b from-earth-400 to-earth-500 border-2 border-earth-700 rounded-[2rem] px-5 sm:px-6 pt-7 pb-6 shadow-lg">
        {/* Cabin panel */}
        <div className="flex flex-col gap-2.5 bg-ivory/95 rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-center gap-2.5">
            {frontRow}
          </div>
          {passengerRows.map((row, i) => (
            <div key={i} className="flex items-center justify-center gap-2.5">
              {row}
            </div>
          ))}
        </div>

        {/* Wheels */}
        <div className="flex justify-center gap-4">
          {Array.from({ length: wheelCount }).map((_, i) => (
            <span key={i} className="h-3 w-6 rounded-sm bg-earth-900" />
          ))}
        </div>
      </div>
    </div>
  );
}
