import { useState } from "react";
import { AFRICA_COUNTRY_PATHS, AFRICA_MAP_VIEWBOX } from "../data/africaMap";
import { countryName } from "../lib/countries";

interface Destination {
  code: string;
  count: number;
}

// The design brief's Africa map, built the same way as everything else in
// this pass: purpose-built around this platform's own data rather than a
// generic decorative graphic. Every country is drawn (real border geometry,
// not a stylized blob), but only countries with an actual live listing are
// interactive — the rest sit muted in the background, exactly like the
// destinations strip below it, just as a map instead of cards.
export function AfricaMap({
  destinations,
  onSelect,
}: {
  destinations: Destination[];
  onSelect: (code: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const counts = new Map(destinations.map((d) => [d.code, d.count]));
  const hoveredCount = hovered ? (counts.get(hovered) ?? 0) : 0;

  return (
    <div className="relative">
      <svg
        viewBox={AFRICA_MAP_VIEWBOX}
        className="w-full h-auto max-h-[560px] mx-auto"
        role="img"
        aria-label="Map of Africa — countries with live safaris are highlighted"
      >
        {AFRICA_COUNTRY_PATHS.map((c) => {
          const hasListings = counts.has(c.code);
          const isHovered = hovered === c.code;
          return (
            <path
              key={c.code}
              d={c.path}
              onClick={() => hasListings && onSelect(c.code)}
              onMouseEnter={() => setHovered(c.code)}
              onMouseLeave={() => setHovered((h) => (h === c.code ? null : h))}
              className={
                hasListings
                  ? `cursor-pointer transition-colors ${isHovered ? "fill-brass-400" : "fill-forest-600"}`
                  : "fill-sand-200"
              }
              stroke="#F7F4EC"
              strokeWidth={0.6}
            >
              <title>
                {hasListings
                  ? `${countryName(c.code)} — ${counts.get(c.code)} safari${counts.get(c.code) === 1 ? "" : "s"}`
                  : countryName(c.code)}
              </title>
            </path>
          );
        })}
      </svg>

      {hovered && counts.has(hovered) && (
        <div className="absolute top-3 left-3 bg-earth-800 text-white px-3 py-2 text-xs pointer-events-none">
          <p className="font-display text-sm">{countryName(hovered)}</p>
          <p className="text-brass-300 uppercase tracking-widest2 text-[10px] mt-0.5">
            {hoveredCount} safari{hoveredCount === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}
