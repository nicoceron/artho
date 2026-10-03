import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

// Supplementary evidence only. This script never writes the original capture
// directory, comparison reports, or migration tracker.
const projectRoot = path.resolve(import.meta.dirname, "..");
const evidenceRoot = path.join(projectRoot, ".evidence");
const outputRoot = path.join(evidenceRoot, "source-qualification");
const sourceBase = new URL(valueFor("--source-url") ?? "https://artho.framer.website/");
const nativeBase = new URL(valueFor("--native-url") ?? "http://127.0.0.1:4393/");
const only = valueFor("--only");
const manifest = JSON.parse(await fs.readFile(path.join(evidenceRoot, "route-manifest.json"), "utf8"));
const cases = [
  { route: "/", viewport: "mobile", label: "scroll-050" },
  { route: "/about", viewport: "tablet", label: "interaction-07" },
  { route: "/blog", viewport: "desktop", label: "scroll-025" },
  { route: "/blog", viewport: "tablet", label: "scroll-075" },
  { route: "/features", viewport: "tablet", label: "scroll-025" },
  { route: "/features", viewport: "mobile", label: "scroll-075" },
  { route: "/", viewport: "bp-500-above", label: "full-page" },
  { route: "/", viewport: "bp-1199-above", label: "full-page" },
];
const defectiveCases = new Set([
  "home--bp-500-above--full-page",
  "home--bp-1199-above--full-page",
  "blog--desktop--scroll-025",
  "features--tablet--scroll-025",
]);

function valueFor(flag) {
  const argument = process.argv.find((item) => item.startsWith(`${flag}=`));
  return argument?.slice(flag.length + 1);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function slug(route) {
  return route === "/" ? "home" : route.slice(1).replaceAll("/", "__");
}

function screenshotRatio(left, right, diffPath) {
  const source = PNG.sync.read(left);
  const target = PNG.sync.read(right);
  if (source.width !== target.width || source.height !== target.height) {
    throw new Error(`PNG dimensions differ: ${source.width}x${source.height} vs ${target.width}x${target.height}`);
  }
  const diff = diffPath ? new PNG({ width: source.width, height: source.height }) : null;
  const count = pixelmatch(source.data, target.data, diff?.data ?? null, source.width, source.height, {
    threshold: 0.12,
    includeAA: false,
  });
  return {
    ratio: count / (source.width * source.height),
    differingPixels: count,
    width: source.width,
    height: source.height,
    diffBuffer: diff ? PNG.sync.write(diff) : undefined,
  };
}

async function settleVisibleImages(page) {
  await page.evaluate(async () => {
    const visible = [...document.images].filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
    });
    await Promise.all(visible.map((image) => Promise.race([
      image.decode().catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 8_000)),
    ])));
  });
}

async function settleAllImages(page) {
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((image) => Promise.race([
      image.decode().catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 8_000)),
    ])));
  });
}

