import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Booking } from "../types";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-stone-100 text-stone-700",
  CONFIRMED: "bg-sunset-100 text-sunset-700",
  PAID: "bg-acacia-100 text-acacia-800",
  ACTIVE: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-stone-200 text-stone-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const PAYMENT_METHODS = ["BANK_TRANSFER", "CASH", "MOBILE_MONEY_MANUAL"] as const;

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
  const [manifestError, setManifestError] = useState<string | null>(null);

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
    mutationFn: () => api.patch(`/bookings/${booking.id}/logistics`, { guideName, guidePhone, pickupNotes }),
    onSuccess: () => {
      setShowLogisticsForm(false);
      invalidate();
    },
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
    <div className="border border-stone-200 rounded-xl p-4 shadow-sm shadow-clay-900/5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[booking.status] ?? "bg-stone-100"}`}>{booking.status}</span>
        <p className="font-display text-lg font-semibold text-clay-800">
          {booking.currency} {Number(booking.amountPaid).toLocaleString()} / {Number(booking.totalPrice).toLocaleString()}
          {balanceDue > 0 && <span className="text-xs text-stone-400 font-normal ml-1.5">({booking.currency} {balanceDue.toLocaleString()} due)</span>}
        </p>
      </div>

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
          <button onClick={() => setShowTravelerForm(true)} className="text-xs text-clay-700 hover:underline mt-1.5">
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
                className="font-medium bg-clay-600 hover:bg-clay-700 text-white rounded px-3 py-1.5 disabled:opacity-50"
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

      {/* Guide/pickup logistics — internal only, feeds the guide manifest */}
      <div>
        <p className="text-xs font-medium text-stone-500 mb-1.5">Guide & pickup logistics</p>
        {!showLogisticsForm ? (
          <div className="text-sm space-y-0.5">
            <p>{booking.guideName ? `${booking.guideName}${booking.guidePhone ? ` (${booking.guidePhone})` : ""}` : <span className="text-stone-400">No guide assigned yet.</span>}</p>
            {booking.pickupNotes && <p className="text-xs text-stone-500">{booking.pickupNotes}</p>}
            <button onClick={() => setShowLogisticsForm(true)} className="text-xs text-clay-700 hover:underline mt-1">
              {booking.guideName ? "Edit" : "+ Assign guide"}
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
                className="font-medium bg-clay-600 hover:bg-clay-700 text-white rounded px-3 py-1.5 disabled:opacity-50"
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
            <button onClick={() => setShowPaymentForm(true)} className="text-xs text-clay-700 hover:underline mt-1.5">
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
                  className="flex-1 font-medium bg-clay-600 hover:bg-clay-700 text-white rounded px-2 py-1.5 disabled:opacity-50"
                >
                  Record
                </button>
                <button onClick={() => setShowPaymentForm(false)} className="border border-stone-300 rounded px-2 py-1.5">
                  ✕
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Documents */}
      <div className="flex flex-wrap items-center gap-3 text-xs border-t border-stone-100 pt-3">
        <a href={`/api/bookings/public/${booking.ticketToken}/receipt.pdf`} target="_blank" rel="noreferrer" className="text-clay-700 underline">
          Receipt PDF
        </a>
        {ticketReady && (
          <a href={`/api/bookings/public/${booking.ticketToken}/eticket.pdf`} target="_blank" rel="noreferrer" className="text-clay-700 underline">
            E-ticket PDF
          </a>
        )}
        <button onClick={downloadManifest} className="text-clay-700 underline" title="Internal only — includes passport numbers, never shown to the client">
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
