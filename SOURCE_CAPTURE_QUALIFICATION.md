# Supplementary source capture qualification

The supplied `standalone.html` is a replayable homepage followed by a non-executing evidence capsule. The exporter's documented `serve` command strips the capsule for browser preview. Other Artho paths are proxied to the published Framer site, so replaying them depends on the live origin. The current preview proxy can forward a Brotli header after Node has decompressed the response, causing `ERR_CONTENT_DECODING_FAILED` in a browser; forcing `Accept-Encoding: identity` avoids that preview issue. This script navigates directly to the published site instead. On 2026-10-03, the published HTML for Home, About, Blog, and Features matched the archived `sourceHtml` byte for byte. The qualification script checks that again for every browser navigation and stops using a route if its SHA-256 changes.

The original `.evidence/screenshots/` PNGs, `.evidence/visual-report*.json`, `.evidence/scroll-report*.json`, and `ASTRO_MIGRATION_TRACKER.csv` remain untouched. This script writes separate screenshots, diffs, and a machine-readable report under `.evidence/source-qualification/`.

## Run

Start the native Astro preview on port 4393, then run:

```sh
node scripts/qualify-source-captures.mjs
```

The default source is `https://artho.framer.website/`. Override either origin when needed:

```sh
node scripts/qualify-source-captures.mjs --source-url=https://artho.framer.website/ --native-url=http://127.0.0.1:4393/
```

To rerun one capture without replacing the complete report:

```sh
node scripts/qualify-source-captures.mjs --only=home--bp-1199-above--full-page
```

The complete report is `.evidence/source-qualification/report.json`; a focused run writes `report--<case>.json`. An open eligible case makes the command exit with status 1 after writing its report.

## Capture and qualification contract

The script uses Playwright Chromium with the source capture's `en-US` locale, `America/Bogota` timezone, light color scheme, and `no-preference` motion setting on **both** pages. For the 1200px full page, it warms the published image cache in the same browser context, navigates afresh, verifies the browser response against archived `sourceHtml`, switches lazy images to eager loading, and waits for the hydrated image count from the archived DOM (86) to decode. The source remains at scrollY 0. Its `Desktop/01` signup preview pans from top to bottom offscreen, reaching a settled bottom position about four seconds after navigation while the parent remains on Step 01. Native Astro now follows the same offscreen timer. The qualifier never writes either page's signup stage or freezes its clock.

Native viewport-driven reveals would otherwise leave lower sections blank in a full-page screenshot. Before capturing, the script visits their actual DOM positions with instant browser scroll jumps, then returns to scrollY 0. Those jumps start below the earlier balance card, preserving its source-matching `$0` pre-view state. The report records the native warmup coordinates, `revealedCount`, and balance text. Both pages must then show `Desktop/01`, signup form content, decoded images, and the bottom preview before and after every frame. The script takes up to 12 full-page frames with 100 ms gaps and accepts the first three consecutive frames whose adjacent pixel ratios are both at most 0.25%. It records every attempted pair, elapsed times since navigation, and the selected window. The clean source's bottom-panned signup form is a natural, coherent state; the original duplicated full-page PNG remains untouched and failed.

We tested [Playwright Clock](https://playwright.dev/docs/clock) as a possible freeze. Installing it before navigation changed this Framer page's document height, and pausing it after load did not prevent a preexisting workflow transition about two seconds later. The short Step 01 window follows the observed source behavior without replacing that animation.

The script waits for DOM content, fonts, image decoding, and two consecutive screenshot pairs within 0.25% pixel difference. Other cases also wait for bounded network idle and a settling delay; the 1200px case skips those waits to capture the timed Step 01 window after its cache prewarm. The 501px full-page recapture scrolls through the page to reveal lazy images, decodes them, then returns to the top. Scroll states replay the recorded absolute scroll coordinate in steps. The About interaction clicks its accessible **Next** carousel control; the archived structural selector no longer matches the hydrated DOM. Each screenshot uses Playwright's `animations: "disabled"`, as the original extractor did.

Image readiness is checked by browser decode and `naturalWidth`, and the report records actual image response `Content-Type`. Framer can serve `image/avif` from URLs ending in `.png` or `.jpg`; the filename suffix is not used to infer rendered format.

Only four known defective archived frames are candidates for replacement: Home 501px and 1200px full-page PNGs, Blog desktop `scroll-025`, and Features tablet `scroll-025`. Visual inspection shows repeated header and hero strips in both archived Home full-page PNGs, an empty article image at the bottom right of the archived Blog frame, and an empty media region at the bottom of the archived Features frame. The clean captures show one Home hero and loaded images in those two route frames. The `originalVsClean` ratio records the extent of each defect but is not the sole proof of it. For these cases, `replacementEligible` is true only when:

1. Chromium's published document bytes have the same SHA-256 as archived `sourceHtml`.
2. Source and native document width, height, and scroll position match the archived measurements (scroll tolerance: 2 CSS pixels).
3. Relevant images decode, source and native screenshots settle for **two consecutive** pairs within 0.25%, and neither page emits a `pageerror` or console error. The 1200px pages must also show the archived `Desktop/01` workflow variant, signup form content, and a naturally bottom-settled preview in each frame of the selected window. Native lower reveal elements must be revealed and the offscreen balance must still read `$0`.
4. The original PNG's SHA-256 is unchanged and native versus clean source differs by at most 1% with the project's pixelmatch settings (`threshold: 0.12`, antialiasing excluded).

The other four recaptured states remain diagnostic even when their ratio is below 1%. The script does not update the migration tracker or mark the whole reconstruction complete.

The four reviewed clean source PNGs are accepted in `tests/reference/qualified/` with their SHA-256 values in its tracked manifest. The archived PNGs and raw comparison reports remain in place. Each accepted PNG is a fixed visual baseline for its recorded route, viewport, scroll position, and motion/interaction state. The 1200px reference represents the natural no-preference, bottom-settled Step 01 state; it does not retroactively validate the corrupt archival PNG. The source HTML hash guards route identity, while external Framer assets are still live dependencies during recapture; the accepted PNG hash makes the resulting baseline immutable.

## Current findings

The complete eight-case report generated on 2026-10-03 at 07:10 UTC qualified all four eligible replacements: Blog desktop `scroll-025` differs from native by 0.305%, Features tablet `scroll-025` by 0.239%, Home 501px full page by 0.849%, and Home 1200px full page by 0.734%. The corrupt 1200px PNG differs from its clean source by 15.459%. All eight original PNG hashes stayed unchanged and all published route HTML hashes matched the archive. Home mobile and Features mobile remain diagnostic state differences and cannot qualify as reference replacements through this script. Regenerate the complete report after each product change before accepting clean references again.
