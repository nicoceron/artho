import fs from "node:fs/promises";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

// Compare each archived viewport-only initial PNG with the top region of the
// native full-page capture. This covers the 75 initial visual-state rows that
// a full-page average can hide. Run after fresh core + home breakpoint sweeps.
const root = path.resolve(import.meta.dirname, "..");
const evidence = path.join(root, ".evidence");
const manifest = JSON.parse(await fs.readFile(path.join(evidence, "route-manifest.json"), "utf8"));
const core = JSON.parse(await fs.readFile(path.join(evidence, "visual-report.json"), "utf8"));
const breakpoint = JSON.parse(await fs.readFile(path.join(evidence, "visual-report-breakpoints.json"), "utf8"));
const actualRoot = path.join(evidence, "initial-actual");
const diffRoot = path.join(evidence, "initial-diff");
await Promise.all([fs.mkdir(actualRoot, { recursive: true }), fs.mkdir(diffRoot, { recursive: true })]);
const ratioLimit = 0.01;
const coreNames = new Set(["desktop", "tablet", "mobile"]);
const key = (route, viewport) => `${route}::${viewport}`;
const slug = (route) => route === "/" ? "home" : route.slice(1).replaceAll("/", "__");
const coreResults = new Map(core.results.map((result) => [key(result.route, result.viewport), result]));
const breakpointResults = new Map(breakpoint.results.map((result) => [key(result.route, result.viewport), result]));
const expectedCore = manifest.flatMap((route) => route.captures
  .filter((capture) => coreNames.has(capture.viewport.name))
  .map((capture) => key(route.route, capture.viewport.name)));
const expectedBreakpoint = manifest.find((route) => route.route === "/").captures
  .map((capture) => key("/", capture.viewport.name));
if (core.results.length !== expectedCore.length || coreResults.size !== expectedCore.length
  || expectedCore.some((id) => !coreResults.has(id))
  || breakpoint.results.length !== expectedBreakpoint.length
  || breakpointResults.size !== expectedBreakpoint.length
  || expectedBreakpoint.some((id) => !breakpointResults.has(id))) {
  throw new Error("Complete fresh core and homepage breakpoint reports are required before initial-state comparison.");
}
const results = [];

for (const route of manifest) {
  for (const capture of route.captures) {
    const viewport = capture.viewport.name;
    const id = key(route.route, viewport);
    const full = coreNames.has(viewport) ? coreResults.get(id) : breakpointResults.get(id);
    if (!full) throw new Error(`Missing native full-page result ${id}`);
    const state = capture.states.find((candidate) => candidate.kind === "initial");
    if (!state) throw new Error(`Missing archived initial state ${id}`);
    const sourcePath = path.join(evidence, state.screenshot);
    const fullActualPath = path.join(root, full.actualPath);
    const [source, fullActual] = await Promise.all([sourcePath, fullActualPath]
      .map(async (file) => PNG.sync.read(await fs.readFile(file))));
    if (source.width !== capture.viewport.width || source.height !== capture.viewport.height
      || fullActual.width !== source.width || fullActual.height < source.height) {
      throw new Error(`Initial/full-page dimensions differ ${id}`);
    }
    const actual = new PNG({ width: source.width, height: source.height });
    PNG.bitblt(fullActual, actual, 0, 0, source.width, source.height, 0, 0);
    const diff = new PNG({ width: source.width, height: source.height });
    const differingPixels = pixelmatch(source.data, actual.data, diff.data,
      source.width, source.height, { threshold: 0.12, includeAA: false });
    const ratio = differingPixels / (source.width * source.height);
    const basename = `${slug(route.route)}--${viewport}--initial.png`;
    const actualPath = path.join(actualRoot, basename);
    const diffPath = path.join(diffRoot, basename);
    await Promise.all([
      fs.writeFile(actualPath, PNG.sync.write(actual)),
      fs.writeFile(diffPath, PNG.sync.write(diff)),
    ]);
    results.push({
      route: route.route,
      viewport,
      ratio,
      differingPixels,
      sourcePath: path.relative(root, sourcePath),
      fullActualPath: path.relative(root, fullActualPath),
      actualPath: path.relative(root, actualPath),
      diffPath: path.relative(root, diffPath),
      width: source.width,
      height: source.height,
    });
    console.log(`${id}: ${(ratio * 100).toFixed(3)}%`);
  }
}
const report = {
  generatedAt: new Date().toISOString(),
  comparator: { threshold: 0.12, includeAA: false, targetRatio: ratioLimit },
  coreReportGeneratedAt: core.generatedAt,
  breakpointReportGeneratedAt: breakpoint.generatedAt,
  expected: 75,
  passed: results.filter((item) => item.ratio <= ratioLimit).length,
  failed: results.filter((item) => item.ratio > ratioLimit).length,
  results,
};
await fs.writeFile(path.join(evidence, "initial-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Initial states: ${report.passed}/${report.expected} within 1%; report .evidence/initial-report.json`);
if (report.failed) process.exitCode = 1;
