import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { MarketplaceListingSummary } from "../types";
import { AcaciaSilhouette } from "../components/AcaciaSilhouette";

export function MarketplacePage() {
  const [country, setCountry] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["marketplace", country],
    queryFn: () => api.get<MarketplaceListingSummary[]>(`/marketplace/templates${country ? `?country=${encodeURIComponent(country)}` : ""}`),
  });

  const countries = Array.from(new Set(data?.map((l) => l.organization.country) ?? [])).sort();

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-sunset-50 via-clay-50 to-acacia-50">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[36rem] rounded-full bg-sunset-300/30 blur-3xl" aria-hidden />
      <AcaciaSilhouette className="hidden md:block absolute bottom-8 right-8 h-20 w-20 text-acacia-800/10 lg:h-28 lg:w-28" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-xs uppercase tracking-[0.15em] text-clay-700 font-medium">Safari Junction's Adventures</p>
        <h1 className="font-display text-3xl font-semibold text-clay-800 mt-1">Browse safaris across Africa</h1>
        <p className="text-sm text-stone-600 mt-2 max-w-xl">
          Every trip below is offered by a verified operator on this platform. Find one you like and send a no-obligation enquiry —
          no account needed.
        </p>

        {countries.length > 1 && (
          <div className="mt-6 flex items-center gap-2">
            <label className="text-xs text-stone-500">Country</label>
            <select className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-white" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">All</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {isLoading && <p className="text-sm text-stone-500 mt-8">Loading…</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-8">
          {data?.map((listing) => (
            <Link
              key={listing.id}
              to="/marketplace/$id"
              params={{ id: listing.id }}
              className="block bg-white rounded-2xl shadow-sm shadow-clay-900/5 border border-white hover:shadow-md transition p-5"
            >
              <p className="text-xs text-acacia-700 font-medium">{listing.organization.name} · {listing.organization.country}</p>
              <h2 className="font-display text-lg font-semibold text-clay-800 mt-1">{listing.title}</h2>
              <p className="text-sm text-stone-500 mt-1.5">{listing.summary}</p>
              <p className="text-xs text-stone-400 mt-3">{listing.durationDays} days</p>
            </Link>
          ))}
        </div>

        {data?.length === 0 && !isLoading && <p className="text-sm text-stone-400 mt-10 text-center">No listings yet — check back soon.</p>}
      </div>
    </div>
  );
}
