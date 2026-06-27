---
name: Appflow Live Update chunk size limit
description: Production JS chunks must stay under 1 MB each or the app shows a white screen after an Appflow Live Update.
---

# Appflow Live Update per-file size limit

A single bundled JS chunk over ~1 MB causes a **white screen after Appflow Live
Update** on the Capacitor Android app. The web build worked fine; only the
Live-Update delivery path broke.

**Rule:** Keep every emitted JS asset under 1 MB. The default Vite build produced
one ~1.2 MB `index-*.js` monolith — that was the failure.

**Fix:** `build.rollupOptions.output.manualChunks` in `vite.config.ts` splits
node_modules into vendor chunks (firebase, ionic, capacitor, radix, react,
tanstack, charts, jspdf, icons, i18n, date-fns, google, fallback `vendor`).
Keep `react`/`react-dom`/`scheduler` grouped together. After splitting, largest
app chunk ~420 KB, vendor chunks <170 KB.

**How to apply:**
- Verify with `npx vite build` and confirm no asset in `dist/public/assets`
  exceeds 1 MB.
- Mobile changes ship via Appflow Live Update + GitHub push (NOT Replit deploy),
  so the user must push to GitHub for the rebuilt chunks to reach devices.
- If bundle grows again, add more targeted matchers to split the `vendor` chunk.
