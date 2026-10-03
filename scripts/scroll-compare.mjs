import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const projectRoot = path.resolve(import.meta.dirname, "..");
const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4393";
const routeFilter = process.argv.find((argument) => argument.startsWith("--route="))?.slice(8);
const viewportFilter = process.argv.find((argument) => argument.startsWith("--viewport="))?.slice(11);
const manifest = JSON.parse(await fs.readFile(path.join(projectRoot, ".evidence/route-manifest.json"), "utf8"));
const outputRoot = path.join(projectRoot, ".evidence", "scroll-actual");
const diffRoot = path.join(projectRoot, ".evidence", "scroll-diff");
const coreViewports = new Set(["desktop", "tablet", "mobile"]);

await fs.mkdir(outputRoot, { recursive: true });
await fs.mkdir(diffRoot, { recursive: true });

const browser = await chromium.launch();
const results = [];

try {
  for (const route of manifest.filter((item) => !routeFilter || item.route === routeFilter)) {
    const routeName = route.route === '/' ? 'home' : route.route.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9._-]+/g, '__');
    const sourceRoute = JSON.parse(await fs.readFile(path.join(projectRoot, '.evidence/routes', `${routeName}.json`), 'utf8'));
    for (const capture of route.captures.filter(({ viewport }) => coreViewports.has(viewport.name) && (!viewportFilter || viewport.name === viewportFilter))) {
      const { name, width, height } = capture.viewport;
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", colorScheme: "light" });
      const page = await context.newPage();
      await page.goto(new URL(route.route, baseUrl).href, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      // The source sweep retains the selected workflow tab between captures.
      // Replay that component state, just as in the full-page comparison.
      const sourceCapture = sourceRoute.captures.find(item => item.viewport.name === name);
      const workflowVariant = sourceCapture.nodes.map(node => node.attributes?.['data-framer-name']).find(value => /^(Desktop|Tablet)\/0[1-4]$/.test(value));
      if (workflowVariant) {
        await page.locator('.workflow-list [role="tab"]').nth(Number(workflowVariant.slice(-1)) - 1).evaluate(element => { if (element instanceof HTMLElement) element.click(); });
      }

      for (const state of capture.states.filter(({ kind }) => kind === "scroll" || kind === 'interaction')) {
        await page.evaluate((scrollY) => window.scrollTo(0, scrollY), state.scrollY);
        let carouselScrollLeft;
        let transferRailOffsetPx;
        if (route.route === '/' && name === 'mobile') {
          await page.locator('.transfer-track').evaluate((element) => {
            if (element instanceof HTMLElement) element.style.removeProperty('transform');
          });
          if (state.label === 'scroll-050') {
            // The source captured the continuous contact rail five pixels into
            // its current frame. The reduced-motion comparison freezes the
            // native rail at its start, so replay the observed phase explicitly.
            transferRailOffsetPx = 5;
            await page.locator('.transfer-track').evaluate((element, offset) => {
              if (element instanceof HTMLElement) element.style.transform = `translateX(${offset}px)`;
            }, transferRailOffsetPx);
          }
        }
        if (state.kind === 'interaction') {
          if (route.route !== '/about' || !state.target?.includes('fieldset > button:nth-of-type(2)')) throw new Error(`Unmapped source interaction: ${route.route} ${state.label}`);
          await page.locator('[data-carousel-button="next"]').evaluate(element => { if (element instanceof HTMLButtonElement) element.click(); });
          if (name === 'tablet') {
            // The tablet source screenshot caught the horizontal scroll at
            // 553px of its 570px travel. The mobile source screenshot instead
            // shows the settled first page at 315px, which the native click
            // reaches directly in reduced motion. Preserve those distinct
            // captured states in this deterministic replay.
            carouselScrollLeft = 553;
            await page.locator('[data-carousel-track]').evaluate((element, left) => {
              if (!(element instanceof HTMLElement)) return;
              element.style.scrollSnapType = 'none';
              element.scrollLeft = left;
            }, carouselScrollLeft);
          }
        }
        await page.waitForTimeout(100);
        const basename = `${routeName}--${name}--${state.label}.png`;
        const actualPath = path.join(outputRoot, basename);
        await page.screenshot({ path: actualPath, animations: "disabled" });
        const sourcePath = path.join(projectRoot, ".evidence", state.screenshot);
        const [source, actual] = await Promise.all([sourcePath, actualPath].map(async (file) => PNG.sync.read(await fs.readFile(file))));
        if (source.width !== actual.width || source.height !== actual.height) throw new Error(`Viewport mismatch for ${name} ${state.label}`);
        const diff = new PNG({ width: source.width, height: source.height });
        const differingPixels = pixelmatch(source.data, actual.data, diff.data, source.width, source.height, { threshold: 0.12, includeAA: false });
        const ratio = differingPixels / (source.width * source.height);
        await fs.writeFile(path.join(diffRoot, basename), PNG.sync.write(diff));
        results.push({ route:route.route, viewport: name, kind:state.kind, state: state.label, replayedStates:{workflowVariant, ...(carouselScrollLeft === undefined ? {} : { carouselScrollLeft }), ...(transferRailOffsetPx === undefined ? {} : { transferRailOffsetPx })}, requestedScrollY: state.scrollY, actualScrollY: await page.evaluate(() => scrollY), ratio, sourcePath:path.relative(projectRoot, sourcePath), actualPath:path.relative(projectRoot, actualPath), diffPath:path.relative(projectRoot, path.join(diffRoot, basename)) });
        console.log(`${route.route} ${name} ${state.label}: y=${state.scrollY}, ${(ratio * 100).toFixed(3)}%`);
      }

      await context.close();
    }
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(projectRoot, ".evidence", routeFilter || viewportFilter ? "scroll-report-filtered.json" : "scroll-report.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
