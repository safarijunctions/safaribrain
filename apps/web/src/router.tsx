import { createRootRoute, createRoute, createRouter, Outlet, Navigate } from "@tanstack/react-router";
import { LoginPage } from "./pages/LoginPage";
import { CrmInboxPage } from "./pages/CrmInboxPage";
import { RequestDetailPage } from "./pages/RequestDetailPage";
import { ProposalPage } from "./pages/ProposalPage";
import { BookingStatusPage } from "./pages/BookingStatusPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { MarketplaceListingPage } from "./pages/MarketplaceListingPage";
import { AdminPage } from "./pages/AdminPage";
import { isAuthenticated } from "./lib/auth";
import { AppShell } from "./components/AppShell";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to={isAuthenticated() ? "/crm" : "/login"} />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app-layout",
  component: () => (isAuthenticated() ? <AppShell /> : <Navigate to="/login" />),
});

const crmInboxRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/crm",
  component: CrmInboxPage,
});

const requestDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/crm/$requestId",
  component: RequestDetailPage,
});

// Server-side enforcement is what actually matters (MANAGE_INTEGRATIONS /
// MANAGE_USERS permission checks in the API) — this route is just where the
// admin nav link in AppShell points.
const adminRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/admin",
  component: AdminPage,
});

// Public — no auth, per §5 "mobile, low-bandwidth, WhatsApp-first". A client
// opens this link directly (e.g. from WhatsApp) with no account needed.
const proposalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/proposal/$token",
  component: ProposalPage,
});

// Public — no auth, same reasoning as proposalRoute: a traveler opens their
// booking status/e-ticket link directly (WhatsApp, email, PDF QR code).
const bookingStatusRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/booking/$token",
  component: BookingStatusPage,
});

// Public — Phase 3 (§7) marketplace: browsing and enquiring never requires
// an account, same principle as every other public route in this app.
const marketplaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/marketplace",
  component: MarketplacePage,
});

const marketplaceListingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/marketplace/$id",
  component: MarketplaceListingPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  appLayoutRoute.addChildren([crmInboxRoute, requestDetailRoute, adminRoute]),
  proposalRoute,
  bookingStatusRoute,
  marketplaceRoute,
  marketplaceListingRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
