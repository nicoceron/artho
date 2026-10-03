import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4393";
const projectRoot = path.resolve(import.meta.dirname, "..");
const outputRoot = path.join(projectRoot, ".evidence", "motion-actual");
const scenes = ["simple", "accuracy", "security", "overview", "billing", "analytics", "budget", "integrations"];

await fs.mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch();

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  for (const name of scenes) {
    const scene = page.locator(`[data-motion-sequence][data-motion-name="${name}"]`);
    await page.mouse.move(0, 0);
    await scene.evaluate(element => {
      const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0;
      window.scrollTo({ top:element.getBoundingClientRect().top + scrollY - header - 20, behavior:'instant' });
    });
    await page.waitForTimeout(350);
    await scene.screenshot({ path: path.join(outputRoot, `${name}--initial.png`), animations: "disabled" });
    await scene.evaluate(element => { if (element instanceof HTMLElement) element.focus({ preventScroll:true }); });
    const delays = (await scene.getAttribute("data-motion-delays") ?? "500").split(",").map(Number);
    await page.waitForTimeout(delays.reduce((sum, delay) => sum + delay, 0) + 450);
    await scene.screenshot({ path: path.join(outputRoot, `${name}--final.png`), animations: "disabled" });
    await scene.evaluate(element => { if (element instanceof HTMLElement) element.blur(); });
  }

  await context.close();
} finally {
  await browser.close();
}

console.log(`Captured ${scenes.length * 2} motion-state screenshots in ${path.relative(projectRoot, outputRoot)}`);
