import { expect, test } from "@playwright/test";

test("balance starts at the source pre-view value and resolves when visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const balance = page.locator(".balance-details [data-count-value]");
  await expect(balance).toHaveText("$0");
  await balance.scrollIntoViewIfNeeded();
  await expect(balance).toHaveText("$16,058.94");
});

test("rapid workflow reversals keep the selected card visible without shifting the page", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const root = page.locator("[data-tabs]");
  await root.scrollIntoViewIfNeeded();
  const before = await root.boundingBox();
  await root.evaluate(async (root) => {
    const tabs = [...root.querySelectorAll<HTMLButtonElement>("[role='tab']")];
    for (const index of [1, 0, 3, 2, 1, 0]) {
      tabs[index].click();
      await new Promise((resolve) => setTimeout(resolve, 45));
    }
  });
  await expect(root.locator("[data-panel='signup']")).toBeVisible();
  await expect.poll(() => root.locator("[role='tabpanel']:not([hidden])").count()).toBe(1);
  await expect(root.locator("[data-tab='signup']")).toHaveAttribute("aria-selected", "true");
  const after = await root.boundingBox();
  expect(after?.height).toBeCloseTo(before!.height, 0);
});

test("hero preserves the source entrance delays and downward-scroll variants", async ({ page }) => {
  await page.goto("/");
  const timings = await page.locator("[data-hero]").evaluate((hero) =>
    hero.getAnimations({ subtree: true }).map((animation) => {
      const timing = animation.effect?.getTiming();
      return { name: (animation as CSSAnimation).animationName, delay: timing?.delay, duration: timing?.duration };
    }),
  );
  expect(timings).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: "heroDashboardIn", delay: 650 }),
    expect.objectContaining({ name: "heroSideIn", delay: 750 }),
  ]));

  const thresholdY = await page.locator("[data-hero-dashboard]").evaluate((dashboard) => {
    const rect = dashboard.getBoundingClientRect();
    return Math.max(1, Math.ceil(rect.top + rect.height * .5 - window.innerHeight));
  });
  await page.evaluate((y) => window.scrollTo(0, Math.max(1, y - 40)), thresholdY);
  await expect(page.locator("[data-hero]")).toHaveAttribute("data-motion-variant", "Desktop");

  await page.evaluate((y) => window.scrollTo(0, y + 40), thresholdY);
  await expect(page.locator("[data-hero]")).toHaveAttribute("data-motion-variant", "Desktop/On Scroll");
  await expect(page.locator(".hero-floating-balance")).toHaveCSS("bottom", "62px");

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator("[data-hero]")).toHaveAttribute("data-motion-variant", "Desktop");
});

test('workflow analytics plays its six source appear states and stops when hidden', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name:/Get Smart Financial Insights/ }).click();
  const scene = page.locator('.workflow-tabs [data-workflow-analytics]');
  await expect(scene).toHaveAttribute('data-motion-delays', '1000,1000,1000,1000,1000,1000');
  await expect(scene).toHaveAttribute('data-workflow-step', '1', { timeout:2000 });
  await expect(scene).toHaveAttribute('data-workflow-step', '6', { timeout:6500 });
  await expect(scene.locator('.analytics-bars')).toHaveCSS('opacity', '1');
  await page.getByRole('tab', { name:/Create Your Account/ }).click();
  await expect(scene).toHaveAttribute('data-workflow-step', '0');
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.getByRole('tab', { name:/Get Smart Financial Insights/ }).click();
  await page.waitForTimeout(1200);
  await expect(scene).toHaveAttribute('data-workflow-step', '0');
});

test('signup preview reveals its lower form, resets on tab changes, and honors reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/');
  const panel = page.locator('.workflow-tabs .signup-panel');
  await expect(panel).toHaveAttribute('data-signup-stage', 'top');
  expect((await panel.boundingBox())!.y).toBeGreaterThan(900);

  const bottomGap = () => panel.evaluate((element) => {
    const stage = element.querySelector<HTMLElement>('.workflow-preview-stage')!.getBoundingClientRect();
    const card = element.querySelector<HTMLElement>('.auth-card')!.getBoundingClientRect();
    return card.bottom - stage.bottom;
  });
  expect(await bottomGap()).toBeGreaterThan(100);
  await expect(panel).toHaveAttribute('data-signup-stage', 'bottom', { timeout: 4500 });
  await expect.poll(bottomGap).toBeCloseTo(0, 0);

  await panel.scrollIntoViewIfNeeded();
  await expect(panel).toHaveAttribute('data-signup-stage', 'bottom');

  await page.getByRole('tab', { name: /Connect Your Financial Tools/ }).click();
  await expect(panel).toHaveAttribute('data-signup-stage', 'top');
  await page.getByRole('tab', { name: /Create Your Account/ }).click();
  await expect(panel).toHaveAttribute('data-signup-stage', 'top');
  await expect(panel).toHaveAttribute('data-signup-stage', 'bottom', { timeout: 4500 });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(panel).toHaveAttribute('data-signup-stage', 'top');
  await page.waitForTimeout(3200);
  await expect(panel).toHaveAttribute('data-signup-stage', 'top');
});