async function captureSettled(page, imagePath, fullPage, shortWorkflowWindow, surface) {
  const options = { fullPage, animations: "disabled", caret: "hide" };
  if (shortWorkflowWindow) {
    const frames = [];
    const allAttemptedPairRatios = [];
    const frameTimesSinceNavigationMs = [];
    let capturedMetrics = null;
    for (let index = 0; index < 12; index += 1) {
      if (index > 0) await page.waitForTimeout(100);
      const before = await metrics(page, true, surface);
      if (before.workflowVariant !== "Desktop/01" || !before.signupPreviewVisible || before.signupPreviewStage !== "bottom"
        || before.imagesLoaded !== before.imageCount || before.imageCount === 0 || before.scrollY !== 0) {
        throw new Error(`${surface} Step 01 signup preview is not naturally bottom-settled before frame ${index + 1}`);
      }
      const screenshot = await page.screenshot(options);
      const after = await metrics(page, true, surface);
      if (after.workflowVariant !== "Desktop/01" || !after.signupPreviewVisible || after.signupPreviewStage !== "bottom"
        || after.imagesLoaded !== after.imageCount || after.imageCount !== before.imageCount
        || after.scrollY !== 0 || after.documentWidth !== before.documentWidth || after.documentHeight !== before.documentHeight) {
        throw new Error(`${surface} Step 01 signup preview changed during frame ${index + 1}`);
      }
      frames.push(screenshot);
      capturedMetrics = after;
      frameTimesSinceNavigationMs.push(await page.evaluate(() => Math.round(performance.now())));
      await fs.writeFile(imagePath.replace(/\.png$/, `--frame-${index + 1}.png`), screenshot);
      if (index > 0) allAttemptedPairRatios.push(screenshotRatio(frames[index - 1], screenshot).ratio);
      if (index > 1 && allAttemptedPairRatios[index - 2] <= 0.0025 && allAttemptedPairRatios[index - 1] <= 0.0025) {
        const pairRatios = allAttemptedPairRatios.slice(-2);
        await fs.writeFile(imagePath, screenshot);
        return {
          stabilityRatio: Math.max(...pairRatios),
          stabilityAttempts: frames.length,
          stablePairs: 2,
          pairRatios,
          allAttemptedPairRatios,
          frameTimesSinceNavigationMs,
          selectedWindowFrameIndices: [index - 1, index, index + 1],
          capturedMetrics,
        };
      }
    }
    throw new Error(`${surface} Step 01 BOTTOM frames did not settle: ${allAttemptedPairRatios.map((ratio) => ratio.toFixed(6)).join(", ")}`);
  }
  let previous = await page.screenshot(options);
  let stabilityRatio = Infinity;
  let stablePairs = 0;
  let attempts = 0;
  for (; attempts < 6; attempts += 1) {
    await page.waitForTimeout(700);
    if (fullPage) await settleAllImages(page);
    else await settleVisibleImages(page);
    const current = await page.screenshot(options);
    stabilityRatio = screenshotRatio(previous, current).ratio;
    previous = current;
    stablePairs = stabilityRatio <= 0.0025 ? stablePairs + 1 : 0;
    if (stablePairs >= 2) break;
  }
  await fs.writeFile(imagePath, previous);
  if (stablePairs < 2) {
    throw new Error(`Capture did not settle for two consecutive pairs: ${stabilityRatio.toFixed(6)} after ${attempts} retries`);
  }
  return { stabilityRatio, stabilityAttempts: attempts + 1, stablePairs };
}

async function load(page, url, expectedSourceSha, fastWorkflowLoad = false) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  if (!response || !response.ok()) throw new Error(`Document request failed: ${response?.status()} ${url}`);
  let observedSha = null;
  if (expectedSourceSha) {
    // Check the exact document bytes that Chromium received, not only a
    // separate preflight fetch that could have seen a different deployment.
    observedSha = sha256(await response.body());
    if (observedSha !== expectedSourceSha) {
      throw new Error(`Published sourceHtml SHA changed for ${url}: ${observedSha} != ${expectedSourceSha}`);
    }
  }
  if (!fastWorkflowLoad) await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts.ready);
  if (!fastWorkflowLoad) await page.waitForTimeout(1_200);
  return observedSha;
}

async function prewarmWorkflowImages(context, url, expectedImageCount) {
  const warmPage = await context.newPage();
  try {
    await warmPage.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await warmPage.evaluate(() => {
      for (const image of document.images) image.loading = "eager";
    });
    await warmPage.waitForFunction((count) => document.images.length === count
      && [...document.images].every((image) => image.complete && image.naturalWidth > 0), expectedImageCount,
    { timeout: 8_000 });
    await settleAllImages(warmPage);
  } finally {
    await warmPage.close();
  }
}

async function prepareFullPage(page, viewportHeight) {
  // Full-page screenshots can include blank lazy images. Reveal the entire
  // page first, then return to the top and allow Framer's variants to settle.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += viewportHeight * 0.8) {
    await page.evaluate((target) => window.scrollTo(0, target), y);
    await page.waitForTimeout(100);
    await settleVisibleImages(page);
  }
  await settleAllImages(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
  await page.waitForTimeout(1_200);
}

