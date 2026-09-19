import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { RentalListing, RentalAgreement, Vehicle } from "../types";

// The vehicle rental exchange (§6 Trade) — an owner org publishes a fleet
// vehicle as rentable; another org requests a date-ranged agreement the
// owner accepts or declines. See VehicleRentalsService for why this is a
// negotiated agreement rather than an instant "book now" like a seat.
export function VehicleExchangePage() {
  const [tab, setTab] = useState<"browse" | "my-listings" | "agreements">("browse");
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <h1 className="font-display text-2xl font-semibold text-forest-800 mb-1">Vehicle Exchange</h1>
      <p className="text-sm text-stone-500 mb-6">
        Rent a safari vehicle from another operator, guide, or fleet owner — or list your own for other trade partners to rent.
      </p>
      <div className="flex gap-1 mb-6 border-b border-stone-200 overflow-x-auto">
        {(["browse", "my-listings", "agreements"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
              tab === t ? "border-forest-600 text-forest-700" : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {t === "browse" ? "Browse vehicles" : t === "my-listings" ? "My listings" : "Agreements"}
          </button>
        ))}
      </div>
      {tab === "browse" && <BrowseVehicles />}
      {tab === "my-listings" && <MyListings />}
      {tab === "agreements" && <Agreements />}
    </div>
  );
}

function BrowseVehicles() {
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["rental-listings"], queryFn: () => api.get<RentalListing[]>("/vehicle-exchange/listings") });
  if (isLoading) return <p className="text-sm text-stone-500">Loading…</p>;
  if (data?.length === 0) return <p className="text-sm text-stone-400">No vehicles listed for rent right now.</p>;
  return (
    <div className="space-y-3">
      {data?.map((l) => (
        <div key={l.id} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm shadow-forest-900/5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-medium text-sm">{l.vehicle.name} · {l.vehicle.capacity} seats</p>
              <p className="text-xs text-stone-500 mt-0.5">
                {l.organization?.name} ({l.organization?.country}) · {l.vehicle.registrationNumber}
              </p>
            </div>
            <p className="text-sm font-semibold text-moss-700 shrink-0">{l.currency} {Number(l.dailyRate).toLocaleString()}/day</p>
          </div>
          <button onClick={() => setOpenId(openId === l.id ? null : l.id)} className="mt-2 text-xs text-forest-700 hover:underline">
            {openId === l.id ? "Cancel" : "Request a rental"}
          </button>
          {openId === l.id && <RequestRentalForm listingId={l.id} onDone={() => setOpenId(null)} />}
        </div>
      ))}
    </div>
  );
}

