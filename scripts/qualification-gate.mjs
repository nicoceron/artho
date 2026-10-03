import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const root = path.resolve(import.meta.dirname, "..");
const acceptedRoot = path.join(root, "tests/reference/qualified");
export const replacementKeys = new Set([
  "/::bp-500-above::full-page",
  "/::bp-1199-above::full-page",
  "/blog::desktop::scroll-025",
  "/features::tablet::scroll-025",
]);
const diagnosticKeys = new Set([
  "/::mobile::scroll-050",
  "/about::tablet::interaction-07",
  "/blog::tablet::scroll-075",
  "/features::mobile::scroll-075",
]);
const allKeys = new Set([...replacementKeys, ...diagnosticKeys]);
const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
const keyOf = (item) => `${item.route}::${item.viewport}::${item.label}`;
const slug = (route) => route === "/" ? "home" : route.slice(1).replaceAll("/", "__");
const requireThat = (condition, message) => {
  if (!condition) throw new Error(`${message} Tracker was not mutated.`);
};
const projectPath = (relative) => {
  requireThat(typeof relative === "string" && relative.length > 0, "Missing qualification path.");
  const absolute = path.resolve(root, relative);
  requireThat(absolute.startsWith(`${root}${path.sep}`), `Path escapes project: ${relative}.`);
  return absolute;
};
const readJson = async (relative) => JSON.parse(await fs.readFile(projectPath(relative), "utf8"));
const nearly = (left, right) => Number.isFinite(left) && Math.abs(left - right) < 1e-7;

async function pixelRatio(leftPath, rightPath) {
  const [left, right] = await Promise.all([leftPath, rightPath].map(async (p) => PNG.sync.read(await fs.readFile(projectPath(p)))));
  requireThat(left.width === right.width && left.height === right.height,
    `PNG dimensions differ: ${leftPath}, ${rightPath}.`);
  return {
    width: left.width,
    height: left.height,
    ratio: pixelmatch(left.data, right.data, null, left.width, left.height,
      { threshold: 0.12, includeAA: false }) / (left.width * left.height),
  };
}

