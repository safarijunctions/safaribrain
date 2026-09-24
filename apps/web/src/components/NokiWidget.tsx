import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";

interface NokiTurn {
  role: "user" | "assistant";
  content: string;
}

// Minimal surface of the Web Speech API this file uses — not in
// lib.dom.d.ts, and only some browsers implement it (Chrome/Edge; no
// Firefox, partial Safari), so everything here is feature-detected and
// degrades to text-only rather than assumed present.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | undefined {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const speechSupported = typeof window !== "undefined" && Boolean(getSpeechRecognitionCtor());
const speechSynthesisSupported = typeof window !== "undefined" && "speechSynthesis" in window;

// Must match (or stay under) the API's NokiMessageDto.messages @ArrayMaxSize
// — the client sends only the most recent slice of a long conversation so a
// deep chat never hits that cap and dead-ends every future message with a
// raw validation error. Full history still stays visible in the panel; only
// what's actually sent to the model gets windowed.
const MAX_SENT_TURNS = 20;

// Floating read-only assistant, available from anywhere inside the
// authenticated app shell. It can only look things up (CRM/bookings/
// dashboard, via the API's tool-use loop) — it has no write path, so
// there's nothing here that needs approval or confirmation before it runs.
//
// Voice is a pure front-end layer on top of the same text endpoint: the mic
// button transcribes speech to text client-side (Web Speech API) and sends
// it exactly like a typed message; "speak replies" reads the same reply
// text back out loud. Neither touches the API — Noki itself never hears
// audio or knows the difference.
export function NokiWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<NokiTurn[]>([]);
  const [listening, setListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");

  const ask = useMutation({
    mutationFn: (messages: NokiTurn[]) => api.post<{ reply: string; model: string }>("/ai/noki/message", { messages }),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, ask.isPending]);

  // Stop listening / talking the moment the panel closes or unmounts, so
  // Noki never keeps the mic open or a voice going in the background.
  useEffect(() => {
    if (!open) {
      recognitionRef.current?.stop();
      if (speechSynthesisSupported) window.speechSynthesis.cancel();
    }
  }, [open]);
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (speechSynthesisSupported) window.speechSynthesis.cancel();
    };
  }, []);

  function respond(text: string) {
    setTurns((t) => [...t, { role: "assistant", content: text }]);
    if (speakReplies && speechSynthesisSupported) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  }

  // A failed request is still a reply as far as a spoken conversation is
  // concerned — a user who asked out loud should hear "no AI provider is
  // configured", not silence, even though it's an error path.
  function sendText(text: string) {
    if (!text.trim() || ask.isPending) return;
    const next = [...turns, { role: "user" as const, content: text.trim() }];
    setTurns(next);
    setInput("");
    ask.mutate(next.slice(-MAX_SENT_TURNS), {
      onSuccess: (res) => respond(res.reply),
      onError: (err) => respond(err instanceof ApiError ? err.message : "Something went wrong reaching Noki."),
    });
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    if (speechSynthesisSupported) window.speechSynthesis.cancel();

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    transcriptRef.current = "";

    recognition.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      transcriptRef.current = text;
      setInput(text);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      const text = transcriptRef.current.trim();
      if (text) sendText(text);
    };
    recognition.onerror = (e) => {
      setListening(false);
      recognitionRef.current = null;
      // Silence-timeout ("no-speech") is expected if someone taps the mic
      // and changes their mind — not worth interrupting them over. Anything
      // else (mic permission denied, no mic, network hiccup) needs to say
      // something, or a voice-first feature just looks broken.
      if (e?.error && e.error !== "no-speech" && e.error !== "aborted") {
        const message =
          e.error === "not-allowed" || e.error === "permission-denied" || e.error === "service-not-allowed"
            ? "I couldn't access your microphone — check this site's mic permission in your browser settings."
            : "Voice input hit a snag — try again, or type your question instead.";
        respond(message);
      }
    };

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-gradient-to-r from-clay-600 to-clay-700 hover:from-clay-700 hover:to-clay-800 text-white text-sm font-medium rounded-full pl-3 pr-4 py-2.5 shadow-lg shadow-clay-900/20 transition"
      >
        <span aria-hidden className="text-base">✦</span>
        Noki
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 w-[22rem] max-w-[calc(100vw-2.5rem)] h-[28rem] max-h-[calc(100vh-4rem)] bg-white border border-stone-200 rounded-xl shadow-2xl shadow-clay-900/20 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between bg-gradient-to-r from-clay-800 via-clay-700 to-acacia-800 text-white px-4 py-3 shrink-0">
        <div>
          <p className="font-display font-semibold text-sm leading-tight">Noki</p>
          <p className="text-[11px] text-white/70 leading-tight">Read-only — asks, never acts</p>
        </div>
        <div className="flex items-center gap-1">
          {speechSynthesisSupported && (
            <button
              onClick={() => {
                setSpeakReplies((v) => !v);
                window.speechSynthesis.cancel();
              }}
              aria-pressed={speakReplies}
              aria-label={speakReplies ? "Spoken replies on" : "Spoken replies off"}
              title={speakReplies ? "Spoken replies on" : "Spoken replies off"}
              className={`text-sm leading-none rounded px-1.5 py-1 transition ${speakReplies ? "bg-white/25 text-white" : "text-white/70 hover:text-white"}`}
            >
              {speakReplies ? "🔊" : "🔈"}
            </button>
          )}
          <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-lg leading-none px-1" aria-label="Close">
            ×
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-stone-50">
        {turns.length === 0 && (
          <p className="text-xs text-stone-500 px-1">
            Ask about enquiries, quotes, or bookings — e.g. "what's the status of Laura Bennett's enquiry" or "how many
            quotes are pending approval". {speechSupported ? "Type, or tap the mic to talk to it." : "Noki can only look things up, not change anything."}
          </p>
        )}
        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                t.role === "user" ? "bg-clay-700 text-white" : "bg-white border border-stone-200 text-stone-800"
              }`}
            >
              {t.content}
            </div>
          </div>
        ))}
        {ask.isPending && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-400">Thinking…</div>
          </div>
        )}
      </div>

      <div className="border-t border-stone-200 p-2 flex gap-2 shrink-0">
        {speechSupported && (
          <button
            onClick={toggleListening}
            disabled={ask.isPending}
            aria-pressed={listening}
            aria-label={listening ? "Stop listening" : "Talk to Noki"}
            title={listening ? "Stop listening" : "Talk to Noki"}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${
              listening ? "bg-red-600 text-white animate-pulse" : "border border-stone-300 hover:bg-stone-50"
            }`}
          >
            🎤
          </button>
        )}
        <input
          className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm"
          placeholder={listening ? "Listening…" : "Ask Noki…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendText(input);
            }
          }}
        />
        <button
          onClick={() => sendText(input)}
          disabled={!input.trim() || ask.isPending}
          className="bg-clay-700 hover:bg-clay-800 text-white text-sm font-medium rounded-lg px-3 py-2 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
