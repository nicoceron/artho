import fs from 'node:fs/promises';
const [route, viewport = 'desktop', ...queries] = process.argv.slice(2);
const evidence = JSON.parse(await fs.readFile(new URL(`../.evidence/routes/${route}.json`, import.meta.url), 'utf8'));
for (const c of evidence.captures.filter(c => c.viewport.name === viewport || viewport === 'all' && ['desktop','tablet','mobile'].includes(c.viewport.name))) {
  console.log(c.viewport.name);
  const props = ['font-size','font-weight','line-height','letter-spacing','text-wrap','color','padding-top','padding-right','padding-bottom','padding-left','gap','background-image','background-color','border-radius','display','flex-direction','align-items'];
  for (const n of c.nodes.filter(n => n.rect.width && n.rect.height && (queries.length ? queries.some(q => n.directText?.includes(q) || n.attributes?.['data-framer-name'] === q) : n.directText && n.rect.y > 100))) {
    console.log(JSON.stringify({ id:n.id, parent:n.parentId, text:n.directText || n.attributes?.['data-framer-name'], rect:n.rect, style:Object.fromEntries(props.map(k=>[k,c.styleCatalog[n.styleId]?.[k]])) }));
  }
}
