import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import sharp from "sharp";
import { replacementKeys, validateQualification, promoteQualified, validateAccepted } from "./qualification-gate.mjs";

// No status is written unless every expected capture has a passing direct or
// reviewed clean-source comparison. Source-only Framer code is classified
// explicitly; unknown row categories fail closed.
const root = path.resolve(import.meta.dirname, "..");
const trackerPath = path.join(root, "ASTRO_MIGRATION_TRACKER.csv");
const args = new Set(process.argv.slice(2));
const acceptedArgs = new Set(["--check", "--qualified", "--accept-qualified", "--write"]);
if ([...args].some((arg) => !acceptedArgs.has(arg)) || (args.has("--write") && args.has("--accept-qualified"))) {
  throw new Error("Usage: node scripts/reconcile-tracker.mjs [--qualified | --accept-qualified | --check | --write]");
}
const coreNames = new Set(["desktop", "tablet", "mobile"]);
const ratioLimit = 0.01;
const key = (route, viewport) => `${route}::${viewport}`;
const stateKey = (route, viewport, state) => `${route}::${viewport}::${state}`;
const fail = (message) => { throw new Error(`${message} Tracker was not mutated.`); };
const insist = (condition, message) => { if (!condition) fail(message); };
const readJson = async (relative) => {
  try { return JSON.parse(await fs.readFile(path.join(root, relative), "utf8")); }
  catch (error) { fail(`Missing or invalid ${relative}: ${error.message}.`); }
};
const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
async function latestMtime(target) {
  const stat = await fs.stat(target);
  if (!stat.isDirectory()) return stat.mtimeMs;
  const children = await fs.readdir(target);
  return Math.max(stat.mtimeMs, ...await Promise.all(children.map((child) => latestMtime(path.join(target, child)))));
}
async function productMtime() {
  return Math.max(...await Promise.all(
    ["src", "public", "astro.config.mjs", "package.json", "package-lock.json"]
      .map((item) => latestMtime(path.join(root, item)))));
}
const manifests = await Promise.all([
  readJson(".evidence/route-manifest.json"),
  readJson(".evidence/asset-manifest.json"),
]);
const [routes, assets] = manifests;
insist(Array.isArray(routes) && routes.length === 18, "Expected 18 source routes.");
insist(Array.isArray(assets) && assets.length === 1066, "Expected 1,066 source asset aliases.");
const routeMap = new Map(routes.map((route) => [route.route, route]));
insist(routeMap.size === 18, "Duplicate source routes.");
const captures = new Map();
const states = new Map();
for (const route of routes) {
  for (const capture of route.captures) {
    const captureId = key(route.route, capture.viewport.name);
    insist(!captures.has(captureId), `Duplicate source capture ${captureId}.`);
    captures.set(captureId, capture);
    for (const state of capture.states) {
      const id = stateKey(route.route, capture.viewport.name, state.label);
      insist(!states.has(id), `Duplicate source state ${id}.`);
      states.set(id, state);
    }
  }
}
insist(captures.size === 75 && states.size === 294, "Expected 75 source captures and 294 states.");

const qualification = await validateQualification(routes);
if (args.has("--qualified") || args.has("--accept-qualified")) {
  insist(Date.parse(qualification.report.generatedAt) >= await productMtime() - 2000,
    "Qualification report is older than product source/assets; recapture before accepting.");
}
if (args.has("--qualified")) {
  for (const id of replacementKeys) {
    const item = qualification.byKey.get(id);
    console.log(`${id}: clean source ${(item.nativeVsClean * 100).toFixed(3)}%; archived ${(item.originalVsClean * 100).toFixed(3)}%; ${item.sourcePath}`);
  }
  console.log("Four clean source captures qualified; tracker and raw references unchanged.");
  process.exit(0);
}
if (args.has("--accept-qualified")) {
  const count = await promoteQualified(qualification);
  console.log(`Promoted ${count} reviewed clean source references to tests/reference/qualified/; original PNGs remain unchanged.`);
  process.exit(0);
}
await validateAccepted(qualification);

