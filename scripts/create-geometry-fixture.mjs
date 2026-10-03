import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const [source, metadata] = await Promise.all([
  fs.readFile(path.join(root, ".evidence/routes/home.json"), "utf8").then(JSON.parse),
  fs.readFile(path.join(root, ".evidence/metadata.json"), "utf8").then(JSON.parse),
]);

const captures = source.captures.map(({ viewport, nodes }) => ({
  viewport,
  headings: nodes
    .filter(({ tag, rect }) => (tag === "h1" || tag === "h2" || tag === "h4") && rect?.width > 0)
    .map(({ tag, directText, textContent, rect }) => ({
      tag,
      text: (directText || textContent || "").trim().replace(/\s+/g, " "),
      rect: Object.fromEntries(["x", "y", "width", "height"].map((key) => [key, rect[key]])),
    })),
}));

if (captures.length !== 24 || captures.some(({ headings }) => headings.length !== 7)) {
  throw new Error("The source homepage capture matrix changed; inspect it before replacing the fixture.");
}

const fixture = {
  source: "standalone.html#reconstruction-evidence",
  sourceSha256BeforeEvidence: metadata.sourceFingerprint.sha256BeforeEvidence,
  geometryToleranceCssPixels: metadata.validationPolicy.geometryToleranceCssPixels,
  captures,
};
await fs.mkdir(path.join(root, "tests/fixtures"), { recursive: true });
await fs.writeFile(path.join(root, "tests/fixtures/home-headings.json"), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(`Wrote ${captures.length} source-derived viewport heading fixtures.`);
