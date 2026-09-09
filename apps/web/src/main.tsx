import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { AuthProvider } from "./lib/auth";
import { router } from "./router";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

// Production only — Vite's dev server rewrites/HMR don't play well with a
// service worker's own caching, and there's nothing to gain from it in
// dev. See public/sw.js for what's actually cached and why (§8, §10.9).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is a progressive enhancement — if registration
      // fails (unsupported browser, blocked storage), the app still works
      // fully online, it just won't cache anything for later.
    });
  });
}
