import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const articles = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../src/data/articles.json'), 'utf8')) as Array<{ slug: string }>;

const routes = ['/', '/about', '/features', '/pricing', '/contact', '/faq', '/blog',
  '/legal/privacy-policy', '/legal/terms-of-service', ...articles.map((article) => `/blog/${article.slug}`)];

test('Malvavisco pages link only to reachable local routes and approved external schemes', async ({ page, request }) => {
  test.setTimeout(90_000);
  const base = new URL('http://127.0.0.1:4393');
  const targets = new Map<string, string[]>();
  const failures: string[] = [];

  for (const route of routes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const hrefs = await page.locator('a[href]').evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href') ?? ''));
    for (const href of hrefs) {
      if (!href) continue;
      if (/artho|framer\.website|framerusercontent\.com/i.test(href)) failures.push(`${route}: old template link ${href}`);
      if (/^(mailto:|tel:|https?:\/\/)/i.test(href)) continue;
      const url = new URL(href, new URL(route, base));
      if (url.origin !== base.origin) continue;
      const destination = `${url.pathname}${url.search}`;
      const sources = targets.get(destination) ?? [];
      sources.push(route);
      targets.set(destination, sources);
      if (url.hash && url.pathname === route) {
        const id = decodeURIComponent(url.hash.slice(1));
        const exists = await page.evaluate((anchorId) => !!document.getElementById(anchorId), id);
        if (!exists) failures.push(`${route}: missing #${id}`);
      }
    }
  }

  for (const [destination, sources] of targets) {
    const response = await request.get(destination);
    if (!response.ok()) failures.push(`${sources[0]} -> ${destination}: HTTP ${response.status()}`);
  }
  expect(failures).toEqual([]);
});
