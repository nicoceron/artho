// Read-only comparison of native semantic content with captured source geometry.
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const route = process.argv[2] || 'home';
const viewport = process.argv[3] || 'desktop';
const deltas = process.argv.includes('--deltas');
const query = deltas ? undefined : process.argv[4];
const evidence = JSON.parse(await fs.readFile(new URL(`../.evidence/routes/${route}.json`, import.meta.url), 'utf8'));
const capture = evidence.captures.find(c => c.viewport.name === viewport);
const props = ['font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-wrap', 'color', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'gap', 'grid-template-columns', 'border-radius', 'background-color', 'object-fit'];
const style = node => Object.fromEntries(props.map(k => [k, capture.styleCatalog[node.styleId]?.[k]]));
if (query) {
  const node = capture.nodes.find(n => (n.directText || '') === query) || capture.nodes.find(n => n.textContent?.includes(query));
  if (!node) throw new Error(`No source text: ${query}`);
  let ancestor = node;
  for (let i = 0; ancestor && i < 7; i++) {
    console.log(JSON.stringify({ id: ancestor.id, tag: ancestor.tag, name: ancestor.attributes?.['data-framer-name'], cls: ancestor.attributes?.class, rect: ancestor.rect, style: style(ancestor) }));
    ancestor = capture.nodes.find(n => n.id === ancestor.parentId);
  }
} else {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: capture.viewport.width, height: capture.viewport.height }, reducedMotion: 'reduce' });
  await page.goto(`http://127.0.0.1:4393${evidence.route}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const actual = await page.locator('h1,h2,h3,h4,p,a,span,b').evaluateAll((nodes, props) => nodes.filter(n => !n.children.length || /^H[1-4]$/.test(n.tagName)).map(n => {
    const r = n.getBoundingClientRect(), s = getComputedStyle(n);
    return { tag: n.tagName.toLowerCase(), text: n.textContent.trim().replace(/\s+/g, ' '), cls: n.className || n.parentElement.className, rect: { x:r.x,y:r.y,width:r.width,height:r.height }, style: Object.fromEntries(props.map(k => [k,s.getPropertyValue(k)])) };
  }), props);
  for (const a of actual.filter(n => n.rect.height && n.text)) {
    const matches = capture.nodes.filter(n => (n.directText || n.textContent || '').trim().replace(/\s+/g, ' ') === a.text && n.rect.width > 0 && n.rect.height > 0);
    const s = matches.find(n => n.tag === a.tag) || matches.sort((a,b) => a.rect.width*a.rect.height-b.rect.width*b.rect.height)[0];
    if (deltas) {
      if (s && a.rect.y > 100 && s.rect.y > 100) console.log(JSON.stringify({ text:a.text.slice(0,65), cls:a.cls, y:+(a.rect.y-s.rect.y).toFixed(2), height:+(a.rect.height-s.rect.height).toFixed(2), x:+(a.rect.x-s.rect.x).toFixed(2), width:+(a.rect.width-s.rect.width).toFixed(2), fonts:[a.style['font-size'],style(s)['font-size']], colors:[a.style.color,style(s).color] }));
    } else console.log(JSON.stringify({ text:a.text, cls:a.cls, actual:a.rect, source:s?.rect, actualStyle:a.style, sourceStyle:s && style(s) }));
  }
  await browser.close();
}
