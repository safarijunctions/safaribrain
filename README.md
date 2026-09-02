# SafariBrain

AI-powered, all-in-one safari operating system for East Africa — built for
**Safari Junction's Adventures** ([www.safarijunctionsadventures.co.tz](https://www.safarijunctionsadventures.co.tz)).

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for what's built, what's deliberately
not built yet, and open decisions that need a human call before the next phase.

## Monorepo layout

```
apps/
  api/      NestJS + Prisma + PostgreSQL — the sales operating system backend
  web/      React + Vite + TypeScript + Tailwind + TanStack Router/Query
packages/
  shared/   Enums and DTO shapes shared between api and web
```

## Prerequisites

- Node.js 20+, pnpm (`corepack enable` or `npm i -g pnpm`)
- PostgreSQL 16 (via `docker compose up -d postgres redis`, or a local install)

## Getting started

```bash
pnpm install

# apps/api
cp apps/api/.env.example apps/api/.env   # edit DATABASE_URL if not using docker-compose defaults
pnpm --filter @safaribrain/api prisma:migrate
pnpm --filter @safaribrain/api prisma:seed
pnpm dev:api    # http://localhost:3001/api

# apps/web (separate terminal)
pnpm dev:web    # http://localhost:5173 — proxies /api to the API above
```

Seeded demo accounts (password `safaribrain-demo` for all):

| Role | Email | Notes |
|---|---|---|
| Admin | admin@safarijunctionsadventures.co.tz | All permissions |
| Operator | operator@safarijunctionsadventures.co.tz | Drafts quotes — cannot approve its own (§3 dual control) |
| Sales Manager | manager@safarijunctionsadventures.co.tz | Holds `APPROVE_QUOTE` |

## The golden path this release proves out

1. Sign in as **operator**, open the seeded enquiry from Laura Bennett, build a
   quote against the "Classic Northern Circuit — 4 Days" template.
2. Submit it for approval — note the operator cannot approve their own quote.
3. Sign in as **manager**, approve it, send the proposal.
4. Open the generated `/proposal/:token` link in an incognito window (or just
   a fresh tab) — no login required. Confirm the internal accommodation net
   rate line is *not* shown, only the client-safe breakdown is. Try
   "Download PDF" too — same content, rendered server-side.
5. Accept the proposal as the client. Reload the operator's view — the price
   is now frozen (a `PriceSnapshot` row, write-once) and the request has moved
   to `BOOKED`.
6. Every step above is in `audit_log`.

This matches the Phase 0/1 gate in the master brief: *"a single sample
enquiry can be walked through a clickable prototype with no ambiguity"* and
*"enquiry → priced, approved quote → sent proposal → acceptance, fully
audited."*

## Admin Portal

Sign in as **admin** and open the "Admin" link in the header:

- **Overview** — requests by stage, quotes by status, accepted revenue,
  team size, integrations enabled, open tasks. Read-only, ADMIN-role only.
- **Integrations** — add real credentials for Stripe, M-Pesa, Tigo Pesa,
  Airtel Money, MTN MoMo, WhatsApp Business, SMS, SMTP, or an LLM provider
  whenever you're ready to go live with them. The app works fully without
  any configured — nothing here is required to run the golden path above.
  Secrets are write-only: once saved, the API never returns their values
  again, only whether they're set.
- **Team** — invite people, assign a role, and grant scoped permissions
  (e.g. `APPROVE_QUOTE`, `MANAGE_INTEGRATIONS`) individually rather than an
  all-or-nothing Admin flag. A new person gets a one-time temporary
  password to share with them until an email/SMS integration is configured
  to deliver invites automatically. If someone gets locked out later,
  **Reset password** on their row generates a fresh one.
- **Audit Log** — filterable, paginated history of every consequential
  action in the org (who approved a quote, who reassigned a request, who
  added a payment credential) — the tool for tracing what happened when a
  user reports a problem.

Admins can also reassign a request's owner directly from its detail page
(useful when the original owner is unavailable and a client is waiting).