export async function validateQualification(routeManifest) {
  const report = await readJson(".evidence/source-qualification/report.json");
  requireThat(report.results?.length === allKeys.size, "A complete eight-case qualification report is required.");
  requireThat(report.results.every((item) => typeof item.qualificationEligible === "boolean"
    && typeof item.replacementEligible === "boolean"),
  "Qualification report predates the fail-closed eligibility schema; rerun the full source capture script.");
  requireThat(report.pixelmatch?.threshold === 0.12
    && report.pixelmatch?.includeAA === false
    && report.pixelmatch?.acceptanceRatio === 0.01,
  "Qualification comparator settings differ.");
  requireThat(new URL(report.sourceBase).hostname === "artho.framer.website",
    "Qualification source is not the published Artho origin.");
  requireThat(["127.0.0.1", "localhost", "::1"].includes(new URL(report.nativeBase).hostname),
    "Qualification native target must be the local Astro site.");
  const byKey = new Map();
  for (const item of report.results) {
    const key = keyOf(item);
    requireThat(allKeys.has(key) && !byKey.has(key), `Unexpected or duplicate qualification case ${key}.`);
    byKey.set(key, item);
  }
  for (const key of diagnosticKeys) {
    const item = byKey.get(key);
    requireThat(item.qualificationEligible === false && item.replacementEligible === false,
      `Diagnostic case ${key} was incorrectly promoted.`);
  }
  for (const key of replacementKeys) {
    const item = byKey.get(key);
    const capture = routeManifest.find((route) => route.route === item.route)
      ?.captures.find((candidate) => candidate.viewport.name === item.viewport);
    const state = item.label === "full-page" ? null
      : capture?.states.find((candidate) => candidate.label === item.label);
    requireThat(capture && (item.label === "full-page" || state), `Missing archived capture ${key}.`);
    requireThat(item.qualificationEligible === true && item.captureQualified === true
      && item.replacementEligible === true && item.qualificationFailures?.length === 0
      && !item.error, `Replacement ${key} is not qualified: ${item.qualificationFailures?.join(", ") ?? "unknown"}.`);
    requireThat(item.motionSetting === "no-preference",
      `Unexpected motion setting for ${key}.`);
    requireThat(item.sourceRecaptureChecksPassed === true && item.originalUnchanged === true
      && item.originalSha256Before === item.originalSha256After,
    `Source/original integrity checks failed for ${key}.`);
    requireThat(item.originalPath === path.join(".evidence", state?.screenshot ?? capture.screenshot),
      `Archived screenshot path differs for ${key}.`);
    requireThat(item.sourcePath?.startsWith(".evidence/source-qualification/")
      && item.nativePath?.startsWith(".evidence/source-qualification/")
      && item.sourcePath !== item.nativePath
      && item.sourcePath !== item.originalPath
      && item.nativePath !== item.originalPath,
    `Qualification PNG paths overlap or leave their evidence directory for ${key}.`);
    const sourceRoute = await readJson(`.evidence/routes/${slug(item.route)}.json`);
    const sourceHtmlSha256 = sha256(sourceRoute.sourceHtml);
    requireThat(item.expectedSourceSha256 === sourceHtmlSha256
      && item.observedSourceSha256 === sourceHtmlSha256,
    `Published HTML does not match archived sourceHtml for ${key}.`);
    requireThat(item.expectedDocumentSize?.width === capture.documentSize.width
      && item.expectedDocumentSize?.height === capture.documentSize.height,
    `Archived document metadata differs for ${key}.`);
    for (const surface of ["source", "native"]) {
      const metrics = item[`${surface}Metrics`];
      requireThat(metrics?.documentWidth === capture.documentSize.width
        && metrics?.documentHeight === capture.documentSize.height,
      `${surface} document dimensions differ for ${key}.`);
      requireThat(Math.abs(metrics.scrollY - (state?.scrollY ?? 0)) <= 2,
        `${surface} scroll coordinate differs for ${key}.`);
      requireThat(metrics.imageCount === metrics.imagesLoaded,
        `${surface} has undecoded images for ${key}.`);
      requireThat(item[`${surface}StabilityRatio`] <= 0.0025,
        `${surface} capture is unstable for ${key}.`);
      requireThat(Number.isInteger(item[`${surface}StablePairs`])
        && item[`${surface}StablePairs`] >= 2,
      `${surface} capture lacks two stable adjacent frame pairs for ${key}.`);
      requireThat(item[`${surface}BrowserErrors`]?.length === 0
        && item[`${surface}ConsoleErrors`]?.length === 0,
      `${surface} emitted browser/console errors for ${key}.`);
    }
    requireThat(item.sourceMetrics.h1 === item.nativeMetrics.h1,
      `Source/native primary heading differs for ${key}.`);
    if (key === "/::bp-1199-above::full-page") {
      const archivedCapture = sourceRoute.captures.find((entry) => entry.viewport.name === item.viewport);
      const archivedImageCount = archivedCapture?.nodes.filter((node) => node.tag?.toLowerCase() === "img").length;
      requireThat(Number.isInteger(archivedImageCount) && archivedImageCount > 0
        && item.expectedSourceImageCount === archivedImageCount
        && item.sourceMetrics.imageCount === archivedImageCount,
      "1200px source image count differs from archived DOM.");
      requireThat(item.archivedWorkflowVariant === "Desktop/01"
        && item.sourceMetrics.workflowVariant === item.archivedWorkflowVariant
        && item.nativeMetrics.workflowVariant === item.archivedWorkflowVariant,
      "1200px source/native workflow differs from archived Step 01.");
      requireThat(item.sourceMetrics.signupPreviewStage === "bottom"
        && item.nativeMetrics.signupPreviewStage === "bottom"
        && item.workflowCaptureMode === "cached-eager-images-natural-Step01-bottom-stable-window-100ms"
        && item.workflowStateNaturallyReached === true
        && item.sourceMotionSetting === "no-preference"
        && item.nativeMotionSetting === "no-preference"
        && item.sourcePairRatios?.length === 2
        && item.nativePairRatios?.length === 2
        && [...item.sourcePairRatios, ...item.nativePairRatios]
          .every((ratio) => Number.isFinite(ratio) && ratio <= 0.0025),
      "1200px natural Step 01 bottom state and adjacent frame stability were not proven.");
      requireThat(item.sourceMetrics.signupPreviewVisible === true
        && item.nativeMetrics.signupPreviewVisible === true
        && item.nativeMetrics.controlBalance === "$0"
        && item.nativeMetrics.visibleRevealCount === 9
        && item.nativeMetrics.revealedCount === item.nativeMetrics.visibleRevealCount
        && Array.isArray(item.nativeScrollWarmupPositions)
        && item.nativeScrollWarmupPositions.length >= 1
        && item.nativeScrollWarmupPositions.every((position) => Number.isInteger(position) && position > 0)
        && new Set(item.nativeScrollWarmupPositions).size === item.nativeScrollWarmupPositions.length,
      "1200px natural reveal warmup, visible signup, or initial balance is not proven.");
      for (const surface of ["source", "native"]) {
        const indices = item[`${surface}SelectedWindowFrameIndices`];
        const attempted = item[`${surface}AllAttemptedPairRatios`];
        const times = item[`${surface}FrameTimesSinceNavigationMs`];
        const selected = item[`${surface}PairRatios`];
        requireThat(indices?.length === 3 && indices[0] >= 1
          && indices[1] === indices[0] + 1 && indices[2] === indices[1] + 1
          && times?.length >= indices[2]
          && attempted?.length === times.length - 1
          && selected.every((ratio, index) => nearly(ratio, attempted[indices[0] - 1 + index]))
          && times.every((time, index) => Number.isFinite(time) && time >= 0
            && (index === 0 || time >= times[index - 1])),
        `${surface} stable three-frame window provenance is incomplete for the 1200px capture.`);
        const framePaths = indices.map((index) => item[`${surface}Path`].replace(/\.png$/, `--frame-${index}.png`));
        const [firstPair, secondPair] = await Promise.all([
          pixelRatio(framePaths[0], framePaths[1]),
          pixelRatio(framePaths[1], framePaths[2]),
        ]);
        requireThat(nearly(firstPair.ratio, selected[0])
          && nearly(secondPair.ratio, selected[1])
          && sha256(await fs.readFile(projectPath(framePaths[2])))
            === sha256(await fs.readFile(projectPath(item[`${surface}Path`]))),
        `${surface} selected frame PNGs do not reproduce the 1200px stability report.`);
      }
    }
    const [original, clean, native] = await Promise.all([
      fs.readFile(projectPath(item.originalPath)),
      fs.readFile(projectPath(item.sourcePath)),
      fs.readFile(projectPath(item.nativePath)),
    ]);
    requireThat(sha256(original) === item.originalSha256Before,
      `Archived PNG SHA changed for ${key}.`);
    const [oldVsClean, nativeVsClean] = await Promise.all([
      pixelRatio(item.originalPath, item.sourcePath),
      pixelRatio(item.sourcePath, item.nativePath),
    ]);
    requireThat(oldVsClean.ratio > 0.01 && nearly(oldVsClean.ratio, item.originalVsClean),
      `Archived PNG is not demonstrably defective for ${key}.`);
    requireThat(nativeVsClean.ratio <= 0.01 && nearly(nativeVsClean.ratio, item.nativeVsClean),
      `Native versus clean source exceeds 1% or differs from report for ${key}.`);
    requireThat(nativeVsClean.width === capture.viewport.width
      && nativeVsClean.height === (state ? capture.viewport.height : capture.documentSize.height),
    `Clean PNG dimensions differ for ${key}.`);
    item.cleanSha256 = sha256(clean);
    item.nativeSha256 = sha256(native);
  }
  return { report, byKey };
}

