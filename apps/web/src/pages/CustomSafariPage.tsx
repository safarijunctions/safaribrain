import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { MarketplaceListingSummary } from "../types";
import { PublicHeader } from "../components/PublicHeader";
import { countryName } from "../lib/countries";

const STYLES = ["Wildlife", "Family", "Luxury", "Photography", "Adventure"];
const DURATIONS = ["3–4 days", "5–7 days", "8–14 days", "15+ days"];
const BUDGETS = ["Under $1,000 pp", "$1,000–$2,000 pp", "$2,000+ pp"];

type StepId =
  | "country"
  | "style"
  | "duration"
  | "budget"
  | "partySize"
  | "preferredStart"
  | "notes"
  | "operator"
  | "contact"
  | "done";

interface Answers {
  country?: string;
  style?: string;
  duration?: string;
  budget?: string;
  partySize?: number;
  preferredStart?: string;
  notes?: string;
  organizationId?: string;
  organizationName?: string;
  fullName?: string;
  email?: string;
  whatsapp?: string;
}

interface Message {
  from: "assistant" | "user";
  text: string;
}

// The design brief's "custom safari conversational builder" — no AI call
// happens here. LLM credentials are configured per-organization
// (LlmService reads an operator's own Anthropic key from their
// Integrations tab), so there's no single key a cross-org, no-account
// conversation could charge a call to before a specific operator is even
// chosen. Instead this genuinely gathers the trip brief through a real
// conversation, then routes it — as a real CRM enquiry, same pipeline as
// every other enquiry source — to whichever verified operator the
// traveler picks for their destination once the conversation narrows to one.
export function CustomSafariPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "assistant",
      text: "Let's build your Africa trip together. Where would you like to go?",
    },
  ]);
  const [step, setStep] = useState<StepId>("country");
  const [answers, setAnswers] = useState<Answers>({});

  const { data: listings } = useQuery({
    queryKey: ["marketplace", ""],
    queryFn: () =>
      api.get<MarketplaceListingSummary[]>("/marketplace/templates"),
  });

  const countries = useMemo(
    () =>
      Array.from(
        new Set(listings?.map((l) => l.organization.country) ?? []),
      ).sort(),
    [listings],
  );

  const operatorsInCountry = useMemo(() => {
    if (!answers.country || !listings) return [];
    const seen = new Map<string, string>();
    for (const l of listings) {
      if (l.organization.country === answers.country) {
        seen.set(l.organization.id, l.organization.name);
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [answers.country, listings]);

  function say(text: string) {
    setMessages((m) => [...m, { from: "assistant", text }]);
  }
  function reply(text: string) {
    setMessages((m) => [...m, { from: "user", text }]);
  }

  function pickCountry(code: string) {
    setAnswers((a) => ({ ...a, country: code }));
    reply(countryName(code));
    say("What kind of safari are you dreaming of?");
    setStep("style");
  }
  function pickStyle(style: string) {
    setAnswers((a) => ({ ...a, style }));
    reply(style);
    say("How long would you like to travel for?");
    setStep("duration");
  }
  function pickDuration(duration: string) {
    setAnswers((a) => ({ ...a, duration }));
    reply(duration);
    say("What's your budget, per person?");
    setStep("budget");
  }
  function pickBudget(budget: string) {
    setAnswers((a) => ({ ...a, budget }));
    reply(budget);
    say("How many travelers in your group?");
    setStep("partySize");
  }
  function submitPartySize(n: number) {
    setAnswers((a) => ({ ...a, partySize: n }));
    reply(`${n} traveler${n === 1 ? "" : "s"}`);
    say("Do you have a preferred start date? (optional)");
    setStep("preferredStart");
  }
  function submitPreferredStart(date: string) {
    setAnswers((a) => ({ ...a, preferredStart: date || undefined }));
    reply(date || "No specific date yet");
    say("Anything else you'd like your operator to know? (optional)");
    setStep("notes");
  }
  function submitNotes(notes: string) {
    setAnswers((a) => ({ ...a, notes: notes || undefined }));
    reply(notes || "Nothing else to add");
    say(
      operatorsInCountry.length > 0
        ? "Here are verified operators for your destination — who should receive your trip brief?"
        : "No verified operators there yet — try another destination.",
    );
    setStep("operator");
  }
  function pickOperator(id: string, name: string) {
    setAnswers((a) => ({ ...a, organizationId: id, organizationName: name }));
    reply(name);
    say("Last step — how should they reach you?");
    setStep("contact");
  }

  const submit = useMutation({
    mutationFn: () =>
      api.post(
        `/marketplace/organizations/${answers.organizationId}/custom-enquiry`,
        {
          contactFullName: answers.fullName,
          contactEmail: answers.email,
          contactWhatsapp: answers.whatsapp || undefined,
          contactCountry: answers.country,
          partySize: answers.partySize,
          preferredStart: answers.preferredStart,
          budgetTier: answers.budget,
          interests: [answers.style, answers.duration].filter(
            Boolean,
          ) as string[],
          notes: answers.notes,
        },
      ),
    onSuccess: () => {
      say(
        `Sent — ${answers.organizationName} will follow up by email with a tailored itinerary and quote.`,
      );
      setStep("done");
    },
  });

  return (
    <div className="min-h-screen bg-ivory">
      <PublicHeader />

      <div className="bg-earth-800 text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
          <p className="text-xs tracking-widest2 uppercase text-brass-300 font-medium">
            Custom safari
          </p>
          <h1 className="font-display text-3xl sm:text-4xl mt-1">
            Tell us your trip, we'll find your operator.
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="space-y-3 mb-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 text-sm ${
                  m.from === "user"
                    ? "bg-forest-700 text-white"
                    : "bg-white border border-sand-200 text-earth-800"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-sand-200 pt-6">
          {step === "country" && (
            <ChipPicker
              options={countries.map((c) => ({
                value: c,
                label: countryName(c),
              }))}
              onPick={pickCountry}
              empty="No destinations with live listings yet."
            />
          )}
          {step === "style" && (
            <ChipPicker
              options={STYLES.map((s) => ({ value: s, label: s }))}
              onPick={pickStyle}
            />
          )}
          {step === "duration" && (
            <ChipPicker
              options={DURATIONS.map((d) => ({ value: d, label: d }))}
              onPick={pickDuration}
            />
          )}
          {step === "budget" && (
            <ChipPicker
              options={BUDGETS.map((b) => ({ value: b, label: b }))}
              onPick={pickBudget}
            />
          )}
          {step === "partySize" && <NumberStep onSubmit={submitPartySize} />}
          {step === "preferredStart" && (
            <DateStep onSubmit={submitPreferredStart} />
          )}
          {step === "notes" && <NotesStep onSubmit={submitNotes} />}
          {step === "operator" && (
            <ChipPicker
              options={operatorsInCountry.map((o) => ({
                value: o.id,
                label: o.name,
              }))}
              onPick={(id) => {
                const op = operatorsInCountry.find((o) => o.id === id);
                if (op) pickOperator(op.id, op.name);
              }}
              empty="No verified operators for this destination yet."
            />
          )}
          {step === "contact" && (
            <ContactStep
              pending={submit.isPending}
              error={
                submit.isError ? (submit.error as Error).message : undefined
              }
              onSubmit={(fullName, email, whatsapp) => {
                setAnswers((a) => ({ ...a, fullName, email, whatsapp }));
                reply(`${fullName} · ${email}`);
                setTimeout(() => submit.mutate(), 0);
              }}
            />
          )}
          {step === "done" && (
            <p className="text-sm text-status-available font-medium">
              Request sent. Check your email for a reply soon.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ChipPicker({
  options,
  onPick,
  empty,
}: {
  options: { value: string; label: string }[];
  onPick: (value: string) => void;
  empty?: string;
}) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-savannah-500">{empty ?? "Nothing to show."}</p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onPick(o.value)}
          className="text-sm border border-sand-300 hover:border-forest-500 hover:bg-forest-50 px-4 py-2 transition"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function NumberStep({ onSubmit }: { onSubmit: (n: number) => void }) {
  const [n, setN] = useState(2);
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        className="atlas-input w-24"
        value={n}
        onChange={(e) => setN(Number(e.target.value))}
      />
      <button
        onClick={() => onSubmit(n)}
        className="text-xs tracking-wide uppercase font-medium bg-forest-700 hover:bg-forest-800 text-white px-4 py-2"
      >
        Continue
      </button>
    </div>
  );
}

function DateStep({ onSubmit }: { onSubmit: (date: string) => void }) {
  const [date, setDate] = useState("");
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        className="atlas-input"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <button
        onClick={() => onSubmit(date)}
        className="text-xs tracking-wide uppercase font-medium bg-forest-700 hover:bg-forest-800 text-white px-4 py-2"
      >
        {date ? "Continue" : "Skip"}
      </button>
    </div>
  );
}

function NotesStep({ onSubmit }: { onSubmit: (notes: string) => void }) {
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-2">
      <textarea
        className="w-full border border-sand-300 px-3 py-2 text-sm"
        rows={3}
        placeholder="Honeymoon, sundowners, specific parks…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button
        onClick={() => onSubmit(notes)}
        className="text-xs tracking-wide uppercase font-medium bg-forest-700 hover:bg-forest-800 text-white px-4 py-2"
      >
        {notes ? "Continue" : "Skip"}
      </button>
    </div>
  );
}

function ContactStep({
  onSubmit,
  pending,
  error,
}: {
  onSubmit: (fullName: string, email: string, whatsapp: string) => void;
  pending: boolean;
  error?: string;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          className="border border-sand-300 px-3 py-2 text-sm"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          className="border border-sand-300 px-3 py-2 text-sm"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border border-sand-300 px-3 py-2 text-sm sm:col-span-2"
          placeholder="WhatsApp (optional)"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />
      </div>
      {error && <p className="text-xs text-status-full">{error}</p>}
      <button
        disabled={!fullName || !email || pending}
        onClick={() => onSubmit(fullName, email, whatsapp)}
        className="w-full bg-forest-700 hover:bg-forest-800 text-white font-medium tracking-wide uppercase text-sm py-3 transition disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send my trip brief"}
      </button>
    </div>
  );
}
