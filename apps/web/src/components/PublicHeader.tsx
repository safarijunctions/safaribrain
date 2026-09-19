import { Link } from "@tanstack/react-router";
import { isAuthenticated } from "../lib/auth";

// The public-facing nav (marketplace, listing, seat-map pages — no
// account needed). `transparent` layers it over a hero image/section;
// otherwise it's a solid dark bar, same visual language as AppShell's
// authenticated header. Only links to pages that actually exist today —
// Destinations/Lodges/Guides/Operators/Stories are deliberately not
// listed here yet rather than linking to nothing.
export function PublicHeader({
  transparent = false,
}: {
  transparent?: boolean;
}) {
  const authed = isAuthenticated();
  return (
    <header
      className={
        transparent
          ? "absolute top-0 left-0 right-0 z-20 px-4 sm:px-6 py-5 flex items-center justify-between"
          : "sticky top-0 z-20 bg-earth-800 px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm"
      }
    >
      <div className="flex items-center gap-6 sm:gap-8 min-w-0">
        <Link
          to="/marketplace"
          className="font-display font-semibold text-lg text-white tracking-wide shrink-0"
        >
          SAFARI ATLAS
        </Link>
        <a
          href="/marketplace"
          className="hidden sm:inline text-sm text-white/75 hover:text-white transition"
        >
          Safaris
        </a>
        <a
          href="#live-departures"
          className="hidden sm:inline text-sm text-white/75 hover:text-white transition"
        >
          Joining Safaris
        </a>
      </div>
      <div className="flex items-center gap-3 sm:gap-5 text-sm shrink-0">
        <Link
          to="/login"
          className="hidden sm:inline text-white/85 hover:text-white transition"
        >
          Trade
        </Link>
        {authed ? (
          <Link
            to="/crm"
            className="text-earth-900 bg-brass-400 hover:bg-brass-300 px-4 py-2 rounded-sm font-medium transition"
          >
            Dashboard
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className="text-white/85 hover:text-white transition"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="text-earth-900 bg-brass-400 hover:bg-brass-300 px-4 py-2 rounded-sm font-medium transition"
            >
              Join the platform
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
