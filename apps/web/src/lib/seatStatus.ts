// Shared "how full is this departure" classification — muted status
// colors (status.available/almost-full/full in tailwind.config.js), used
// wherever a live departure's seat count is shown.
export function seatAvailability(seatsAvailable: number, totalSeats: number) {
  if (seatsAvailable <= 0)
    return { label: "Full", dot: "bg-status-full", text: "text-status-full" };
  const threshold = Math.max(1, Math.ceil(totalSeats * 0.25));
  if (seatsAvailable <= threshold)
    return {
      label: "Almost full",
      dot: "bg-status-almost-full",
      text: "text-status-almost-full",
    };
  return {
    label: "Open",
    dot: "bg-status-available",
    text: "text-status-available",
  };
}
