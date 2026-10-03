# Artho motion parity ledger

This ledger maps the native Astro implementation to the recovered Framer source module
`Uh_1razjKJCtzy45NRpSNwg8AUZg0vDfw_3YFXWgTu8.6w3yXPeI.mjs`
(captured SHA-256 `448e7ff5…`). The source module is evidence only and is not shipped or executed.

| Bundle | Recovered source contract | Native implementation | Regression gate |
| --- | --- | --- | --- |
| Shared header, buttons, footer | 400 ms spring/tween hover variants; growing link underlines; moving CTA arrows | `motion.css`: underline, fill, arrow, social and menu motion | All-route runtime checks; keyboard focus states |
| Page scrolling | The prior `srcwise` native reconstruction uses Lenis 1.1.2 for wheel/trackpad and same-page anchors | Lenis 1.1.2 with a native RAF loop, nested-scroll protection, menu locking, same-page anchor handling, and reduced-motion fallback | Wheel progression and FAQ anchor-settling tests |
| Home hero | Main image spring at 650 ms; exact exported balance/expense SVG panels at 750 ms; unclipped outer stage around a clipped browser window; desktop/tablet/phone downward-scroll variants at 50% threshold | `HomeHero.astro` + `site.ts`: native browser chrome, source dashboard crop, exact local panel assets, delayed entrances, and breakpoint-aware `*/On Scroll` state | Asset, geometry, timing, and scroll-variant motion tests |
| Trusted logo rail | 700 px clipped marquee, 12.5% edge mask, 120×40 logo cells with 10 px gaps, and a linear 86.666 s track | Four native source-logo repetitions moving 1,300 px per cycle at the source's 15 px/s speed | Geometry, edge-mask, logo-count, and duration motion test |
| Simple & Intuitive | Three desktop image-pan states after hover; 500/500 ms holds; 400 ms transitions; static tablet/phone variants; no invented overlays | Native top, fitted-center and bottom pans of the exact source dashboard image plus source-sized responsive crops | Exact delay ledger, responsive geometry, DOM boundary, and pointer/keyboard tests |
| Real-Time Accuracy | Four horizontal report states; 500/500/500 ms holds; 400 ms transitions | Native four-panel stacked-to-horizontal report rail | Exact delay ledger plus keyboard sequence test |
| Secure & Reliable | Nine account-protection states; 500/500/500/500/800/800/500/500 ms holds | Native profile, lock and security-settings sequence with protected completion state | Exact delay ledger plus keyboard sequence test |
| Real-Time Overview | Three embedded image states, 500 ms holds, 400 ms transitions | Local overview/expense/balance frames with live status | Pointer sequence test |
| Automated Billing | Six desktop embedded-card states, 500 ms holds, 400 ms transitions; static My Cards tablet/phone variants | Exact local payment-card fan, expansion, My Cards swap, and vertical pans | Delay ledger, responsive visibility, and reduced-motion tests |
| Insightful Analytics | Four desktop hover states; 800/800/500 ms holds; 400 ms transitions; static two-card tablet and score-only phone variants | Native score, bar, expense, and stacked/panned states with breakpoint-specific layouts | Exact delay ledger, responsive visibility, and reduced-motion tests |
| Budget Planning | Seven desktop hover states; 500/500/1000/500/500/500 ms holds | Exact native stacked, selected, spread, and panned report states | Exact delay-attribute and responsive-static tests |
| Seamless Integrations | Three hover states plus a 60 s linear rotation | Native central exchange and eight-logo orbit states | 60 s track-duration and responsive-static tests |
| Control CTA | Desktop start/visible variants at 50% threshold; desktop bell toggles the notification panel; Quick Transfer rail moves linearly for 83 s | Native threshold reveal, bell shrink/toggle, source notification panel, balance counter, and continuous contact rail | Threshold, notification, rail-duration, and reduced-motion tests |
| Four-step workflow | Active-step variants and 400 ms panel transitions; tablet previews at 0/100/200px and bottom-aligned step 04 | ARIA tabs, arrow-key navigation, responsive preview placement and interruptible panel replacement; cancelled animations cannot hide the newly selected panel | Atomic 400 ms duration check, rapid-reversal, geometry and keyboard tests |
| Workflow step 01 signup | The nested account preview advances through one-second appear states while offscreen; its tall form moves upward to show the password, agreement, signup, and social controls | After 3 s of selected desktop time, the form pans by its measured overflow even while offscreen; tab exit/reentry resets it, and reduced motion keeps the initial view | Focused 1200px offscreen pan, reset/replay, and reduced-motion test; clean source-state qualification uses naturally reached frames |
| Workflow step 04 analytics | Six appear states with 1s holds and 400 ms transitions, recovered from captured module SHA-256 `8d8dfd62…`; unstack, expand score, fill score bars, expand expenses, fill expense bars and pan | Native CSS/TypeScript sequence; starts only while the selected desktop panel is visible, resets when hidden; static tablet/mobile/reduced-motion rendering | Dedicated six-step appear/reset test and source-state captures |
| Testimonials | Static quote/metric cards with responsive rearrangement; the recovered homepage bundle does not attach card hover gestures | Native source grid/crops without invented lift or image zoom | Geometry and reduced-motion coverage |
| About | Horizontal journey overflow plus desktop card/social hovers; always-visible social links below 1200px | Drag, touch, buttons, arrows, scroll snap, disabled states and progress; desktop team hover/focus and tablet/mobile social links | Keyboard scroll/progress, source hover and tablet-detail tests |
| Features | Five large product sections are static in the recovered route; no section hover state is attached | Exact localized source images with no invented hover swap or reveal | Static-route-card motion test plus all-route rendering |
| Pricing | Period toggle plus shared button variants; pricing and add-on cards themselves are static | Animated native price swap with no invented card lift, add-on shift, or entrance reveal | Pricing functional and static-route-card motion tests |
| FAQ | Category and accordion variants at 400 ms | ARIA tabs plus interruptible 400 ms accordion height transitions | Single-open functional test |
| Contact | Contact-method cards are static in the recovered route; form controls retain native focus feedback | Static contact methods plus accessible validation and explicit demo/no-message-sent feedback | Static-route-card motion and contact-form functional tests |
| Blog/article | Static article cards in the recovered route; no card hover animation is attached | Native linked cards with exact source content and no invented lift, corner morph, image zoom, or arrow | Static-route-card motion test plus all-route and related-title tests |
| Responsive imagery | Framer requests scaled blog images, feature photos, and the workflow dashboard at sizes appropriate to the viewport | Local 512/1024/2048-class variants use standard `srcset` and `sizes`; the verified original aliases remain the full-resolution fallback | Browser-selected asset sizes, core full-page comparison, and close-up state captures |
| Reduced motion | No source requirement, added as an accessibility boundary | Long tracks stop; sequences stay at step 0; content remains visible | Dedicated reduced-motion context test |

The implementation is native Astro/TypeScript/CSS. It does not import the Framer runtime,
embed the export, or execute captured source bundles.

The latest raw scroll/interaction sweep has 217 of 219 states within 1%.
The two raw close-ups show images absent in the archived scrolled PNGs but present
in the source DOM and full-page captures. See `SOURCE_CAPTURE_QUALIFICATION.md`
for their clean-source qualification and original hash evidence.
