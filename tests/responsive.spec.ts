import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';

test('all 24 captured home widths keep source heading geometry and avoid page overflow', async ({ page }) => {
  test.setTimeout(90_000);
  const fixture = JSON.parse(await fs.readFile('tests/fixtures/home-headings.json', 'utf8'));
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.goto('/');
  for (const capture of fixture.captures) {
    await test.step(`${capture.viewport.name}: ${capture.viewport.width}px`, async () => {
      await page.setViewportSize({ width:capture.viewport.width, height:capture.viewport.height });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const headings = await page.locator('main h1, main h2').evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return { tag:node.tagName.toLowerCase(), text:node.textContent?.trim().replace(/\s+/g, ' '), x:rect.x, y:rect.y + scrollY, width:rect.width, height:rect.height };
      }));
      expect(headings.length).toBe(capture.headings.length);
      for (const [index, heading] of headings.entries()) {
        const source = capture.headings[index];
        // The Framer source uses h4 for two section titles; native Astro gives
        // those titles a consistent h2 hierarchy while preserving their text.
        expect(heading.text).toBe(source.text);
        for (const dimension of ['x','y','width','height'] as const) {
          expect.soft(Math.abs(heading[dimension] - source.rect[dimension]), `${capture.viewport.name} ${heading.text}: ${dimension}`).toBeLessThanOrEqual(fixture.geometryToleranceCssPixels);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(capture.viewport.width);
    });
  }
});

test('tablet footer, team cards, and sticky FAQ retain their source details', async ({ page }) => {
  await page.setViewportSize({ width:810, height:1080 });
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.goto('/about');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.footer-watermark')).toHaveCSS('opacity', '0.1');
  await expect(page.locator('.socials')).toHaveCSS('margin-top', '40px');
  await expect(page.locator('.team-card .linkedin-badge').first()).toHaveCSS('opacity', '1');
  expect((await page.locator('.join-card .button').boundingBox())?.width).toBeCloseTo(159.23, 0);
  await page.locator('.story-stats').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-count-value="1200"]')).toHaveText('1200+');
  await page.goto('/faq');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 900));
  await expect.poll(async () => (await page.locator('.knowledge-nav').boundingBox())?.y).toBe(105);
  const category = page.locator('.knowledge-nav a').filter({ hasText:'Billing & Subscriptions' });
  expect((await category.boundingBox())?.height).toBeCloseTo(22.4, 0);
  await page.goto('/features');
  await expect(page.locator('.connect-card button').first()).toHaveCSS('font-size', '12px');
});
