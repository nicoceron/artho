import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(root, "public");
const originalBase = "/assets/framerusercontent.com/images/";
const outputBase = "/assets/responsive/";
const sourceLists = JSON.parse(await fs.readFile(path.join(root, "src/data/responsive-image-sources.json"), "utf8"));
const articles = JSON.parse(await fs.readFile(path.join(root, "src/data/articles.json"), "utf8"));
const manifestPath = path.join(root, "src/data/responsive-images.generated.json");
const recipeMtime = (await fs.stat(new URL(import.meta.url))).mtimeMs;
const previousManifest = JSON.parse(await fs.readFile(manifestPath, "utf8").catch(() => "{}"));

const groups = [
  {
    name: "blog",
    sources: [...new Set(articles.map((article) => article.image))],
    candidates: [512, 1024, 2048],
    dimension: "width",
  },
  {
    name: "features",
    sources: sourceLists.features.map((name) => `${originalBase}${name}`),
    candidates: [1024, 2048, 4096],
    dimension: "longEdge",
  },
  {
    name: "workflow-dashboard",
    sources: [`${originalBase}${sourceLists.workflowDashboard}`],
    candidates: [1024, 2048],
    dimension: "longEdge",
  },
];

const manifest = {};
let generated = 0;

for (const group of groups) {
  for (const source of group.sources) {
    if (!source.startsWith(originalBase)) throw new Error(`Expected a localized image alias: ${source}`);
    const sourcePath = path.join(publicRoot, source.slice(1));
    const sourceSha256 = createHash("sha256").update(await fs.readFile(sourcePath)).digest("hex");
    const metadata = await sharp(sourcePath).metadata();
    if (!metadata.width || !metadata.height) throw new Error(`Missing image dimensions: ${source}`);

    const variants = [];
    for (const size of group.candidates) {
      const targetWidth = group.dimension === "longEdge"
        ? Math.floor(metadata.width * Math.min(1, size / Math.max(metadata.width, metadata.height)))
        : Math.min(metadata.width, size);
      if (targetWidth >= metadata.width) continue;

      const extension = path.extname(source).toLowerCase();
      const stem = path.basename(source, extension);
      const variant = `${outputBase}${group.name}/${stem}-${group.dimension === "longEdge" ? "long" : "w"}${size}${extension}`;
      const outputPath = path.join(publicRoot, variant.slice(1));
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      const sourceStat = await fs.stat(sourcePath);
      const outputStat = await fs.stat(outputPath).catch(() => null);
      if (!outputStat || outputStat.mtimeMs < Math.max(sourceStat.mtimeMs, recipeMtime) || previousManifest[source]?.sourceSha256 !== sourceSha256) {
        const transformer = sharp(sourcePath).rotate().resize({ width: targetWidth, withoutEnlargement: true });
        if (extension === ".png") transformer.png({ palette: true, quality: 100, effort: 10 });
        else transformer.jpeg({ quality: 85, mozjpeg: true });
        await transformer.toFile(outputPath);
        generated += 1;
      }

      const result = await sharp(outputPath).metadata();
      if (result.width !== targetWidth) throw new Error(`Unexpected variant width for ${variant}: ${result.width}`);
      variants.push({ src: variant, width: result.width });
    }

    manifest[source] = { sourceSha256, width: metadata.width, height: metadata.height, variants };
  }
}

const serialized = `${JSON.stringify(Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))), null, 2)}\n`;
const previous = await fs.readFile(manifestPath, "utf8").catch(() => "");
if (previous !== serialized) await fs.writeFile(manifestPath, serialized);
console.log(`Responsive images ready: ${Object.keys(manifest).length} sources, ${generated} variants generated`);
