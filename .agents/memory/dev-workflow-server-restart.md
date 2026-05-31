---
name: Dev server requires manual restart for backend changes
description: The "Start application" workflow runs tsx without watch, so server/ changes need a workflow restart.
---

The dev workflow runs `NODE_ENV=development tsx server/index.ts` (no `--watch`). Vite HMR only reloads the client (`client/`). Any change to `server/` (routes, pdf generators, services) does NOT take effect until the "Start application" workflow is restarted.

**Why:** Symptom of a forgotten restart: a newly added Express route returns the SPA `index.html` (HTTP 200, HTML body) instead of JSON/PDF, because the request falls through to Vite's catch-all.

**How to apply:** After editing any backend file, call `restart_workflow("Start application")` before testing the endpoint with curl or the browser.
