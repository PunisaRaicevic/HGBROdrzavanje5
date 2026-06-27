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

**Critical — do NOT split node_modules into many fine-grained vendor chunks.**
Splitting vendors across multiple chunks (firebase/ionic/radix/react/... each
separate) broke module init order due to cross-chunk circular dependencies and
produced a BLANK WHITE SCREEN on the web app at runtime (chunks loaded with 200
+ valid JS, but a TDZ "cannot access before initialization" crashed React boot).
It rendered for users still on the old cached bundle, which masked the breakage.

**Safe split:** one single `vendor` chunk for ALL of node_modules, app code
separate. This preserves the original (working single-bundle) vendor init order
— the only chunk boundary is app->vendor, which is one-way/acyclic so no
cross-chunk cycle/TDZ is possible. Current sizes: vendor ~0.85 MB, app ~0.42 MB,
both under 1 MB.

```js
manualChunks(id) { if (id.includes("node_modules")) return "vendor"; }
```

**How to apply:**
- Verify with `npx vite build` and confirm no asset in `dist/public/assets`
  exceeds 1 MB.
- Verify the build graph is acyclic: `vendor-*.js` must NOT import any
  `index-*.js`; `index-*.js` may import `vendor-*.js`. (rg the built files.)
- A fresh-browser screenshot of the LIVE url (screenshot type=external_url) is
  the reliable way to catch this — local prod server on a non-workflow port is
  not reachable by the headless screenshotter.
- Mobile changes ship via Appflow Live Update + GitHub push (NOT Replit deploy),
  so the user must push to GitHub for the rebuilt chunks to reach devices.
- If `vendor` ever exceeds 1 MB, split off only a KNOWN-LEAF library (nothing
  imports it circularly), never the interdependent UI libs.
