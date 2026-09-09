// Minimal offline support for the traveler-facing booking status page —
// §8 non-functional requirement / §10.9 acceptance criterion: "the
// traveler can open essential trip details offline; unsynced actions are
// clearly labeled as such." Scope is deliberately narrow: a page the
// traveler has already opened once (their own /booking/:token link, its
// API response, and the JS/CSS shell that renders it) stays available with
// no network. Nothing here ever caches a POST/PATCH/DELETE — write actions
// (recording a payment, submitting a review) always require real network,
// per §8's "never imply a payment or seat is confirmed while offline."

const CACHE_NAME = "safaribrain-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never intercept writes — always hit the network

  const url = new URL(request.url);
  const isNavigation = request.mode === "navigate";
  const isBookingApi = url.pathname.startsWith("/api/bookings/public/") && !url.pathname.endsWith(".pdf");
  const isStaticAsset = url.pathname.startsWith("/assets/") || url.pathname === "/manifest.json" || url.pathname === "/icon.svg";

  if (!isNavigation && !isBookingApi && !isStaticAsset) return; // everything else (other API calls, PDFs) always goes live

  if (isStaticAsset) {
    // Build assets are content-hashed by Vite — safe to serve cache-first.
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Navigations and the booking status API response: network-first so a
  // traveler with connectivity always sees live status, falling back to
  // whatever was cached the last time this exact URL was opened.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, res.clone()));
        return res;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error())),
  );
});
