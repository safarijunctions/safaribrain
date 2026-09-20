import { ReactNode } from "react";

// The top-down vehicle body: rounded rectangle, a clearly separate front
// (driver) cockpit, a rear passenger cabin, wheels, mirrors and door
// handles for readability — everything the reference image's vehicle
// shows, built as real markup rather than a picture.
export function VehicleShell({
  passengerRows,
  driver,
  wheelCount,
}: {
  passengerRows: ReactNode[];
  driver: ReactNode;
  wheelCount: number;
}) {
  return (
    <div className="relative w-fit mx-auto">
      {/* Wheels */}
      <div className="absolute bottom-0 left-8 right-8 translate-y-1/2 flex justify-between px-1">
        {Array.from({ length: Math.max(2, wheelCount) }).map((_, i) => (
          <span key={i} className="h-2.5 w-5 rounded-sm bg-earth-800" />
        ))}
      </div>

      {/* Vehicle body */}
      <div className="relative flex items-stretch gap-3 sm:gap-4 bg-white border-2 border-sand-300 rounded-2xl px-4 sm:px-6 py-5 sm:py-6 shadow-md">
        {/* Rear cap */}
        <span className="absolute -left-2 top-1/2 -translate-y-1/2 h-16 w-2.5 rounded-l-full bg-sand-300" />

        {/* Passenger cabin: near row (top) / far row (bottom) */}
        <div className="flex flex-col justify-center gap-2.5">
          {passengerRows.map((row, i) => (
            <div key={i} className="flex items-center justify-center gap-2.5">
              {row}
            </div>
          ))}
        </div>

        {/* Driver cockpit — front of the vehicle, fixed, not bookable */}
        <div className="relative flex flex-col items-center justify-center gap-2 pl-3 sm:pl-4 border-l border-sand-200 shrink-0">
          {/* Side mirrors */}
          <span className="absolute -top-3 -right-1.5 h-2.5 w-4 rounded-sm bg-sand-300" />
          <span className="absolute -bottom-3 -right-1.5 h-2.5 w-4 rounded-sm bg-sand-300" />
          {driver}
          <span className="text-[9px] tracking-widest2 uppercase text-earth-500">
            Driver
          </span>
        </div>

        {/* Front cap */}
        <span className="absolute -right-2 top-1/2 -translate-y-1/2 h-20 w-3 rounded-r-full bg-sand-300" />
      </div>
    </div>
  );
}
