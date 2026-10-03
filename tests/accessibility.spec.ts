import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const articleCount = (JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "../src/data/articles.json"), "utf8")) as unknown[]).length;

test("mobile navigation keeps keyboard focus visible when it closes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const toggle = page.getByRole("button", { name: "Open navigation" });
  await toggle.click();
  const firstLink = page.locator("[data-mobile-menu] a").first();
  await firstLink.focus();
  await firstLink.press("Escape");
  await expect(page.locator("[data-mobile-menu]")).toBeHidden();
  await expect(toggle).toBeFocused();

  await toggle.click();
  const lastLink = page.locator("[data-mobile-menu] a").last();
  await lastLink.focus();
  await lastLink.press("Tab");
  await expect(page.locator("[data-mobile-menu]")).toBeHidden();
  await expect(page.locator("main :focus")).toHaveCount(1);

  await toggle.click();
  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(page.locator("[data-mobile-menu]")).toBeHidden();
  await expect(page.locator("body")).not.toHaveClass(/menu-open/);
});

test("workflow vertical tabs immediately remove outgoing content from keyboard navigation", async ({ page }) => {
  await page.goto("/");
  const tablist = page.getByRole("tablist", { name: "Setup steps" });
  await expect(tablist).toHaveAttribute("aria-orientation", "vertical");

  const firstTab = tablist.getByRole("tab").first();
  await firstTab.focus();
  await firstTab.press("ArrowDown");
  await expect(tablist.getByRole("tab").nth(1)).toBeFocused();
  await expect(tablist.getByRole("tab").nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("[data-panel='signup']")).toHaveAttribute("inert", "");
  await expect(page.locator("[data-panel='card']")).not.toHaveAttribute("inert", "");
});

test("illustrated lodge setup and booking previews are described without false keyboard controls", async ({ page }) => {
  await page.goto("/");
  const previews = page.locator(".workflow-tabs .workflow-preview-stage:has(.auth-card), .workflow-tabs .workflow-preview-stage:has(.connect-card)");
  await expect(previews).toHaveCount(2);
  await expect(previews.nth(0)).toHaveAttribute("role", "img");
  await expect(previews.nth(0)).toHaveAttribute("aria-label", "Illustration of lodge setup");
  await expect(previews.nth(1)).toHaveAttribute("aria-label", "Illustration of a lodge booking");
  await expect(previews.nth(0).locator(".auth-card")).toHaveAttribute("inert", "");
  await expect(previews.nth(1).locator(".connect-card")).toHaveAttribute("inert", "");
  await expect(page.getByRole("img", { name: "Illustration of lodge setup" })).toBeVisible();

  const firstTab = page.getByRole("tablist", { name: "Setup steps" }).getByRole("tab").first();
  await firstTab.focus();
  await firstTab.press("Tab");
  await expect(page.locator("[data-panel='signup']")).toBeFocused();
});

test("animated previews use product names and expose one description instead of hidden frames", async ({ page }) => {
  await page.goto("/");
  const labels = {
    simple: "Daily operations preview for a sample lodge",
    accuracy: "Guide and equipment scheduling preview for a sample lodge",
    security: "Staff roles and access preview for a sample lodge",
    overview: "Places, Crew and Assets calendar preview for a sample lodge",
    billing: "Booking, point of sale and kitchen preview for a sample lodge",
    analytics: "Arrivals and daily work preview for a sample lodge",
    budget: "Activity, guide and equipment planning preview for a sample lodge",
    integrations: "Connected booking, kitchen and reporting preview for a sample lodge",
  };

  for (const [sceneName, label] of Object.entries(labels)) {
    const scene = page.locator(`.motion-scene-${sceneName}`).first();
    await expect(scene).toHaveAttribute("role", "group");
    await expect(scene).toHaveAttribute("aria-label", label);
    await expect(scene.getByRole("img")).toHaveCount(0);
  }

  const calendar = page.getByRole("group", { name: labels.overview }).first();
  await calendar.focus();
  await expect(calendar).toBeFocused();
  await expect(calendar).toHaveAttribute("data-motion-running", "true");
});

test("for-lodges navigation and demo request status expose their semantics", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "See How LodgeOps Fits Your Lodge" })).toBeVisible();
  await expect(page.locator(".desktop-nav a[href='/pricing']")).toHaveAttribute("aria-current", "page");

  await page.goto("/contact");
  const status = page.getByRole("status");
  await expect(status).toHaveCSS("display", "block");
  await expect(status).toHaveAttribute("aria-live", "polite");
  await expect(status).toHaveText("Demo requests are not connected yet. Please check back soon.");
  const submit = page.getByRole("button", { name: "Request a Demo" }).last();
  await expect(submit).toBeDisabled();
  await page.locator("[data-demo-form]").evaluate((form) => {
    (form as HTMLFormElement).dataset.endpoint = "/mock-lead";
    (form.querySelector('button[type="submit"]') as HTMLButtonElement).disabled = false;
  });
  await submit.click();
  await expect(status).toHaveText("Please add your name, a valid email and your lodge’s name.");
  await expect(page.locator("input[name='name']")).toBeFocused();
  await expect(page.locator("input[name='name']")).toHaveAttribute("aria-invalid", "true");
});

test("FAQ accordion can reverse a keyboard close before its animation finishes", async ({ page }) => {
  await page.goto("/pricing");
  const first = page.locator(".faq-list details").first();
  const summary = first.locator("summary");
  await expect(first).toHaveAttribute("open", "");
  await summary.focus();
  await summary.press("Enter");
  await summary.press("Enter");
  await expect(first).toHaveAttribute("open", "");
  await page.waitForTimeout(450);
  await expect(first).toHaveAttribute("open", "");
});

test("blog card image links have accessible names", async ({ page }) => {
  await page.goto("/blog");
  const cards = page.locator(".blog-card");
  await expect(cards).toHaveCount(articleCount);
  for (const card of await cards.all()) {
    const title = await card.locator("h2").innerText();
    await expect(card.locator(".blog-card-image")).toHaveAttribute("aria-label", `Read ${title}`);
  }
});
