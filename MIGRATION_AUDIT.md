# Artho migration audit

## Implemented

- 18 native Astro routes: home, About, Blog, nine article pages, Contact, FAQ, Features, two legal pages, and Pricing.
- Shared header, footer, hero, CTA, workflow, testimonial, FAQ, blog-card, article, and legal-page bundles.
- Localized production aliases backed by deduplicated assets; no Framer iframe or production runtime dependency.
- Responsive desktop, tablet, and mobile layouts derived from the recorded Framer captures.
- Mobile navigation, desktop Resources menu, keyboard-accessible workflow tabs, mobile four-step workflow, pricing billing toggle, FAQ category/accordion behavior, About timeline controls, Contact form demo state, and source-specific related posts.
- Source-derived desktop state machines for all eight product cards, with the export's static tablet/phone card variants and exact media geometry.
- Local responsive variants for blog cards and article heroes, feature photos, and the workflow dashboard; verified original image aliases remain the full-resolution fallback.
- Lenis 1.1.2 wheel/trackpad smoothing carried over from the prior `srcwise` reconstruction, including same-page anchors, nested-scroll protection, mobile-menu locking, and reduced-motion fallback.

## Evidence

- Export capsule: 18 routes and 75 recorded viewport captures.
- Extracted evidence: 369 screenshots, 1,066 source aliases, and 889 verified deduplicated blobs.
- Browser test suite covers every route and the reconstructed behaviors.
- The source-generated tracker has 5,796 rows in 32 categories. Reconciliation is gated on the complete visual, accessibility, asset, and build evidence described in `TRACKER_RECONCILIATION.md`.

## Acceptance status

Native section implementation: **delivered across all 18 routes**. The illustrated
financial application and account/contact forms are demonstrations, not connected
financial or message-delivery services.

Core full-page pixel gate: **54/54 pass**. Initial viewport gate: **75/75 pass**.
The four defective archive frames have accepted, SHA-pinned clean-source
references. The guarded tracker reconciliation is complete: **5,387 VERIFIED,
409 NOT_APPLICABLE, 0 open**. Passing a full-page average does not certify
every close-up or animation frame; the separate state and qualification gates
are recorded below.

Latest measured matrix on 2026-10-03:

- `npm run verify` passes: Astro check has zero errors, warnings, and hints;
  the build generates 18 pages; Playwright passes 52 route/accessibility/link,
  18 motion, three section-geometry, and two responsive-detail tests (75 total).
- All 54 desktop, tablet, and mobile full-page captures pass the 1% threshold:
  0.207% average difference, 0.879% worst. Zero runtime errors.
- All 75 archived viewport-only initial states pass the 1% threshold against
  matching native top crops; Pricing mobile is 0.055% after restoring the
  source's lime billing control without shifting the page. The source/native
  accessibility audit also passes all 75 captured viewports.
- All 24 captured homepage widths pass heading geometry within 2 CSS pixels,
  with no horizontal page overflow. The raw breakpoint comparison passes
  22/24 PNGs within 1%; the 501px and 1200px source PNGs contain repeated
  header/hero strips.
- Across all 75 full-page references, 73 pass. The two failed source PNGs contain
  repeated header/hero strips inconsistent with their captured DOM.
- All 216 scroll positions and three captured interactions were compared:
  217/219 pass 1%; two scrolled source PNGs show blank images
  that are populated in their source DOM/full-page captures. All requested
  vertical scroll positions are reached within 2 CSS pixels.
- The source's timed signup preview now pans by its measured form overflow after
  3s of selected desktop time, including while offscreen as observed on the
  published source. Focused reset and reduced-motion tests pass. The Take
  Control balance starts at the source's pre-view `$0` and resolves on entry.
- Original screenshots and failed comparisons are preserved. The complete
  eight-case source replay qualifies Blog desktop `scroll-025` at 0.305%,
  Features tablet `scroll-025` at 0.239%, Home 501px at 0.849%, and Home
  1200px at 0.734% against clean source. The 1200px frame uses naturally
  reached, bottom-settled Step 01 on both sites. The source HTML, original
  PNGs, and accepted replacement PNGs are hash checked. See
  `SOURCE_REFERENCE_NOTES.md` and `SOURCE_CAPTURE_QUALIFICATION.md`.

## Section-by-section repair ledger

| Section or bundle | Repaired and checked |
| --- | --- |
| Navigation and scrolling | Lenis wheel/anchor smoothing; mobile scroll lock; Resources hover, Escape and keyboard focus; sticky header |
| Hero dashboard | Exact local dashboard and floating SVG panels; native browser chrome; source entrance delays; responsive downward-scroll states |
| Trusted clients | Centered 700px marquee; correct logo dimensions, gaps, edge mask and continuous source speed |
| Why choose us | Intrinsic responsive card heights; exact dashboard crops; simple, accuracy and security state sequences |
| Feature cards | Native overview, billing, analytics, budget and integration sequences; source static phone/tablet variants; fluid grid and floating panels |
| Control CTA | Source notification toggle, transfer rail, counter, date and responsive composition |
| Four-step workflow | Native account/card previews; all four panels; rapid reversal cancellation; measured timed signup-form pan; six-step analytics appear sequence; source tablet offsets and mobile stack |
| Testimonials and final CTA | Exact copy, fonts, stars, image crops, nested columns, intrinsic heights and responsive CTA image sizing |
| About | Hero collage, story, statistics, timeline controls, native team hovers, visible tablet social links and correctly sized hiring button |
| Features and pricing | All five feature sections with local responsive photos; source check icons; pricing period toggle, add-ons and FAQ |
| Blog and articles | All nine articles; local responsive card/hero images; source inline formatting, headings, lists, cards and related posts |
| Contact, FAQ and legal | Source form appearance, explicit demo feedback, all 30 FAQ answers, corrected sticky categories and legal typography |
| Footer | Source link opacity, social spacing, responsive columns and 10%-opacity watermark |

## Reproduce the evidence

With the local site on port 4393:

```sh
npm run verify
npm run visual:compare -- --strict
npm run visual:compare -- --route=/ --all-viewports
npm run visual:scroll
npm run audit:accessibility
node scripts/initial-state-compare.mjs
node scripts/qualify-source-captures.mjs
node scripts/reconcile-tracker.mjs --check
node scripts/capture-motion.mjs
```

Reports live in `.evidence/visual-report.json`,
`.evidence/visual-report-breakpoints.json`, `.evidence/scroll-report.json`,
`.evidence/initial-report.json`, `.evidence/accessibility-report.json`, and
`.evidence/source-qualification/report.json`. The accepted clean reference
hashes live in `tests/reference/qualified/manifest.json`.
The motion capture script records initial and final native frames for all eight
interactive homepage cards without the fixed header obscuring their contents.
