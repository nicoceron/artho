import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const articles = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, "../src/data/articles.json"), "utf8"),
) as Array<{ slug: string }>;

const routes = [
  "/",
  "/about",
  "/blog",
  ...articles.map((article) => `/blog/${article.slug}`),
  "/contact",
  "/faq",
  "/features",
  "/legal/privacy-policy",
  "/legal/terms-of-service",
  "/pricing",
];

for (const route of routes) {
  test(`${route} renders without runtime errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("main#content")).toBeVisible();
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator("footer.site-footer")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("mobile navigation opens, closes with Escape, and preserves focusable links", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.locator("[data-menu-toggle]");
  await toggle.click();
  await expect(page.locator("[data-mobile-menu]")).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-mobile-menu]")).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("tablet navigation uses the captured compact header breakpoint", async ({ page }) => {
  await page.setViewportSize({ width: 810, height: 1080 });
  await page.goto("/");
  await expect(page.locator(".desktop-nav")).toBeHidden();
  await expect(page.locator("[data-menu-toggle]")).toBeVisible();
});

test("mobile workflow preserves all four captured steps and panels", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".workflow-tabs")).toBeHidden();
  await expect(page.locator(".workflow-mobile-step")).toHaveCount(4);
  await expect(page.locator(".workflow-mobile-panel")).toHaveCount(4);
  for (const panel of await page.locator(".workflow-mobile-panel").all()) {
    await expect(panel).toBeVisible();
  }
});

test("resource menu, workflow tabs, and keyboard arrows work", async ({ page }) => {
  await page.goto("/");
  const resources = page.getByRole("button", { name: "Resources" });
  await resources.click();
  await expect(page.locator("[data-resource-menu]")).toHaveClass(/open/);
  await resources.press('Escape');
  await expect(page.locator('[data-resource-menu]')).toBeHidden();
  await expect(resources).toHaveAttribute('aria-expanded', 'false');
  await resources.press('ArrowDown');
  await expect(page.locator('[data-resource-menu] a').first()).toBeFocused();
  await page.locator('[data-resource-menu] a').first().press('Escape');
  await expect(resources).toBeFocused();
  await page.getByRole("tab", { name: /Connect Your Financial Tools/ }).click();
  await expect(page.locator("[data-panel='card']")).toBeVisible();
  await page.getByRole("tab", { name: /Connect Your Financial Tools/ }).press("ArrowRight");
  await expect(page.locator("[data-panel='dashboard']")).toBeVisible();
});

test("pricing toggle switches all displayed billing values", async ({ page }) => {
  await page.goto("/pricing");
  await page.getByRole("button", { name: "Yearly" }).click();
  const prices = await page.locator("[data-monthly-price]").allTextContents();
  expect(prices).toEqual(["$0", "$290", "$790"]);
  await expect(page.locator("[data-billing-period]").first()).toHaveText("/year");
});

test("FAQ hash navigation smooth-scrolls through every source section", async ({ page }) => {
  await page.goto("/faq");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[data-scroll-section]")).toHaveCount(5);
  for (const section of await page.locator("[data-scroll-section]").all()) {
    await expect(section).toBeVisible();
  }

  const secondLink = page.locator("[data-scroll-link]").nth(1);
  const scrollSamples = await page.evaluate(async () => {
    const link = document.querySelector<HTMLAnchorElement>("a[href='#billing-subscriptions']");
    const section = document.querySelector<HTMLElement>("#billing-subscriptions");
    if (!link || !section) throw new Error("Missing FAQ source anchors");
    const target = Math.min(section.getBoundingClientRect().top + window.scrollY, document.documentElement.scrollHeight - window.innerHeight);
    link.click();
    const immediate = window.scrollY;
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    const underway = window.scrollY;
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    return { immediate, underway, settled: window.scrollY, target };
  });
  expect(scrollSamples.immediate).toBeLessThan(scrollSamples.underway);
  expect(scrollSamples.underway).toBeLessThan(scrollSamples.settled);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scrollSamples.target, 0);
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("#billing-subscriptions");
  await expect(secondLink).toHaveAttribute("aria-current", "location");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  const questions = page.locator("#billing-subscriptions details");
  await questions.nth(0).locator("summary").click();
  await questions.nth(1).locator("summary").click();
  await expect(questions.nth(0)).not.toHaveAttribute("open", "");
  await expect(questions.nth(1)).toHaveAttribute("open", "");
});

test("page wheel scrolling uses the shared Lenis smoothing from the reference port", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/lenis/);
  await expect.poll(() => page.evaluate(() => (window as Window & { lenisVersion?: string }).lenisVersion)).toBe("1.1.2");

  await page.mouse.wheel(0, 900);
  await expect(page.locator("html")).toHaveClass(/lenis-smooth/);
  const immediate = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(80);
  const underway = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(1200);
  const settled = await page.evaluate(() => window.scrollY);

  expect(immediate).toBeLessThan(underway);
  expect(underway).toBeLessThan(settled);
  expect(settled).toBeGreaterThan(850);
});

test("about timeline carousel advances", async ({ page }) => {
  await page.goto("/about");
  const track = page.locator("[data-carousel-track]");
  const expected = await track.evaluate((element) => element.scrollWidth - element.clientWidth);
  await page.getByRole("button", { name: "Next timeline item" }).click();
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeCloseTo(expected, 0);
});

test("contact form validates and reaches its native demo completion state", async ({ page }) => {
  await page.goto("/contact");
  await page.locator("input[name='name']").fill("Artho QA");
  await page.locator("input[name='email']").fill("qa@example.com");
  await page.locator("input[name='subject']").fill("Native port verification");
  await page.locator("textarea[name='message']").fill("Testing the complete contact flow.");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.locator(".form-status")).toHaveText("Demo form only — no message was sent.");
});

test("article pages preserve source-specific related stories", async ({ page }) => {
  await page.goto("/blog/digital-transformation-navigating-the-new-normal");
  const related = page.locator(".related-grid .blog-card h2");
  await expect(related).toHaveCount(2);
  await expect(related.nth(0)).toHaveText("Mastering Time Management: Tips for Busy Professionals");
  await expect(related.nth(1)).toHaveText("The Art of Effective Communication in the Workplace");
});
