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
      <header className="bg-savanna-700 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/crm" className="font-semibold text-lg tracking-tight">
            SafariBrain
          </Link>
          {user?.role === "ADMIN" && (
            <Link to="/admin" className="text-sm opacity-90 hover:opacity-100 [&.active]:font-semibold [&.active]:opacity-100">
              Admin
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span>
            {user?.fullName} · <span className="opacity-80">{user?.role}</span>
          </span>
          <button onClick={handleLogout} className="underline hover:opacity-80">
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
