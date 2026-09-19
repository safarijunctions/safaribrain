import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Booking, Vehicle } from "../types";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-stone-100 text-stone-700",
  CONFIRMED: "bg-brass-100 text-brass-700",
  PAID: "bg-moss-100 text-moss-800",
  ACTIVE: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-stone-200 text-stone-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const PAYMENT_METHODS = ["BANK_TRANSFER", "CASH", "MOBILE_MONEY_MANUAL"] as const;

const CONFIRMATION_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-stone-100 text-stone-700",
  CONFIRMED: "bg-moss-100 text-moss-800",
  DECLINED: "bg-red-100 text-red-700",
};

export function BookingPanel({ booking, onChanged }: { booking: Booking; onChanged: () => void }) {
  const qc = useQueryClient();
  const [showTravelerForm, setShowTravelerForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showLogisticsForm, setShowLogisticsForm] = useState(false);
  const [travelerName, setTravelerName] = useState("");
  const [travelerDob, setTravelerDob] = useState("");
  const [travelerPassport, setTravelerPassport] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("BANK_TRANSFER");
  const [paymentReference, setPaymentReference] = useState("");
  const [guideName, setGuideName] = useState(booking.guideName ?? "");
  const [guidePhone, setGuidePhone] = useState(booking.guidePhone ?? "");
  const [pickupNotes, setPickupNotes] = useState(booking.pickupNotes ?? "");
  const [vehicleId, setVehicleId] = useState(booking.vehicleId ?? "");
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [supplierType, setSupplierType] = useState("");
  const [supplierNeededBy, setSupplierNeededBy] = useState("");
  const [referenceDrafts, setReferenceDrafts] = useState<Record<string, string>>({});

  const { data: vehicles } = useQuery({
    queryKey: ["fleet-vehicles"],
    queryFn: () => api.get<Vehicle[]>("/fleet/vehicles"),
  });

  function invalidate() {
    qc.invalidateQueries();
    onChanged();
  }

  const addTraveler = useMutation({
    mutationFn: () =>
      api.post(`/bookings/${booking.id}/travelers`, {
        fullName: travelerName,
        dateOfBirth: travelerDob || undefined,
        passportNumber: travelerPassport || undefined,
      }),
    onSuccess: () => {
      setTravelerName("");
      setTravelerDob("");
      setTravelerPassport("");
      setShowTravelerForm(false);
      invalidate();
    },
  });

  const updateLogistics = useMutation({
    mutationFn: () => api.patch(`/bookings/${booking.id}/logistics`, { guideName, guidePhone, pickupNotes, vehicleId: vehicleId || null }),
    onSuccess: () => {
      setShowLogisticsForm(false);
      invalidate();
    },
  });

  const addSupplierConfirmation = useMutation({
    mutationFn: () =>
      api.post(`/bookings/${booking.id}/supplier-confirmations`, {
        supplierName,
        supplierType: supplierType || undefined,
        neededBy: supplierNeededBy || undefined,
      }),
    onSuccess: () => {
      setSupplierName("");
      setSupplierType("");
      setSupplierNeededBy("");
      setShowSupplierForm(false);
      invalidate();
    },
  });

  const updateSupplierConfirmation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "CONFIRMED" | "DECLINED" | "PENDING" }) =>
      api.patch(`/bookings/${booking.id}/supplier-confirmations/${id}`, { status, referenceCode: referenceDrafts[id] || undefined }),
    onSuccess: invalidate,
  });

  async function downloadManifest() {
    setManifestError(null);
    try {
      const blob = await api.getBlob(`/bookings/${booking.id}/manifest.pdf`);
      window.open(URL.createObjectURL(blob), "_blank");
    } catch {
      setManifestError("Couldn't load the manifest — try again.");
    }
  }

  const markCompleted = useMutation({
    mutationFn: () => api.post(`/bookings/${booking.id}/complete`),
    onSuccess: invalidate,
  });

  const recordPayment = useMutation({
    mutationFn: () =>
      api.post(`/bookings/${booking.id}/payments`, {
        amount: Number(paymentAmount),
        method: paymentMethod,
        reference: paymentReference || undefined,
      }),
    onSuccess: () => {
      setPaymentAmount("");
      setPaymentReference("");
      setShowPaymentForm(false);
      invalidate();
    },
  });

  const balanceDue = Number(booking.totalPrice) - Number(booking.amountPaid);
  const statusUrl = `${window.location.origin}/booking/${booking.ticketToken}`;
  const ticketReady = ["PAID", "ACTIVE", "COMPLETED"].includes(booking.status);

  return (
    <div className="border border-stone-200 rounded-xl p-4 shadow-sm shadow-forest-900/5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[booking.status] ?? "bg-stone-100"}`}>{booking.status}</span>
        <p className="font-display text-lg font-semibold text-forest-800">
          {booking.currency} {Number(booking.amountPaid).toLocaleString()} / {Number(booking.totalPrice).toLocaleString()}
          {balanceDue > 0 && <span className="text-xs text-stone-400 font-normal ml-1.5">({booking.currency} {balanceDue.toLocaleString()} due)</span>}
        </p>
      </div>

      {["PAID", "ACTIVE"].includes(booking.status) && (
        <button
          onClick={() => markCompleted.mutate()}
          disabled={markCompleted.isPending}
          className="text-xs font-medium border border-moss-300 text-moss-700 hover:bg-moss-50 rounded px-3 py-1.5 disabled:opacity-50"
        >
          {markCompleted.isPending ? "Marking…" : "Mark trip completed"}
        </button>
      )}
      {booking.status === "COMPLETED" && (
        <p className="text-xs text-stone-500">
          Trip completed —{" "}
          {booking.review
            ? `traveler ${booking.review.status === "PENDING" ? "left a review, awaiting moderation" : `left a ${booking.review.rating}★ review (${booking.review.status.toLowerCase()})`}`
            : "the traveler can now leave a review from their booking status page."}
        </p>
      )}

      {/* Travelers */}
      <div>
        <p className="text-xs font-medium text-stone-500 mb-1.5">Travelers</p>
        {booking.travelers.length === 0 && <p className="text-xs text-stone-400">None added yet.</p>}
        <ul className="text-sm space-y-1">
          {booking.travelers.map((t) => (
            <li key={t.id}>{t.fullName}</li>
          ))}
        </ul>
        {!showTravelerForm ? (
          <button onClick={() => setShowTravelerForm(true)} className="text-xs text-forest-700 hover:underline mt-1.5">
            + Add traveler
          </button>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
            <input
              className="sm:col-span-2 border border-stone-300 rounded px-2 py-1.5"
              placeholder="Full name"
              value={travelerName}
              onChange={(e) => setTravelerName(e.target.value)}
            />
            <input
              type="date"
              className="border border-stone-300 rounded px-2 py-1.5"
              placeholder="Date of birth"
              value={travelerDob}
              onChange={(e) => setTravelerDob(e.target.value)}
            />
            <input
              className="border border-stone-300 rounded px-2 py-1.5"
              placeholder="Passport #"
              value={travelerPassport}
              onChange={(e) => setTravelerPassport(e.target.value)}
            />
            <div className="col-span-2 sm:col-span-4 flex gap-1.5">
              <button
                onClick={() => addTraveler.mutate()}
                disabled={!travelerName || addTraveler.isPending}
                className="font-medium bg-forest-600 hover:bg-forest-700 text-white rounded px-3 py-1.5 disabled:opacity-50"
              >
                Add
              </button>
              <button onClick={() => setShowTravelerForm(false)} className="border border-stone-300 rounded px-3 py-1.5">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Guide/vehicle/pickup logistics — internal only, feeds the guide manifest */}
      <div>
        <p className="text-xs font-medium text-stone-500 mb-1.5">Guide, vehicle & pickup logistics</p>
        {!showLogisticsForm ? (
          <div className="text-sm space-y-0.5">
            <p>{booking.guideName ? `${booking.guideName}${booking.guidePhone ? ` (${booking.guidePhone})` : ""}` : <span className="text-stone-400">No guide assigned yet.</span>}</p>
            <p>
              {booking.vehicle ? (
                <>
                  {booking.vehicle.name} ({booking.vehicle.registrationNumber})
                  {booking.vehicle.complianceStatus !== "OK" && booking.vehicle.complianceStatus !== "NOT_TRACKED" && (
                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${booking.vehicle.complianceStatus === "EXPIRED" ? "bg-red-100 text-red-700" : "bg-brass-100 text-brass-700"}`}>
                      {booking.vehicle.complianceStatus === "EXPIRED" ? "compliance expired" : "compliance expiring soon"}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-stone-400">No vehicle assigned yet.</span>
              )}
            </p>
            {booking.pickupNotes && <p className="text-xs text-stone-500">{booking.pickupNotes}</p>}
            <button onClick={() => setShowLogisticsForm(true)} className="text-xs text-forest-700 hover:underline mt-1">
              {booking.guideName || booking.vehicle ? "Edit" : "+ Assign guide/vehicle"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 text-xs">
            <input
              className="border border-stone-300 rounded px-2 py-1.5"
              placeholder="Guide/driver name"
              value={guideName}
              onChange={(e) => setGuideName(e.target.value)}
            />
            <input
              className="border border-stone-300 rounded px-2 py-1.5"
              placeholder="Guide phone"
              value={guidePhone}
              onChange={(e) => setGuidePhone(e.target.value)}
            />
            <select className="sm:col-span-2 border border-stone-300 rounded px-2 py-1.5" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">No vehicle assigned</option>
              {vehicles?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.registrationNumber}){v.complianceStatus === "EXPIRED" ? " — compliance expired" : v.complianceStatus === "EXPIRING_SOON" ? " — compliance expiring soon" : ""}
                </option>
              ))}
            </select>
            <textarea
              className="sm:col-span-2 border border-stone-300 rounded px-2 py-1.5"
              placeholder="Pickup notes (location, flight number, time…)"
              rows={2}
              value={pickupNotes}
              onChange={(e) => setPickupNotes(e.target.value)}
            />
            <div className="sm:col-span-2 flex gap-1.5">
              <button
                onClick={() => updateLogistics.mutate()}
                disabled={updateLogistics.isPending}
                className="font-medium bg-forest-600 hover:bg-forest-700 text-white rounded px-3 py-1.5 disabled:opacity-50"
              >
                Save
              </button>
              <button onClick={() => setShowLogisticsForm(false)} className="border border-stone-300 rounded px-3 py-1.5">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Supplier confirmations — §4.3 "calendar/supplier confirmations":
          a checklist of lodges/permits/transport the operator needs a yes
          from before a trip is ready, independent of payment status. */}
      <div>
        <p className="text-xs font-medium text-stone-500 mb-1.5">Supplier confirmations</p>
        {booking.supplierConfirmations.length === 0 && <p className="text-xs text-stone-400">None added yet.</p>}
        <ul className="text-sm space-y-1.5">
          {booking.supplierConfirmations.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 flex-wrap">
              <span>
                {c.supplierName}
                {c.supplierType && <span className="text-stone-400"> · {c.supplierType}</span>}
                {c.referenceCode && <span className="text-stone-400"> · ref {c.referenceCode}</span>}
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CONFIRMATION_STATUS_COLORS[c.status]}`}>{c.status}</span>
                {c.status === "PENDING" && (
                  <>
                    <input
                      className="border border-stone-300 rounded px-1.5 py-1 text-xs w-24"
                      placeholder="Ref #"
                      value={referenceDrafts[c.id] ?? ""}
                      onChange={(e) => setReferenceDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                    />
                    <button
                      onClick={() => updateSupplierConfirmation.mutate({ id: c.id, status: "CONFIRMED" })}
                      className="text-xs text-moss-700 hover:underline"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => updateSupplierConfirmation.mutate({ id: c.id, status: "DECLINED" })}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Decline
                    </button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
        {!showSupplierForm ? (
          <button onClick={() => setShowSupplierForm(true)} className="text-xs text-forest-700 hover:underline mt-1.5">
            + Add supplier confirmation
          </button>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
            <input
              className="sm:col-span-2 border border-stone-300 rounded px-2 py-1.5"
              placeholder="Supplier (e.g. Serena Lodge)"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
            <input
              className="border border-stone-300 rounded px-2 py-1.5"
              placeholder="Type (Lodge, Permit…)"
              value={supplierType}
              onChange={(e) => setSupplierType(e.target.value)}
            />
            <input
              type="date"
              className="border border-stone-300 rounded px-2 py-1.5"
              value={supplierNeededBy}
              onChange={(e) => setSupplierNeededBy(e.target.value)}
            />
            <div className="col-span-2 sm:col-span-4 flex gap-1.5">
              <button
                onClick={() => addSupplierConfirmation.mutate()}
                disabled={!supplierName || addSupplierConfirmation.isPending}
                className="font-medium bg-forest-600 hover:bg-forest-700 text-white rounded px-3 py-1.5 disabled:opacity-50"
              >
                Add
              </button>
              <button onClick={() => setShowSupplierForm(false)} className="border border-stone-300 rounded px-3 py-1.5">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payments */}
      <div>
        <p className="text-xs font-medium text-stone-500 mb-1.5">Payments</p>
        {booking.payments.length === 0 && <p className="text-xs text-stone-400">None recorded yet.</p>}
        <ul className="text-sm space-y-1">
          {booking.payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between">
              <span>
                {p.method.replace(/_/g, " ")} {p.reference && <span className="text-stone-400">({p.reference})</span>}
              </span>
              <span className="tabular-nums">
                {p.currency} {Number(p.amount).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
        {booking.status !== "CANCELLED" &&
          (!showPaymentForm ? (
            <button onClick={() => setShowPaymentForm(true)} className="text-xs text-forest-700 hover:underline mt-1.5">
              + Record payment
            </button>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
              <input
                type="number"
                className="border border-stone-300 rounded px-2 py-1.5"
                placeholder="Amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <select className="border border-stone-300 rounded px-2 py-1.5" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <input
                className="border border-stone-300 rounded px-2 py-1.5"
                placeholder="Reference (optional)"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
              <div className="flex gap-1.5">
                <button
                  onClick={() => recordPayment.mutate()}
                  disabled={!paymentAmount || recordPayment.isPending}
                  className="flex-1 font-medium bg-forest-600 hover:bg-forest-700 text-white rounded px-2 py-1.5 disabled:opacity-50"
                >
                  Record
                </button>
                <button onClick={() => setShowPaymentForm(false)} className="border border-stone-300 rounded px-2 py-1.5">
                  ✕
                </button>
              </div>
              {recordPayment.isError && <p className="col-span-2 sm:col-span-4 text-red-600">{(recordPayment.error as Error).message}</p>}
            </div>
          ))}
      </div>

      {/* Documents */}
      <div className="flex flex-wrap items-center gap-3 text-xs border-t border-stone-100 pt-3">
        <a href={`/api/bookings/public/${booking.ticketToken}/receipt.pdf`} target="_blank" rel="noreferrer" className="text-forest-700 underline">
          Receipt PDF
        </a>
        {ticketReady && (
          <a href={`/api/bookings/public/${booking.ticketToken}/eticket.pdf`} target="_blank" rel="noreferrer" className="text-forest-700 underline">
            E-ticket PDF
          </a>
        )}
        <button onClick={downloadManifest} className="text-forest-700 underline" title="Internal only — includes passport numbers, never shown to the client">
          Guide manifest PDF
        </button>
        <a href={statusUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">
          {statusUrl}
        </a>
      </div>
      {manifestError && <p className="text-xs text-red-600">{manifestError}</p>}
    </div>
  );
}
