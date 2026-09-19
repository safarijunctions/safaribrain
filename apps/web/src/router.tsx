import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  Navigate,
} from "@tanstack/react-router";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { TradePage } from "./pages/TradePage";
import { VehicleExchangePage } from "./pages/VehicleExchangePage";
import { MessagesPage } from "./pages/MessagesPage";
import { CrmInboxPage } from "./pages/CrmInboxPage";
import { RequestDetailPage } from "./pages/RequestDetailPage";
import { ProposalPage } from "./pages/ProposalPage";
import { BookingStatusPage } from "./pages/BookingStatusPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { MarketplaceListingPage } from "./pages/MarketplaceListingPage";
import { DepartureSeatMapPage } from "./pages/DepartureSeatMapPage";
import { OperatorProfilePage } from "./pages/OperatorProfilePage";
import { CustomSafariPage } from "./pages/CustomSafariPage";
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

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app-layout",
  component: () =>
    isAuthenticated() ? <AppShell /> : <Navigate to="/login" />,
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

// §6 Trade — any authenticated organization (operator, guide, or agent),
// not admin-only: a solo guide has no separate "admin" account to log in
// as, so these live at the top level of the authenticated app, same as
// /crm.
const tradeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/trade",
  component: TradePage,
});

const vehicleExchangeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/vehicle-exchange",
  component: VehicleExchangePage,
});

const messagesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/messages",
  component: MessagesPage,
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

// Public — §1.2's second buying mode, the seat-map instant-booking flow.
// Static "departures" segment matched ahead of the dynamic $id template
// route above, so /marketplace/departures/xyz never gets swallowed as a
// template id.
const departureSeatMapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/marketplace/departures/$departureId",
  component: DepartureSeatMapPage,
});

// Public — the operator/guide mini-site (design brief). Static
// "operators" segment, no collision with marketplace's /$id template
// route since they live under different top-level paths.
const operatorProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/operators/$id",
  component: OperatorProfilePage,
});

// Public — the custom-safari conversational builder (design brief).
const customSafariRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/custom-safari",
  component: CustomSafariPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  appLayoutRoute.addChildren([
    crmInboxRoute,
    requestDetailRoute,
    adminRoute,
    tradeRoute,
    vehicleExchangeRoute,
    messagesRoute,
  ]),
  proposalRoute,
  bookingStatusRoute,
  marketplaceRoute,
  marketplaceListingRoute,
  departureSeatMapRoute,
  operatorProfileRoute,
  customSafariRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