function RequestRentalForm({ listingId, onDone }: { listingId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");
  const request = useMutation({
    mutationFn: () => api.post("/vehicle-exchange/listings/" + listingId + "/requests", { startDate, endDate, message: message || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agreements"] });
      onDone();
    },
  });
  return (
    <div className="mt-3 border-t border-stone-100 pt-3 grid grid-cols-2 gap-2 text-xs bg-stone-50 rounded-lg p-3">
      <input type="date" className="border border-stone-300 rounded px-2 py-1.5" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      <input type="date" className="border border-stone-300 rounded px-2 py-1.5" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      <input className="border border-stone-300 rounded px-2 py-1.5 col-span-2" placeholder="Message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} />
      <button
        disabled={!startDate || !endDate || request.isPending}
        onClick={() => request.mutate()}
        className="col-span-2 font-medium bg-forest-600 hover:bg-forest-700 text-white rounded px-3 py-1.5 disabled:opacity-50"
      >
        Send request
      </button>
      {request.isError && <p className="col-span-2 text-red-600">{(request.error as Error).message}</p>}
    </div>
  );
}

function MyListings() {
  const { data: vehicles } = useQuery({ queryKey: ["vehicles"], queryFn: () => api.get<Vehicle[]>("/fleet/vehicles") });
  const { data: listings, refetch } = useQuery({ queryKey: ["my-rental-listings"], queryFn: () => api.get<RentalListing[]>("/vehicle-exchange/my-listings") });
  const listedVehicleIds = new Set(listings?.map((l) => l.vehicle.id));

  return (
    <div className="space-y-4">
      <p className="text-xs text-stone-500">List one of your fleet vehicles so other operators, guides, or agents can request to rent it.</p>
      <div className="bg-white border border-stone-200 rounded-xl divide-y shadow-sm shadow-forest-900/5 overflow-hidden">
        {vehicles?.map((v) => (
          <VehicleListingRow key={v.id} vehicle={v} existing={listings?.find((l) => l.vehicle.id === v.id)} onSaved={refetch} />
        ))}
        {vehicles?.length === 0 && <p className="px-5 py-8 text-center text-sm text-stone-400">Add a vehicle under Admin → Fleet first.</p>}
      </div>
    </div>
  );
}

function VehicleListingRow({ vehicle, existing, onSaved }: { vehicle: Vehicle; existing?: RentalListing; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [dailyRate, setDailyRate] = useState(existing?.dailyRate ?? "");
  const [currency, setCurrency] = useState(existing?.currency ?? "USD");
  const [visibility, setVisibility] = useState<"LISTED" | "UNLISTED">(existing?.visibility ?? "LISTED");

  const save = useMutation({
    mutationFn: () =>
      api.post(`/fleet/vehicles/${vehicle.id}/rental-listing`, { dailyRate: Number(dailyRate), currency, visibility, active: true }),
    onSuccess: () => {
      setEditing(false);
      onSaved();
    },
  });

  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap text-sm">
        <div>
          <p className="font-medium">{vehicle.name}</p>
          <p className="text-xs text-stone-500">{vehicle.registrationNumber} · {vehicle.capacity} seats</p>
        </div>
        {existing && !editing && (
          <p className="text-xs text-moss-700 font-medium">
            Listed at {existing.currency} {Number(existing.dailyRate).toLocaleString()}/day ({existing.visibility})
          </p>
        )}
        <button onClick={() => setEditing((e) => !e)} className="text-xs text-forest-700 hover:underline">
          {editing ? "Cancel" : existing ? "Edit listing" : "List for rent"}
        </button>
      </div>
      {editing && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs bg-stone-50 rounded-lg p-3">
          <input type="number" className="border border-stone-300 rounded px-2 py-1.5" placeholder="Daily rate" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
          <input className="border border-stone-300 rounded px-2 py-1.5" placeholder="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          <select className="border border-stone-300 rounded px-2 py-1.5" value={visibility} onChange={(e) => setVisibility(e.target.value as "LISTED" | "UNLISTED")}>
            <option value="LISTED">Listed (visible to all trade partners)</option>
            <option value="UNLISTED">Unlisted (share the link privately)</option>
          </select>
          <button disabled={!dailyRate || save.isPending} onClick={() => save.mutate()} className="col-span-3 font-medium bg-forest-600 hover:bg-forest-700 text-white rounded px-3 py-1.5 disabled:opacity-50">
            Save
          </button>
        </div>
      )}
    </div>
  );
}

function Agreements() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["agreements"], queryFn: () => api.get<RentalAgreement[]>("/vehicle-exchange/agreements") });
  const respond = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "ACCEPTED" | "DECLINED" }) => api.patch(`/vehicle-exchange/agreements/${id}/respond`, { decision }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agreements"] }),
  });

  if (isLoading) return <p className="text-sm text-stone-500">Loading…</p>;
  if (data?.length === 0) return <p className="text-sm text-stone-400">No rental agreements yet.</p>;

  return (
    <div className="bg-white border border-stone-200 rounded-xl divide-y shadow-sm shadow-forest-900/5 overflow-hidden">
      {data?.map((a) => (
        <div key={a.id} className="px-5 py-3 text-sm flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-medium">{a.listing.vehicle.name}</p>
            <p className="text-xs text-stone-500">
              {a.ownerOrganization.name} → {a.renterOrganization.name} · {new Date(a.startDate).toLocaleDateString()}–{new Date(a.endDate).toLocaleDateString()}
            </p>
            {a.message && <p className="text-xs text-stone-400 mt-0.5">"{a.message}"</p>}
          </div>
          <div className="text-right text-xs shrink-0 flex items-center gap-2">
            <div>
              <p className="font-semibold">{a.currency} {Number(a.totalPrice).toLocaleString()}</p>
              <p className={`font-medium ${a.status === "ACCEPTED" ? "text-moss-700" : a.status === "DECLINED" ? "text-red-600" : "text-amber-600"}`}>{a.status}</p>
            </div>
            {a.status === "PENDING" && a.ownerOrganizationId === user?.organizationId && (
              <div className="flex gap-1">
                <button onClick={() => respond.mutate({ id: a.id, decision: "ACCEPTED" })} className="bg-moss-700 hover:bg-moss-800 text-white rounded px-2 py-1">
                  Accept
                </button>
                <button onClick={() => respond.mutate({ id: a.id, decision: "DECLINED" })} className="border border-stone-300 rounded px-2 py-1">
                  Decline
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
      {respond.isError && <p className="px-5 py-2 text-xs text-red-600">{(respond.error as Error).message}</p>}
    </div>
  );
}
