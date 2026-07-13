import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Separate from vite.config.js on purpose: that file configures the dev
// server (allowedHosts etc.), this configures the test runner. Only *.jsx
// render tests run under Vitest - the existing node:test suite (api-helpers,
// request-cache, page-components, responsive-css, app, auth-flow) keeps
// running via `node --test`, unchanged, so this doesn't force a rewrite of
// already-passing tests just to fit a new runner's assertion syntax.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.render.test.jsx"],
    setupFiles: ["./tests/render-setup.js"],
    globals: false,
  },
});
