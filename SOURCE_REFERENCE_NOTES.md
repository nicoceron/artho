# Source-reference limitations

The supplied export remains the source of truth. Original PNGs are never replaced,
edited, or silently excluded from the comparison reports.

## Corrupted full-page screenshots

- `home/bp-500-above--initial.png` (501px): the header and hero restart around
  image row 993, despite the captured DOM containing a single header and hero.
- `home/bp-1199-above--initial.png` (1200px): the header and hero repeat around
  image rows 813 and 1626. This is a stitched-capture error, not the source layout.

The final 24-width raw comparison passes 22 captures within 1%. Native versus
the two stitched archive PNGs remains at 18.401% (501px) and 15.395% (1200px),
with matching document dimensions. The archive PNGs differ from fresh source
renders by 18.597% and 15.459%, respectively. Captured heading geometry
passes the same 2px test as all other widths. Native versus those fresh source
renders is 0.849% and 0.734%; the original PNGs remain unchanged.

## Scroll/interaction references

`.evidence/scroll-report.json` retains all 216 scroll and three interaction
comparisons. It does not hide differences behind the passing full-page matrix.
All requested scroll positions settle within 2 CSS pixels. The refreshed raw
sweep has 217/219 comparisons within 1% (0.269% average).

The deterministic comparator replays source-captured component states: selected
workflow tabs come from the captured DOM, the home mobile contact rail uses its
observed 5px animation phase, and the About tablet carousel uses its observed
553px in-flight position. The mobile About capture shows the settled first page
at 315px, which the native button reaches directly. Both About interactions now
pass at 0.416% (tablet) and 0.428% (mobile). Home mobile `scroll-050` passes at
0.500%, Blog tablet `scroll-075` at 0.374%, and Features mobile `scroll-075` at
0.947%.

Raw comparisons above 1%:

| Route | Viewport/state | Difference | Observed discrepancy |
| --- | --- | --- | --- |
| Blog | Desktop / scroll-025 | 3.127% | One card image is blank in this scrolled source PNG but present in the source DOM and full-page PNG |
| Features | Tablet / scroll-025 | 8.172% | The lower photo is blank in this scrolled source PNG but loaded in the source DOM and full-page PNG |

The export aliases multiple `scale-down-to` URLs to a single original image
blob. The native site now generates local responsive variants for nine blog
images, five feature photos, and the workflow dashboard. Standard `srcset` and
`sizes` select 512/1024/2048-class resources while the verified original alias
remains the full-resolution fallback. The source often serves AVIF content
behind `.jpg` or `.png` URLs, so the local variants are not asserted to be
byte-identical CDN responses. Exact live 512px contact-avatar responses were
tested separately; they reduced bytes but did not improve the home capture, so
the original avatars remain in use.

The source signup preview advances through nested timed states and pans its
tall form upward while the workflow is offscreen. The native preview now does
so after 3s of selected desktop time using measured overflow; tab resets and
reduced motion have focused tests. The 1200px clean-source capture records a
natural `no-preference` Step 01 frame with the preview bottom-settled on both
sites. Native lower sections were revealed by scrolling to their own elements
and back before that screenshot; no preview stage was set by the capture code.
The four clean-source screenshots are separately hash checked, while the raw
archive failures remain visible in the original reports.

## Product boundary

This is a native marketing-site reconstruction, not the financial application
illustrated inside its cards. Contact and account-preview forms do not create
accounts or deliver messages. Contact submission explicitly reports that it is a
demo and that no message was sent. A real delivery backend needs separate setup.
