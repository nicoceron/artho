import { expect, test } from "@playwright/test";

const cases = [
  {
    name: "desktop",
    width: 1440,
    height: 900,
    target: { hero: 1141.41, logos: 245.2, why: 1428.22, why1: 430, why2: 485.81, why3: 485.81, features: 1988.88, workflow: 982.41, testimonials: 986.34, cta: 840, footer: 632.16 },
    testimonialCards: {
      grid: { width: 1200, height: 568.75 },
      quoteOne: { width: 590, height: 182.41 },
      quoteTwo: { width: 285, height: 366.34 },
      metricSeventy: { width: 285, height: 366.34 },
      quoteThree: { width: 285, height: 366.34 },
      metricSatisfaction: { width: 285, height: 366.34 },
      quoteFour: { width: 590, height: 182.41 },
    },
  },
  {
    name: "tablet",
    width: 810,
    height: 1080,
    target: { hero: 1002.19, logos: 205.2, why: 1315.83, why1: 340, why2: 543.02, why3: 543.02, features: 2437.53, workflow: 922.88, testimonials: 1640.95, cta: 848.56, footer: 704.55 },
    testimonialCards: {
      grid: { width: 750, height: 1175.34 },
      quoteOne: { width: 750, height: 182.41 },
      quoteTwo: { width: 365, height: 350 },
      metricSeventy: { width: 365, height: 350 },
      quoteThree: { width: 365, height: 400.53 },
      metricSatisfaction: { width: 365, height: 400.53 },
      quoteFour: { width: 750, height: 182.41 },
    },
  },
  {
    name: "mobile",
    width: 390,
    height: 844,
    target: { hero: 928.27, logos: 165.2, why: 2108.86, why1: 589.61, why2: 541.81, why3: 541.81, features: 3868.16, workflow: 2420.88, testimonials: 2200.36, cta: 1115.2, footer: 716.8 },
    testimonialCards: {
      grid: { width: 350, height: 1724.73 },
      quoteOne: { width: 350, height: 232.81 },
      quoteTwo: { width: 350, height: 232.81 },
      metricSeventy: { width: 350, height: 319.39 },
      quoteThree: { width: 350, height: 232.81 },
      metricSatisfaction: { width: 350, height: 374.09 },
      quoteFour: { width: 350, height: 232.81 },
    },
  },
] as const;

for (const viewport of cases) {
  test(`home section geometry matches the ${viewport.name} source capture`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    const actual = await page.evaluate(() => {
      const height = (selector: string) => document.querySelector(selector)?.getBoundingClientRect().height ?? -1;
      const combinedHeight = (startSelector: string, endSelector: string) => {
        const start = document.querySelector(startSelector)?.getBoundingClientRect();
        const end = document.querySelector(endSelector)?.getBoundingClientRect();
        return start && end ? end.bottom - start.top : -1;
      };
      return {
        hero: height(".home-hero"),
        logos: height(".logo-rail"),
        why: height(".why-section"),
        why1: height(".why-card:nth-child(1)"),
        why2: height(".why-card:nth-child(2)"),
        why3: height(".why-card:nth-child(3)"),
        features: combinedHeight(".feature-grid-section", ".control-section"),
        workflow: height(".workflow-section"),
        testimonials: height(".testimonials-section"),
        cta: height(".main-cta"),
        footer: height(".site-footer"),
      };
    });

    for (const [section, target] of Object.entries(viewport.target)) {
      expect.soft(actual[section as keyof typeof actual], `${viewport.name} ${section}`).toBeCloseTo(target, 0);
    }

    const testimonialCards = await page.evaluate(() => {
      const dimensions = (selector: string) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        return rect ? { width: rect.width, height: rect.height } : { width: -1, height: -1 };
      };
      return {
        grid: dimensions(".testimonial-grid"),
        quoteOne: dimensions(".quote-one"),
        quoteTwo: dimensions(".quote-two"),
        metricSeventy: dimensions(".metric-seventy"),
        quoteThree: dimensions(".quote-three"),
        metricSatisfaction: dimensions(".metric-satisfaction"),
        quoteFour: dimensions(".quote-four"),
      };
    });

    for (const [card, target] of Object.entries(viewport.testimonialCards)) {
      expect.soft(testimonialCards[card as keyof typeof testimonialCards].width, `${viewport.name} ${card} width`).toBeCloseTo(target.width, 0);
      expect.soft(testimonialCards[card as keyof typeof testimonialCards].height, `${viewport.name} ${card} height`).toBeCloseTo(target.height, 0);
    }

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
    await expect(page.locator(".site-header")).toHaveCSS("position", "fixed");
    expect((await page.locator(".site-header").boundingBox())?.y).toBeCloseTo(0, 0);
  });
}
