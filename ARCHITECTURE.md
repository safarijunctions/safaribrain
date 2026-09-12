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

## What's built (Phases 3-5, first slices)

Continuing straight past Phase 2 rather than stopping — three first slices,
one per remaining phase, each scoped to what's actually buildable and
verifiable in this environment (see the network-access note under
"Deliberately not built yet" for what that ruled out).

### Phase 5 groundwork: admin content management (pan-African scope)

The pan-African content question raised mid-build (§1.7: every national
park, attraction, and destination across Africa, eventually) was always a
content-ops problem, not a schema one — `Place.country` was already free
text. What was actually missing was any way to add content without an
engineer running a seed script. `ContentService`/`ContentController` now
have full CRUD for `Place` (gated by a new `MANAGE_CONTENT` permission) and
`ParkFeeRule` (gated by the existing `PUBLISH_FEE` — fee values are
financial, place metadata isn't, so they're scoped separately per §3). The
Admin Portal's new "Content" tab lists places with a country filter and
lets an admin add a place in any country, then attach fee rules to it —
verified by adding Maasai Mara National Reserve (Kenya) and a fee rule to
it live, confirming the country filter picks it up immediately. This
doesn't populate the rest of Africa's content (still a business-development
effort — partnerships, bulk import), but the platform can now grow one
country at a time from today, through the UI, by anyone with the
permission.

### Phase 3: marketplace (public browsing + enquiry)