async function replayState(page, caseData, state, viewportHeight, surface, expectedSourceImageCount) {
  if (caseData.label === "full-page") {
    if (caseData.viewport === "bp-1199-above") {
      // The original breakpoint extractor did not scroll through the page.
      // A fresh, cache-warmed navigation lets the selected Step 01 signup
      // preview pan naturally while the page stays at the top. Both the
      // published source and native Astro reach the bottom after ~3-4s.
      await page.evaluate(() => {
        for (const image of document.images) image.loading = "eager";
      });
      if (surface === "source") {
        await page.waitForFunction((count) => document.images.length === count
          && [...document.images].every((image) => image.complete && image.naturalWidth > 0), expectedSourceImageCount,
        { timeout: 3_000 });
      }
      await settleAllImages(page);
      if (surface === "source") {
        await page.waitForFunction(() => {
          const workflow = [...document.querySelectorAll("[data-framer-name]")]
            .find((element) => element.getAttribute("data-framer-name") === "Desktop/01");
          const form = workflow?.querySelector('[data-framer-name="Form"]');
          const background = workflow?.querySelector('[data-framer-name="Background"]');
          return Boolean(form && background && Math.abs(form.getBoundingClientRect().bottom - background.getBoundingClientRect().bottom) <= 2);
        }, undefined, { timeout: 5_000 });
      } else {
        // Framer's full-page frame shows lower content even at scrollY 0.
        // Native reveals are viewport driven, so visit their real elements
        // without crossing the earlier balance card, then return to the top.
        // Instant browser scrolling is important: CSS smooth scrolling would
        // pass through that balance card and change its source-matching $0.
        const revealTargets = await page.evaluate(() => {
          const workflow = document.querySelector(".workflow-tabs");
          if (!workflow) throw new Error("Native desktop workflow is missing");
          const workflowTop = workflow.getBoundingClientRect().top + scrollY;
          return [...new Set([...document.querySelectorAll("[data-reveal]")]
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return { top: rect.top + scrollY, width: rect.width, height: rect.height };
            })
            .filter((entry) => entry.top >= workflowTop - 1 && entry.width > 0 && entry.height > 0)
            .map((entry) => Math.round(Math.max(0, entry.top - innerHeight / 2))))];
        });
        if (!revealTargets.length) throw new Error("Native lower reveal targets are missing");
        for (const target of revealTargets) {
          await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), target);
          await page.waitForTimeout(160);
        }
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.waitForTimeout(750);
        await page.waitForFunction(() => {
          const panel = document.querySelector(".workflow-tabs .signup-panel");
          const stage = panel?.querySelector(".workflow-preview-stage")?.getBoundingClientRect();
          const card = panel?.querySelector(".auth-card")?.getBoundingClientRect();
          return panel?.getAttribute("data-signup-stage") === "bottom"
            && Boolean(stage && card && Math.abs(card.bottom - stage.bottom) <= 2);
        }, undefined, { timeout: 5_000 });
        return { shortWorkflowWindow: true, scrollWarmupPositions: revealTargets };
      }
      return { shortWorkflowWindow: true };
    }
    await prepareFullPage(page, viewportHeight);
    return { shortWorkflowWindow: false };
  }
  if (state.kind === "interaction") {
    if (caseData.route !== "/about" || caseData.label !== "interaction-07") {
      throw new Error(`Unmapped interaction ${caseData.route} ${caseData.label}`);
    }
    // The export's structural path is stale after hydration, although the
    // published sourceHtml is byte-identical. Use the control's accessible name.
    const target = surface === "source"
      ? page.locator('fieldset[aria-label="Carousel pagination controls"] button[aria-label="Next"]')
      : page.locator('[data-carousel-button="next"]');
    if (await target.count() !== 1) throw new Error(`${surface} About Next control count is not one`);
    await target.click({ noWaitAfter: true });
    await page.evaluate((y) => window.scrollTo(0, y), state.scrollY);
  } else {
    let y = 0;
    while (y + viewportHeight * 0.8 < state.scrollY) {
      y = Math.min(state.scrollY, y + viewportHeight * 0.8);
      await page.evaluate((target) => window.scrollTo(0, target), y);
      await page.waitForTimeout(160);
    }
    await page.evaluate((target) => window.scrollTo(0, target), state.scrollY);
  }
  await settleVisibleImages(page);
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
  await page.waitForTimeout(1_400);
  return { shortWorkflowWindow: false };
}

