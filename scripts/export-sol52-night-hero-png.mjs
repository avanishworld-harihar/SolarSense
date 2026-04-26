/**
 * Rasterize `public/sol52-night-hero.svg` (1500×540) to PNG.
 *   node scripts/export-sol52-night-hero-png.mjs
 *   SOL52_NIGHT_PNG_WIDTH=6000 node scripts/export-sol52-night-hero-png.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "public", "sol52-night-hero.svg");
const outPath = path.join(root, "public", "sol52-night-hero-hd.png");

const VB_W = 1500;
const VB_H = 540;

async function main() {
  const width = Math.max(1, Number.parseInt(process.env.SOL52_NIGHT_PNG_WIDTH || "6000", 10) || 6000);
  const height = Math.round((width * VB_H) / VB_W);

  const svg = fs.readFileSync(svgPath);
  await sharp(svg, { density: 300 })
    .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 })
    .toFile(outPath);

  const meta = await sharp(outPath).metadata();
  console.log("Wrote", outPath, `${meta.width}×${meta.height}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
