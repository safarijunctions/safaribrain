import { useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { OrganizationProfile } from "../types";
import { PublicHeader } from "../components/PublicHeader";
import { RouteLine } from "../components/RouteLine";

const KIND_LABEL: Record<string, string> = {
  OPERATOR: "Tour Operator",
  GUIDE: "Independent Guide",
  AGENT: "Travel Agent",
};

// The operator/guide public profile mini-site (design brief's "operator
// mini-website pages" / "guide pages") — who is behind a listing before a
// traveler enquires, purpose-built around this platform's actual data:
// their publicly listed templates and their real approved reviews, not a
// generic "about us" template.
export function OperatorProfilePage() {
  const { id } = useParams({ strict: false }) as { id: string };

  const { data, isLoading } = useQuery({
    queryKey: ["operator-profile", id],
    queryFn: () =>
      api.get<OrganizationProfile>(`/marketplace/organizations/${id}`),
  });

  if (isLoading || !data)
    return (
      <div className="min-h-screen bg-ivory">
        <PublicHeader />
        <p className="text-sm text-savannah-600 text-center py-20">Loading…</p>
      </div>
    );

  const { organization, templates, reviews, averageRating, reviewCount } = data;
  const memberSince = new Date(organization.createdAt).getFullYear();

  return (
    <div className="min-h-screen bg-ivory">
      <PublicHeader />

      {/* Hero — a dark, editorial identity band, the same visual language
          as the homepage/listing header, not a card-based "profile" layout */}
      <section className="relative overflow-hidden bg-gradient-to-b from-earth-900 via-earth-800 to-forest-800 text-white">
        <RouteLine className="absolute top-1/2 left-0 w-full h-16 text-brass-400/20" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-14 sm:pt-20 sm:pb-16">
          <p className="text-xs tracking-widest2 uppercase text-brass-300 font-medium mb-3">
            {KIND_LABEL[organization.kind] ?? organization.kind} ·{" "}
            {organization.country} · Verified partner
          </p>
          <h1 className="font-display text-4xl sm:text-5xl">
            {organization.name}
          </h1>
          <div className="flex items-center gap-4 mt-4 text-sm text-white/70">
            <span>On Safari Atlas since {memberSince}</span>
            {reviewCount > 0 && (
              <span className="text-brass-200">
                {"★".repeat(Math.round(averageRating ?? 0))}
                {"☆".repeat(5 - Math.round(averageRating ?? 0))}{" "}
                {averageRating?.toFixed(1)} ({reviewCount} review
                {reviewCount === 1 ? "" : "s"})
              </span>
            )}
          </div>
          {organization.bio && (
            <p className="text-white/80 mt-6 max-w-xl leading-relaxed">
              {organization.bio}
            </p>
          )}
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <section>
          <p className="text-xs tracking-widest2 uppercase text-savannah-600 font-medium mb-3">
            {templates.length} listing{templates.length === 1 ? "" : "s"}
          </p>
          <h2 className="font-display text-2xl text-forest-800 mb-5">
            Safaris by {organization.name}
          </h2>
          {templates.length === 0 ? (
            <p className="text-sm text-savannah-500">No public listings yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {templates.map((t) => (
                <Link
                  key={t.id}
                  to="/marketplace/$id"
                  params={{ id: t.id }}
                  className="block bg-white border border-sand-200 hover:border-forest-300 transition p-5"
                >
                  <h3 className="font-display text-xl text-forest-800">
                    {t.title}
                  </h3>
                  {t.summary && (
                    <p className="text-sm text-earth-500 mt-1.5 line-clamp-2">
                      {t.summary}
                    </p>
                  )}
                  <p className="text-xs text-savannah-500 mt-3">
                    {t.durationDays} days
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {reviews.length > 0 && (
          <section className="border-t border-sand-200 pt-8">
            <p className="text-xs tracking-widest2 uppercase text-savannah-600 font-medium mb-3">
              In their words
            </p>
            <h2 className="font-display text-2xl text-forest-800 mb-5">
              Traveler reviews
            </h2>
            <div className="space-y-5">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="border-b border-sand-100 pb-4 last:border-0"
                >
                  <p className="text-sm text-brass-500">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </p>
                  <p className="text-xs text-earth-400 mt-1">
                    {r.reviewerName}
                  </p>
                  {r.title && (
                    <p className="text-sm font-medium text-earth-800 mt-1">
                      {r.title}
                    </p>
                  )}
                  {r.body && (
                    <p className="text-sm text-earth-500 mt-1">{r.body}</p>
                  )}
                  {r.operatorReply && (
                    <div className="bg-forest-50 p-3 text-xs text-earth-600 mt-2">
                      <p className="font-medium text-forest-700 mb-1">
                        Reply from {organization.name}
                      </p>
                      {r.operatorReply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
