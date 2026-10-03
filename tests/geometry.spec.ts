import { expect, test } from '@playwright/test';

for (const { name, width, height } of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 810, height: 1080 },
  { name: 'phone', width: 390, height: 844 },
]) {
  test(`${name} keeps the product scenes and story structure intact`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    await expect(page.locator('.why-card')).toHaveCount(3);
    await expect(page.locator('.feature-card')).toHaveCount(5);
    await expect(page.locator('.workflow-list [role="tab"]')).toHaveCount(4);
    await expect(page.locator('.workflow-mobile-step')).toHaveCount(4);
    await expect(page.locator('.motion-scene[data-motion-name]')).toHaveCount(10);

    const hero = page.locator('.browser-window > img');
    await hero.scrollIntoViewIfNeeded();
    await expect.poll(() => hero.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(1000);

    for (const scene of await page.locator('.why-card .motion-scene, .feature-card .motion-scene').all()) {
      await scene.scrollIntoViewIfNeeded();
      const box = await scene.boundingBox();
      expect(box?.width).toBeGreaterThan(100);
      expect(box?.height).toBeGreaterThan(100);
      const images = scene.locator('img');
      for (const image of await images.all()) {
        await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
      }
    }

    const measures = await page.evaluate(() => {
      const header = document.querySelector('.site-header')?.getBoundingClientRect();
      const footer = document.querySelector('.site-footer')?.getBoundingClientRect();
      const main = document.querySelector('main')?.getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth - innerWidth, headerTop: header?.top, footerTop: footer?.top, mainBottom: main?.bottom };
    });
    expect(measures.overflow).toBeLessThanOrEqual(0);
    expect(measures.headerTop).toBe(0);
    expect(measures.footerTop).toBeGreaterThanOrEqual((measures.mainBottom ?? 0) - 1);
  });
}
