# Migration tracker reconciliation

`ASTRO_MIGRATION_TRACKER.csv` has 5,796 source-generated rows in 32 categories. The reconciliation script is deliberately fail-closed: a passing core screenshot average cannot set every row to `VERIFIED`.

## Evidence gates

1. The source manifest must still have 18 routes, 75 viewport captures, 294 states, and 1,066 asset aliases. The 54 core full-page, 24 homepage breakpoint, 75 viewport-only initial, and 219 scroll/interaction reports must contain every expected key exactly once and match the recorded paths, state kind, and scroll coordinates. Viewport/document width is exact; native full-page height may differ by at most 2 CSS pixels for browser rounding, matching the source geometry tolerance. The initial report compares each archived initial PNG against the top of its matching native full-page capture; the full-page reports must have zero browser errors.
2. The four original PNG failures are allowed only for Home at 501px and 1200px and Blog desktop/Features tablet at `scroll-025`. The original reports and PNGs remain untouched. The qualification script must prove the published HTML SHA-256 equals archived `sourceHtml`, source/native document and scroll geometry match, images decode, browser/console errors are absent, frames settle, the original PNG hash is unchanged, and a new source/native comparison is at most 1%. The 1200px capture uses the archived `no-preference` motion setting on both pages; it must reach the `Desktop/01` workflow variant and bottom signup preview naturally, without directly setting the native stage. The native replay scrolls to its real lower reveal elements and returns to the top. It must show all nine visible native reveal elements, preserve the initial `$0` balance, and identify a three-frame window with both adjacent frame differences at most 0.25% on each surface. The reconciliation gate recomputes those differences from the saved frame PNGs, checks the selected final frame, and retains the attempted frame times and scroll warmup positions in the accepted manifest.
3. Accepted clean source PNGs live in `tests/reference/qualified/` with a tracked SHA-256 manifest. The reconciliation script recomputes the four pixel differences from PNG bytes and rechecks the tracked hashes; a report boolean alone is insufficient.
4. The accessibility audit must cover the same 75 route/viewport keys. It compares archived source AX data with the live Astro page for the primary heading, visible heading text, named controls, and navigation/main/footer landmarks; runtime errors and missing semantics fail the gate.
5. Every production image and font alias in `.evidence/asset-manifest.json` must exist in `public/assets/` with the source blob SHA-256. Five explicit AVIF-to-PNG recodes in `scripts/asset-recodes.json` instead require both pinned byte hashes, the original archived AVIF blob, matching decoded dimensions, and byte-identical RGBA pixels. The source CDN returned AVIF content behind PNG URLs; the local PNGs align extension and static MIME type without changing decoded image pixels. Unknown byte mismatches fail. Every tracker row must have a unique ID, known route/category, source locator, and category-specific evidence. The script rejects unknown categories. Raw Framer scripts, source capture blobs, editor/badge CSS, platform-only metadata, SVG namespace tokens, and source-only CSS comment URLs can be `NOT_APPLICABLE` with their source locator and reason.
6. `--write` requires reports newer than the current `src/`, `public/`, config, and package files, then runs `npm run verify` before atomically replacing the CSV.

## Commands

After starting the native Astro server and regenerating the full-page, breakpoint, scroll, accessibility, and source qualification reports described in `MIGRATION_AUDIT.md` and `SOURCE_CAPTURE_QUALIFICATION.md`:

```sh
node scripts/initial-state-compare.mjs
node scripts/reconcile-tracker.mjs --qualified
node scripts/reconcile-tracker.mjs --accept-qualified
node scripts/reconcile-tracker.mjs --check
node scripts/reconcile-tracker.mjs --write
```

`--qualified` reads and validates a current eight-case qualification report without writing any file. Inspect its four candidate images and diffs before using `--accept-qualified`, which also requires a current report, copies only the four reviewed clean source PNGs, and writes their tracked manifest. `--check` reads everything without changing the tracker. `--write` performs the full gate and verification suite, then sets terminal statuses. Each command fails without changing the CSV if its prerequisites are incomplete.

`npm run tracker:reconcile` is also a read-only gate. Use the explicit `--write` command above when the final evidence is reviewed.

The 2026-10-03 guarded write passed all evidence gates and `npm run verify`.
The tracker contains 5,387 `VERIFIED`, 409 `NOT_APPLICABLE`, and no open rows
across all 32 source categories. Each terminal row retains its source locator
and category-specific evidence; the raw archive failures remain visible.

## What row evidence means

Visual, DOM, component, responsive-model, and CSS rows cite the precise source row ID/locator, native implementation area, and the relevant measured capture matrix. They record visual translation at the page/viewport threshold; they do **not** claim one-to-one DOM nodes, identical Framer selectors, or an independently measured rectangle for each of the 1,580 DOM nodes or 1,500 homepage responsive models. Link destinations, local image/font bytes, routes, recorded states, accessibility samples, and keyboard semantics have separate checks. The AX audit checks specific semantics at all 75 viewports but does **not** claim identical full accessibility trees. A row with only aggregate visual evidence must be read with that limit.

If accepted, the 1200px natural no-preference frame is a stable supplementary source state. It does not transform the broken original PNG into a valid comparison or claim that every phase of the Framer animation was pixel-identical. The motion is checked separately by browser motion tests and `MOTION_PARITY.md`.