export async function promoteQualified(qualification) {
  await fs.mkdir(acceptedRoot, { recursive: true });
  const cases = [];
  for (const key of replacementKeys) {
    const item = qualification.byKey.get(key);
    const filename = `${slug(item.route)}--${item.viewport}--${item.label}.png`;
    const destination = path.join(acceptedRoot, filename);
    await fs.copyFile(projectPath(item.sourcePath), destination);
    requireThat(sha256(await fs.readFile(destination)) === item.cleanSha256,
      `Promoted PNG hash differs for ${key}.`);
    cases.push({
      key,
      path: path.relative(root, destination),
      cleanSha256: item.cleanSha256,
      archivedSha256: item.originalSha256Before,
      sourceHtmlSha256: item.expectedSourceSha256,
      nativeSha256: item.nativeSha256,
      originalVsClean: item.originalVsClean,
      nativeVsClean: item.nativeVsClean,
      motionSetting: item.motionSetting,
      sourceMotionSetting: item.sourceMotionSetting ?? item.motionSetting,
      nativeMotionSetting: item.nativeMotionSetting ?? item.motionSetting,
      workflowVariant: item.archivedWorkflowVariant ?? null,
      workflowCaptureMode: item.workflowCaptureMode ?? null,
      signupPreviewStage: item.sourceMetrics.signupPreviewStage ?? null,
      workflowStateNaturallyReached: item.workflowStateNaturallyReached ?? null,
      expectedSourceImageCount: item.expectedSourceImageCount ?? null,
      nativeScrollWarmupPositions: item.nativeScrollWarmupPositions ?? null,
      nativeVisibleRevealCount: item.nativeMetrics.visibleRevealCount ?? null,
      nativeRevealedCount: item.nativeMetrics.revealedCount ?? null,
      nativeControlBalance: item.nativeMetrics.controlBalance ?? null,
      sourceSelectedWindowFrameIndices: item.sourceSelectedWindowFrameIndices ?? null,
      nativeSelectedWindowFrameIndices: item.nativeSelectedWindowFrameIndices ?? null,
      sourcePairRatios: item.sourcePairRatios ?? null,
      nativePairRatios: item.nativePairRatios ?? null,
      sourceAllAttemptedPairRatios: item.sourceAllAttemptedPairRatios ?? null,
      nativeAllAttemptedPairRatios: item.nativeAllAttemptedPairRatios ?? null,
      sourceFrameTimesSinceNavigationMs: item.sourceFrameTimesSinceNavigationMs ?? null,
      nativeFrameTimesSinceNavigationMs: item.nativeFrameTimesSinceNavigationMs ?? null,
    });
  }
  await fs.writeFile(path.join(acceptedRoot, "manifest.json"), `${JSON.stringify({
    version: 1,
    qualificationGeneratedAt: qualification.report.generatedAt,
    acceptance: "reviewed clean source captures; originals preserved",
    pixelmatch: qualification.report.pixelmatch,
    cases,
  }, null, 2)}\n`);
  return cases.length;
}

