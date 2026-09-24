// The platform's signature motif (see ARCHITECTURE.md/design brief §33):
// a thin route line connecting waypoints, echoing a safari itinerary on a
// map. Purely decorative, no photography dependency — a few dots and a
// dashed path scale to any width.
export function RouteLine({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 60"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M0 40 C 80 10, 140 50, 220 24 S 360 4, 440 30 S 560 46, 600 18"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 8"
        strokeLinecap="round"
      />
      {[0, 220, 440, 600].map((x, i) => (
        <circle
          key={i}
          cx={x}
          cy={i % 2 === 0 ? 40 - i * 5 : 24}
          r="2.5"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
