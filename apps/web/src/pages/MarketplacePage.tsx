import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  MarketplaceListingSummary,
  LiveDeparture,
  LatestReview,
} from "../types";
import { PublicHeader } from "../components/PublicHeader";
import { RouteLine } from "../components/RouteLine";
import { seatAvailability } from "../lib/seatStatus";
import { countryName } from "../lib/countries";

const SAFARI_TYPES = [
  "Any type",
  "Wildlife",
  "Family",
  "Luxury",
  "Photography",
  "Adventure",
];
const BUDGETS = [
  "Any budget",
  "Under $1,000 pp",
  "$1,000–$2,000 pp",
  "$2,000+ pp",
];

export function MarketplacePage() {
  const navigate = useNavigate();
  const [country, setCountry] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["marketplace", country],
    queryFn: () =>
      api.get<MarketplaceListingSummary[]>(
        `/marketplace/templates${country ? `?country=${encodeURIComponent(country)}` : ""}`,
      ),
  });
  const { data: live } = useQuery({
    queryKey: ["live-departures"],
    queryFn: () => api.get<LiveDeparture[]>("/marketplace/departures/live"),
  });
  const { data: latestReviews } = useQuery({
    queryKey: ["latest-reviews"],
    queryFn: () => api.get<LatestReview[]>("/marketplace/reviews/latest"),
  });
  // Unfiltered, independent of the `country` search filter above — the
  // destinations strip and the search dropdown both need every country
  // that has listings, not just whichever one is currently selected.
  const { data: allListings } = useQuery({
    queryKey: ["marketplace", ""],
    queryFn: () =>
      api.get<MarketplaceListingSummary[]>("/marketplace/templates"),
  });

  const countries = Array.from(
    new Set(allListings?.map((l) => l.organization.country) ?? []),
  ).sort();

  const destinations = countries
    .map((code) => ({
      code,
      count: allListings!.filter((l) => l.organization.country === code).length,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-ivory">
      {/* ---------------------------------------------------------------- */}
      {/* Hero */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-earth-900 via-earth-800 to-forest-800 text-white">
        <PublicHeader transparent />
        <RouteLine className="absolute top-1/3 left-0 w-full h-16 text-brass-400/20" />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,theme(colors.forest.600/25),transparent_55%)]"
          aria-hidden
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-40 pb-28 sm:pt-48 sm:pb-36 text-center">
          <p className="text-xs tracking-widest2 uppercase text-brass-300 font-medium mb-5">
            Safaris · People · Places · Departures
          </p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-medium leading-[1.05] text-white">
            Africa, your way.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-white/70 max-w-xl mx-auto">
            Discover the wild differently — browse verified operators, join a
            live departure, or have Africa's own guides build your trip from
            scratch.
          </p>
        </div>
      </section>

      {/* Search card, overlapping the hero's bottom edge — deliberately
          outside the hero <section> above (which has overflow-hidden for
          the route-line/gradient decoration) so this isn't clipped where
          it extends past the hero's bottom edge. */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 -mt-14 sm:-mt-16">
        <div className="bg-white rounded-sm shadow-xl shadow-earth-900/20 p-5 sm:p-6 grid grid-cols-2 sm:grid-cols-5 gap-4 sm:items-stretch">
          <Field label="Where?">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="atlas-input"
            >
              <option value="">All of Africa</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {countryName(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Safari type">
            <select className="atlas-input" defaultValue={SAFARI_TYPES[0]}>
              {SAFARI_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Budget">
            <select className="atlas-input" defaultValue={BUDGETS[0]}>
              {BUDGETS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field label="Travelers">
            <select className="atlas-input" defaultValue="2 adults">
              <option>1 adult</option>
              <option>2 adults</option>
              <option>3+ adults</option>
            </select>
          </Field>
          <div className="col-span-2 sm:col-span-1 flex flex-col justify-end">
            <a
              href="#safaris"
              className="bg-forest-700 hover:bg-forest-800 text-white text-sm font-medium tracking-wide uppercase py-2.5 rounded-sm text-center transition"
            >
              Search
            </a>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Live Joining Safaris */}
      {/* ---------------------------------------------------------------- */}
      <section
        id="live-departures"
        className="pt-28 sm:pt-32 pb-16 sm:pb-20 bg-ivory"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs tracking-widest2 uppercase text-savannah-600 font-medium mb-2">
                Live · Departing soon
              </p>
              <h2 className="font-display text-3xl sm:text-4xl text-forest-800">
                Join a safari
              </h2>
            </div>
          </div>

          {!live?.length && (
            <p className="text-sm text-savannah-700">
              No live departures open right now — check back soon.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {live?.map((d) => {
              const availability = seatAvailability(
                d.seatsAvailable,
                d.totalSeats,
              );
              return (
                <Link
                  key={d.id}
                  to="/marketplace/departures/$departureId"
                  params={{ departureId: d.id }}
                  className="group block bg-white border border-sand-200 hover:border-forest-300 transition p-5"
                >
                  <p className="text-[11px] tracking-widest2 uppercase text-savannah-600 font-medium">
                    {d.tourTemplate.organization.country} · Joining Safari
                  </p>
                  <h3 className="font-display text-xl text-forest-800 mt-1.5 group-hover:text-forest-700">
                    {d.tourTemplate.title}
                  </h3>
                  <p className="text-xs text-earth-500 mt-1">
                    {new Date(d.departureDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · {d.tourTemplate.durationDays} days ·{" "}
                    <span
                      className="hover:text-forest-700 hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate({
                          to: "/operators/$id",
                          params: { id: d.tourTemplate.organization.id },
                        });
                      }}
                    >
                      {d.tourTemplate.organization.name}
                    </span>
                  </p>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-sand-100">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${availability.dot}`}
                      />
                      <span className={`font-medium ${availability.text}`}>
                        {d.seatsAvailable} of {d.totalSeats} seats
                      </span>
                    </div>
                    <p className="font-display text-lg text-forest-800">
                      {d.currency} {Number(d.pricePerSeat).toLocaleString()}
                      <span className="text-xs text-earth-400 font-sans">
                        {" "}
                        pp
                      </span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Destinations — driven by this platform's actual country coverage, */}
      {/* not a static list; a country only appears once an operator there */}
      {/* has a public listing.                                            */}
      {/* ---------------------------------------------------------------- */}
      {destinations.length > 0 && (
        <section className="py-16 sm:py-20 bg-sand-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <p className="text-xs tracking-widest2 uppercase text-savannah-600 font-medium mb-2">
              Where to go
            </p>
            <h2 className="font-display text-3xl sm:text-4xl text-forest-800 mb-8">
              Destinations across Africa
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {destinations.map((d) => (
                <button
                  key={d.code}
                  onClick={() => {
                    setCountry(d.code);
                    document
                      .getElementById("safaris")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-left bg-earth-800 hover:bg-earth-900 text-white p-5 transition"
                >
                  <p className="font-display text-xl">{countryName(d.code)}</p>
                  <p className="text-xs text-brass-300 mt-1.5 uppercase tracking-widest2">
                    {d.count} safari{d.count === 1 ? "" : "s"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Full marketplace grid */}
      {/* ---------------------------------------------------------------- */}
      <section id="safaris" className="py-16 sm:py-20 bg-sand-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-xs tracking-widest2 uppercase text-savannah-600 font-medium mb-2">
            Every operator, every safari
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-forest-800 mb-8">
            Browse safaris across Africa
          </h2>

          {isLoading && <p className="text-sm text-savannah-700">Loading…</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data?.map((listing) => (
              <Link
                key={listing.id}
                to="/marketplace/$id"
                params={{ id: listing.id }}
                className="block bg-white border border-sand-200 hover:border-forest-300 transition p-5"
              >
                <p className="text-[11px] tracking-widest2 uppercase text-savannah-600 font-medium">
                  <span
                    className="hover:text-forest-700 hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate({
                        to: "/operators/$id",
                        params: { id: listing.organization.id },
                      });
                    }}
                  >
                    {listing.organization.name}
                  </span>{" "}
                  · {listing.organization.country}
                </p>
                <h3 className="font-display text-xl text-forest-800 mt-1.5">
                  {listing.title}
                </h3>
                <p className="text-sm text-earth-500 mt-1.5 line-clamp-2">
                  {listing.summary}
                </p>
                <p className="text-xs text-savannah-500 mt-3">
                  {listing.durationDays} days
                </p>
              </Link>
            ))}
          </div>

          {data?.length === 0 && !isLoading && (
            <p className="text-sm text-savannah-500 mt-10 text-center">
              No listings yet — check back soon.
            </p>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Live Africa — real traveler feedback just approved across every  */}
      {/* verified operator/guide, not curated editorial filler.          */}
      {/* ---------------------------------------------------------------- */}
      {latestReviews && latestReviews.length > 0 && (
        <section className="py-16 sm:py-20 bg-ivory">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <p className="text-xs tracking-widest2 uppercase text-savannah-600 font-medium mb-2">
              Live Africa
            </p>
            <h2 className="font-display text-3xl sm:text-4xl text-forest-800 mb-8">
              What travelers are saying, right now
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {latestReviews.slice(0, 4).map((r) => (
                <div key={r.id} className="border-l-2 border-brass-400 pl-4">
                  <p className="text-sm text-brass-500">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </p>
                  {r.title && (
                    <p className="text-sm font-medium text-earth-800 mt-2">
                      {r.title}
                    </p>
                  )}
                  {r.body && (
                    <p className="text-sm text-earth-500 mt-1 line-clamp-3">
                      {r.body}
                    </p>
                  )}
                  <p className="text-xs text-savannah-500 mt-3">
                    {r.reviewerName} · {r.organization.name},{" "}
                    {r.organization.country}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Footer */}
      {/* ---------------------------------------------------------------- */}
      <footer className="bg-earth-800 text-white/70 py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 sm:grid-cols-5 gap-8 text-sm">
          <div className="col-span-2 sm:col-span-1">
            <p className="font-display text-lg text-white mb-3">SAFARI ATLAS</p>
            <p className="text-white/50 text-xs max-w-xs">
              A luxury African safari marketplace — live departures, verified
              operators, guides and agents.
            </p>
          </div>
          <div>
            <p className="text-white/40 text-[11px] tracking-widest2 uppercase mb-3">
              Safaris
            </p>
            <a
              href="/marketplace"
              className="block hover:text-white transition mb-1.5"
            >
              All safaris
            </a>
            <a
              href="#live-departures"
              className="block hover:text-white transition mb-1.5"
            >
              Joining safaris
            </a>
            {countries.map((c) => (
              <a
                key={c}
                href={`/marketplace?country=${encodeURIComponent(c)}`}
                onClick={(e) => {
                  e.preventDefault();
                  setCountry(c);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="block hover:text-white transition mb-1.5"
              >
                Safaris in {countryName(c)}
              </a>
            ))}
          </div>
          <div>
            <p className="text-white/40 text-[11px] tracking-widest2 uppercase mb-3">
              Trade network
            </p>
            <Link
              to="/login"
              className="block hover:text-white transition mb-1.5"
            >
              Wholesale marketplace
            </Link>
            <Link
              to="/login"
              className="block hover:text-white transition mb-1.5"
            >
              Vehicle exchange
            </Link>
            <Link
              to="/login"
              className="block hover:text-white transition mb-1.5"
            >
              Org-to-org messaging
            </Link>
          </div>
          <div>
            <p className="text-white/40 text-[11px] tracking-widest2 uppercase mb-3">
              For professionals
            </p>
            <Link
              to="/register"
              className="block hover:text-white transition mb-1.5"
            >
              Become an operator
            </Link>
            <Link
              to="/register"
              className="block hover:text-white transition mb-1.5"
            >
              Become a guide
            </Link>
            <Link
              to="/register"
              className="block hover:text-white transition mb-1.5"
            >
              Become an agent
            </Link>
          </div>
          <div>
            <p className="text-white/40 text-[11px] tracking-widest2 uppercase mb-3">
              Account
            </p>
            <Link
              to="/login"
              className="block hover:text-white transition mb-1.5"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="block hover:text-white transition mb-1.5"
            >
              Join the platform
            </Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-10 pt-6 border-t border-white/10 text-xs text-white/30">
          © {new Date().getFullYear()} Safari Atlas. Every operator and guide on
          this platform is independently verified.
        </div>
      </footer>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block col-span-1">
      <span className="block text-[11px] tracking-wide uppercase text-earth-400 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
