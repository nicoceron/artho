import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

// Compare the archived source AX capture with the native page's meaningful
// semantics at every exported viewport. Framer's generated tree is not a DOM
// template: shorter link names and stronger native roles are acceptable, while
// missing source headings, unnamed controls, and missing landmarks are not.
const root = path.resolve(import.meta.dirname, "..");
const evidence = path.join(root, ".evidence");
const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4393";
const manifest = JSON.parse(await fs.readFile(path.join(evidence, "route-manifest.json"), "utf8"));
const outputPath = path.join(evidence, "accessibility-report.json");
const interactiveRoles = new Set(["link", "button", "textbox", "combobox", "checkbox", "radio", "tab", "switch", "searchbox", "spinbutton"]);
const landmarkRoles = ["main", "navigation", "banner", "contentinfo"];

function routeName(route) {
  return route === "/" ? "home" : route.slice(1).replaceAll("/", "__");
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function sourceRole(node) {
  return node.role;
}

function nativeRole(node) {
  return node.role?.value;
}

function nativeLevel(node) {
  return node.properties?.find((property) => property.name === "level")?.value?.value;
}

const browser = await chromium.launch();
const results = [];
try {
  for (const route of manifest) {
    const archived = JSON.parse(await fs.readFile(path.join(evidence, "routes", `${routeName(route.route)}.json`), "utf8"));
    for (const capture of archived.captures) {
      const { name, width, height } = capture.viewport;
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", colorScheme: "light" });
      try {
        const page = await context.newPage();
        const runtimeErrors = [];
        page.on("pageerror", (error) => runtimeErrors.push(error.message));
        page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()); });
        const response = await page.goto(new URL(route.route, baseUrl).href, { waitUntil: "domcontentloaded" });
        if (!response?.ok()) runtimeErrors.push(`Document HTTP ${response?.status()}`);
        await page.evaluate(() => document.fonts.ready);
        const source = capture.accessibilityTree.filter((node) => !node.ignored);
        const native = (await (await context.newCDPSession(page)).send("Accessibility.getFullAXTree")).nodes.filter((node) => !node.ignored);
        const visibleText = clean(await page.evaluate(() => document.body.innerText));
        const sourceHeadings = source.filter((node) => sourceRole(node) === "heading" && clean(node.name));
        const sourceH1 = sourceHeadings.filter((node) => node.properties?.level === 1).map((node) => clean(node.name));
        const nativeH1 = native.filter((node) => nativeRole(node) === "heading" && nativeLevel(node) === 1).map((node) => clean(node.name?.value));
        const missingHeadingText = [...new Set(sourceHeadings.map((node) => clean(node.name)).filter((name) => !visibleText.includes(name)))];
        const unnamedNativeControls = native.filter((node) => interactiveRoles.has(nativeRole(node)) && !clean(node.name?.value))
          .map((node) => ({ role: nativeRole(node), backendDOMNodeId: node.backendDOMNodeId ?? null }));
        const nativeRoles = new Set(native.map(nativeRole));
        const missingLandmarks = landmarkRoles.filter((role) => !nativeRoles.has(role));
        const failures = [];
        // Pricing's source marks two decorative metrics (70% and 98%) as H1.
        // The native page keeps the actual page title as its single H1 and
        // preserves those metric strings as visible content.
        if (nativeH1.length !== 1 || !sourceH1.includes(nativeH1[0])) failures.push("page H1 accessible name differs");
        if (missingHeadingText.length) failures.push("source heading text missing");
        if (unnamedNativeControls.length) failures.push("unnamed native interactive control");
        if (missingLandmarks.length) failures.push("native landmark missing");
        if (runtimeErrors.length) failures.push("browser runtime error");
        results.push({
          route: route.route,
          viewport: name,
          width,
          height,
          sourceAxNodes: source.length,
          nativeAxNodes: native.length,
          sourceHeadingCount: sourceHeadings.length,
          sourceUnnamedLinks: source.filter((node) => sourceRole(node) === "link" && !clean(node.name)).length,
          nativeInteractiveCount: native.filter((node) => interactiveRoles.has(nativeRole(node))).length,
          sourceH1,
          nativeH1,
          missingHeadingText,
          unnamedNativeControls,
          missingLandmarks,
          runtimeErrors,
          failures,
        });
        console.log(`${route.route} ${name}: ${failures.length ? failures.join(", ") : "pass"}`);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

const report = {
  generatedAt: new Date().toISOString(),
  source: "archived Chromium accessibilityTree in .evidence/routes/*.json",
  target: baseUrl,
  expectedCaptures: manifest.reduce((total, route) => total + route.captures.length, 0),
  passed: results.filter((result) => result.failures.length === 0).length,
  failed: results.filter((result) => result.failures.length > 0).length,
  results,
};
await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Accessibility audit: ${report.passed}/${results.length} captures passed; report ${path.relative(root, outputPath)}`);
if (report.failed > 0 || results.length !== report.expectedCaptures) process.exitCode = 1;