async function metrics(page, fullPage, surface) {
  return page.evaluate(({ full, surface }) => {
    const visible = [...document.images].filter((image) => {
      const rect = image.getBoundingClientRect();
      return full || (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight);
    });
    const sourceWorkflow = [...document.querySelectorAll("[data-framer-name]")]
      .filter((element) => /^Desktop\/0[1-4]$/.test(element.getAttribute("data-framer-name") ?? ""))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      })
      .map((element) => element);
    const nativeTabs = [...document.querySelectorAll('.workflow-list [role="tab"]')];
    const nativeIndex = nativeTabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    const nativeSignup = document.querySelector(".workflow-tabs .signup-panel");
    const nativeSignupRect = nativeSignup?.getBoundingClientRect();
    const sourceForm = sourceWorkflow[0]?.querySelector('[data-framer-name="Form"]');
    const sourceBackground = sourceWorkflow[0]?.querySelector('[data-framer-name="Background"]');
    const sourceFormRect = sourceForm?.getBoundingClientRect();
    const sourceBackgroundRect = sourceBackground?.getBoundingClientRect();
    const nativeStageRect = nativeSignup?.querySelector(".workflow-preview-stage")?.getBoundingClientRect();
    const nativeCardRect = nativeSignup?.querySelector(".auth-card")?.getBoundingClientRect();
    const nativeReveals = [...document.querySelectorAll("[data-reveal]")].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    return {
      scrollY: Math.round(window.scrollY),
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      imageCount: visible.length,
      imagesLoaded: visible.filter((image) => image.complete && image.naturalWidth > 0).length,
      h1: document.querySelector("h1")?.textContent?.trim() ?? null,
      workflowVariant: surface === "source"
        ? sourceWorkflow.length === 1 ? sourceWorkflow[0].getAttribute("data-framer-name") : null
        : nativeIndex >= 0 ? `Desktop/0${nativeIndex + 1}` : null,
      signupPreviewVisible: surface === "source"
        ? sourceWorkflow.length === 1 && sourceWorkflow[0].innerText.includes("Username*") && sourceWorkflow[0].innerText.includes("Sign Up")
        : Boolean(nativeSignupRect?.width && nativeSignupRect.height && nativeSignup?.textContent?.includes("Sign Up")),
      signupPreviewStage: surface === "source"
        ? sourceFormRect && sourceBackgroundRect && Math.abs(sourceFormRect.bottom - sourceBackgroundRect.bottom) <= 2 ? "bottom" : "transition-or-other"
        : nativeSignup?.getAttribute("data-signup-stage") === "bottom" && nativeCardRect && nativeStageRect
          && Math.abs(nativeCardRect.bottom - nativeStageRect.bottom) <= 2 ? "bottom" : "transition-or-other",
      controlBalance: surface === "native" ? document.querySelector("[data-live-balance] [data-count-value]")?.textContent?.trim() ?? null : null,
      visibleRevealCount: surface === "native" ? nativeReveals.length : null,
      revealedCount: surface === "native" ? nativeReveals.filter((element) => element.classList.contains("revealed")).length : null,
    };
  }, { full: fullPage, surface });
}

