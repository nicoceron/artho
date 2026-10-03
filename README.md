# Artho Astro

Native Astro reconstruction of the captured Artho Framer site. The implementation is split into reusable page bundles and ships without an iframe, Framer runtime, or remote production-asset dependency.

## Run it

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 4393
```

Open [the local preview](http://127.0.0.1:4393/).
The dev and build commands generate local responsive image variants from the
verified source aliases when needed. Originals remain the full-resolution
fallback; the generated files are served directly from `public/assets/responsive/`.

For a deployed build, set `PUBLIC_SITE_URL` to the final public origin before
running `npm run build` (for example, `PUBLIC_SITE_URL=https://example.com npm run build`).
Astro uses it for absolute canonical, Open Graph URL, and social-image URLs.
Without it, the build omits canonical and Open Graph URL tags rather than
pointing search engines at the captured Framer site or localhost.

## Cloudflare preview

The static Astro output is deployed as an assets-only Worker at
[artho-astro-preview.nicocerond.workers.dev](https://artho-astro-preview.nicocerond.workers.dev/).
The configuration in `wrangler.jsonc` serves `dist/` and does not change the
existing Framer or Artho domains. To publish an updated preview:

```sh
npm ci
PUBLIC_SITE_URL=https://artho-astro-preview.nicocerond.workers.dev npm run build
npx wrangler deploy
```

The build-time URL sets canonical and Open Graph links. Check the URL printed
by Wrangler after deployment; if the preview address changes, rebuild with
that exact origin before deploying again.

## Verification

```sh
npm run verify
```

This runs Astro diagnostics, an 18-page production build, and Playwright coverage for every route plus smooth wheel/anchor scrolling, source card state machines and responsive variants, keyboard navigation, workflow reversal, pricing, FAQ, timeline, demo contact feedback, and related-article flows. Geometry tests cover all 24 captured homepage widths and the repaired tablet details.

To recreate the source evidence from the exported Framer capsule:

```sh
npm run evidence:extract -- /path/to/artho-framer/standalone.html
npm run evidence:fixture
```

`npm run verify` uses a small, tracked source-derived heading fixture, so it
also works without the 840 MB ignored screenshot evidence directory. Regenerate
that fixture after extracting a different source capsule.

With the dev server running on port `4393`, run the visual comparison matrix with:

```sh
npm run visual:compare
npm run visual:compare -- --route=/ --all-viewports
npm run visual:scroll
npm run audit:accessibility
node scripts/initial-state-compare.mjs
node scripts/reconcile-tracker.mjs --check
```

## Architecture

- `src/components/home/` contains the homepage bundles.
- `src/components/` contains shared workflow, testimonial, FAQ, blog, legal, layout, header, and footer bundles.
- `src/pages/` contains all 18 static routes.
- `src/data/` contains extracted site and article content.
- `public/assets/` contains localized source assets and generated responsive variants.
- `scripts/` contains responsive-image generation, streaming evidence extraction, visual comparison, and fail-closed tracker reconciliation.

The section ledger and current acceptance results are in `MIGRATION_AUDIT.md`.
The latest local verification builds all 18 routes and passes 75 Playwright
tests. Direct pixel comparisons pass all 54 core full-page captures and all
75 initial viewport states; the source/native accessibility audit passes all
75 captured viewports. The raw Home breakpoint sweep passes 22/24 and the raw
scroll/interaction sweep passes 217/219. The four failed archival PNGs remain
available for inspection. A separate live-source replay qualified four
hash-pinned references without changing the originals. The 5,796-row tracker
now has 5,387 `VERIFIED`, 409 `NOT_APPLICABLE`, and zero open rows. See
`SOURCE_REFERENCE_NOTES.md`, `SOURCE_CAPTURE_QUALIFICATION.md`, and
`TRACKER_RECONCILIATION.md` for the evidence and its limits.

Contact and account-preview forms are demos. No messages are delivered or accounts
created; the contact form explicitly says when no message has been sent.
