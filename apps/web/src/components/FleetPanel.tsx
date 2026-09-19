import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Vehicle } from "../types";

const STATUSES = ["ACTIVE", "MAINTENANCE", "RETIRED"] as const;

const COMPLIANCE_LABELS: Record<Vehicle["complianceStatus"], string> = {
  OK: "Compliant",
  EXPIRING_SOON: "Expiring soon",
  EXPIRED: "Expired",
  NOT_TRACKED: "Not tracked",
};

const COMPLIANCE_COLORS: Record<Vehicle["complianceStatus"], string> = {
  OK: "bg-moss-100 text-moss-800",
  EXPIRING_SOON: "bg-brass-100 text-brass-700",
  EXPIRED: "bg-red-100 text-red-700",
  NOT_TRACKED: "bg-stone-100 text-stone-500",
};

// §4.3 "vehicle compliance" — the org's own fleet, tracked for insurance/
// inspection expiry so an expired vehicle isn't quietly assigned to a
// trip from BookingPanel's logistics form.
export function FleetPanel() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("MANAGE_FLEET");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);

  const { data: vehicles, isLoading } = useQuery({ queryKey: ["fleet-vehicles"], queryFn: () => api.get<Vehicle[]>("/fleet/vehicles") });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/fleet/vehicles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleet-vehicles"] }),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["fleet-vehicles"] });
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <p className="text-sm text-stone-500">{vehicles?.length ?? 0} vehicle{vehicles?.length === 1 ? "" : "s"} in the fleet</p>
        {canManage && (
          <button
            onClick={() => {
              setEditing(null);
              setShowForm((s) => !s);
            }}
            className="bg-gradient-to-r from-forest-600 to-forest-700 hover:from-forest-700 hover:to-forest-800 text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm shadow-forest-900/10 transition"
          >
            {showForm && !editing ? "Close" : "+ Add vehicle"}
          </button>
        )}
      </div>

      {showForm && canManage && <VehicleForm vehicle={editing} onSaved={invalidate} onCancel={() => { setShowForm(false); setEditing(null); }} />}

      {isLoading && <p className="text-sm text-stone-500">Loading…</p>}

      <div className="bg-white border border-stone-200 rounded-xl divide-y shadow-sm shadow-forest-900/5 overflow-hidden">
        {vehicles?.map((v) => (
          <div key={v.id} className="px-5 py-4 flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="font-medium text-sm">
                {v.name} <span className="text-xs text-stone-400">({v.registrationNumber} · seats {v.capacity} · {v.status.toLowerCase()})</span>
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                {v.insuranceExpiry && <>Insurance {new Date(v.insuranceExpiry).toLocaleDateString()} · </>}
                {v.inspectionExpiry && <>Inspection {new Date(v.inspectionExpiry).toLocaleDateString()}</>}
                {!v.insuranceExpiry && !v.inspectionExpiry && "No expiry dates tracked"}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className={`font-medium px-2 py-1 rounded-full ${COMPLIANCE_COLORS[v.complianceStatus]}`}>{COMPLIANCE_LABELS[v.complianceStatus]}</span>
              {canManage && (
                <>
                  <button
                    onClick={() => {
                      setEditing(v);
                      setShowForm(true);
                    }}
                    className="text-forest-700 hover:underline"
                  >
                    Edit
                  </button>
                  <button onClick={() => remove.mutate(v.id)} className="text-red-500 hover:underline">
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {vehicles?.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-stone-400">No vehicles in the fleet yet. {canManage && "Add the first one above."}</p>
        )}
      </div>
    </div>
  );
}

function VehicleForm({ vehicle, onSaved, onCancel }: { vehicle: Vehicle | null; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(vehicle?.name ?? "");
  const [registrationNumber, setRegistrationNumber] = useState(vehicle?.registrationNumber ?? "");
  const [capacity, setCapacity] = useState(vehicle ? String(vehicle.capacity) : "");
  const [status, setStatus] = useState<string>(vehicle?.status ?? "ACTIVE");
  const [insuranceExpiry, setInsuranceExpiry] = useState(vehicle?.insuranceExpiry?.slice(0, 10) ?? "");
  const [inspectionExpiry, setInspectionExpiry] = useState(vehicle?.inspectionExpiry?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(vehicle?.notes ?? "");

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name,
        registrationNumber,
        capacity: Number(capacity),
        status,
        insuranceExpiry: insuranceExpiry || undefined,
        inspectionExpiry: inspectionExpiry || undefined,
        notes: notes || undefined,
      };
      return vehicle ? api.patch(`/fleet/vehicles/${vehicle.id}`, body) : api.post("/fleet/vehicles", body);
    },
    onSuccess: onSaved,
  });

  return (
    <div className="border border-stone-200 rounded-xl p-4 bg-forest-50/40 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Name</label>
          <input className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Land Cruiser #2" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Registration number</label>
          <input className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="T 123 ABC" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Seats</label>
          <input type="number" className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="7" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Status</label>
          <select className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Insurance expiry</label>
          <input type="date" className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm" value={insuranceExpiry} onChange={(e) => setInsuranceExpiry(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Inspection expiry</label>
          <input type="date" className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm" value={inspectionExpiry} onChange={(e) => setInspectionExpiry(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Notes (optional)</label>
        <textarea className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {save.isError && <p className="text-xs text-red-600">{(save.error as Error).message}</p>}
      <div className="flex gap-1.5">
        <button
          onClick={() => save.mutate()}
          disabled={!name || !registrationNumber || !capacity || save.isPending}
          className="bg-gradient-to-r from-forest-600 to-forest-700 hover:from-forest-700 hover:to-forest-800 text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm shadow-forest-900/10 transition disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save vehicle"}
        </button>
        <button onClick={onCancel} className="border border-stone-300 rounded-lg px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