if (only && !cases.some((item) => `${slug(item.route)}--${item.viewport}--${item.label}` === only)) {
  throw new Error(`Unknown --only case: ${only}`);
}
await fs.mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const caseData of cases.filter((item) => !only || `${slug(item.route)}--${item.viewport}--${item.label}` === only)) {
    const route = manifest.find((entry) => entry.route === caseData.route);
    const capture = route?.captures.find((entry) => entry.viewport.name === caseData.viewport);
    const state = caseData.label === "full-page" ? null : capture?.states.find((entry) => entry.label === caseData.label);
    if (!capture || (caseData.label !== "full-page" && !state)) {
      throw new Error(`Missing archived capture ${caseData.route} ${caseData.viewport} ${caseData.label}`);
    }
    const routeSlug = slug(caseData.route);
    const archivedRoute = JSON.parse(await fs.readFile(path.join(evidenceRoot, "routes", `${routeSlug}.json`), "utf8"));
    const sourceSha = sha256(archivedRoute.sourceHtml);
    const { width, height } = capture.viewport;
    const basename = `${routeSlug}--${caseData.viewport}--${caseData.label}`;
    const originalPath = path.join(evidenceRoot, state?.screenshot ?? capture.screenshot);
    const sourcePath = path.join(outputRoot, `${basename}--source.png`);
    const nativePath = path.join(outputRoot, `${basename}--native.png`);
    const diffPath = path.join(outputRoot, `${basename}--native-diff.png`);
    const result = {
      ...caseData,
      qualificationEligible: defectiveCases.has(basename),
      motionSetting: "no-preference",
      workflowCaptureMode: basename === "home--bp-1199-above--full-page" ? "cached-eager-images-natural-Step01-bottom-stable-window-100ms" : null,
      workflowStateNaturallyReached: basename === "home--bp-1199-above--full-page" ? true : null,
      sourceMotionSetting: "no-preference",
      nativeMotionSetting: "no-preference",
      expectedSourceSha256: sourceSha,
      expectedDocumentSize: capture.documentSize,
      originalPath: path.relative(projectRoot, originalPath),
      sourcePath: path.relative(projectRoot, sourcePath),
      nativePath: path.relative(projectRoot, nativePath),
      nativeDiffPath: path.relative(projectRoot, diffPath),
      originalSha256Before: sha256(await fs.readFile(originalPath)),
      originalSha256After: "",
    };
    if (basename === "home--bp-1199-above--full-page") {
      const archivedCapture = archivedRoute.captures.find((entry) => entry.viewport.name === caseData.viewport);
      result.expectedSourceImageCount = archivedCapture.nodes.filter((node) => node.tag?.toLowerCase() === "img").length;
      result.archivedWorkflowVariant = archivedCapture?.nodes
        .map((node) => node.attributes?.["data-framer-name"])
        .find((name) => /^Desktop\/0[1-4]$/.test(name ?? "")) ?? null;
    }
    const contexts = [];
    try {
      for (const surface of ["source", "native"]) {
        const context = await browser.newContext({
          viewport: { width, height },
          locale: "en-US",
          timezoneId: "America/Bogota",
          colorScheme: "light",
          reducedMotion: result.motionSetting,
        });
        contexts.push(context);
        const url = new URL(caseData.route.replace(/^\//, ""), surface === "source" ? sourceBase : nativeBase).href;
        if (basename === "home--bp-1199-above--full-page" && surface === "source") {
          await prewarmWorkflowImages(context, url, result.expectedSourceImageCount);
        }
        const page = await context.newPage();
        const browserErrors = [];
        const consoleErrors = [];
        const imageResponses = [];
        page.on("pageerror", (error) => browserErrors.push(error.message));
        page.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text());
        });
        page.on("response", (response) => {
          if (response.request().resourceType() !== "image") return;
          // Framer can return image/avif behind a URL ending in .png/.jpg.
          // Record the HTTP MIME type; image.decode() and naturalWidth above
          // determine whether the browser actually rendered the response.
          imageResponses.push({
            url: response.url(),
            status: response.status(),
            contentType: response.headers()["content-type"] ?? null,
          });
        });
        const observedSha = await load(page, url, surface === "source" ? sourceSha : null,
          basename === "home--bp-1199-above--full-page");
        if (surface === "source") result.observedSourceSha256 = observedSha;
        const replayed = await replayState(page, caseData, state, height, surface, result.expectedSourceImageCount);
        if (replayed.scrollWarmupPositions) result[`${surface}ScrollWarmupPositions`] = replayed.scrollWarmupPositions;
        const imagePath = surface === "source" ? sourcePath : nativePath;
        const settled = await captureSettled(page, imagePath, caseData.label === "full-page", replayed.shortWorkflowWindow, surface);
        result[`${surface}StabilityRatio`] = settled.stabilityRatio;
        result[`${surface}StabilityAttempts`] = settled.stabilityAttempts;
        result[`${surface}StablePairs`] = settled.stablePairs;
        if (settled.pairRatios) result[`${surface}PairRatios`] = settled.pairRatios;
        if (settled.allAttemptedPairRatios) result[`${surface}AllAttemptedPairRatios`] = settled.allAttemptedPairRatios;
        if (settled.frameTimesSinceNavigationMs) result[`${surface}FrameTimesSinceNavigationMs`] = settled.frameTimesSinceNavigationMs;
        if (settled.selectedWindowFrameIndices) result[`${surface}SelectedWindowFrameIndices`] = settled.selectedWindowFrameIndices;
        result[`${surface}Metrics`] = settled.capturedMetrics ?? await metrics(page, caseData.label === "full-page", surface);
        result[`${surface}BrowserErrors`] = browserErrors;
        result[`${surface}ConsoleErrors`] = consoleErrors;
        result[`${surface}ImageResponses`] = imageResponses;
      }
      const original = await fs.readFile(originalPath);
      const source = await fs.readFile(sourcePath);
      const native = await fs.readFile(nativePath);
      result.originalVsClean = screenshotRatio(original, source).ratio;
      const comparison = screenshotRatio(source, native, diffPath);
      result.nativeVsClean = comparison.ratio;
      await fs.writeFile(diffPath, comparison.diffBuffer);
      result.originalSha256After = sha256(await fs.readFile(originalPath));
      result.originalUnchanged = result.originalSha256Before === result.originalSha256After;
      const expectedScroll = state?.scrollY ?? 0;
      const failures = [];
      if (!result.originalUnchanged) failures.push("original PNG changed");
      if (result.observedSourceSha256 !== sourceSha) failures.push("published sourceHtml SHA changed");
      if (result.sourceMetrics.documentWidth !== capture.documentSize.width || result.sourceMetrics.documentHeight !== capture.documentSize.height) failures.push("source document dimensions changed");
      if (result.nativeMetrics.documentWidth !== capture.documentSize.width || result.nativeMetrics.documentHeight !== capture.documentSize.height) failures.push("native document dimensions differ");
      if (Math.abs(result.sourceMetrics.scrollY - expectedScroll) > 2) failures.push("source scroll position differs");
      if (Math.abs(result.nativeMetrics.scrollY - expectedScroll) > 2) failures.push("native scroll position differs");
      if (result.sourceMetrics.imagesLoaded !== result.sourceMetrics.imageCount) failures.push("source images not decoded");
      if (result.nativeMetrics.imagesLoaded !== result.nativeMetrics.imageCount) failures.push("native images not decoded");
      if (result.sourceStabilityRatio > 0.0025 || result.sourceStablePairs < 2) failures.push("source capture unstable");
      if (result.nativeStabilityRatio > 0.0025 || result.nativeStablePairs < 2) failures.push("native capture unstable");
      if (result.sourceBrowserErrors.length || result.sourceConsoleErrors.length) failures.push("source browser runtime or console error");
      if (result.nativeBrowserErrors.length || result.nativeConsoleErrors.length) failures.push("native browser runtime or console error");
      if (basename === "home--bp-1199-above--full-page") {
        if (!result.archivedWorkflowVariant || result.sourceMetrics.workflowVariant !== result.archivedWorkflowVariant) {
          failures.push("source workflow variant differs from archived Desktop step");
        }
        if (!result.archivedWorkflowVariant || result.nativeMetrics.workflowVariant !== result.archivedWorkflowVariant) {
          failures.push("native workflow variant differs from archived Desktop step");
        }
        if (!result.sourceMetrics.signupPreviewVisible) failures.push("source Step 01 signup preview is not visible");
        if (!result.nativeMetrics.signupPreviewVisible) failures.push("native Step 01 signup preview is not visible");
        if (result.sourceMetrics.signupPreviewStage !== "bottom") failures.push("source Step 01 signup preview is not naturally bottom-settled");
        if (result.nativeMetrics.signupPreviewStage !== "bottom") failures.push("native Step 01 signup preview is not naturally bottom-settled");
        if (result.sourceMetrics.imageCount !== result.expectedSourceImageCount) failures.push("source hydrated image count differs from archived DOM");
        if (result.nativeMetrics.controlBalance !== "$0") failures.push("native offscreen balance differs from source initial state");
        if (result.nativeMetrics.visibleRevealCount !== result.nativeMetrics.revealedCount) failures.push("native lower content was not revealed by scroll warmup");
      }
      result.sourceRecaptureChecksPassed = failures.filter((failure) => !failure.startsWith("native ")).length === 0;
      if (result.nativeVsClean > 0.01) failures.push("native difference exceeds 1%");
      result.qualificationFailures = failures;
      result.captureQualified = result.qualificationEligible && failures.length === 0;
      result.replacementEligible = result.captureQualified;
      if (result.qualificationEligible && !result.captureQualified) process.exitCode = 1;
      console.log(`${basename}: archive ${(result.originalVsClean * 100).toFixed(3)}%, native ${(result.nativeVsClean * 100).toFixed(3)}%, ${result.qualificationEligible ? result.captureQualified ? "qualified" : `OPEN (${failures.join(", ")})` : "diagnostic only"}`);
    } catch (error) {
      result.error = error.message;
      result.captureQualified = false;
      result.replacementEligible = false;
      result.qualificationFailures = [error.message];
      process.exitCode = 1;
      console.error(`${basename}: ${error.message}`);
    } finally {
      for (const context of contexts) await context.close();
    }
    results.push(result);
  }
} finally {
  await browser.close();
}

const report = {
  generatedAt: new Date().toISOString(),
  purpose: "Supplementary clean source recaptures for eight disputed archival frames; no tracker signoff",
  sourceBase: sourceBase.href,
  nativeBase: nativeBase.href,
  browser: `Chromium ${browser.version()}`,
  pixelmatch: { threshold: 0.12, includeAA: false, acceptanceRatio: 0.01 },
  qualificationRule: "Only four listed defective archival captures can qualify; sourceHtml SHA, archived geometry/scroll, decoded images, two stable source/native frame pairs, no runtime errors, unchanged original PNG, and native difference <=1% are required. The 1200px full-page case uses natural no-preference Step 01 signup bottom on both pages after native lower-section reveal warmup.",
  results,
};
const reportPath = path.join(outputRoot, only ? `report--${only}.json` : "report.json");
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Saved ${path.relative(projectRoot, reportPath)}`);
