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
  which lines are internal-only. `PriceBreakdownDto.commissionPercent` is
  now persisted alongside `commissionAmount` (it wasn't originally — only
  the computed amount was kept, silently dropping the actual business
  input), so a revised quote's form can be pre-filled exactly rather than
  reverse-engineered from a rounded amount.
- Proposal engagement tracking (§4.4 "engagement tracking"):
  `ProposalLink.openedAt` was already recorded server-side on first view but
  never surfaced anywhere — `QuoteCard` now shows "Client opened it [time]"
  next to the quote status.
- Quotes: `DRAFT → PENDING_APPROVAL → APPROVED → SENT → ACCEPTED` state
  machine, with `CHANGES_REQUESTED`/`DECLINED` branches. Approval requires
  the `APPROVE_QUOTE` permission — an operator cannot approve their own
  quote (§3 dual control), enforced server-side, not just hidden in the UI.
  The `CHANGES_REQUESTED` branch is a real, closed loop, not just a status
  value: when a client requests changes on the public proposal page, the
  operator gets a "Revise & resubmit" form in `QuoteCard` pre-filled from
  the rejected version's supplier cost lines and pricing knobs (park-fee
  lines are left out since those recompute automatically from the quote's
  pinned template version), which calls the existing `POST
  /quotes/:id/revise` endpoint, drops the quote back to `DRAFT`, and reuses
  the same `ProposalLink` token on resend — the client's original link
  stays valid rather than needing a new one. Closes what was a real gap:
  the negotiation half of the CRM lifecycle (§4.7 "new → quoted →
  negotiating → booked") had an API for this but no UI action for it.
  Verified end-to-end in a browser: client requests changes → operator
  revises the markup → resubmits → manager re-approves → resends → client
  accepts the revised price, which freezes correctly into the snapshot.
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
- **Admin Portal — Integrations and Team** (§4.9, resolves the payment/AI
  provider decision below): an `Integration` model
  (`organizationId`, `provider`, `category`, `config`, `secrets`, `enabled`)
  lets an admin add Stripe/M-Pesa/Tigo Pesa/Airtel Money/MTN
  MoMo/WhatsApp/SMS/SMTP/LLM credentials from the running app instead of the
  team hardcoding a provider at build time. `secrets` is write-only —
  `IntegrationsService` never returns saved secret values, only a
  `secretsConfigured` boolean and which keys are set — verified by API test
  and by reading the response back in a browser session. Gated by a new
  `MANAGE_INTEGRATIONS` permission, separate from `MANAGE_USERS`/`ADMIN`, so
  credential access can be granted narrowly (§3). The actual per-provider
  SDK calls (a real Stripe charge, a real M-Pesa STK push) still need to be
  written when Phase 2 booking/payments lands — this is the credential
  storage and admin UI for them, not the payment processing itself. The
  extension point for that future work is
  `IntegrationsService.getEnabledForCategory(organizationId, "PAYMENT")`.
- **Admin Portal — user management**: list org members, invite a new person
  (role + granular permissions), edit an existing member's
  role/permissions, revoke access. Invites without an email/SMS integration
  configured surface a one-time temporary password for the admin to share
  out of band, rather than being half-built waiting on that integration.
- **Admin Portal — overview dashboard** (§4.9 "basic admin/.../dashboard"):
  requests by stage, quotes by status, accepted revenue (summed from
  `PriceSnapshot`, grouped by currency since an org can enable more than
  one), team size, integrations enabled, open tasks. Deliberately just
  counts/sums with no charting library — a real analytics view with
  time-series and segmentation is explicitly Phase 4 (§4.9 "analytics").
- **Branded proposal PDF** (§4.4 "branded PDF export" / §7 Phase 1 "web +
  PDF"): `GET /proposals/:token/pdf` renders the same client-safe
  breakdown the public proposal page shows (internal cost lines already
  stripped upstream in `QuotesService.getProposalByToken`, so the PDF
  renderer never sees them either) via `pdfkit` — a pure-JS, no-native-deps
  library chosen over a headless-browser approach specifically because it
  keeps the rendered file small (~2.5KB for the seeded 4-day itinerary),
  which matters given §5's low-bandwidth/data-cost principle. Linked from
  both the public proposal page and the operator's quote card.

## What's built (Phase 2 — Booking and trip delivery, first slice)

Per §7's phase order, this is the first Phase 2 slice: a booking is created
the moment a client accepts a proposal, and staff can then manage travelers,
record manual payments, and hand the client a status page and PDFs — no
payment gateway integration yet (see "Deliberately not built" below).

- **Schema** (`apps/api/prisma/schema.prisma`): `Booking` (status, currency,
  totalPrice, amountPaid, a public `ticketToken`), `BookingTermsSnapshot`
  (write-once, same pattern as `PriceSnapshot` — see "Non-negotiables"),
  `Traveler`, and `Payment` (amount, method, optional reference, who
  recorded it).
- **Booking is created automatically on acceptance, nowhere else.**
  `QuotesService.accept()` — inside the same `$transaction` that already
  writes the `PriceSnapshot` — now also creates the `Booking` with a nested
  `BookingTermsSnapshot` whose `itinerary` JSON is frozen from the quote's
  pinned template version (days, meals, places) at that exact moment. Later
  edits to the `TourTemplate` cannot change what an already-booked client
  sees, for the same reason the price snapshot is immutable.
- **`BookingsService`** (`apps/api/src/bookings/`) — everything *after* a
  booking exists: add a traveler, record a payment. Status is a pure
  function of `amountPaid` vs `totalPrice`: `PENDING → CONFIRMED` (first
  payment) `→ PAID` (fully paid); `ACTIVE`/`COMPLETED`/`CANCELLED` are
  trip-lifecycle states this pass deliberately doesn't touch. Recording a
  payment is itself a consequential, audited action (§1.3) — a payment only
  ever enters the system because a human typed it in, never automatically;
  every call writes to `audit_log`.
- **Payment methods, this pass**: bank transfer, cash, manual mobile money
  — the brief's own §4.3 lists "manual bank transfer with proof upload" as
  first-class, not a fallback. No gateway SDK call (Stripe charge, M-Pesa
  STK push) is wired yet; that's the real Phase 2 work the
  `IntegrationsService.getEnabledForCategory(orgId, "PAYMENT")` extension
  point (added in Phase 1) exists for.
- **Invoice/receipt and e-ticket PDFs** (`BookingPdfService`, same `pdfkit`
  approach and hand-matched brand colors as the proposal PDF, for the same
  low-bandwidth reasoning — §5): a receipt PDF is always available; the
  e-ticket — which embeds a QR code (`qrcode` npm package) linking to the
  public booking-status page — is only issued once the booking is fully
  paid (`BadRequestException` otherwise), enforced server-side in
  `BookingsPublicController`, not just hidden in the UI.
- **Public, tokenized booking pages** (`BookingsPublicController`, no auth
  guard — same reasoning as the proposal link: a traveler opens it directly
  from WhatsApp/email/the PDF's QR code, no account needed): `GET
  /bookings/public/:token` returns a client-safe view that strips internal
  detail the way `clientSafeBreakdown` already does for proposals —
  payment `reference` and `recordedBy` stay internal, only
  amount/method/date reach the client. `apps/web/src/pages/
  BookingStatusPage.tsx` renders it in the same visual language as
  `ProposalPage.tsx` (gradient header, itinerary, payment table, balance
  due, receipt/e-ticket download buttons), reachable at `/booking/$token`.
- **Operator `BookingPanel`** (`apps/web/src/components/BookingPanel.tsx`),
  wired into `RequestDetailPage.tsx` once a booking exists: status badge,
  balance-due hint, inline add-traveler and record-payment forms, the
  payment ledger, and links to both PDFs plus the client-facing status URL.
- Verified end-to-end in a real browser session, not just by inspection:
  draft a quote → submit for approval → a manager (not the drafting
  operator, per §3 dual control) approves → operator sends → client accepts
  the public proposal → booking appears on the request page as `PENDING` →
  add a traveler → record a partial payment (status → `CONFIRMED`) → record
  the remaining balance (status → `PAID`, e-ticket link appears) → both
  PDFs download correctly → the public `/booking/:token` page renders
  correctly on both desktop and a 390px mobile viewport. Confirmed
  server-side permission boundaries: an unauthenticated request to the
  org-scoped `/bookings` endpoint gets 401; an unknown token on any public
  booking endpoint gets 404 rather than leaking existence.

### Guide manifests (trip delivery, continued)

The other half of Phase 2's "Booking **and trip delivery**" title (§7): once
a booking exists, staff need an operational day sheet for whoever is
actually driving/guiding the trip — this is deliberately a different
document from anything the client sees.

- **Guide/pickup logistics on `Booking`**: `guideName`, `guidePhone`,
  `pickupNotes` — plain text fields, not a `User` foreign key. Guides and
  drivers in this business are frequently contracted, not platform account
  holders, so modeling this as a relation to `User` would have been wrong
  for the common case. Editable from the operator's `BookingPanel` via
  `PATCH /bookings/:id/logistics`.
- **Traveler passport/DOB capture, actually wired up**: `AddTravelerDto`
  already supported `dateOfBirth`/`passportNumber` from the first Phase 2
  slice, but the web form only ever collected `fullName` — a real gap, since
  a manifest without passport numbers is useless for the park-gate entry
  logs it exists for. The "Add traveler" form now has both fields
  (optional, since not every trip needs them at booking time).
- **`GET /bookings/:id/manifest.pdf`** (`BookingPdfService.renderManifest`)
  — the one PDF in this system that is deliberately *not* client-safe: it
  lists every traveler's passport number and date of birth, plus the
  assigned guide's contact details and pickup notes. It lives only on
  `BookingsController` (JWT-guarded, staff-only) and has no counterpart on
  `BookingsPublicController` — confirmed by grep, not just by omission, and
  by a live 401 on an unauthenticated request. The client-facing booking
  status page and its public JSON endpoint were re-checked to confirm
  neither field ever appears there.
- Verified end-to-end in a real browser: assigned a guide with phone and
  pickup notes, added a traveler with a passport number and date of birth,
  confirmed both persist and render correctly in the panel on both desktop
  and a 390px mobile viewport (the traveler form's `grid-cols-2
  sm:grid-cols-4` collapses cleanly), downloaded the manifest PDF via a
  fetch-as-blob flow (a plain `<a href>` can't carry the Bearer token this
  endpoint requires — `api.getBlob` fetches with the auth header and opens
  an object URL instead), and confirmed the public booking JSON for the
  same booking still omits `guideName`/`guidePhone`/`pickupNotes` and every
  traveler's `dateOfBirth`/`passportNumber`.

## Visual design

The app now has an actual brand identity instead of default Tailwind gray/
blue: an "African savanna" theme — `clay` (terracotta, primary), `acacia`
(deep green, secondary/success), `sunset` (amber, accents) — defined in
`apps/web/tailwind.config.js`, with Fraunces for headings and Inter for
body text (Google Fonts, loaded in `apps/web/index.html` with a system-font
fallback stack so nothing breaks if the fonts don't load). Applied
consistently across every screen, not just the client-facing ones — the
same tokens drive the internal CRM/admin UI, the public proposal page, and
the proposal PDF (`ProposalPdfService`'s colors are hand-matched to the
same hex values), so the whole product reads as one brand rather than an
internal tool bolted to a polished client page. A small hand-drawn
`AcaciaSilhouette` component (two SVG shapes, no image asset) is the one
decorative touch, used sparingly on the login and proposal pages.

**Mobile layout is a real requirement here, not polish** — §5 states this
explicitly ("design for weak connections and feature phones from day one").
A first pass at the theme left every multi-column screen (request detail,
quote builder, admin forms) broken at phone width: fixed `grid-cols-3`/
`grid-cols-4`/`grid-cols-12` layouts don't collapse, so labels and inputs
overlapped into unusable slivers, confirmed with real 390px-viewport
screenshots rather than just a browser resize. Every such grid now carries
a mobile-first breakpoint (`grid-cols-1 sm:grid-cols-3`, etc.). The subtler
bug this surfaced: a `col-span-N` child left unprefixed inside a container
whose *own* column count is now responsive still forces `N` columns to
exist at any width — CSS grid then invents implicit columns to satisfy it,
which re-breaks the "1 column on mobile" layout even though the container
class looks correct. Every `col-span` in a responsive grid needs the same
breakpoint prefix as its container. Re-verified on both the request-detail
page and the two admin forms that had this exact bug (`UsersPanel`'s invite
form, `CrmInboxPage`'s new-enquiry form) before calling it fixed.

## Admin support tooling

The user's ask — "admin can do everything anywhere so when users have
problems we can help them" — is implemented as scoped, audited support
tools within an org, not a blanket permission bypass or cross-tenant "god
mode." Nothing here reaches outside the admin's own organization; that
would be a different (and much riskier) feature this brief never asked for.

- **Password reset** (`POST /admin/users/:membershipId/reset-password`) —
  the single most common real support request. Generates a fresh one-time
  password with the same reveal-once UX as inviting a new person, so an
  admin can unblock a locked-out teammate without a "forgot password"
  email flow that doesn't exist yet (no SMTP integration configured by
  default — see Integrations above).
- **Audit log viewer** (`GET /admin/audit-log`, new "Audit Log" tab) — the
  `audit_log` table already recorded everything, but nothing surfaced it.
  An admin can now filter by entity type/ID and see exactly what happened
  to a specific quote, request, or user when someone reports a problem,
  instead of needing an engineer to query the database directly. This
  required making `AuditLog.organizationId` a real (required) column
  rather than something derived from `actorId` — a public proposal-token
  action (accept/request-changes) has no actor at all, so scoping by actor
  wouldn't have worked; every `AuditService.record()` call site across
  CRM, quotes, integrations, and user management now passes it explicitly.
- **Request owner reassignment** (`PATCH /crm/requests/:id/owner`) — an
  admin can hand a stuck or orphaned enquiry to a different team member
  (e.g. the original owner is unavailable) directly from the request page.

All three are gated by the `ADMIN` role (owner reassignment, audit log) or
`MANAGE_USERS` permission (password reset) server-side — confirmed a
non-admin gets 403 on each — and every action still writes its own
`audit_log` entry, including the admin's own password resets and
reassignments. Admin visibility doesn't mean admin invisibility.

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
- **Payment gateway integration** — bookings currently take manual
  bank-transfer/cash/mobile-money payments recorded by staff (§4.3, a
  first-class method, not a stopgap). A real Stripe charge or M-Pesa STK
  push against the credentials an admin already stores via Integrations is
  the next Phase 2 slice, at the
  `IntegrationsService.getEnabledForCategory(orgId, "PAYMENT")` extension
  point.
- **PWA offline support, SOS/medevac, vehicle compliance, calendar/supplier
  confirmations** — still-unbuilt pieces of Phase 2's "Booking and trip
  delivery" scope per §7/§4.3. Guide manifests are now built (see above);
  these remaining items need a booking to already exist, which it now does.
- **Marketplace, trade portal, automation (Phase 3-4), super-app (Phase 5)**
  — untouched, per the brief's own phase order. Nothing here should be
  built ahead of its phase.
- **AI itinerary builder / any LLM call** (§4.4, §9) — no LLM provider has
  been chosen yet (see open decisions below), and §9 requires every
  AI-drafted price/content change to carry model/prompt version, sources,
  and a human approval decision. That governance scaffolding (an `ai_jobs`
  table with an approval workflow) should land in the same change as the
  first real AI feature, not before, so it isn't decorative.

## Open decisions (need a human call before the next phase)

Per §11's instruction to ask before locking in irreversible choices:

1. ~~**Payment providers per country.**~~ Resolved by making this
   admin-configurable rather than a build-time decision: an admin adds
   whichever provider(s) they've actually contracted with (Stripe, M-Pesa,
   Tigo Pesa, Airtel Money, MTN MoMo, or manual bank transfer) from the
   Admin Portal's Integrations tab, with credentials stored server-side and
   never re-exposed. What's still open for Phase 2 is the
   `payment_intents`/webhook *schema* — that has to accommodate whatever
   mix of providers an org actually enables, which is now knowable from the
   `Integration` table at implementation time rather than needing to be
   guessed now.
2. **Native app timeline.** §2 already resolves this in principle — PWA
   first, Capacitor wrap only once PWA engagement is proven — so no action
   needed until that milestone is reached.
3. **Exact LLM provider/model.** §2 suggests GPT-4o-mini "or equivalent." An
   admin can now store an `LLM_PROVIDER` integration's API key from the
   Admin Portal (same credential-storage mechanism as payments), so the key
   itself is no longer a blocker — but §9's governance fields (model/prompt
   version recorded on every `ai_jobs` row) are provider-specific, so the
   first Phase 4 AI feature still needs a firm choice of *which* provider's
   client library and model identifiers to code against.
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

- `PriceSnapshot` and `BookingTermsSnapshot` are write-once. No migration,
  admin tool, or "quick fix" should ever add an UPDATE/DELETE path to
  either.
- No AI action may silently alter a confirmed price, published content, a
  confirmed booking, or safety-critical information (§9) — every future AI
  feature needs a human-approval step before it lands, not after.
- Scoped permissions, not role-only checks, for anything financial or
  safety-critical (§3) — extend `Permission` in `packages/shared/src/enums.ts`
  rather than adding new role-based `if` checks.
- `Integration.secrets` is write-only from the API's perspective. No read
  endpoint, log line, or audit entry should ever include a saved secret
  value — only whether one is set and which keys exist
  (`IntegrationsService`'s `toSafeIntegration`/`getEnabledForCategory`
  split already enforces this; keep it that way when this grows into real
  provider SDK calls in Phase 2). For production, `secrets` should also
  move from plain `Json` to encryption-at-rest via a proper secrets
  manager/KMS — the current column is functionally correct for the admin
  workflow but is not yet hardened storage.
