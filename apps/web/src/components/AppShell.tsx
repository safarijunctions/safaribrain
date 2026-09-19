import { Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../lib/auth";

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="relative bg-earth-800 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-sm gap-2">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-brass-500/40" />
        <div className="flex items-center gap-4 sm:gap-7 min-w-0 overflow-x-auto">
          <Link
            to="/crm"
            className="font-display font-semibold text-lg tracking-wide shrink-0"
          >
            SAFARI ATLAS
          </Link>
          <Link
            to="/marketplace"
            className="text-sm text-white/70 hover:text-white transition [&.active]:text-white [&.active]:font-semibold shrink-0"
          >
            Marketplace
          </Link>
          <Link
            to="/trade"
            className="text-sm text-white/70 hover:text-white transition [&.active]:text-white [&.active]:font-semibold shrink-0"
          >
            Trade
          </Link>
          <Link
            to="/vehicle-exchange"
            className="text-sm text-white/70 hover:text-white transition [&.active]:text-white [&.active]:font-semibold shrink-0"
          >
            Vehicles
          </Link>
          <Link
            to="/messages"
            className="text-sm text-white/70 hover:text-white transition [&.active]:text-white [&.active]:font-semibold shrink-0"
          >
            Messages
          </Link>
          {user?.role === "ADMIN" && (
            <Link
              to="/admin"
              className="text-sm text-white/70 hover:text-white transition [&.active]:text-white [&.active]:font-semibold shrink-0"
            >
              Admin
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-sm shrink-0">
          <span className="hidden sm:inline text-white/80 truncate max-w-[14rem]">
            {user?.fullName} <span className="text-white/40">·</span>{" "}
          </span>
          <span className="text-brass-300 text-xs sm:text-sm tracking-wide uppercase">
            {user?.role}
          </span>
          <button
            onClick={handleLogout}
            className="text-white/70 hover:text-white underline decoration-white/30 transition shrink-0"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1 bg-ivory">
        <Outlet />
      </main>
    </div>
  );
}
