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

test("mobile workflow keeps all four LodgeOps steps and panels", async ({ page }) => {
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
  await page.getByRole("tab", { name: /Build the stay/ }).click();
  await expect(page.locator("[data-panel='card']")).toBeVisible();
  await page.getByRole("tab", { name: /Build the stay/ }).press("ArrowRight");
  await expect(page.locator("[data-panel='dashboard']")).toBeVisible();
});

test("for-lodges page explains the demo path without invented subscription prices", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "See How LodgeOps Fits Your Lodge" })).toBeVisible();
  await expect(page.locator(".pricing-card")).toHaveCount(3);
  await expect(page.locator(".pricing-card .price strong")).toHaveText(["01", "02", "03"]);
  await expect(page.locator("[data-billing-toggle]")).toHaveCount(0);
  await expect(page.locator(".pricing-card a[href='/contact']")).toHaveCount(3);
});

test("FAQ hash navigation smooth-scrolls through every LodgeOps section", async ({ page }) => {
  await page.goto("/faq");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[data-scroll-section]")).toHaveCount(5);
  for (const section of await page.locator("[data-scroll-section]").all()) {
    await expect(section).toBeVisible();
  }

  const secondLink = page.locator("[data-scroll-link]").nth(1);
  const scrollSamples = await page.evaluate(async () => {
    const link = document.querySelector<HTMLAnchorElement>("a[href='#bookings-calendar']");
    const section = document.querySelector<HTMLElement>("#bookings-calendar");
    if (!link || !section) throw new Error("Missing FAQ anchors");
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
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("#bookings-calendar");
  await expect(secondLink).toHaveAttribute("aria-current", "location");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  const questions = page.locator("#bookings-calendar details");
  await questions.nth(0).locator("summary").click();
  await questions.nth(1).locator("summary").click();
  await expect(questions.nth(0)).not.toHaveAttribute("open", "");
  await expect(questions.nth(1)).toHaveAttribute("open", "");
});

test("page wheel scrolling keeps the shared Lenis smoothing", async ({ page }) => {
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

test("about workflow carousel advances", async ({ page }) => {
  await page.goto("/about");
  const track = page.locator("[data-carousel-track]");
  const expected = await track.evaluate((element) => element.scrollWidth - element.clientWidth);
  await page.getByRole("button", { name: "Next workflow item" }).click();
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeCloseTo(expected, 0);
});

test("unconfigured demo form fails closed, then a configured endpoint receives a valid request", async ({ page }) => {
  await page.goto("/contact");
  const button = page.getByRole("button", { name: "Request a Demo" }).last();
  await expect(button).toBeDisabled();
  await expect(page.getByRole("status")).toHaveText("Demo requests are not connected yet. Please check back soon.");

  let posted: Record<string, unknown> | undefined;
  await page.route("**/mock-lead", async (route) => {
    posted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  });
  await page.locator("[data-demo-form]").evaluate((form) => {
    (form as HTMLFormElement).dataset.endpoint = "/mock-lead";
    (form.querySelector('button[type="submit"]') as HTMLButtonElement).disabled = false;
  });
  await button.click();
  await expect(page.getByRole("status")).toHaveText("Please add your name, a valid email and your lodge’s name.");
  await page.locator("input[name='name']").fill("Demo Guest");
  await page.locator("input[name='email']").fill("qa@example.com");
  await page.locator("input[name='lodge']").fill("Sample Lodge");
  await page.locator("select[name='rooms']").selectOption("6–15");
  await page.locator("textarea[name='message']").fill("Show us kitchen and booking workflows.");
  await button.click();
  await expect(page.getByRole("status")).toHaveText("Request submitted. We’ll use the email you provided to arrange a walkthrough.");
  expect(posted).toMatchObject({ name: "Demo Guest", email: "qa@example.com", lodge: "Sample Lodge", rooms: "6–15", message: "Show us kitchen and booking workflows." });
});

test("guide pages link to distinct LodgeOps workflows", async ({ page }) => {
  await page.goto(`/blog/${articles[0].slug}`);
  const related = page.locator(".related-grid .blog-card h2");
  await expect(related).toHaveCount(2);
  const titles = await related.allTextContents();
  expect(new Set(titles).size).toBe(2);
  await expect(page.locator(".related-grid .blog-card a[href^='/blog/']").first()).not.toHaveAttribute("href", `/blog/${articles[0].slug}`);
});

test("unapproved website policy drafts are excluded from indexing", async ({ page }) => {
  for (const route of ["/legal/privacy-policy", "/legal/terms-of-service"]) {
    await page.goto(route);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
    await expect(page.getByText("Draft for review", { exact: false })).toBeVisible();
  }
});