test("hero dashboard uses the exact source panels and breakpoint geometry", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  const geometry = () => page.locator("[data-hero-dashboard]").evaluate((root) => {
    const rootRect = root.getBoundingClientRect();
    const relative = (selector: string) => {
      const rect = root.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
      return {
        x: rect.x - rootRect.x,
        y: rect.y - rootRect.y,
        width: rect.width,
        height: rect.height,
      };
    };
    return {
      root: { width: rootRect.width, height: rootRect.height },
      expense: relative(".hero-floating-expense"),
      balance: relative(".hero-floating-balance"),
    };
  });

  await page.setViewportSize({ width: 1306, height: 950 });
  await page.goto("/");
  await expect(page.locator(".hero-floating-expense")).toHaveAttribute("src", /Wa0iJs5NoZkKXbnov7KxFUi2Tc\.svg$/);
  await expect(page.locator(".hero-floating-balance")).toHaveAttribute("src", /xBxllK2qhbBQQc56D90nWUyWA\.svg$/);
  let desktop = await geometry();
  expect(desktop.root).toEqual({ width: 1100, height: 600 });
  expect(desktop.expense.x).toBeCloseTo(715, 0);
  expect(desktop.expense.y).toBeCloseTo(60, 0);
  expect(desktop.expense.width).toBeCloseTo(385, 0);
  expect(desktop.balance.x).toBeCloseTo(0, 0);
  expect(desktop.balance.y + desktop.balance.height).toBeCloseTo(600, 0);
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect(page.locator('[data-hero]')).toHaveAttribute('data-motion-variant', 'Desktop/On Scroll');
  await expect.poll(async () => (await geometry()).expense.y).toBeCloseTo(120, 0);

  await page.setViewportSize({ width: 810, height: 1080 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  let tablet = await geometry();
  expect(tablet.root).toEqual({ width: 690, height: 500 });
  expect(tablet.expense.x).toBeCloseTo(448.5, 0);
  expect(tablet.expense.y).toBeCloseTo(55, 0);
  expect(tablet.expense.width).toBeCloseTo(241.5, 0);
  expect(tablet.balance.y + tablet.balance.height).toBeCloseTo(500, 0);

  await page.evaluate(() => window.scrollTo(0, 500));
  await expect(page.locator("[data-hero]")).toHaveAttribute("data-motion-variant", "Tablet/On Scroll");
  tablet = await geometry();
  expect(tablet.expense.y).toBeCloseTo(110, 0);
  expect(tablet.balance.y + tablet.balance.height).toBeCloseTo(467, 0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  const phone = await geometry();
  expect(phone.root.width).toBeCloseTo(330, 0);
  expect(phone.root.height).toBeCloseTo(272.47, 1);
  expect(phone.expense.x).toBeCloseTo(198, 0);
  expect(phone.expense.y).toBeCloseTo(40, 0);
  expect(phone.expense.width).toBeCloseTo(132, 0);
  expect(phone.balance.y + phone.balance.height).toBeCloseTo(272.47, 1);
});

test("trusted logos and integration orbit keep their source-derived long tracks", async ({ page }) => {
  await page.goto("/");
  const logoAnimation = page.locator(".logo-track");
  await expect.poll(() => logoAnimation.evaluate((element) => element.getAnimations()[0]?.effect?.getTiming().duration)).toBe(86_666);
  await expect.poll(() => logoAnimation.evaluate((element) => {
    const effect = element.getAnimations()[0]?.effect;
    return effect instanceof KeyframeEffect ? effect.getKeyframes().at(-1)?.transform : undefined;
  })).toBe("translateX(-1300px)");
  await page.locator(".logo-marquee").hover();
  await expect.poll(() => logoAnimation.evaluate((element) => element.getAnimations()[0]?.effect?.getTiming().duration)).toBe(86_666);

  const logoGeometry = () => page.locator(".logo-rail").evaluate((rail) => {
    const inner = rail.querySelector<HTMLElement>(".logo-rail-inner")!;
    const marquee = rail.querySelector<HTMLElement>(".logo-marquee")!;
    const track = rail.querySelector<HTMLElement>(".logo-track")!;
    const logos = [...track.querySelectorAll<HTMLElement>("img")];
    const visibleLogos = logos.filter((logo) => getComputedStyle(logo).display !== "none");
    const rect = (element: HTMLElement) => {
      const bounds = element.getBoundingClientRect();
      return { width: bounds.width, height: bounds.height };
    };
    return {
      rail: rect(rail as HTMLElement),
      inner: rect(inner),
      marquee: rect(marquee),
      logo: rect(visibleLogos[0]),
      visibleLogos: visibleLogos.length,
      gap: getComputedStyle(track).gap,
      mask: getComputedStyle(marquee).maskImage,
    };
  });

  let logos = await logoGeometry();
  expect(logos.rail.height).toBeCloseTo(245.2, 1);
  expect(logos.inner.width).toBe(700);
  expect(logos.inner.height).toBeCloseTo(85.2, 1);
  expect(logos.marquee).toEqual({ width: 700, height: 40 });
  expect(logos.logo.width).toBeCloseTo(120, 2);
  expect(logos.logo.height).toBeCloseTo(40, 2);
  expect(logos.visibleLogos).toBe(20);
  expect(logos.gap).toBe("10px");
  expect(logos.mask).toContain("12.5%");

  await page.setViewportSize({ width: 810, height: 1080 });
  logos = await logoGeometry();
  expect(logos.rail.height).toBeCloseTo(205.2, 1);
  expect(logos.inner.width).toBe(700);

  await page.setViewportSize({ width: 390, height: 844 });
  logos = await logoGeometry();
  expect(logos.rail.height).toBeCloseTo(165.2, 1);
  expect(logos.inner.width).toBe(350);
  expect(logos.marquee.width).toBe(350);
  expect(logos.visibleLogos).toBe(15);

  const integration = page.locator(".motion-scene-integrations");
  await integration.scrollIntoViewIfNeeded();
  await integration.evaluate((element) => element.setAttribute("data-motion-step", "3"));
  const orbitDurations = await integration.locator(".integration-orbit").evaluate((element) =>
    element.getAnimations().map((animation) => animation.effect?.getTiming().duration),
  );
  expect(orbitDurations).toContain(60_000);
});

test("feature bundles advance their exact hover state machines and reset", async ({ page }) => {
  await page.goto("/");
  const overview = page.locator(".motion-scene-overview");
  await overview.scrollIntoViewIfNeeded();
  await overview.hover();
  await expect(overview).toHaveAttribute("data-motion-running", "true");
  await expect(overview).toHaveAttribute("data-motion-step", "1");
  await expect(overview).toHaveAttribute("data-motion-step", "2", { timeout: 900 });
  await expect(overview).toHaveAttribute("data-motion-step", "3", { timeout: 900 });
  await page.mouse.move(1, 1);
  await expect(overview).toHaveAttribute("data-motion-step", "0");

  const budget = page.locator(".motion-scene-budget");
  await expect(budget).toHaveAttribute("data-motion-delays", "500,500,1000,500,500,500");
  await expect(page.locator(".motion-scene-simple")).toHaveAttribute("data-motion-delays", "500,500");
  await expect(page.locator(".motion-scene-accuracy")).toHaveAttribute("data-motion-delays", "500,500,500");
  await expect(page.locator(".motion-scene-security")).toHaveAttribute("data-motion-delays", "500,500,500,500,800,800,500,500");
  await expect(page.locator(".motion-scene-billing")).toHaveAttribute("data-motion-delays", "500,500,500,500,500");
  await expect(page.locator(".feature-grid .motion-scene-analytics")).toHaveAttribute("data-motion-delays", "800,800,500");
  await expect(page.locator(".motion-scene-integrations")).toHaveAttribute("data-motion-delays", "500,500");

  const simple = page.locator(".motion-scene-simple");
  await expect(simple.locator(".scene-float, .scene-cursor")).toHaveCount(0);
  await simple.scrollIntoViewIfNeeded();
  await simple.hover();
  await expect(simple).toHaveAttribute("data-motion-step", "2", { timeout: 900 });
  await expect(simple.locator(".scene-dashboard")).toHaveCSS("object-fit", "cover");
  await page.mouse.move(1, 1);
  await expect(simple).toHaveAttribute("data-motion-step", "0");
});

test("card state machines are keyboard-operable", async ({ page }) => {
  await page.goto("/");
  const security = page.locator(".motion-scene-security");
  await security.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(security).toHaveAttribute("data-motion-step", "0");
  await security.focus();
  await expect(security).toHaveAttribute("data-motion-running", "true");
  await expect.poll(async () => Number(await security.getAttribute("data-motion-step"))).toBeGreaterThan(0);
  await page.keyboard.press("Tab");
  await expect(security).toHaveAttribute("data-motion-step", "0");
});

test("responsive cards preserve the source static tablet and phone variants", async ({ page }) => {
  await page.setViewportSize({ width: 810, height: 1080 });
  await page.goto("/");

  const simpleTablet = page.locator(".motion-scene-simple");
  await simpleTablet.scrollIntoViewIfNeeded();
  await simpleTablet.hover();
  await page.waitForTimeout(1100);
  await expect(simpleTablet).toHaveAttribute("data-motion-step", "0");
  await expect(page.locator(".motion-scene-billing .billing-list")).toBeHidden();
  await expect(page.locator(".motion-scene-billing .billing-my-cards")).toBeVisible();
  await expect(page.locator(".feature-grid .motion-scene-analytics .analytics-score-card")).toBeVisible();
  await expect(page.locator(".feature-grid .motion-scene-analytics .analytics-expense-card")).toBeVisible();
  await expect(page.locator(".feature-grid .motion-scene-analytics .analytics-balance-card")).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(450);
  await expect(page.locator(".feature-grid .motion-scene-analytics .analytics-score-card")).toBeVisible();
  await expect(page.locator(".feature-grid .motion-scene-analytics .analytics-expense-card")).toBeHidden();
  const simplePhone = await page.locator(".motion-scene-simple .scene-dashboard").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const parent = element.parentElement!.getBoundingClientRect();
    return { x: rect.x - parent.x, y: rect.y - parent.y, width: rect.width };
  });
  expect(simplePhone.x).toBeCloseTo(10, 0);
  expect(simplePhone.y).toBeCloseTo(10, 0);
  expect(simplePhone.width).toBeCloseTo(290, 0);
  await expect(page.locator(".motion-scene-accuracy .accuracy-stage")).toHaveCSS("top", "0px");
  await expect(page.locator(".motion-scene-security .security-stage")).toHaveCSS("top", "0px");
});

