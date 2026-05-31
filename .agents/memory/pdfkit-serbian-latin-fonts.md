---
name: pdfkit Serbian Latin fonts
description: Why server PDFs must embed a Unicode TTF and how font files are resolved across dev/prod
---

# pdfkit + Serbian Latin diacritics

pdfkit's built-in Helvetica uses WinAnsi encoding, which lacks Latin Extended-A
glyphs (c, c, z, s, dj). Any PDF rendered with `doc.font('Helvetica')` will mangle
Serbian Latin names (e.g. "Mirkovic" loses its accents, "Kovac Dj" breaks).

**Rule:** server-side PDFs that print user/worker names or Serbian labels must embed
a Unicode TTF. We bundle DejaVuSans into `server/assets/fonts/` (DejaVuSans.ttf +
DejaVuSans-Bold.ttf) and register them via `registerUnicodeFonts(doc)` in
`server/pdfGenerator.ts`.

**Why bundle instead of using system fonts:** `/usr/share/fonts/...` exists in the
dev container but is not guaranteed in the deployed runtime. Committing the TTFs to
the repo makes PDF rendering portable.

**Font path resolution:** `registerUnicodeFonts` tries candidate dirs in order —
module-relative (`import.meta.url` dir, works in dev under tsx) then
`process.cwd()/server/assets/fonts` (works in prod `node dist/index.js` from repo
root, since esbuild bundles JS to dist/ but the TTFs stay in server/assets). Falls
back to Helvetica with a console.warn if files are missing (degraded, not a crash).

**Scope note:** only `generateWorkerAnalysisPdf` was converted. `generateTaskReportPdf`
and `generateDailyReportPdf` still use Helvetica and have the same latent bug — fix
them the same way if diacritics are reported there.
