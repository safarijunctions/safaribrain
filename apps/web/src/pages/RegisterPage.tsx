import { useState, FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../lib/auth";
import { api, ApiError } from "../lib/api";
import { AcaciaSilhouette } from "../components/AcaciaSilhouette";

const KINDS = [
  {
    value: "OPERATOR",
    label: "Tour Operator",
    hint: "A company running its own safaris and departures.",
  },
  {
    value: "GUIDE",
    label: "Tour Guide",
    hint: "A freelance guide selling your own itineraries directly to clients.",
  },
  {
    value: "AGENT",
    label: "Tour Agent / Agency",
    hint: "Resell other operators' and guides' inventory at wholesale rates.",
  },
] as const;

// Self-service sign-up for the tourism-professional side of the platform
// (§6 Trade) — every account before this was created by an admin or the
// seed script. A new organization starts unverified; an admin verifies it
// before its listings/trade departures become visible to anyone else.
export function RegisterPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("OPERATOR");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [country, setCountry] = useState("TZ");
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ accessToken: string; user: any }>(
        "/auth/register",
        {
          fullName,
          email,
          password,
          organizationName,
          organizationKind: kind,
          country,
          currency,
        },
      );
      setSession(res);
      navigate({ to: "/crm" });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create your account",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-10 bg-gradient-to-b from-brass-50 via-forest-50 to-moss-50">
      <div
        className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brass-300/40 blur-3xl"
        aria-hidden
      />
      <AcaciaSilhouette className="absolute bottom-0 right-6 h-40 w-40 text-moss-800/15 sm:h-56 sm:w-56" />

      <form
        onSubmit={onSubmit}
        className="relative bg-white/90 backdrop-blur-sm shadow-xl shadow-forest-900/10 rounded-2xl p-8 w-full max-w-md border border-white/60"
      >
        <div className="h-1 w-16 rounded-full bg-gradient-to-r from-forest-500 to-brass-400 mb-5" />
        <h1 className="font-display text-3xl font-semibold text-forest-800 mb-1">
          Join Safari Atlas
        </h1>
        <p className="text-sm text-earth-500 mb-6">
          Sell your own safaris, join the trade marketplace, and connect with
          other operators.
        </p>

        <label className="block text-sm font-medium text-earth-700 mb-1.5">
          I am a...
        </label>
        <div className="grid grid-cols-1 gap-2 mb-4">
          {KINDS.map((k) => (
            <label
              key={k.value}
              className={`flex items-start gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm ${
                kind === k.value
                  ? "border-forest-500 bg-forest-50"
                  : "border-sand-200"
              }`}
            >
              <input
                type="radio"
                className="mt-0.5"
                checked={kind === k.value}
                onChange={() => setKind(k.value)}
              />
              <span>
                <span className="font-medium">{k.label}</span>
                <span className="block text-xs text-earth-500">{k.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-earth-700 mb-1">
              Your full name
            </label>
            <input
              className="w-full border border-sand-300 rounded-lg px-3 py-2 text-sm"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-earth-700 mb-1">
              {kind === "OPERATOR"
                ? "Company name"
                : kind === "GUIDE"
                  ? "Your business/guide name"
                  : "Agency name"}
            </label>
            <input
              className="w-full border border-sand-300 rounded-lg px-3 py-2 text-sm"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-earth-700 mb-1">
              Country
            </label>
            <input
              className="w-full border border-sand-300 rounded-lg px-3 py-2 text-sm"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              placeholder="TZ"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-earth-700 mb-1">
              Currency
            </label>
            <input
              className="w-full border border-sand-300 rounded-lg px-3 py-2 text-sm"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="USD"
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-earth-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full border border-sand-300 rounded-lg px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-earth-700 mb-1">
              Password
            </label>
            <input
              type="password"
              minLength={8}
              className="w-full border border-sand-300 rounded-lg px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {error && <p className="text-sm text-status-full mb-4">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-forest-600 to-forest-700 hover:from-forest-700 hover:to-forest-800 text-white rounded-lg py-2.5 text-sm font-medium shadow-sm shadow-forest-900/20 transition disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>

        <p className="text-xs text-earth-400 mt-4 text-center">
          Your organization starts unverified — an admin verifies you before
          your listings or trade departures are visible to anyone else.
        </p>
        <p className="text-sm text-earth-500 mt-4 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-forest-700 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