test("secure card preserves the source login narrative states", async ({ page }) => {
  await page.goto("/");
  const security = page.locator(".motion-scene-security");
  await security.scrollIntoViewIfNeeded();

  await security.evaluate((element) => { element.setAttribute("data-motion-step", "4"); });
  await page.waitForTimeout(450);
  await expect(security.locator(".security-email")).toHaveCSS("background-color", "rgb(229, 238, 255)");
  await expect(security.locator(".security-email em")).toHaveCSS("opacity", "1");

  await security.evaluate((element) => { element.setAttribute("data-motion-step", "7"); });
  await page.waitForTimeout(450);
  await expect(security.locator(".security-action i")).toHaveCSS("background-color", "rgb(51, 92, 255)");

  await security.evaluate((element) => { element.setAttribute("data-motion-step", "8"); });
  await page.waitForTimeout(450);
  await expect(security.locator(".security-submit")).toHaveCSS("width", "250px");
  await expect(security.locator(".security-submit")).toHaveCSS("height", "35px");

  await security.evaluate((element) => { element.setAttribute("data-motion-step", "9"); });
  await page.waitForTimeout(450);
  await expect(security.locator(".security-person")).toHaveCSS("width", "105px");
  await expect(security.locator(".security-person")).toHaveCSS("height", "105px");
  await expect(security.locator(".security-login")).toHaveCSS("opacity", "0");
});

