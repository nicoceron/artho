import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

type TrackerRow = { category: string; route: string; detail: string };
const tracker = parse(
  fs.readFileSync(path.resolve(import.meta.dirname, "../ASTRO_MIGRATION_TRACKER.csv"), "utf8"),
  { columns: true, skip_empty_lines: true },
) as TrackerRow[];

function destination(href: string, route: string): string {
  if (href.startsWith("tel:")) return `tel:${href.slice(4).replace(/\D/g, "")}`;
  const url = new URL(href, new URL(route, "https://artho.framer.website/"));
  if (url.hostname === "artho.framer.website") return `${url.pathname.replace(/\/$/, "") || "/"}${url.hash}`;
  return url.href;
}

const sourceLinks = new Map<string, Set<string>>();
for (const row of tracker) {
  if (row.category !== "observed-interaction") continue;
  const { href } = JSON.parse(row.detail) as { href?: string };
  if (!href) continue;
  const expected = sourceLinks.get(row.route) ?? new Set<string>();
  expected.add(destination(href, row.route));
  sourceLinks.set(row.route, expected);
}

for (const [route, expected] of sourceLinks) {
  test(`${route} preserves the exported link destinations`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const actual = new Set(
      (await page.locator("a[href]").evaluateAll((anchors) =>
        anchors.map((anchor) => anchor.getAttribute("href")).filter((href): href is string => !!href),
      )).map((href) => destination(href, route)),
    );
    expect([...expected].filter((href) => !actual.has(href))).toEqual([]);
  });
}
