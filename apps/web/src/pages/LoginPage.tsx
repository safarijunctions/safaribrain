import { useState, FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

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
    <div className="min-h-screen flex items-center justify-center bg-savanna-50 px-4">
      <form onSubmit={onSubmit} className="bg-white shadow-sm rounded-lg p-8 w-full max-w-sm border border-stone-200">
        <h1 className="text-2xl font-semibold text-savanna-700 mb-1">SafariBrain</h1>
        <p className="text-sm text-stone-500 mb-6">Sales operating system — sign in</p>

        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          className="w-full border border-stone-300 rounded px-3 py-2 mb-4 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          className="w-full border border-stone-300 rounded px-3 py-2 mb-4 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-savanna-600 hover:bg-savanna-700 text-white rounded py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-xs text-stone-400 mt-4">
          Demo accounts: operator@…, manager@…, admin@safarijunctionsadventures.co.tz — password{" "}
          <code>safaribrain-demo</code>
        </p>
      </form>
    </div>
  );
}
