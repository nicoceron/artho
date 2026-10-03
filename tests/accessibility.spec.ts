import { expect, test } from "@playwright/test";

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

test("illustrated account and card forms are described without false keyboard controls", async ({ page }) => {
  await page.goto("/");
  const previews = page.locator(".workflow-tabs .workflow-preview-stage:has(.auth-card), .workflow-tabs .workflow-preview-stage:has(.connect-card)");
  await expect(previews).toHaveCount(2);
  await expect(previews.nth(0)).toHaveAttribute("role", "img");
  await expect(previews.nth(0)).toHaveAttribute("aria-label", "Illustration of an account sign-up form");
  await expect(previews.nth(1)).toHaveAttribute("aria-label", "Illustration of adding a payment card");
  await expect(previews.nth(0).locator(".auth-card")).toHaveAttribute("inert", "");
  await expect(previews.nth(1).locator(".connect-card")).toHaveAttribute("inert", "");
  await expect(page.getByRole("img", { name: "Illustration of an account sign-up form" })).toBeVisible();

  const firstTab = page.getByRole("tablist", { name: "Setup steps" }).getByRole("tab").first();
  await firstTab.focus();
  await firstTab.press("Tab");
  await expect(page.locator("[data-panel='signup']")).toBeFocused();
});

test("pricing and contact controls expose their group and status semantics", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("group", { name: "Billing period" })).toBeVisible();
  await expect(page.locator(".desktop-nav a[href='/pricing']")).toHaveAttribute("aria-current", "page");

  await page.goto("/contact");
  const status = page.getByRole("status");
  await expect(status).toHaveCSS("display", "block");
  await page.locator("input[name='name']").fill("Artho QA");
  await page.locator("input[name='email']").fill("qa@example.com");
  await page.locator("input[name='subject']").fill("Accessibility check");
  await page.locator("textarea[name='message']").fill("Testing the contact demo status.");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(status).toHaveText("Demo form only — no message was sent.");
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
  await expect(cards).toHaveCount(9);
  for (const card of await cards.all()) {
    const title = await card.locator("h2").innerText();
    await expect(card.locator(".blog-card-image")).toHaveAttribute("aria-label", `Read ${title}`);
  }
});