A `TourTemplate.publiclyListed` flag (off by default, toggled from a new
Admin "Marketplace" tab) controls what a traveler can find at `/marketplace`
— `MarketplaceController` is public (no auth, same reasoning as every other
public route in this app) and deliberately cross-organization: it queries
`publiclyListed=true` templates belonging to a `verified` org rather than
scoping by `organizationId` like every other service in the codebase,
which is why it's its own module rather than an extension of
`ProductsService`. A listing page shows the itinerary and an enquiry form;
submitting it calls straight into the existing `CrmService.createRequest`
(the same method the operator's own "new enquiry" form uses) — a
marketplace lead lands in the identical pipeline as any other enquiry, not
a second-class queue, with the listing title prepended to `notes` for
context and `interests` set from it. No pricing is exposed at any point in
this flow (`TourTemplate`/`TemplateVersion` never carried pricing — that's
computed per-quote — so there's nothing to accidentally leak). Verified
end-to-end: browsed the seeded listing, submitted an enquiry as "Peter
Otieno" from Kenya, and confirmed it appeared in the operator's CRM inbox
with the correct contact, party size, and marketplace-sourced note.

### Phase 4: AI governance + first real feature (itinerary drafting)

The `AiJob` model (using the `AiJobKind`/`AiJobApprovalStatus` enums already
scaffolded in `packages/shared` since Phase 0/1 but never backed by a table)
is the governance record §9 requires: every AI output is written as
`DRAFTED` with its prompt and the model that produced it, and nothing it
contains can become real content until a human calls the approve endpoint
with a payload they control — `AiJobsService.approveItinerary` builds the
`TourTemplate` from the *submitted* `ApproveItineraryDto`, not from the
job's stored `output`, so an edited title/day wording actually is what gets
created, not just cosmetically re-displayed. The approval records who
decided and when (`decidedById`/`decidedAt`) and links back to what it
created (`resultEntityType`/`resultEntityId`); a job can't be approved
twice (`BadRequestException` if already decided).

The one real feature built on this: an operator describes a trip in plain
language, `LlmService` calls Anthropic's Messages API using whatever
`LLM_PROVIDER` credentials an admin has stored via Integrations, and the
result is parsed into a day-by-day draft the operator can edit inline
before approving it into a real `TourTemplate` (unpublished by default —
listing it on the marketplace is still a separate, deliberate step). This
client is intentionally Anthropic-specific rather than a speculative
multi-vendor abstraction — see the network-access note below for why that
was the only provider this environment could even reach to build against,
and a second provider is additive whenever there's a second real feature
that needs one, not before.

**What's verified and what isn't, specifically:** the "not configured" path
(current state — no LLM integration exists) was verified live in a browser,
showing a clear actionable error. Adding a real (but intentionally invalid)
API key via the Integrations UI and generating a draft confirmed the entire
pipeline — credential retrieval, the HTTPS request reaching
`api.anthropic.com`, and Anthropic's own `401 authentication_error` — surfaces
correctly in the UI rather than crashing. The approve→create-template path
was verified by seeding a synthetic `DRAFTED` job directly and driving it
through the real approve endpoint: confirmed the created template used the
*edited* title/description (not the AI's raw output), confirmed
`resultEntityType`/`resultEntityId`/`decidedById` were set correctly, and
confirmed a second approve attempt on the same job is rejected. What's
*not* verified is an actual model completion — this environment has no
Anthropic API key available to call the endpoint successfully, so the
`parseItineraryResponse` JSON-parsing path has been reviewed but not
exercised against a live response. Whoever configures a real key should
sanity-check one draft before relying on this.

## What's built: the second buying mode (fixed departures, seat-map checkout)

§1's product principles are numbered "do not violate," and #2 reads: *"Two
buying modes. Support both custom safari enquiries (quote → negotiate →
book) and instant booking on fixed joinable departures (seat-map
checkout)."* Every prior batch in this build implemented the first mode
only — this one adds the second, which §10.7 also names directly as an
acceptance gate: *"a fixed departure prevents two users from buying the
same seat and releases expired holds automatically."*

- **Schema** (`Departure`, `Seat`): a `Departure` is a `TourTemplate` sold
  on a fixed date at a fixed price per seat; `Seat` rows are generated when
  the departure is created (`DeparturesService.generateSeats` — rows of 3,
  first row `FRONT`, outer seats `WINDOW`, middle `AISLE`, matching §4.2's
  named seat types). `Booking.quoteId` was made nullable and
  `Booking.departureId` added so the *same* `Booking` model serves both
  buying modes — a seat-map booking has `departureId` set and `quoteId`
  null, a quote-negotiated one the reverse. This was a deliberate reuse
  decision, not a shortcut: every existing operator tool (`BookingPanel`,
  payment recording, guide manifest, receipt/e-ticket PDFs, the public
  `/booking/:token` status page) works on a seat-map booking with zero new
  code, verified live — see below.
- **Concurrency-safe holds** (`DeparturesService.holdSeats`): the one hard
  correctness requirement in this slice. A hold-acquisition transaction
  runs at Postgres `SERIALIZABLE` isolation — when two requests race for
  the same seat, Postgres aborts one with a genuine serialization failure
  (Prisma surfaces this as error code `P2034`) rather than both believing
  they succeeded; the loser gets a clean `409` naming the seat, with a
  bounded retry (up to 3 attempts) so legitimate concurrent holds on
  *different* seats in the same departure don't spuriously fail each
  other. This is a DB-level guarantee, not an application-level race that
  happens to usually work — see the concurrency test below for what "no
  double booking" actually meant to verify.
- **Lazy hold expiry**: a hold lasts 5 minutes (`HOLD_MINUTES`). Rather
  than requiring a reliable background sweep job (infrastructure this
  environment can't verify runs on schedule), every read path treats
  `status=HELD && heldUntil <= now()` as available — `effectiveStatus()` in
  `DeparturesService` and the same condition inline in `holdSeats`'s
  transaction. A seat is functionally released the instant its hold lapses
  from every caller's perspective, even though the stale `HELD` row isn't
  proactively cleaned up. Documenting this explicitly since it's a
  deliberate tradeoff, not an oversight — a production deployment with
  real infrastructure could add a sweep job as a pure optimization (freeing
  up unused rows) without changing correctness.
- **Public flow**: `MarketplaceListingPage` shows upcoming departures under
  the itinerary; each links to `/marketplace/departures/:id`
  (`DepartureSeatMapPage`) — a seat grid (colored by available/held/booked,
  "held by you" highlighted separately from "held by someone else"), a
  client-generated `holderToken` (`crypto.randomUUID()`, stored in
  `sessionStorage`, same unguessable-token trust model as
  `ProposalLink`/`Booking.ticketToken` — no account needed, per §5), a hold
  button, a live countdown, and a contact form that calls the confirm
  endpoint and redirects straight into the existing
  `/booking/:token` status page.
- **Staff side**: the Admin Portal's "Marketplace" tab gained a
  "Departures" section per template — open a departure (date, price/seat,
  seat count), see booked/held counts against the total. Gated by
  `MANAGE_CONTENT`, same permission as the publicly-listed toggle.
- **Verified, not just built**: this is the one feature in the whole build
  where I ran an actual concurrency test rather than reasoning about
  correctness from the code. Fired 10 genuinely simultaneous `hold` requests
  (`Promise.all`, ten different `holderToken`s) at the *same* seat —
  exactly 1 succeeded, the other 9 got a clean `409`. Separately, fired 6
  simultaneous holds at 6 *different* seats in the same departure and
  confirmed all 6 succeeded (proving the retry logic doesn't cause false
  conflicts between unrelated seats). Then drove the full public flow in a
  real browser — pick seats, watch the price update, hold, watch the
  countdown, fill the contact form, confirm, land on the booking status
  page with the correct itinerary/total/balance — and confirmed the
  resulting booking appears correctly in the operator's CRM (stage
  `BOOKED`, correct party size, a note identifying it as an instant seat
  booking) with the full existing `BookingPanel` (travelers, payments,
  guide assignment, both PDFs) working on it unmodified. Confirmed
  permission boundaries: creating a departure without `MANAGE_CONTENT`
  gets 403, unauthenticated gets 401; attempting to hold an already-booked
  seat gets 409; re-using a consumed hold token to book again gets 400.

## What's built: post-trip reviews and offline trip access

Two more explicit gates closed in this pass — §4.1's "traveler reviews
(verified post-trip only)" plus §7 Phase 3's own stated gate ("post-trip
review invite and moderation"), and §10.9's acceptance criterion ("the
traveler can open essential trip details offline").

**Reviews.** A `Review` is tied to a specific `Booking` (one per booking,
enforced by a unique constraint) and can only be submitted once staff mark
that booking `COMPLETED` (`BookingsService.markCompleted`, a new button in
`BookingPanel` — no automatic "trip must be over by now" inference, a human
confirms it happened). Every review starts `PENDING` and is invisible on
the public marketplace until a human with `MODERATE_LISTING` publishes or
rejects it from the new Admin "Reviews" tab, which can also post a public
operator reply. `tourTemplateId` is denormalized onto the review at
submission time (read off the booking's quote or departure, whichever
produced it) so the public `GET /marketplace/templates/:id/reviews`
endpoint — average rating + published reviews — doesn't need to join back
through Booking on every request. Verified end-to-end: recorded a full
payment, marked the booking completed, submitted a 5-star review from the
booking status page, confirmed a second submission on the same booking is
rejected, confirmed an operator without `MODERATE_LISTING` gets 403 trying
to moderate it, published it and posted a reply as admin, and confirmed it
then appears — with the reply — on the public marketplace listing.

**Offline trip access.** `apps/web/public/sw.js` is a minimal service
worker, registered only in production builds (`import.meta.env.PROD` —
Vite's dev server and HMR don't mix well with a caching layer, and there's
nothing to gain from it in dev). Scope is deliberately narrow: it caches
navigations and the `/api/bookings/public/:token` response network-first
with a cache fallback, plus the hashed JS/CSS build assets cache-first.
Nothing else — every other API call, and every PDF download, always hits
the network live, and **no `POST`/`PATCH`/`DELETE` request is ever
intercepted or cached**, so a payment or a review can never appear to
succeed while offline (§8's explicit requirement). `BookingStatusPage` also
tracks `navigator.onLine` directly and shows an explicit banner plus grays
out the PDF download buttons and the review form when offline, rather than
letting a write action fail silently or confusingly.

**This was verified against a real offline browser context, not assumed
from the code:** opened a completed booking's status page once online (so
the service worker installs and caches it), confirmed the worker reached
`activated` state, then set the Playwright browser context fully offline
and reloaded the *exact same URL* — the itinerary, payment history, and
even the just-published review still rendered correctly, with the offline
banner showing and both PDF buttons correctly disabled. That's the actual
acceptance bar §10.9 sets, not just "a service worker file exists."

## What's built: vehicle compliance and supplier confirmations

The last two explicit gates in Phase 2's "Booking **and trip delivery**"
title (§7/§4.3): a fleet an operator can actually track compliance on, and a
per-booking checklist for the lodges/permits/transport a trip depends on.

**Fleet compliance.** `Vehicle` is an org-owned asset (`name`,
`registrationNumber`, `capacity`, `status`, `insuranceExpiry`,
`inspectionExpiry`) — deliberately not tied to any one booking, since the
same vehicle serves many trips over its life. Whether it's road-legal is
computed at read time from its expiry dates (`FleetService`'s
`computeComplianceStatus`: `EXPIRED` / `EXPIRING_SOON` (30-day window) /
`OK` / `NOT_TRACKED`) — the same lazy-evaluation pattern `Departure` hold
expiry already uses, so there's no sweep job to keep a stored status field
correct. Every write (`POST`/`PATCH`/`DELETE /fleet/vehicles`) is gated by a
new `MANAGE_FLEET` permission — safety-critical per §3, so it's scoped
separately from `MANAGE_CONTENT`/`ADMIN` rather than folded into either.
Reads are unrestricted to any authenticated staff member, same as the CRM
data everyone already sees, since assigning a vehicle to a booking
(`BookingsService.updateLogistics`, extended with `vehicleId` alongside the
existing guide fields) needs the list without needing fleet-management
rights itself — the assignment is validated to belong to the same org
(`NotFoundException` otherwise), same cross-tenant guard every other
`getOwned`-style lookup in this codebase uses. The assigned vehicle now
also appears on the staff-only guide manifest PDF next to the guide/driver
line; the public booking page was re-checked to confirm it still never
appears there.

**Supplier confirmations.** `SupplierConfirmation` is a simple per-booking
checklist row (`supplierName`, `supplierType` free text, `status`
PENDING/CONFIRMED/DECLINED, `referenceCode`, `neededBy`, `confirmedAt`) —
independent of the booking's payment status, since a fully-paid trip can
still have an unconfirmed lodge booking. No new permission gates it: adding
and updating confirmations is booking management, the same access level
`addTraveler`/`recordPayment` already use, not a financial or safety action
in its own right. `confirmedAt` is set/cleared automatically by
`updateSupplierConfirmation` based on the status transition rather than
being a field the caller sets directly, so it can't drift from the status
it's supposed to describe.

**Verified end-to-end**, not just by reading the code: created a vehicle
with an insurance date inside the 30-day window via the Admin Portal's new
"Fleet" tab and confirmed it rendered "Expiring soon"; confirmed a
non-`MANAGE_FLEET` operator gets 403 creating a vehicle but can still list
them; assigned that vehicle and a guide to a real seat-map booking from
`BookingPanel` and confirmed both the operator-facing panel and the
downloaded guide manifest PDF showed it (decoded the PDF's compressed
content stream directly to confirm the literal text, not just that the
code path runs); confirmed a bogus `vehicleId` on the logistics endpoint
returns 404 rather than silently accepting a cross-tenant or non-existent
vehicle; added a supplier confirmation, confirmed it defaulted to PENDING,
then confirmed it (with a reference code) and separately declined a second
one from the UI, watching the status pill and `confirmedAt` update
correctly in both directions; confirmed the public `/booking/:token` JSON
never includes `vehicle`, `guideName`, or `supplierConfirmations` at any
point in this flow.

## What's built: AI reply drafting (second `AiJobKind`, Phase 4 continued)

The second real feature on the `AiJob` governance pattern introduced for
itinerary drafting (§9) — an operator can now have an AI draft a first-reply
message for a new enquiry, directly from the request detail page's new "AI
reply assistant" card.

`AiJobsService.draftReply` builds a prompt from the enquiry's own contact
name, party size, stated interests, budget tier, and notes, calls
`LlmService` the same way itinerary drafting does, and writes an `AiJob`
row (`kind: REPLY_DRAFT`, `status: DRAFTED`) — nothing is sent or logged
anywhere yet. `AiJob` gained a nullable `requestId` FK for this: itinerary
drafts aren't tied to any one enquiry, but a reply draft always is, and the
request detail page needs to list only its own drafts.

Unlike the itinerary drafter, this one isn't gated by `MANAGE_CONTENT` —
drafting a reply doesn't create catalog content or touch money, so it only
requires the same authenticated-org-member access every other CRM action
(adding a traveler, recording a payment) already uses. It lives in its own
`ReplyDraftsController` at `ai/reply-drafts` for exactly that reason, next
to but separate from `AiJobsController`.

**The human-approval non-negotiable, extended to this feature specifically:**
`approveReply` never uses `job.output.replyText` (the AI's raw draft) — it
takes the text from the submitted `ApproveReplyDto`, so an operator's edits
before sending are what actually gets recorded, the same
submitted-payload-over-stored-output pattern `approveItinerary` established.
Approval writes a `PipelineEvent` at the request's *current* stage rather
than forcing a stage transition — approving a reply is an activity-trail
entry, not a pipeline move — and the UI's "Approve & copy" button copies
that exact edited text to the clipboard in the same action, since no
messaging integration is live yet to actually send it (§11, same reasoning
as the deferred WhatsApp channel).

**Verified end-to-end:** the not-configured path (no LLM integration) gives
a clear 400, confirmed live; adding a real-shaped but intentionally invalid
`LLM_PROVIDER` credential and drafting a reply confirmed the request
actually reaches `api.anthropic.com` and Anthropic's own
`401 authentication_error` surfaces correctly in the UI rather than
crashing — same discipline as the itinerary drafter, and for the same
reason (no real Anthropic key available in this environment). The
approve/reject paths themselves don't depend on a live completion, so they
were driven for real: seeded a synthetic `DRAFTED` job directly, approved
it with edited text different from the stored `output`, and confirmed the
resulting `PipelineEvent.note` contains the edited text (not the original
draft), the request's `stage` was untouched, a second approval attempt on
the same job is rejected, and a separate job rejected via "Discard" cannot
later be approved. Also confirmed cross-kind isolation: an `ITINERARY_DRAFT`
job's id returns 404 through the `reply-drafts` reject route, and vice
versa — `reject()` now takes an explicit `AiJobKind` rather than assuming
one, so the two features can't accidentally act on each other's jobs.

## Hardening pass: a targeted code review, not a rewrite

Prompted by an explicit "no bugs, no misunderstanding" ask, this pass ran a
focused correctness review across everything built so far (~6,800 lines
since the last point `main` was merged) rather than adding a new feature.
Three findings came back; a fourth and a class of UI gaps surfaced while
verifying the fixes by hand. All four are fixed and re-verified with real
requests, not just re-read.

**1. CI was silently broken on every push.** `.github/workflows/webpack.yml`
was a generic "NodeJS with Webpack" template (added directly via the GitHub
UI, outside this build) that ran `npm install` + `npx webpack` — but this
repo is a pnpm workspace with no webpack config anywhere, so it failed on
every single push/PR and gave no real signal. Replaced with
`.github/workflows/ci.yml`: `pnpm install --frozen-lockfile` then `pnpm
build`, which exercises the exact typecheck+build path this build has run
before every push throughout the project.

**2. `QuotesService.accept()` had a genuine double-accept race.** The status
check (`quote.status !== SENT`) happened outside the transaction that
creates the `PriceSnapshot`/`Booking`, so two concurrent `accept()` calls —
a double-click, a client retry, the proposal link open in two tabs — could
both read `SENT` before either committed. The loser would then hit a raw
unique-constraint violation on `bookings_quoteId_key` and the whole batch
would roll back as an unhandled 500, instead of a clean "already accepted."
Fixed by making the transaction's first statement a conditional
`updateMany({ where: { status: SENT }, data: { status: ACCEPTED } })`: only
one concurrent caller can ever flip that row, so every other caller sees
`count 0` and gets a clean `BadRequestException` instead. Applied the same
guard to `requestChanges()`, which had the identical shape of race.
**Verified for real**, the same way the seat-hold concurrency was verified
earlier in this build: fired 10 genuinely simultaneous `accept()` requests
at the same proposal token (`Promise.all`) — exactly 1 succeeded, the other
9 got the clean "already accepted" 400, and the database ended up with
exactly one `Booking` and one `PriceSnapshot` for that quote, not zero, not
two.

**3. `BookingsService.recordPayment()` had no upper bound.** A payment
amount was validated as `> 0` and nothing else — a fat-fingered figure
(typing 6600 instead of 660) would silently overpay a booking, flip it to
`PAID`, and leave the receipt/e-ticket PDFs showing a nonsensical negative
balance due. Fixed by rejecting any amount greater than the booking's
actual remaining balance, computed fresh from `totalPrice - amountPaid`
before the payment is written. **Verified**: an amount over the total is
rejected with the exact remaining balance in the message; a partial payment
followed by exactly-the-remaining-balance succeeds and flips the booking to
`PAID`; any further payment against a fully-paid booking is correctly
rejected as "exceeds the remaining balance due (0.00)."

**4. `QuotesController.decide()` bypassed all input validation.** Found
while re-testing fix #2: the endpoint's body was typed as a plain inline
TypeScript object literal (`{ decision: "APPROVED" | "REJECTED"; reason?:
string }`) rather than a class. NestJS's global `ValidationPipe` — active
and enforced (`whitelist: true, forbidNonWhitelisted: true`) on every other
endpoint in this codebase — only validates class-typed bodies, so this one
endpoint silently skipped it: a malformed request reached Prisma raw and
surfaced as an ugly 500 (`Argument decision is missing`) instead of a clean
400. Added `DecideQuoteDto` with `@IsIn(["APPROVED", "REJECTED"])`, matching
every other mutating endpoint's existing DTO-class convention. Confirmed
live: the same malformed body that previously 500'd now returns a proper
`400` naming exactly what's wrong.

**5. Several consequential actions failed silently in the UI.** A pass
across every `useMutation` in `apps/web` found a handful where a rejected
mutation showed nothing at all — the button just stopped spinning, with no
indication anything went wrong. For record-keeping and lead-generation
actions specifically, that's a real "did it work?" gap, not cosmetic.
Added error display to: `BookingPanel`'s record-payment form (the
overpayment guard above would otherwise fail silently); `ProposalPage`'s
accept/request-changes buttons, which also now refetch on error so a
losing "already accepted" race (client double-click, two open tabs)
self-heals into the correct "🎉 Accepted" state instead of leaving the
visitor stuck looking at a form for something that, in fact, already went
through; `ReviewsPanel`'s publish/reject/reply actions; the admin owner-
reassignment dropdown on the request detail page; and the CRM inbox's
"create enquiry" form, where a silently-dropped lead would be the worst
version of this bug. Verified the overpayment case renders correctly in a
real browser screenshot, not just reasoned about.

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
  first-class method, not a stopgap). This is deliberately *not* built in
  this pass, and specifically because it can't be — see "A note on network
  access" immediately below, not because of any remaining design question.
  The extension point (`IntegrationsService.getEnabledForCategory(orgId,
  "PAYMENT")`) is unchanged from Phase 1 and ready whenever a session with
  real network access and a test-mode Stripe/M-Pesa credential can build
  and actually verify it.
- **SOS/medevac** — the one still-unbuilt piece of Phase 2's "Booking and
  trip delivery" scope per §7/§4.3. Guide manifests, offline trip access,
  vehicle compliance, and supplier confirmations are now built (see
  below); SOS/medevac specifically needs a real dispatch-partner
  integration (e.g. AMREF Flying Doctors) to be more than a UI mockup, so
  it's deferred until that partnership exists rather than half-built.
- **Trade portal, remaining Phase 4 automation (translation, fee
  extraction, news summary — the other `AiJobKind` values; `REPLY_DRAFT` is
  now built, see below), super-app/native app** — Phase 3's marketplace and
  Phase 4's AI-governance pattern now have two real slices; these are the
  remaining pieces of those same phases. `TRANSLATION` and `FEE_EXTRACTION`
  specifically would need either a chosen target-locale content model or a
  real external data source to fetch from — neither is a network-access
  problem like payments, just scope deferred to keep each batch reviewable.

### A note on network access (why the payment gateway wasn't attempted)

This build session's sandbox has no general internet access — only an
allowlisted set of dev-infra hosts (npm, GitHub, `api.anthropic.com`) are
reachable; confirmed directly with `curl` against `api.stripe.com`,
`api.openai.com`, and a plain `google.com` request, all of which fail at
the network layer before any credential is even sent. There is also no
Stripe/M-Pesa/OpenAI credential available to test against even if there
were network access. Every other integration in this codebase (payment
methods, WhatsApp, SMS, the AI itinerary drafter) was built *and verified
end-to-end* before being considered done, including the negative paths —
that discipline is the reason bugs like the leaked password hash and the
dropped `commissionPercent` were caught during this build instead of in
production. Writing a Stripe `checkout.session.create` call, a webhook
signature verifier, and the currency/idempotency handling around real
money, and shipping it *unable to run it even once*, would break that
discipline for the highest-stakes code in the app. The Anthropic-backed AI
feature above got to ship specifically because `api.anthropic.com` turned
out to be reachable — that was verified with `curl` before writing a line
of the feature, not assumed.
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
3. **Exact LLM provider/model** — partially resolved, not fully. §2
   suggests GPT-4o-mini "or equivalent"; this pass's one AI feature
   (itinerary drafting, see above) is coded against Anthropic's Messages
   API specifically, not because Anthropic was chosen as *the* platform
   answer, but because this build session's sandbox can only reach
   `api.anthropic.com` among LLM vendors (verified with `curl`, OpenAI's
   API is unreachable from here) — see "A note on network access" above.
   The `ai_jobs.model` field already records which model produced each
   draft, so nothing about the governance schema is Anthropic-specific;
   what's still an open, unmade decision is whether Anthropic is the
   product's actual choice going forward or just what one dev session
   could reach, and whether a second provider is worth the abstraction
   once there's a second real feature that needs one.
4. **Pan-African content scope, raised mid-build** — groundwork shipped
   this pass, sourcing is still open. The brief's own §1.7 sequences this
   as "Tanzania first, East Africa next, pan-Africa later," with geographic
   expansion landing in Phase 5 (§7). The schema already supported this
   with no redesign (`Place.country`/`Organization.country` are free-form
   strings), and now there's a UI for it too: the Admin Portal's "Content"
   tab lets an admin add a place (any country) and its fee rules directly,
   without an engineer running a seed script — verified live by adding a
   Kenyan park. What's still open is *sourcing at scale*: getting the rest
   of Africa's parks/attractions into the system is a content-ops effort
   (bulk import, partnerships with national tourism boards/park
   authorities per country), not a schema or tooling gap anymore. Needs a
   decision on whether to invest in a bulk-import pipeline now or keep
   adding countries one at a time through the UI as they come up.

## Non-negotiables carried forward (don't relax these later)

- `PriceSnapshot` and `BookingTermsSnapshot` are write-once. No migration,
  admin tool, or "quick fix" should ever add an UPDATE/DELETE path to
  either.
- No AI action may silently alter a confirmed price, published content, a
  confirmed booking, or safety-critical information (§9) — every future AI
  feature needs a human-approval step before it lands, not after. `AiJob`
  now enforces this in code, not just in principle: `AiJobsService`'s
  create-on-approve methods build the resulting entity from the human's
  *submitted* payload, never from the stored AI `output` directly — extend
  this pattern for every future `AiJobKind`, don't shortcut it.
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