function exactMatrix(results, expected, title, idOf) {
  insist(Array.isArray(results) && results.length === expected.size,
    `${title} requires ${expected.size} entries; found ${results?.length ?? 0}.`);
  const actual = new Map();
  for (const result of results) {
    const id = idOf(result);
    insist(expected.has(id) && !actual.has(id), `${title} has unexpected or duplicate ${id}.`);
    actual.set(id, result);
  }
  return actual;
}

const [core, breakpoint, scroll, initial, accessibility] = await Promise.all([
  readJson(".evidence/visual-report.json"),
  readJson(".evidence/visual-report-breakpoints.json"),
  readJson(".evidence/scroll-report.json"),
  readJson(".evidence/initial-report.json"),
  readJson(".evidence/accessibility-report.json"),
]);
insist(core.captureMode === "settled-reduced-motion-with-captured-component-states"
  && breakpoint.captureMode === core.captureMode
  && core.targetRatio === ratioLimit && breakpoint.targetRatio === ratioLimit,
"Visual reports use unexpected comparator settings.");
const expectedCore = new Set([...captures.keys()].filter((captureId) => coreNames.has(captureId.split("::")[1])));
const expectedBreakpoint = new Set([...captures.keys()].filter((captureId) => captureId.startsWith("/::")));
const expectedStates = new Set([...states.entries()]
  .filter(([, state]) => state.kind === "scroll" || state.kind === "interaction")
  .map(([id]) => id));
const coreResults = exactMatrix(core.results, expectedCore, "Core full-page matrix", (r) => key(r.route, r.viewport));
const breakpointResults = exactMatrix(breakpoint.results, expectedBreakpoint, "Home breakpoint matrix", (r) => key(r.route, r.viewport));
const stateResults = exactMatrix(scroll.results, expectedStates, "Scroll/interaction matrix", (r) => stateKey(r.route, r.viewport, r.state));
const initialResults = exactMatrix(initial.results, new Set(captures.keys()), "Initial viewport matrix", (r) => key(r.route, r.viewport));
const accessibilityResults = exactMatrix(accessibility.results, new Set(captures.keys()), "Accessibility matrix", (r) => key(r.route, r.viewport));
insist(coreResults.size === 54 && breakpointResults.size === 24 && stateResults.size === 219,
  "Source matrix sizes changed unexpectedly.");
insist(initial.expected === 75 && initial.passed === 75 && initial.failed === 0
  && initial.coreReportGeneratedAt === core.generatedAt
  && initial.breakpointReportGeneratedAt === breakpoint.generatedAt
  && initial.comparator?.threshold === 0.12
  && initial.comparator?.includeAA === false
  && initial.comparator?.targetRatio === ratioLimit,
"Initial viewport report is incomplete, failed, or based on stale full-page captures.");
for (const [id, result] of initialResults) {
  const capture = captures.get(id);
  const state = capture.states.find((candidate) => candidate.kind === "initial");
  const full = coreResults.get(id) ?? breakpointResults.get(id);
  insist(Number.isFinite(result.ratio) && result.ratio <= ratioLimit
    && result.sourcePath === path.join(".evidence", state.screenshot)
    && result.fullActualPath === full.actualPath
    && result.width === capture.viewport.width
    && result.height === capture.viewport.height,
  `Initial viewport visual state failed at ${id}.`);
}
insist(accessibility.expectedCaptures === 75 && accessibility.passed === 75
  && accessibility.failed === 0 && accessibilityResults.size === 75,
"Accessibility audit did not cover all 75 captured viewports.");
for (const [id, result] of accessibilityResults) {
  const capture = captures.get(id);
  insist(result.width === capture.viewport.width && result.height === capture.viewport.height
    && result.sourceAxNodes > 0 && result.nativeAxNodes > 0
    && result.sourceH1?.length > 0 && result.nativeH1?.[0] === result.sourceH1[0]
    && result.failures?.length === 0 && result.missingHeadingText?.length === 0
    && result.unnamedNativeControls?.length === 0 && result.missingLandmarks?.length === 0
    && result.runtimeErrors?.length === 0,
  `Accessibility semantics failed at ${id}.`);
}

