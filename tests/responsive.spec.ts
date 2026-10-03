import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';

test('Malvavisco stays readable across the 24 captured viewport widths', async ({ page }) => {
  test.setTimeout(90_000);
  const fixture = JSON.parse(await fs.readFile('tests/fixtures/home-headings.json', 'utf8')) as {
    captures: Array<{ viewport: { name: string; width: number; height: number } }>;
  };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  for (const { viewport } of fixture.captures) {
    await test.step(`${viewport.name}: ${viewport.width}px`, async () => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const layout = await page.evaluate(() => {
        const sections = ['.home-hero', '.why-section', '.feature-grid-section', '.control-section', '.workflow-section', '.testimonials-section', '.main-cta'];
        return {
          scrollWidth: document.documentElement.scrollWidth,
          viewport: innerWidth,
          title: document.querySelector('main h1')?.textContent?.trim(),
          headings: [...document.querySelectorAll('main h1, main h2')].map((heading) => heading.textContent?.trim()).filter(Boolean),
          sections: sections.map((selector) => {
            const rect = document.querySelector(selector)?.getBoundingClientRect();
            return { selector, top: rect?.top ?? -1, bottom: rect?.bottom ?? -1, height: rect?.height ?? -1 };
          }),
        };
      });
      expect(layout.scrollWidth, `horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(layout.viewport);
      expect(layout.title).toBe('The whole lodge, one clear view.');
      expect(layout.headings.length).toBeGreaterThanOrEqual(7);
      for (const section of layout.sections) expect(section.height, `${section.selector} collapsed at ${viewport.width}px`).toBeGreaterThan(200);
      for (let index = 1; index < layout.sections.length; index++) {
        expect(layout.sections[index].top, `${layout.sections[index].selector} overlaps previous section at ${viewport.width}px`)
          .toBeGreaterThanOrEqual(layout.sections[index - 1].bottom - 2);
      }
    });
  }
});

test('phone and tablet keep workflow content and calls to action within their sections', async ({ page }) => {
  for (const width of [390, 810]) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const bounds = await page.evaluate(() => {
      const containment = (parentSelector: string, childSelector: string) => {
        const parent = document.querySelector(parentSelector)?.getBoundingClientRect();
        const child = document.querySelector(childSelector)?.getBoundingClientRect();
        return parent && child ? { parentBottom: parent.bottom, childBottom: child.bottom, parentLeft: parent.left, parentRight: parent.right, childLeft: child.left, childRight: child.right } : null;
      };
      return {
        hero: containment('.home-hero-panel', '.hero-copy'),
        control: containment('.control-panel', '.control-visual'),
        workflow: containment('.workflow-section', '.workflow-mobile-step:last-child'),
      };
    });
    expect(bounds.hero).not.toBeNull();
    expect(bounds.control).not.toBeNull();
    for (const part of [bounds.hero, bounds.control, width < 810 ? bounds.workflow : null]) {
      if (!part) continue;
      expect(part.childBottom).toBeLessThanOrEqual(part.parentBottom + 2);
      expect(part.childLeft).toBeGreaterThanOrEqual(part.parentLeft - 2);
      expect(part.childRight).toBeLessThanOrEqual(part.parentRight + 2);
    }
  }
});
