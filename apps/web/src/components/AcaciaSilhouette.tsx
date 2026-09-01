// A single flat acacia-tree silhouette — the iconic wide, flat-topped
// "umbrella thorn" canopy of the East African savanna, instantly readable
// even small. Two plain shapes (a flattened ellipse canopy + a tapered
// trunk), no photo, costs nothing over the network.
export function AcaciaSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" fill="currentColor" className={className} aria-hidden="true">
      <ellipse cx="100" cy="46" rx="92" ry="23" />
      <path d="M93 68 L107 68 L112 140 L88 140 Z" />
    </svg>
  );
}
