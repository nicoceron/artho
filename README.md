# Malvavisco marketing site

An Astro site for **Malvavisco**, the name used to market LodgeOps. It adapts the completed Artho-to-Astro reconstruction, retaining its section and card motion while replacing the finance template with LodgeOps workflows and product captures.

The 16 screens in `public/product/` come from the real LodgeOps staff app populated with a **fictional sample lodge**. Product claims in `src/data/malvavisco.ts` and the guides are grounded in `lodge-ops/docs/status.md` and `lodge-ops/docs/guides/staff-workflows.md`. There are no invented subscription tiers, customer reviews, or live payment promises.

## Local development

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 4393
```

Set deployment-specific values in your environment before building:

| Variable | Purpose |
| --- | --- |
| `PUBLIC_SITE_URL` | Final public origin for absolute canonical and social URLs. Omit for local builds. |
| `PUBLIC_DEMO_ENDPOINT` | Optional URL that accepts a JSON `POST` demo request. A 2xx response confirms submission. |
| `PUBLIC_CONTACT_EMAIL` | Optional fallback. Opens a prepared email draft that the visitor must send. |
| `PUBLIC_APP_URL` | Optional verified staff sign-in URL shown in the footer. |

If neither demo destination is configured, the request button is disabled with a visible explanation. The endpoint receives `name`, `email`, `lodge`, `country`, `rooms`, `runs`, and `message`; `runs` is currently an empty array for compatibility with the existing Malvavisco form contract. Configure CORS if the endpoint is on another origin.

The form enables submission only after its client script is ready. With JavaScript unavailable it stays disabled and explains why, so it cannot post to a static page by accident.

```sh
npm run verify
```

This runs Astro checks, a static build, route and interaction tests, motion state tests, and desktop/tablet/phone layout checks. The privacy and website terms pages are marked **Draft for review** and `noindex`; they require an approved recipient, legal identity, and policy review before public release.

The existing Artho preview is separate. `wrangler.jsonc` is configured for a new `malvavisco-astro-preview` Worker so a future preview deploy cannot overwrite it. No preview or production release is implied by a local build.

The Malvavisco build ships product captures and the seven legacy font/SVG files still used by the design. Unused Framer assets and the former responsive-image generator were removed. Archived Artho documentation describes the original reconstruction, not this asset pipeline.

## Port history

The Framer reconstruction evidence and original motion contract remain in `MOTION_PARITY.md`, `MIGRATION_AUDIT.md`, and `ASTRO_MIGRATION_TRACKER.csv`. The former README is preserved in `ARTHO_PORT_HISTORY.md` as historical context. Those old parity scripts reference the original Artho assets and are archival; `npm run verify` is the current Malvavisco gate. The original layout and text geometry tests were replaced with Malvavisco layout checks because the brand copy and product media change those measurements.
