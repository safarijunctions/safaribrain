# Architecture & phase status

This tracks what's built against the master brief's phase order (§7), so the
next session picks up in the right place instead of re-deriving scope.

## What's built (Phase 0 + start of Phase 1)

**Phase 0 — Foundation.** The data model in §6 is instantiated as a Prisma
schema (`apps/api/prisma/schema.prisma`) scoped to what Phase 1 needs —
Identity, CRM, Content (minimal), Pricing (with the immutable snapshot),
Products, Sales documents, and Platform audit logging. Marketplace,
Departures, Booking, Finance, Operations, Communications, Reviews, and Trade
are *not* modeled yet — they're Phase 2+ per the brief's own phase order, and
building their tables now would mean half-finished schema ahead of the
features that use it.

The Phase 0 gate — *"a single sample enquiry can be walked through a
clickable prototype with no ambiguity"* — is satisfied by the seeded golden
path described in `README.md`, run end-to-end through both the API and a
real browser session against the web app.

**Phase 1 — Sales operating system**, first slice:
- Identity/roles with scoped permissions (`Membership.permissions`), not a
  single "Admin does everything" flag — §3.
- CRM: deduplicated contacts, enquiry requests, tasks, pipeline activity log.
- Content: places with park fee rules (residency/age/unit/currency/source
  date) — §4.5's *fee governance*, minus the Phase 4 automated-detection
  workflow (see "Deliberately not built" below).
- Products: tour templates → versioned itinerary days.
- Pricing engine: combines auto-pulled park fees with operator-entered
  supplier cost lines, applies markup/discount/tax/commission, and marks
  which lines are internal-only.
- Quotes: `DRAFT → PENDING_APPROVAL → APPROVED → SENT → ACCEPTED` state
  machine, with `CHANGES_REQUESTED`/`DECLINED` branches. Approval requires
  the `APPROVE_QUOTE` permission — an operator cannot approve their own
  quote (§3 dual control), enforced server-side, not just hidden in the UI.
- **Immutable price snapshot (§1.8, §6):** `PriceSnapshot` rows are written
  once, at acceptance, from the quote's current version, and the application
  layer never updates or deletes them. `QuotesService.getProposalByToken`
  always prefers the snapshot over the live quote version once one exists —
  a later edit to a `TourTemplate` or `ParkFeeRule` cannot change what an
  accepted quote shows.
- Public, tokenized proposal links (no login) that strip internal cost
  lines before they ever leave the server (`clientSafeBreakdown` in
  `packages/shared`) — verified by a real browser test, not just by
  inspection.
- Every consequential action (quote created/approved/sent/accepted) is
  written to `audit_log`.
- Web app: CRM inbox, request detail with an inline quote builder, and the
  public proposal/accept page — React + Vite + Tailwind + TanStack
  Router/Query, per §2.

## Deliberately not built yet (with why)

- **WhatsApp Business API channel** (§4.1/§5/Phase 1 scope item) — needs a
  Meta Business/WhatsApp Cloud API account and a phone number, which is a
  business decision, not an engineering one. The booking/quote services are
  already channel-agnostic (plain REST), so wiring a WhatsApp webhook to call
  the same `CrmService`/`QuotesService` methods is additive, not a rebuild.
- **Automated park-fee change detection** (§4.5) — Phase 4 per §7. Fees are
  currently admin/seed-entered with a source URL and date; the
  scrape-detect-approve pipeline (`fee_change_proposals`) is intentionally
  deferred until the official TANAPA/TALA/NCAA data-sharing relationship is
  pursued, per the brief's own instruction to treat that as the primary
  source and scraping as fallback.
- **Booking, payments, guide manifests, SOS, marketplace, trade portal** —
  all explicitly Phase 2+ in §7. Nothing here should be built ahead of its
  phase.
- **AI itinerary builder / any LLM call** (§4.4, §9) — no LLM provider has
  been chosen yet (see open decisions below), and §9 requires every
  AI-drafted price/content change to carry model/prompt version, sources,
  and a human approval decision. That governance scaffolding (an `ai_jobs`
  table with an approval workflow) should land in the same change as the
  first real AI feature, not before, so it isn't decorative.

## Open decisions (need a human call before the next phase)

Per §11's instruction to ask before locking in irreversible choices:

1. **Payment providers per country.** §2/§4.3 list Stripe plus M-Pesa, Tigo
   Pesa, Airtel Money, MTN MoMo — but the specific aggregator/PSP per rail
   (e.g. which mobile-money gateway integrator for Tanzania) determines the
   `payment_intents`/webhook schema in Phase 2. Needs a decision before
   Phase 2 payment work starts.
2. **Native app timeline.** §2 already resolves this in principle — PWA
   first, Capacitor wrap only once PWA engagement is proven — so no action
   needed until that milestone is reached.
3. **Exact LLM provider/model.** §2 suggests GPT-4o-mini "or equivalent."
   Needs a firm choice (and API key/billing setup) before any Phase 4 AI
   feature is built, since §9's governance fields (model/prompt version)
   are provider-specific.
4. **Pan-African content scope, raised mid-build.** The brief's own §1.7
   sequences this as "Tanzania first, East Africa next, pan-Africa later,"
   with geographic expansion landing in Phase 5 (§7). Partway through this
   build the user asked for the platform to eventually hold *every* national
   park, attraction, and destination across Africa — not just well-known
   ones — for an international audience. The schema already supports this
   with no redesign: `Place.country` and `Organization.country` are
   free-form strings, not hardcoded to Tanzania. What's still open is
   *sequencing*: populating that scale of content is a content-ops effort
   (bulk import via the `import_jobs`/`export_jobs` Platform domain in §6,
   plus partnerships with national tourism boards/park authorities per
   country) rather than a schema change, and the brief's own phase order
   puts it later. Needs a decision on whether to start building the
   bulk-import pipeline and sourcing pan-African park/attraction data now,
   ahead of Phase 5, or hold it until the sales-operating-system core
   (current phase) and booking (Phase 2) are further along.

## Non-negotiables carried forward (don't relax these later)

- `PriceSnapshot` and (once Phase 2 adds it) `BookingTermsSnapshot` are
  write-once. No migration, admin tool, or "quick fix" should ever add an
  UPDATE/DELETE path to either.
- No AI action may silently alter a confirmed price, published content, a
  confirmed booking, or safety-critical information (§9) — every future AI
  feature needs a human-approval step before it lands, not after.
- Scoped permissions, not role-only checks, for anything financial or
  safety-critical (§3) — extend `Permission` in `packages/shared/src/enums.ts`
  rather than adding new role-based `if` checks.
