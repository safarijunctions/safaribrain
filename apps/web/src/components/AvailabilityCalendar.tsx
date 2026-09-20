import { useState } from "react";

export interface AvailabilityRange {
  startDate: string;
  endDate: string;
  status: "ACCEPTED" | "PENDING";
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function toDayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Design brief's "vehicle availability calendar" — a small month grid so a
// prospective renter can see which dates are already spoken for before
// picking a date range, instead of finding out only after submitting a
// request. Accepted rentals are a hard block (VehicleRentalsService.respond
// enforces the same overlap rule server-side); pending requests are shown
// as tentative since another renter's outstanding ask is still useful to
// know, even though it isn't binding yet.
export function AvailabilityCalendar({
  ranges,
}: {
  ranges: AvailabilityRange[];
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const statusForDay = (day: Date): "ACCEPTED" | "PENDING" | null => {
    const key = toDayKey(day);
    for (const r of ranges) {
      if (key >= r.startDate.slice(0, 10) && key <= r.endDate.slice(0, 10)) {
        return r.status;
      }
    }
    return null;
  };

  const firstOfMonth = month;
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const cells: (Date | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1),
    ),
  ];

  return (
    <div className="border border-sand-200 bg-white p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
          className="text-earth-500 hover:text-forest-700 px-1"
        >
          ‹
        </button>
        <p className="font-medium text-forest-800">
          {month.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </p>
        <button
          type="button"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
          className="text-earth-500 hover:text-forest-700 px-1"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-earth-400">
        {WEEKDAYS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mt-1">
        {cells.map((day, i) => {
          if (!day) return <span key={i} />;
          const status = statusForDay(day);
          return (
            <span
              key={i}
              title={
                status === "ACCEPTED"
                  ? "Booked"
                  : status === "PENDING"
                    ? "Requested (pending)"
                    : "Available"
              }
              className={`h-6 flex items-center justify-center ${
                status === "ACCEPTED"
                  ? "bg-status-full/15 text-status-full"
                  : status === "PENDING"
                    ? "bg-status-almost-full/15 text-status-almost-full"
                    : "text-earth-600"
              }`}
            >
              {day.getDate()}
            </span>
          );
        })}
      </div>
      <div className="flex gap-3 mt-2 text-[10px] text-earth-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 bg-status-full/40" /> Booked
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 bg-status-almost-full/40" />{" "}
          Requested
        </span>
      </div>
    </div>
  );
}
