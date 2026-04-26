/**
 * Read `public/sol52-logo.jpg` (opaque export), make near-black pixels transparent, write `public/sol52-logo.png`.
 * If you already have a transparent PNG, drop it at `public/sol52-logo.png` and skip this script.
 * Run: node scripts/sol52-logo-knockout.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const jpg = path.join(root, "public", "sol52-logo.jpg");
const png = path.join(root, "public", "sol52-logo.png");

/** Sum RGB below this → treat as black backdrop (navy/teal/gold stay above). */
const SUM_CUTOFF = 58;

async function main() {
  if (!fs.existsSync(jpg)) {
    console.error("Missing", jpg);
    process.exit(1);
  }

  const { data, info } = await sharp(jpg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels !== 4) throw new Error(`Expected RGBA, got ${channels} channels`);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r + g + b < SUM_CUTOFF) data[i + 3] = 0;
  }

  await sharp(data, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(png);
  console.log("Wrote", png, `${width}×${height}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