export async function validateAccepted(qualification) {
  const accepted = await readJson("tests/reference/qualified/manifest.json");
  requireThat(accepted.version === 1 && accepted.cases?.length === replacementKeys.size
    && accepted.qualificationGeneratedAt === qualification.report.generatedAt,
  "Tracked clean reference manifest is missing, partial, or stale. Run --accept-qualified after review.");
  const seen = new Set();
  for (const item of accepted.cases) {
    requireThat(replacementKeys.has(item.key) && !seen.has(item.key),
      `Unexpected/duplicate accepted reference ${item.key}.`);
    seen.add(item.key);
    const qualified = qualification.byKey.get(item.key);
    requireThat(item.path.startsWith("tests/reference/qualified/")
      && item.cleanSha256 === qualified.cleanSha256
      && item.archivedSha256 === qualified.originalSha256Before
      && item.sourceHtmlSha256 === qualified.expectedSourceSha256
      && item.nativeSha256 === qualified.nativeSha256
      && nearly(item.nativeVsClean, qualified.nativeVsClean)
      && item.motionSetting === qualified.motionSetting
      && item.sourceMotionSetting === (qualified.sourceMotionSetting ?? qualified.motionSetting)
      && item.nativeMotionSetting === (qualified.nativeMotionSetting ?? qualified.motionSetting)
      && item.workflowVariant === (qualified.archivedWorkflowVariant ?? null)
      && item.workflowCaptureMode === (qualified.workflowCaptureMode ?? null)
      && item.signupPreviewStage === (qualified.sourceMetrics.signupPreviewStage ?? null)
      && item.workflowStateNaturallyReached === (qualified.workflowStateNaturallyReached ?? null)
      && item.expectedSourceImageCount === (qualified.expectedSourceImageCount ?? null)
      && JSON.stringify(item.nativeScrollWarmupPositions) === JSON.stringify(qualified.nativeScrollWarmupPositions ?? null)
      && item.nativeVisibleRevealCount === (qualified.nativeMetrics.visibleRevealCount ?? null)
      && item.nativeRevealedCount === (qualified.nativeMetrics.revealedCount ?? null)
      && item.nativeControlBalance === (qualified.nativeMetrics.controlBalance ?? null)
      && ["source", "native"].every((surface) => [
        "SelectedWindowFrameIndices", "PairRatios", "AllAttemptedPairRatios", "FrameTimesSinceNavigationMs",
      ].every((suffix) => JSON.stringify(item[`${surface}${suffix}`] ?? null)
        === JSON.stringify(qualified[`${surface}${suffix}`] ?? null))),
    `Tracked reference metadata differs for ${item.key}.`);
    requireThat(sha256(await fs.readFile(projectPath(item.path))) === item.cleanSha256,
      `Tracked clean PNG SHA differs for ${item.key}.`);
  }
  return accepted;
}