const rawFailures = new Set();
for (const [id, result] of coreResults) {
  const capture = captures.get(id);
  insist(Number.isFinite(result.ratio) && result.ratio <= ratioLimit && result.runtimeErrors?.length === 0,
    `Core full-page comparison failed at ${id}.`);
  insist(result.oraclePath === path.join(".evidence", capture.screenshot)
    && result.oracle?.width === capture.documentSize.width
    && result.oracle?.height === capture.documentSize.height
    && result.actual?.width === capture.documentSize.width
    && Math.abs(result.actual?.height - capture.documentSize.height) <= 2,
  `Core full-page geometry/path differs at ${id}.`);
}
for (const [id, result] of breakpointResults) {
  const capture = captures.get(id);
  const replacementId = `${id}::full-page`;
  insist(Number.isFinite(result.ratio) && result.runtimeErrors?.length === 0,
    `Breakpoint comparison failed at ${id}.`);
  if (result.ratio > ratioLimit) rawFailures.add(replacementId);
  insist(result.oraclePath === path.join(".evidence", capture.screenshot)
    && result.oracle?.width === capture.documentSize.width
    && result.oracle?.height === capture.documentSize.height
    && result.actual?.width === capture.documentSize.width
    && Math.abs(result.actual?.height - capture.documentSize.height) <= 2,
  `Breakpoint geometry/path differs at ${id}.`);
}
for (const [id, result] of stateResults) {
  const state = states.get(id);
  insist(Number.isFinite(result.ratio) && result.kind === state.kind
    && result.requestedScrollY === state.scrollY
    && Math.abs(result.actualScrollY - state.scrollY) <= 2
    && result.sourcePath === path.join(".evidence", state.screenshot),
  `State geometry/kind/path differs at ${id}.`);
  if (result.ratio > ratioLimit) rawFailures.add(id);
}
insist(core.failed === 0 && breakpoint.failed === 2
  && rawFailures.size === replacementKeys.size
  && [...replacementKeys].every((id) => rawFailures.has(id)),
"Raw report failures differ from the four qualified archive defects.");

// All production image/font aliases must be present locally with the exact
// deduplicated blob hash; raw HTML, scripts, source maps, and WASM are source
// runtime evidence, not production dependencies.
const assetBySha = new Map();
const assetByUrl = new Map();
const aliasesBySha = new Map();
const recodeManifest = await readJson("scripts/asset-recodes.json");
insist(recodeManifest.version === 1 && recodeManifest.images?.length === 5,
  "Production image recode allowlist changed unexpectedly.");
const recodesByPath = new Map(recodeManifest.images.map((item) => [item.localPath, item]));
insist(recodesByPath.size === recodeManifest.images.length,
  "Production image recode allowlist contains duplicate paths.");
