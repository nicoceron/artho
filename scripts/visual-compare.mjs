import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const projectRoot = path.resolve(import.meta.dirname, "..");
const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4393";
const strict = process.argv.includes("--strict");
const allViewports = process.argv.includes('--all-viewports');
const routeFilter = process.argv.find((argument) => argument.startsWith("--route="))?.slice("--route=".length);
const viewportFilter = process.argv.find((argument) => argument.startsWith("--viewport="))?.slice("--viewport=".length);
const coreViewports = new Set(["desktop", "tablet", "mobile"]);
const manifest = JSON.parse(await fs.readFile(path.join(projectRoot, ".evidence/route-manifest.json"), "utf8"));
const actualRoot = path.join(projectRoot, ".evidence", "visual-actual");
const diffRoot = path.join(projectRoot, ".evidence", "visual-diff");

await fs.mkdir(actualRoot, { recursive: true });
await fs.mkdir(diffRoot, { recursive: true });

function routeName(route) {
  return route === "/" ? "home" : route.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9._-]+/g, "__");
}

function padded(source, width, height) {
  const result = new PNG({ width, height });
  result.data.fill(255);
  PNG.bitblt(source, result, 0, 0, source.width, source.height, 0, 0);
  return result;
}

const browser = await chromium.launch();
const results = [];

try {
  for (const route of manifest.filter((item) => !routeFilter || item.route === routeFilter)) {
    const sourceRoute = JSON.parse(await fs.readFile(path.join(projectRoot, '.evidence/routes', `${routeName(route.route)}.json`), 'utf8'));
    for (const capture of route.captures.filter((item) => (allViewports || coreViewports.has(item.viewport.name)) && (!viewportFilter || item.viewport.name === viewportFilter))) {
      const { name, width, height } = capture.viewport;
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", colorScheme: "light" });
      const page = await context.newPage();
      const runtimeErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") runtimeErrors.push(message.text());
      });
      page.on("pageerror", (error) => runtimeErrors.push(error.message));
      await page.goto(new URL(route.route, baseUrl).href, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(100);

      // The export's full-page captures retain component states from its capture
      // sweep (including an already-scrolled hero and a selected workflow tab).
      // Reproduce those states explicitly; don't change the site's initial state.
      const sourceCapture = sourceRoute.captures.find(item => item.viewport.name === name);
      const names = sourceCapture.nodes.map(node => node.attributes?.['data-framer-name']).filter(Boolean);
      const heroVariant = names.find(value => /^(Desktop|Tablet|Phone)\/On Scroll$/.test(value));
      const workflowVariant = names.find(value => /^(Desktop|Tablet)\/0[1-4]$/.test(value));
      const replayedStates = { heroVariant, workflowVariant };
      if (workflowVariant) {
        const index = Number(workflowVariant.slice(-1)) - 1;
        await page.locator('.workflow-list [role="tab"]').nth(index).evaluate(element => { if (element instanceof HTMLElement) element.click(); });
      }
      if (heroVariant) await page.locator('[data-hero]').evaluate((element, variant) => { element.dataset.motionVariant = variant; }, heroVariant);

      const actualPath = path.join(actualRoot, `${routeName(route.route)}--${name}.png`);
      await page.screenshot({ path: actualPath, fullPage: true, animations: "disabled" });
      const oraclePath = path.join(projectRoot, ".evidence", capture.screenshot);
      const [oracleBuffer, actualBuffer] = await Promise.all([fs.readFile(oraclePath), fs.readFile(actualPath)]);
      const oracle = PNG.sync.read(oracleBuffer);
      const actual = PNG.sync.read(actualBuffer);
      const compareWidth = Math.max(oracle.width, actual.width);
      const compareHeight = Math.max(oracle.height, actual.height);
      const oraclePadded = padded(oracle, compareWidth, compareHeight);
      const actualPadded = padded(actual, compareWidth, compareHeight);
      const diff = new PNG({ width: compareWidth, height: compareHeight });
      const differingPixels = pixelmatch(oraclePadded.data, actualPadded.data, diff.data, compareWidth, compareHeight, { threshold: 0.12, includeAA: false });
      const ratio = differingPixels / (compareWidth * compareHeight);
      const diffPath = path.join(diffRoot, `${routeName(route.route)}--${name}.png`);
      await fs.writeFile(diffPath, PNG.sync.write(diff));

      results.push({
        route: route.route,
        viewport: name,
        ratio,
        differingPixels,
        oracle: { width: oracle.width, height: oracle.height },
        actual: { width: actual.width, height: actual.height },
        runtimeErrors,
        replayedStates,
        oraclePath: path.relative(projectRoot, oraclePath),
        actualPath: path.relative(projectRoot, actualPath),
        diffPath: path.relative(projectRoot, diffPath),
      });
      console.log(`${route.route} ${name}: ${(ratio * 100).toFixed(3)}% (${actual.width}x${actual.height} vs ${oracle.width}x${oracle.height})`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  generatedAt: new Date().toISOString(),
  captureMode: "settled-reduced-motion-with-captured-component-states",
  targetRatio: 0.01,
  passed: results.filter((item) => item.ratio <= 0.01).length,
  failed: results.filter((item) => item.ratio > 0.01).length,
  averageRatio: results.length ? results.reduce((sum, item) => sum + item.ratio, 0) / results.length : 0,
  worstRatio: results.length ? Math.max(...results.map((item) => item.ratio)) : 0,
  results,
};
const reportName = allViewports && routeFilter === '/' && !viewportFilter ? 'visual-report-breakpoints.json' : routeFilter || viewportFilter ? 'visual-report-filtered.json' : 'visual-report.json';
await fs.writeFile(path.join(projectRoot, ".evidence", reportName), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Average ${(report.averageRatio * 100).toFixed(3)}%; worst ${(report.worstRatio * 100).toFixed(3)}%; ${report.passed}/${results.length} at or below 1%`);
if (strict && report.failed > 0) process.exitCode = 1;
