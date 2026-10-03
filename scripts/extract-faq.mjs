// Recover literal authored content without executing the original Framer module.
import fs from 'node:fs/promises';
const source = new URL('../.evidence/assets/by-hash/a14ad495682954e45f1385f5d38a25f12cfc70efc64e360b07bfb4b79864d6c1.bin',import.meta.url);
const bundle = await fs.readFile(source,'utf8');
const literal = value => value.replace(/\\`/g,'`').replace(/\\n/g,'\n').replace(/\\"/g,'"').replace(/\\'/g,"'");
const answers = {};
for (const match of bundle.matchAll(/MHyA5wRwZ:`((?:\\.|[^`])*)`,nfe7w_0_C:`((?:\\.|[^`])*)`/g)) {
  if (match[1].includes('${') || match[2].includes('${')) throw new Error('Expected static FAQ literals');
  answers[literal(match[2])] = literal(match[1]);
}
if (Object.keys(answers).length !== 30) throw new Error(`Expected 30 answers, found ${Object.keys(answers).length}`);
await fs.writeFile(new URL('../src/data/faq-answers.json',import.meta.url),`${JSON.stringify(answers,null,2)}\n`);
console.log(`Recovered ${Object.keys(answers).length} authored FAQ answers.`);