const verifiedRecodes = new Set();
for (const asset of assets) {
  assetBySha.set(asset.sha256, asset);
  aliasesBySha.set(asset.sha256, [...(aliasesBySha.get(asset.sha256) ?? []), asset]);
  for (const url of asset.urls) assetByUrl.set(url, asset);
  if (asset.kind !== "image" && asset.kind !== "font") continue;
  const localPath = path.join(root, "public", asset.localPath);
  let local;
  try { local = await fs.readFile(localPath); }
  catch { fail(`Missing production asset ${asset.localPath}.`); }
  const localSha = sha256(local);
  if (localSha === asset.sha256) continue;
  const recode = recodesByPath.get(asset.localPath);
  insist(asset.kind === "image" && asset.contentType === "image/avif"
    && recode?.sourceSha256 === asset.sha256 && recode?.localSha256 === localSha
    && asset.localPath.endsWith(".png")
    && local.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    && !verifiedRecodes.has(asset.localPath),
  `Production asset hash differs without an exact AVIF-to-PNG recode record: ${asset.localPath}.`);
  const source = await fs.readFile(path.join(root, ".evidence/assets/by-hash", `${asset.sha256}.avif`));
  insist(source.length === asset.bytes && sha256(source) === asset.sha256,
    `Archived AVIF blob differs for ${asset.localPath}.`);
  const [sourcePixels, localPixels] = await Promise.all([
    sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(local).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  insist(sourcePixels.info.width === localPixels.info.width
    && sourcePixels.info.height === localPixels.info.height
    && sourcePixels.info.channels === 4 && localPixels.info.channels === 4
    && sourcePixels.data.equals(localPixels.data),
  `Decoded pixels differ in AVIF-to-PNG recode ${asset.localPath}.`);
  verifiedRecodes.add(asset.localPath);
}
insist(verifiedRecodes.size === recodesByPath.size,
  "A pinned AVIF-to-PNG recode was not used by the production asset manifest.");

const assetProof = (asset) => verifiedRecodes.has(asset.localPath)
  ? `archived AVIF SHA-256 ${asset.sha256}; local PNG SHA-256 ${recodesByPath.get(asset.localPath).localSha256}; decoded RGBA pixels identical (scripts/asset-recodes.json)`
  : `SHA-256 ${asset.sha256}`;

const trackerSource = await fs.readFile(trackerPath, "utf8");
const nativeGlobalCss = await fs.readFile(path.join(root, "src/styles/global.css"), "utf8");
const rows = parse(trackerSource, { columns: true, skip_empty_lines: true });
const columns = Object.keys(rows[0] ?? {});
insist(rows.length === 5796 && columns.includes("status") && columns.includes("verification_evidence"),
  "Tracker schema or row count changed.");
const routeFiles = {
  "/": "src/pages/index.astro; src/components/home/; src/components/Workflow.astro",
  "/about": "src/pages/about.astro",
  "/blog": "src/pages/blog/index.astro; src/components/BlogCard.astro",
  "/contact": "src/pages/contact.astro",
  "/faq": "src/pages/faq.astro; src/components/FaqAccordion.astro",
  "/features": "src/pages/features.astro; src/components/FeatureDetails.astro",
  "/pricing": "src/pages/pricing.astro",
  "/legal/privacy-policy": "src/pages/legal/privacy-policy.astro; src/components/LegalPage.astro",
  "/legal/terms-of-service": "src/pages/legal/terms-of-service.astro; src/components/LegalPage.astro",
};
const targetOf = (route) => route.startsWith("/blog/")
  ? "src/pages/blog/[slug].astro; src/components/BlogArticle.astro; src/data/articles.json"
  : routeFiles[route];
const globalFiles = "src/layouts/BaseLayout.astro; src/styles/global.css; src/styles/source-parity.css; src/scripts/site.ts";
const visualFiles = ".evidence/visual-report.json; .evidence/visual-report-breakpoints.json; .evidence/initial-report.json; .evidence/scroll-report.json";
const coreEvidence = (route) => [...coreNames]
  .map((name) => `${name} ${(coreResults.get(key(route, name)).ratio * 100).toFixed(3)}%`)
  .join(", ");
function fullEvidence(route, viewport) {
  const id = key(route, viewport);
  const direct = coreResults.get(id) ?? breakpointResults.get(id);
  insist(direct, `No full-page result for ${id}.`);
  const replacementId = `${id}::full-page`;
  return replacementKeys.has(replacementId)
    ? `${id} clean source ${(qualification.byKey.get(replacementId).nativeVsClean * 100).toFixed(3)}%, tests/reference/qualified/manifest.json`
    : `${id} ${(direct.ratio * 100).toFixed(3)}%`;
}
function stateEvidence(route, viewport, state) {
  const id = stateKey(route, viewport, state);
  const direct = stateResults.get(id);
  insist(direct, `No recorded state result for ${id}.`);
  return replacementKeys.has(id)
    ? `${id} clean source ${(qualification.byKey.get(id).nativeVsClean * 100).toFixed(3)}%, tests/reference/qualified/manifest.json`
    : `${id} ${(direct.ratio * 100).toFixed(3)}%`;
}
const parseDetail = (row) => { try { return JSON.parse(row.detail); } catch { return null; } };

function rowProof(row) {
  const target = targetOf(row.route);
  insist(target, `Unknown target route ${row.route} (${row.id}).`);
  const source = `${row.id} ${row.source_locator}`;
  const detail = parseDetail(row);
  const visual = `54 core captures, 24 home widths, 75 initial viewport states and 219 scroll/interaction states passed direct or reviewed clean-source comparisons (${visualFiles})`;
  switch (row.category) {
    case "route":
      return ["VERIFIED", `${source}; ${target}; ${coreEvidence(row.route)}; tests/site.spec.ts route-open check`];
    case "responsive-capture":
      insist(captures.has(key(row.route, row.viewport)), `Unknown responsive capture ${row.id}.`);
      return ["VERIFIED", `${source}; ${fullEvidence(row.route, row.viewport)}; ${target}`];
    case "visual-state": {
      const id = stateKey(row.route, row.viewport, detail?.label);
      insist(states.has(id), `Unknown visual state ${row.id}.`);
      const comparison = detail.kind === "initial"
        ? `${key(row.route, row.viewport)} initial viewport ${(initialResults.get(key(row.route, row.viewport)).ratio * 100).toFixed(3)}%, .evidence/initial-report.json`
        : stateEvidence(row.route, row.viewport, detail.label);
      return ["VERIFIED", `${source}; ${comparison}; ${target}`];
    }
    case "embedded-asset": {
      const asset = assetBySha.get(detail?.sha256);
      insist(asset && detail.bytes === asset.bytes && detail.blobIndex === asset.blobIndex,
        `Source blob metadata differs for ${row.id}.`);
      const aliases = aliasesBySha.get(detail.sha256);
      insist(detail.aliases === aliases.length
        && detail.localPaths?.length === aliases.length
        && detail.localPaths.every((localPath) => aliases.some((alias) => alias.localPath === localPath)),
      `Source alias set differs for ${row.id}.`);
      return asset.kind === "image" || asset.kind === "font"
        ? ["VERIFIED", `${source}; ${aliases.length} localized alias(es), including public/${asset.localPath}; ${assetProof(asset)}; .evidence/asset-manifest.json`]
        : ["NOT_APPLICABLE", `${source}; source ${asset.kind} blob ${asset.sha256} is Framer runtime/source capture data; native behavior in ${target}; ${globalFiles}`];
    }
    case "media": {
      const url = detail?.attrs?.src ?? row.source_element;
      const asset = assetByUrl.get(url);
      insist(asset?.kind === "image", `No localized source image for ${row.id}: ${url}.`);
      return ["VERIFIED", `${source}; source ${url}; public/${asset.localPath} ${assetProof(asset)}; ${fullEvidence(row.route, "desktop")}; ${target}`];
    }
    case "font": {
      if (row.id === "css:font:53" && detail?.body?.includes('font-family: "Inter Placeholder"; src: local("Arial")')) {
        insist(nativeGlobalCss.includes('font-family: "Inter Placeholder";')
          && nativeGlobalCss.includes('src: local("Arial");')
          && nativeGlobalCss.includes('ascent-override: 89.79%;')
          && nativeGlobalCss.includes('descent-override: 22.36%;')
          && /line-gap-override:\s*0(?:\.00)?%;/.test(nativeGlobalCss)
          && nativeGlobalCss.includes('size-adjust: 107.89%;')
          && nativeGlobalCss.includes('font-family: "Artho Inter", "Inter Placeholder", Arial, sans-serif;'),
        "Native Inter Placeholder metrics/fallback do not match the source.");
        return ["VERIFIED", `${source}; source Arial fallback ascent 89.79%, descent 22.36%, line gap 0%, size 107.89% implemented in src/styles/global.css and included after localized Artho Inter; ${coreEvidence("/")}`];
      }
      const urls = [...(detail?.body ?? "").matchAll(/url\(["']?(https?:[^"')]+)["']?\)/g)].map((match) => match[1]);
      insist(urls.length && urls.every((url) => assetByUrl.get(url)?.kind === "font"),
        `No localized source font for ${row.id}.`);
      return ["VERIFIED", `${source}; ${urls.map((url) => `public/${assetByUrl.get(url).localPath}`).join(", ")}; src/styles/global.css; core typography ${coreEvidence("/")}`];
    }
    case "link":
      insist(typeof detail?.href === "string" && detail.href, `No source href for ${row.id}.`);
      return ["VERIFIED", `${source}; destination ${detail.href}; tests/link-parity.spec.ts route ${row.route}; ${target}`];
    case "observed-interaction":
      return ["VERIFIED", `${source}; ${detail?.href ? `destination ${detail.href}; tests/link-parity.spec.ts` : "source control state; tests/site.spec.ts, tests/accessibility.spec.ts, tests/motion.spec.ts"}; ${coreEvidence(row.route)}; .evidence/scroll-report.json; ${target}`];
    case "interaction":
      return ["VERIFIED", `${source}; ${row.source_element}; tests/site.spec.ts, tests/accessibility.spec.ts, tests/link-parity.spec.ts; ${visual}; ${target}`];
    case "accessibility":
      insist(captures.has(key(row.route, row.viewport)), `Unknown accessibility capture ${row.id}.`);
      return ["VERIFIED", `${source}; ${key(row.route, row.viewport)} source/native AX: primary H1, visible headings, named controls and landmarks pass (.evidence/accessibility-report.json); tests/accessibility.spec.ts keyboard checks; ${target}; full AX node identity not asserted`];
    case "responsive-model":
      return ["VERIFIED", `${source}; ${coreEvidence(row.route)}; ${row.route === "/" ? "tests/responsive.spec.ts (24 widths x 7 heading rectangles within 2px);" : "core viewport visual matrix;"} ${target}; individual model fit not asserted`];
    case "responsive-viewport":
      insist(coreNames.has(row.viewport), `Unknown core viewport ${row.id}.`);
      return ["VERIFIED", `${source}; ${fullEvidence("/", row.viewport)}; ${visualFiles}`];
    case "dom-node":
    case "section":
    case "named-component":
      return ["VERIFIED", `${source}; source ${row.source_element}; ${target}; ${coreEvidence(row.route)}; ${visual}; DOM identity not asserted`];
    case "css-variable":
    case "media-query":
    case "css-at-rule":
    case "style-rule":
    case "animation":
    case "keyframe":
    case "keyframe-step": {
      const platform = /style\[[456]\]/.test(row.source_locator);
      return platform
        ? ["NOT_APPLICABLE", `${source}; ${row.source_element} is Framer editor/badge runtime CSS, excluded from native page; ${globalFiles}`]
        : ["VERIFIED", `${source}; ${row.source_element}; translated appearance in ${globalFiles}; ${visual}; Framer selector identity not asserted`];
    }
    case "head-node": {
      const platform = detail?.attrs?.name === "generator" || detail?.attrs?.name?.startsWith("framer-");
      return platform
        ? ["NOT_APPLICABLE", `${source}; Framer platform metadata ${detail.attrs.name} omitted from Astro head; src/layouts/BaseLayout.astro`]
        : ["VERIFIED", `${source}; source ${row.source_element} ${JSON.stringify(detail?.attrs ?? {})}; src/layouts/BaseLayout.astro; dist/index.html`];
    }
    case "runtime-diagnostic":
      return ["VERIFIED", `${source}; source ${detail?.message ?? row.source_element} for ${detail?.url ?? "request"}; native core pages report zero runtime errors; tests/site.spec.ts all 18 routes; .evidence/asset-manifest.json`];
    case "bundle":
      return ["NOT_APPLICABLE", `${source}; original Framer/export script is source runtime; native behavior in src/scripts/site.ts; tests/site.spec.ts, tests/motion.spec.ts, ${visualFiles}`];
    case "privacy-exclusion":
      return ["NOT_APPLICABLE", `${source}; owner/auth response privacy-excluded by exporter; no native visible page dependency`];
    case "asset":
      return row.source_element.includes("www.framer.com")
        ? ["NOT_APPLICABLE", `${source}; Framer attribution badge belongs to source platform runtime`]
        : ["VERIFIED", `${source}; ${row.source_element}; ${row.source_element.includes("framerusercontent.com/images/") ? "localized favicon in public/assets" : "tests/link-parity.spec.ts social destination"}; src/components/Footer.astro; src/layouts/BaseLayout.astro`];
    case "external-reference":
      if (/^http:\/\/www\.w3\.org\/(?:1999\/xlink|2000\/svg)/.test(row.source_element)) {
        return ["NOT_APPLICABLE", `${source}; ${row.source_element} is an XML/SVG namespace token found by the source full-text scan, not a browser fetch or navigation destination; native SVGs are localized in public/assets`];
      }
      if (/^https:\/\/framerusercontent\.com\/sites\/[^/]+\/searchIndex-/.test(row.source_element)) {
        return ["NOT_APPLICABLE", `${source}; ${row.source_element} is Framer platform search-index metadata, not a visible site asset or native search feature`];
      }
      if (row.source_element.startsWith("https://sergeyski.com/")) {
        return ["NOT_APPLICABLE", `${source}; ${row.source_element} occurs in a source CSS comment and is not a rendered link, fetch, or native dependency`];
      }
      if (row.source_element === "https://artho.framer.website") {
        return ["VERIFIED", `${source}; source origin resolves the 18 archived routes in .evidence/route-manifest.json; target origin is configurable via PUBLIC_SITE_URL in astro.config.mjs`];
      }
      fail(`Unclassified source full-text URL ${row.source_element} (${row.id}).`);
    case "evidence":
      return ["VERIFIED", `${source}; source style block parsed from standalone.html; appearance translated in ${globalFiles}; ${visual}`];
    case "evidence-capsule":
      return ["VERIFIED", `${source}; schema-v2 extracted to .evidence/route-manifest.json and .evidence/asset-manifest.json: 18 routes, 75 captures, 294 states, 1,066 aliases`];
    case "coverage":
      return ["VERIFIED", `${source}; ${visual}; tests/reference/qualified/manifest.json; npm run verify`];
    case "meta":
      return ["VERIFIED", `${source}; source/export and completion boundary audited in RECONSTRUCTION_AGENT.md, MIGRATION_AUDIT.md, SOURCE_CAPTURE_QUALIFICATION.md; 5,796 IDs checked by scripts/reconcile-tracker.mjs`];
    default:
      fail(`No evidence policy for category ${row.category} (${row.id}).`);
  }
}

const seenIds = new Set();
const categoryCounts = new Map();
for (const row of rows) {
  insist(row.id && !seenIds.has(row.id), `Missing or duplicate tracker ID ${row.id}.`);
  seenIds.add(row.id);
  insist(row.source_locator && row.source_element && routeMap.has(row.route),
    `Unlocatable tracker row ${row.id}.`);
  const [status, proof] = rowProof(row);
  insist(["VERIFIED", "NOT_APPLICABLE"].includes(status)
    && proof.includes(row.id) && proof.includes(row.source_locator),
  `Row evidence does not cite its source for ${row.id}.`);
  row.owner = "Astro reconstruction";
  row.status = status;
  row.verification_evidence = proof;
  categoryCounts.set(row.category, (categoryCounts.get(row.category) ?? 0) + 1);
}
insist(seenIds.size === rows.length && categoryCounts.size === 32,
  "Tracker category/ID coverage is incomplete.");

if (args.has("--write")) {
  // A passing old report must not certify code or assets changed afterward.
  const latestProductMtime = await productMtime();
  for (const [name, report] of [["core", core], ["breakpoint", breakpoint], ["initial", initial], ["state", scroll], ["accessibility", accessibility], ["qualification", qualification.report]]) {
    insist(Date.parse(report.generatedAt) >= latestProductMtime - 2000,
      `${name} report is older than product source/assets; recapture before writing.`);
  }
  console.log("Capture, qualification, asset and category gates passed; running npm run verify...");
  execFileSync("npm", ["run", "verify"], { cwd: root, stdio: "inherit" });
  const afterVerifyMtime = await productMtime();
  for (const [name, report] of [["core", core], ["breakpoint", breakpoint], ["initial", initial], ["state", scroll], ["accessibility", accessibility], ["qualification", qualification.report]]) {
    insist(Date.parse(report.generatedAt) >= afterVerifyMtime - 2000,
      `${name} report became stale during npm run verify; recapture before writing.`);
  }
  insist(await fs.readFile(trackerPath, "utf8") === trackerSource,
    "Tracker changed during verification; inspect and rerun before writing.");
  const temporary = `${trackerPath}.tmp-${process.pid}`;
  await fs.writeFile(temporary, stringify(rows, { header: true, columns, record_delimiter: "\n" }), "utf8");
  await fs.rename(temporary, trackerPath);
  const statusCounts = rows.reduce((counts, row) => ({ ...counts, [row.status]: (counts[row.status] ?? 0) + 1 }), {});
  console.log(`Tracker reconciled: ${JSON.stringify(statusCounts)}, 0 open; ${categoryCounts.size} categories.`);
} else {
  console.log(`Tracker gate passed without mutation: ${rows.length} rows, ${categoryCounts.size} categories; use --write after review.`);
}