test("workflow tabs run the source 400ms panel transition", async ({ page }) => {
  await page.goto("/");
  const second = page.getByRole("tab", { name: /Connect Your Financial Tools/ });
  await second.scrollIntoViewIfNeeded();
  // Read the created animation in the same browser task; round trips can
  // otherwise miss a correctly completed 400ms animation on a busy machine.
  const duration = await second.evaluate((element) => {
    if (element instanceof HTMLElement) element.click();
    return document.querySelector("[data-panel='card']")?.getAnimations()[0]?.effect?.getTiming().duration;
  });
  const panel = page.locator("[data-panel='card']");
  await expect(panel).toBeVisible();
  expect(duration).toBe(400);
  await expect(panel).not.toHaveAttribute("data-motion-state", "entering", { timeout: 900 });
});

test("quick transfer card preserves the source continuous contact rail", async ({ page }) => {
  await page.goto("/");
  const control = page.locator("[data-control-scene]");
  await control.scrollIntoViewIfNeeded();
  const track = control.locator(".transfer-track");
  await expect(track.locator("li")).toHaveCount(12);
  await expect(track.locator("li").nth(0)).toContainText("Natalia");
  await expect(track.locator("li").nth(1)).toContainText("James");
  await expect(track.locator("li").nth(2)).toContainText("Laura");
  await expect(track.locator("li").nth(3)).toContainText("Wei");
  await expect(control.locator(".quick-transfer button")).toHaveCount(0);
  const timing = await track.evaluate((element) => element.getAnimations()[0]?.effect?.getTiming());
  expect(timing?.duration).toBe(83_000);
  expect(timing?.iterations).toBe(Infinity);
});

