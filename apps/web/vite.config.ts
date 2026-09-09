import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxy = {
  "/api": {
    target: "http://localhost:3001",
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  // `vite preview` serves the production build — needed to test the
  // service worker, which only registers when import.meta.env.PROD (see
  // src/main.tsx). It reads its own `preview` config, not `server`.
  preview: {
    port: 4173,
    proxy: apiProxy,
  },
});
