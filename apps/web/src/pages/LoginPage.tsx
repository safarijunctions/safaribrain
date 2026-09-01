import { useState, FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { AcaciaSilhouette } from "../components/AcaciaSilhouette";

export function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("operator@safarijunctionsadventures.co.tz");
  const [password, setPassword] = useState("safaribrain-demo");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate({ to: "/crm" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in");
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 bg-gradient-to-b from-sunset-50 via-clay-50 to-acacia-50">
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-sunset-300/40 blur-3xl" aria-hidden />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-acacia-900/10 to-transparent" aria-hidden />
      <AcaciaSilhouette className="absolute bottom-0 right-6 h-40 w-40 text-acacia-800/15 sm:h-56 sm:w-56" />
      <AcaciaSilhouette className="absolute bottom-0 left-10 h-24 w-24 text-acacia-800/10 hidden sm:block" />

      <form
        onSubmit={onSubmit}
        className="relative bg-white/90 backdrop-blur-sm shadow-xl shadow-clay-900/10 rounded-2xl p-8 w-full max-w-sm border border-white/60"
      >
        <div className="h-1 w-16 rounded-full bg-gradient-to-r from-clay-500 to-sunset-400 mb-5" />
        <h1 className="font-display text-3xl font-semibold text-clay-800 mb-1">SafariBrain</h1>
        <p className="text-sm text-stone-500 mb-7">Sales operating system — sign in</p>

        <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
        <input
          className="w-full border border-stone-300 rounded-lg px-3 py-2.5 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-clay-400 focus:border-transparent"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />

        <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
        <input
          className="w-full border border-stone-300 rounded-lg px-3 py-2.5 mb-5 text-sm focus:outline-none focus:ring-2 focus:ring-clay-400 focus:border-transparent"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-clay-600 to-clay-700 hover:from-clay-700 hover:to-clay-800 text-white rounded-lg py-2.5 text-sm font-medium shadow-sm shadow-clay-900/20 transition disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-xs text-stone-400 mt-5 text-center">
          Demo accounts: operator@…, manager@…, admin@safarijunctionsadventures.co.tz — password{" "}
          <code className="bg-stone-100 px-1 py-0.5 rounded">safaribrain-demo</code>
        </p>
      </form>
    </div>
  );
}