test("control card preserves its 50-percent reveal and notification variant", async ({ page }) => {
  await page.goto("/");
  const control = page.locator("[data-control-visual]");
  await control.scrollIntoViewIfNeeded();
  await expect(control).toHaveAttribute("data-control-visible", "true");

  const toggle = page.locator("[data-control-notification-toggle]");
  await expect(toggle).toBeEnabled();
  await expect(toggle).toHaveAccessibleName("Open notifications");
  await toggle.hover();
  await expect.poll(() => toggle.evaluate((element) => getComputedStyle(element).transform)).not.toBe("none");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const panel = page.locator("[data-control-notifications]");
  await expect(panel).toHaveAttribute("aria-hidden", "false");
  await expect(panel).toContainText("Wei Chen joined to Final Presentation");
  await expect(panel).toContainText("Sophia Williams invites you arthitecture.design file with you");
  await toggle.click();
  await expect(panel).toHaveAttribute("aria-hidden", "true");
});

test("timeline uses the source page step for buttons and keyboard", async ({ page }) => {
  await page.goto("/about");
  const track = page.locator("[data-carousel-track]");
  await track.scrollIntoViewIfNeeded();
  await track.focus();
  const expected = await track.evaluate((element) => element.scrollWidth - element.clientWidth);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeCloseTo(expected, 0);
  await expect(track.locator("[data-carousel-item][aria-hidden='false']")).not.toHaveCount(0);
});

test("team cards expose the source hover transform and biography", async ({ page }) => {
  await page.goto("/about");
  const team = page.locator(".team-card").first();
  await team.hover();
  await expect.poll(() => team.locator(":scope > img").evaluate((element) => getComputedStyle(element).transform)).toContain("matrix(1.1");
  await expect(team.locator(".team-detail")).toHaveCSS("opacity", "1");
  await expect(team.locator(".linkedin-badge")).toHaveCSS("opacity", "1");
});

test("route cards that are static in the source remain static on hover", async ({ page }) => {
  await page.goto("/features");
  const feature = page.locator(".feature-detail").first();
  await expect(feature.locator(".feature-detail-media > img")).toHaveCount(1);
  await expect(feature.locator(".motion-scene")).toHaveCount(0);
  const featureBefore = await feature.evaluate((element) => getComputedStyle(element).transform);
  await feature.hover();
  await page.waitForTimeout(550);
  await expect.poll(() => feature.evaluate((element) => getComputedStyle(element).transform)).toBe(featureBefore);

  await page.goto("/blog");
  const blogCard = page.locator(".blog-card").first();
  const blogImage = blogCard.locator(".blog-card-image img");
  const blogBefore = await blogImage.evaluate((element) => getComputedStyle(element).transform);
  await blogCard.hover();
  await page.waitForTimeout(550);
  await expect.poll(() => blogImage.evaluate((element) => getComputedStyle(element).transform)).toBe(blogBefore);

  await page.goto("/pricing");
  const pricingCard = page.locator(".pricing-card").first();
  const pricingBefore = await pricingCard.evaluate((element) => getComputedStyle(element).transform);
  await pricingCard.hover();
  await page.waitForTimeout(550);
  await expect.poll(() => pricingCard.evaluate((element) => getComputedStyle(element).transform)).toBe(pricingBefore);

  await page.goto("/contact");
  const contactMethod = page.locator(".contact-methods article").first();
  const contactBefore = await contactMethod.evaluate((element) => getComputedStyle(element).transform);
  await contactMethod.hover();
  await page.waitForTimeout(450);
  await expect.poll(() => contactMethod.evaluate((element) => getComputedStyle(element).transform)).toBe(contactBefore);
});

test("reduced motion freezes sequences and removes continuous tracks", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  const scene = page.locator(".motion-scene-overview");
  await scene.scrollIntoViewIfNeeded();
  await scene.hover();
  await expect(scene).toHaveAttribute("data-motion-step", "0");
  const integrationAnimations = await page.locator(".integration-orbit").evaluate((element) => element.getAnimations().length);
  expect(integrationAnimations).toBe(0);
  await expect(page.locator("[data-reveal]").first()).toHaveCSS("opacity", "1");
  await context.close();
});
