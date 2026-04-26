/**
 * Rasterize `public/new_sol52-logo.svg` to a transparent PNG for print / UI.
 * Default output: 6000×2000 (4× the 1500×500 viewBox) for crisp scaling.
 *
 * Usage:
 *   node scripts/export-sol52-logo-png.mjs
 *   SOL52_PNG_WIDTH=9000 node scripts/export-sol52-logo-png.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "public", "new_sol52-logo.svg");
const outPath = path.join(root, "public", "sol52-wordmark-transparent-hd.png");

/** viewBox 1500×500 → aspect 3:1 */
const VB_W = 1500;
const VB_H = 500;

async function main() {
  const width = Math.max(
    1,
    Number.parseInt(process.env.SOL52_PNG_WIDTH || "6000", 10) || 6000
  );
  const height = Math.round((width * VB_H) / VB_W);

  const svg = fs.readFileSync(svgPath);
  await sharp(svg, { density: 300 })
    .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      effort: 10,
    })
    .toFile(outPath);

  const meta = await sharp(outPath).metadata();
  console.log("Wrote", outPath, `${meta.width}×${meta.height}`, meta.hasAlpha ? "RGBA" : "no alpha");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
