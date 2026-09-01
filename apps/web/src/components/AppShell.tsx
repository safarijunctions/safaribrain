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
      <header className="relative bg-gradient-to-r from-clay-800 via-clay-700 to-acacia-800 text-white px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sunset-400 via-sunset-300 to-acacia-400" />
        <div className="flex items-center gap-6">
          <Link to="/crm" className="font-display font-semibold text-lg tracking-tight">
            SafariBrain
          </Link>
          {user?.role === "ADMIN" && (
            <Link
              to="/admin"
              className="text-sm text-white/80 hover:text-white transition [&.active]:text-white [&.active]:font-semibold"
            >
              Admin
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-white/90">
            {user?.fullName} <span className="text-white/50">·</span> <span className="text-sunset-200">{user?.role}</span>
          </span>
          <button onClick={handleLogout} className="text-white/80 hover:text-white underline decoration-white/40 transition">
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1 bg-stone-50">
        <Outlet />
      </main>
    </div>
  );
}
